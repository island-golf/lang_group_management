import { Injectable, signal, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { MUser, SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly STORAGE_KEY = 'current_user';
  private readonly SESSION_TIMEOUT_KEY = 'session_timestamp';
  private readonly SESSION_TIMEOUT_HOURS = 4; // 4 hours timeout
  private readonly isBrowser: boolean;
  currentUser = signal<MUser | null>(null);
  private initialized = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (this.isBrowser) {
      // Check session timeout first
      if (this.isSessionExpired()) {
        this.clearSession();
        this.currentUser.set(null);
        this.initialized = true;
        return;
      }

      // Only access localStorage in browser environment
      const stored = this.loadFromStorage();
      this.currentUser.set(stored);
      this.initialized = true;
    } else {
      // Server-side: set to null initially
      this.currentUser.set(null);
      this.initialized = true;
    }
  }

  private loadFromStorage(): MUser | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    if (!this.initialized) {
      return false;
    }

    // Check if session has expired
    if (this.isBrowser && this.isSessionExpired()) {
      this.logout();
      return false;
    }

    return this.currentUser() !== null;
  }

  async login(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.supabase.loginUser(username);
      if (user) {
        this.currentUser.set(user);
        if (this.isBrowser) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
          // Store session timestamp
          localStorage.setItem(this.SESSION_TIMEOUT_KEY, Date.now().toString());
        }
        return { success: true };
      }
      return { success: false, error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' };
    } catch (err: any) {
      return { success: false, error: err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private isSessionExpired(): boolean {
    if (!this.isBrowser) return false;

    try {
      const timestamp = localStorage.getItem(this.SESSION_TIMEOUT_KEY);
      if (!timestamp) return true; // No timestamp means session is invalid

      const loginTime = parseInt(timestamp);
      const currentTime = Date.now();
      const sessionDuration = this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

      return (currentTime - loginTime) > sessionDuration;
    } catch {
      return true; // If there's any error, consider session expired
    }
  }

  private clearSession(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.SESSION_TIMEOUT_KEY);
    }
  }

  getSessionRemainingTime(): number {
    if (!this.isBrowser) return 0;

    try {
      const timestamp = localStorage.getItem(this.SESSION_TIMEOUT_KEY);
      if (!timestamp) return 0;

      const loginTime = parseInt(timestamp);
      const currentTime = Date.now();
      const sessionDuration = this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;
      const remainingTime = sessionDuration - (currentTime - loginTime);

      return Math.max(0, Math.floor(remainingTime / 1000)); // Return remaining seconds
    } catch {
      return 0;
    }
  }
}

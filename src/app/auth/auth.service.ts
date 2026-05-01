import { Injectable, signal, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { MUser, SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly STORAGE_KEY = 'current_user';
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
    return this.currentUser() !== null;
  }

  async login(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.supabase.loginUser(username);
      if (user) {
        this.currentUser.set(user);
        if (this.isBrowser) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
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
    if (this.isBrowser) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.router.navigate(['/login']);
  }
}

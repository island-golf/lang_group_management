import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MUser, SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly STORAGE_KEY = 'current_user';
  currentUser = signal<MUser | null>(this.loadFromStorage());

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  private loadFromStorage(): MUser | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  async login(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.supabase.loginUser(username);
      if (user) {
        this.currentUser.set(user);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        return { success: true };
      }
      return { success: false, error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' };
    } catch (err: any) {
      return { success: false, error: err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    this.router.navigate(['/login']);
  }
}

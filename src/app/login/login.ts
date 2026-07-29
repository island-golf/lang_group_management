import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, NgOptimizedImage],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  async onSubmit() {
    if (!this.username.trim()) {
      this.errorMessage.set('กรุณากรอกชื่อผู้ใช้');
      return;
    }
    if (!this.password) {
      this.errorMessage.set('กรุณากรอกรหัสผ่าน');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    const result = await this.auth.login(this.username.trim(), this.password);
    this.loading.set(false);
    if (result.success) {
      this.router.navigate(['/home']);
    } else {
      this.errorMessage.set(result.error ?? 'เกิดข้อผิดพลาด');
    }
  }
}

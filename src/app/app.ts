import { Component, signal, HostListener, inject, computed } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';
import { getMenusForUser, MenuItem } from './auth/menu-permission.config';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [RouterModule, CommonModule],
  styleUrl: './app.scss',
})
export class AppComponent {
  protected readonly title = signal('lang_group_management');
  sidebarOpen = false;
  isDarkMode = signal(false);
  isMobileMode = signal(false);

  private router = inject(Router);
  auth = inject(AuthService);

  /** เมนูที่ user คนนี้มีสิทธิ์เห็น — คำนวณอัตโนมัติเมื่อ currentUser เปลี่ยน */
  allowedMenus = computed<MenuItem[]>(() => {
    const user = this.auth.currentUser();
    return user ? getMenusForUser(user.USERNAME) : [];
  });

  isLoginRoute = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects.startsWith('/login')),
      startWith(this.router.url.startsWith('/login'))
    ),
    { initialValue: this.router.url.startsWith('/login') }
  );

  constructor() {
    this.updateMobileMode();
    // Handle refresh: if user is logged in but on login page, redirect to home
    if (this.auth.isLoggedIn() && this.router.url === '/login') {
      this.router.navigate(['/home']);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateMobileMode();
  }

  updateMobileMode() {
    this.isMobileMode.set(window.innerWidth < 1024);
  }

  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
    document.body.classList.toggle('dark-theme', this.isDarkMode());
  }
}

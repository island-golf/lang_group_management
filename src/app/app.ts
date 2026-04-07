import {Component, signal, HostListener} from '@angular/core';
import {RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [RouterModule, CommonModule],
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly title = signal('lang_group_management');
  sidebarOpen = false;
  isDarkMode = signal(false);
  isMobileMode = signal(false);

  constructor() {
    this.updateMobileMode();
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

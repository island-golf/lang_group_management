import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { getMenusForUser } from '../auth/menu-permission.config';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
})
export class Home {
  constructor(public auth: AuthService) {}

  get permittedMenus() {
    const username = this.auth.currentUser()?.USERNAME || '';
    return getMenusForUser(username);
  }
}

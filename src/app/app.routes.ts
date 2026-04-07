import { Routes } from '@angular/router';
import { KaokangInventory } from './inventory/kaokang-inventory/kaokang-inventory';
import { KaokangInventorySummary } from './inventory/kaokang-inventory-summary/kaokang-inventory-summary';
import { Dashboard } from './dashboard/dashboard';
import { Login } from './login/login';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'kaokang-inventory', component: KaokangInventory, canActivate: [authGuard] },
  { path: 'kaokang-inventory-summary', component: KaokangInventorySummary, canActivate: [authGuard] },
];

import { Routes } from '@angular/router';
import { KaokangInventory } from './inventory/kaokang-inventory/kaokang-inventory';
import { KaokangInventorySummary } from './inventory/kaokang-inventory-summary/kaokang-inventory-summary';
import { KaokangInventoryMaintenance } from './inventory/kaokang-inventory-maintenance/kaokang-inventory-maintenance';
import { Dashboard } from './dashboard/dashboard';
import { Login } from './login/login';
import { Home } from './home/home';
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'kaokang-inventory', component: KaokangInventory, canActivate: [authGuard] },
  { path: 'kaokang-inventory-summary', component: KaokangInventorySummary, canActivate: [authGuard] },
  { path: 'kaokang-inventory-maintenance', component: KaokangInventoryMaintenance, canActivate: [authGuard, adminGuard] },
  { path: '**', component: Login }
];

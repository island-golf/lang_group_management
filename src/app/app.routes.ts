import { Routes } from '@angular/router';
import {KaokangInventory} from './inventory/kaokang-inventory/kaokang-inventory';
import {Dashboard} from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full'},
  { path: 'kaokang-inventory', component: KaokangInventory },
  { path: 'dashboard', component: Dashboard }
];

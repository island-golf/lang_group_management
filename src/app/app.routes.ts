import { Routes } from '@angular/router';
import {KaokangInventory} from './inventory/kaokang-inventory/kaokang-inventory';
import {KaokangInventorySummary} from './inventory/kaokang-inventory-summary/kaokang-inventory-summary';
import {Dashboard} from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full'},
  { path: 'kaokang-inventory', component: KaokangInventory },
  { path: 'kaokang-inventory-summary', component: KaokangInventorySummary },
  { path: 'dashboard', component: Dashboard }
];

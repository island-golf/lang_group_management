import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../../auth/auth.service';
import { RinnamchaInventoryDialogComponent, MInventory } from './rinnamcha-inventory-dialog/rinnamcha-inventory-dialog';
import { sortItemGroupsRinnamcha } from '../../config/item-group-order-rinnamcha.config';

@Component({
  selector: 'app-rinnamcha-inventory-maintenance',
  imports: [
    MatCard,
    MatTableModule,
    MatIconModule,
    MatDialogModule,
    MatTabsModule,
  ],
  templateUrl: './rinnamcha-inventory-maintenance.html',
  styleUrl: './rinnamcha-inventory-maintenance.scss',
  encapsulation: ViewEncapsulation.None
})
export class RinnamchaInventoryMaintenance implements OnInit {
  private supabase: SupabaseClient;

  displayedColumns: string[] = ['seq', 'item_desc', 'default_amount', 'unit', 'vendor_group', 'is_active_yn', 'actions'];
  inventoryItems: MInventory[] = [];
  isLoading = false;
  showSuccess = false;
  groupedItems: { [key: string]: MInventory[] } = {};
  itemGroups: string[] = [];
  selectedTab = 0;

  constructor(
    private auth: AuthService,
    private dialog: MatDialog
  ) {
    this.supabase = createClient(
      'https://batxjgnynvnykoingkij.supabase.co',
      'sb_publishable_UtUV7xSJeNC44WeOprBeDg_8tDWXA1w'
    );

    // Check if user is admin (assuming admin check based on username or role)
    if (!this.isAdmin()) {
      throw new Error('Access denied: Admin privileges required');
    }
  }

  ngOnInit(): void {
    this.loadInventoryItems();
  }

  isAdmin(): boolean {
    const currentUser = this.auth.currentUser();
    // For now, let's assume admin users have specific usernames
    // This should be adjusted based on your actual admin role system
    const adminUsernames = ['admin', 'administrator', 'superadmin'];
    return currentUser ? adminUsernames.includes(currentUser.USERNAME.toLowerCase()) : false;
  }

  async loadInventoryItems(): Promise<void> {
    this.isLoading = true;
    try {
      const { data, error } = await this.supabase
        .from('M_INVENTORY_RINNAMCHA')
        .select('*')
        .order('SEQ', { ascending: true })
        .order('ITEM_DESC', { ascending: true });

      if (error) throw error;
      this.inventoryItems = data || [];
      this.groupItemsByCategory();
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      this.isLoading = false;
    }
  }

  groupItemsByCategory(): void {
    this.groupedItems = {};
    this.itemGroups = [];

    // Group items by ITEM_GROUP
    this.inventoryItems.forEach(item => {
      const group = item.ITEM_GROUP || 'ไม่ระบุกลุ่ม';
      if (!this.groupedItems[group]) {
        this.groupedItems[group] = [];
      }
      this.groupedItems[group].push(item);
    });

    // Sort groups using the config order
    this.itemGroups = sortItemGroupsRinnamcha(Object.keys(this.groupedItems));

    // Sort items within each group by SEQ
    this.itemGroups.forEach(group => {
      this.groupedItems[group].sort((a, b) => {
        const seqA = a.SEQ || 0;
        const seqB = b.SEQ || 0;
        return seqA - seqB;
      });
    });
  }

  onAddItem(): void {
    const dialogRef = this.dialog.open(RinnamchaInventoryDialogComponent, {
      data: {
        title: 'เพิ่มรายการใหม่',
        groupedItems: this.groupedItems
      },
      width: '70vw',
      maxWidth: '90vw',
      panelClass: 'wide-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.upsertItem(result);
      }
    });
  }

  onEditItem(item: MInventory): void {
    const dialogRef = this.dialog.open(RinnamchaInventoryDialogComponent, {
      data: { title: 'แก้ไขรายการ', item },
      width: '70vw',
      maxWidth: '90vw',
      panelClass: 'wide-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.upsertItem(result, item.ID!);
      }
    });
  }

  onDeleteItem(item: MInventory): void {
    const dialogRef = this.dialog.open(RinnamchaInventoryDialogComponent, {
      data: {
        title: 'ยืนยันการลบรายการ',
        item,
        isDeleteMode: true
      },
      width: '400px',
      panelClass: 'confirm-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.confirmDelete(item);
      }
    });
  }

  async confirmDelete(item: MInventory): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('M_INVENTORY_RINNAMCHA')
        .delete()
        .eq('ID', item.ID);

      if (error) throw error;

      await this.loadInventoryItems();
      this.showSuccessMessage();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  async upsertItem(itemData: any, id?: number): Promise<void> {
    this.isLoading = true;
    try {
      const data: Partial<MInventory> = {
        ITEM_DESC: itemData.item_desc,
        DEFAULT_AMOUNT: itemData.default_amount,
        UNIT: itemData.unit,
        VENDOR_GROUP: itemData.vendor_group,
        ITEM_GROUP: itemData.item_group,
        SEQ: itemData.seq,
        IS_ACTIVE_YN: itemData.is_active_yn
      };

      // Add ID if updating existing record
      if (id) {
        data.ID = id;
      }

      const { error } = await this.supabase
        .from('M_INVENTORY_RINNAMCHA')
        .upsert(data, { onConflict: 'ID' });

      if (error) throw error;

      await this.loadInventoryItems();
      this.showSuccessMessage();
    } catch (error) {
      console.error('Error upserting item:', error);
    } finally {
      this.isLoading = false;
    }
  }

  showSuccessMessage(): void {
    this.showSuccess = true;
    setTimeout(() => {
      this.showSuccess = false;
    }, 3000);
  }

  getActiveStatusText(isActive: string): string {
    return isActive === 'Y' ? 'ใช้งาน' : 'ไม่ใช้งาน';
  }

  getActiveStatusClass(isActive: string): string {
    return isActive === 'Y' ? 'text-green-600' : 'text-red-600';
  }

  getNextSequence(itemGroup: string): number {
    const group = itemGroup || 'ไม่ระบุกลุ่ม';
    const items = this.groupedItems[group] || [];

    if (items.length === 0) {
      return 1;
    }

    // Find the maximum SEQ in the group
    const maxSeq = Math.max(...items.map(item => item.SEQ || 0));
    return maxSeq + 1;
  }
}



import {Component, ElementRef, OnInit, QueryList, ViewChildren, HostListener, ViewEncapsulation, ChangeDetectorRef} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatCard} from '@angular/material/card';
import {CommonModule} from '@angular/common';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {InventoryInsertModel} from './kaokang-inventory.model';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {AuthService} from '../../auth/auth.service';
import { sortItemGroups } from '../../config/item-group-order.config';

@Component({
  selector: 'app-kaokang-inventory',
  standalone: true,
  imports: [
    CommonModule,
    MatButton,
    MatCard,
    ReactiveFormsModule,
  ],
  templateUrl: './kaokang-inventory.html',
  styleUrls: ['./kaokang-inventory.scss'],
  encapsulation: ViewEncapsulation.None
})
export class KaokangInventory implements OnInit {
  @ViewChildren('amountInput') amountInputs!: QueryList<ElementRef>;

  private supabase: SupabaseClient;

  fb: FormBuilder;
  formGroup!: FormGroup;
  showSuccess = false;
  showConfirm = false;
  isLoading = false;
  showBackToTop = false;
  // Index of the currently selected tab (used by the UI to switch groups)
  // -1 means no group selected (show group selection cards). 0..N-1 are groups, N is remark panel.
  activeTabIndex = -1;

  // The display name used for the remark panel (added to groupNames so it appears as a card)
  remarkGroupName = 'หมายเหตุ';

  // Properties for dynamic tabs
  itemGroups: { [key: string]: any[] } = {};
  groupNames: string[] = [];

  // Track which groups have been saved today
  groupsSavedToday: Set<string> = new Set();


  constructor(private auth: AuthService, private cdr: ChangeDetectorRef) {
    this.supabase = createClient(
      'https://batxjgnynvnykoingkij.supabase.co',
      'sb_publishable_UtUV7xSJeNC44WeOprBeDg_8tDWXA1w'
    );
    this.fb = new FormBuilder;
  }

  async ngOnInit() {
    this.isLoading = true;
    try {
      this.initForm();
      await this.getMasterInventory();
      await this.getTransactionInventory();
    } finally {
      this.isLoading = false;
    }
  }

  initForm() {
    this.formGroup = this.fb.group({
      inventories: this.fb.array([]),
      remark: ['']
    });
  }

  get inventories(): FormArray {
    return this.formGroup.get('inventories') as FormArray;
  }

  async getMasterInventory() {
    const {data, error} = await this.supabase
      .from('M_INVENTORY')
      .select(`
    ID,
    ITEM_DESC,
    ITEM_GROUP
  `).eq('IS_ACTIVE_YN', 'Y').order('ITEM_GROUP').order('SEQ');
    if (error) throw error;

    if (data) {
      // Group data by ITEM_GROUP
      this.itemGroups = {};
      this.groupNames = [];

      data.forEach(inv => {
        const groupName = inv.ITEM_GROUP || 'อื่นๆ';
        if (!this.itemGroups[groupName]) {
          this.itemGroups[groupName] = [];
          this.groupNames.push(groupName);
        }
        this.itemGroups[groupName].push(inv);
      });

      // Sort groups using the config order
      this.groupNames = sortItemGroups(this.groupNames);

      // Ensure remark group is present in the list so it appears as a selectable card
      if (!this.groupNames.includes(this.remarkGroupName)) {
        this.groupNames.push(this.remarkGroupName);
      }

      // Create form controls for all items
      data?.forEach(inv => {
        this.inventories.push(this.fb.group({
          tran_id: [],
          amount: [null],
          master_id: [inv.ID],
          item_desc: [inv.ITEM_DESC],
          item_group: [inv.ITEM_GROUP]
        }));
      });
    }
    return data;
  }

   async getTransactionInventory() {
     const today = this.getDate();
     const {data, error} = await this.supabase
       .from('T_INVENTORY')
       .select(`
         M_INVENTORY_ID,
         AMOUNT,
         M_INVENTORY!inner(
           ITEM_GROUP
         )
       `)
       .gte('CREATED_DATETIME', `${today}T00:00:00`)
       .lte('CREATED_DATETIME', `${today}T23:59:59`);

     if (error) throw error;

     if (this.inventories.length > 0) {
       this.inventories.controls.forEach(group => {
         const transaction = data?.find((item: any) => item.M_INVENTORY_ID === group.get('master_id')?.value);
         group.get('amount')?.setValue(transaction?.AMOUNT ?? null);
       });
     }

     // Track which groups have saved data for today
     this.groupsSavedToday.clear();
     if (data && Array.isArray(data) && data.length > 0) {
       const groupsWithData = new Set<string>();
       data.forEach((item: any) => {
         let itemGroup: string | undefined;

         if (Array.isArray(item.M_INVENTORY)) {
           itemGroup = item.M_INVENTORY[0]?.ITEM_GROUP;
         } else if (typeof item.M_INVENTORY === 'object' && item.M_INVENTORY !== null) {
           itemGroup = item.M_INVENTORY.ITEM_GROUP;
         }

         const groupName = itemGroup || 'อื่นๆ';
         groupsWithData.add(groupName);
       });
       groupsWithData.forEach(group => this.groupsSavedToday.add(group));
     }

     // Trigger change detection to update the UI
     this.cdr.markForCheck();

     // Get today's remark
     await this.getTodayRemark();
   }

  async getTodayRemark() {
    const today = this.getDate();
    const {data, error} = await this.supabase
      .from('T_INVENTORY_REMARK')
      .select('REMARK')
      .gte('CREATED_DATETIME', `${today}T00:00:00`)
      .lte('CREATED_DATETIME', `${today}T23:59:59`)
      .order('CREATED_DATETIME', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting remark:', error);
    }

    if (data?.REMARK) {
      this.formGroup.get('remark')?.setValue(data.REMARK);
    }
  }

  submit() {
    // Show confirm dialog instead of directly submitting
    this.showConfirm = true;
  }

   async confirmSave() {
     this.showConfirm = false;

     const formData = this.formGroup.value;
     const remark = formData.remark || '';
     const username = this.auth.currentUser()?.USERNAME || 'unknown';
    // Determine which section is being saved (group or remark)
    const selectedIndex = this.activeTabIndex;

    this.isLoading = true;
    try {
      if (selectedIndex === -1) {
        // Nothing selected - nothing to save
        return;
      }

      const selectedGroup = this.groupNames[selectedIndex];

       if (selectedGroup === this.remarkGroupName) {
          // Only save remark
          await this.upsertRemark(remark);
          // Mark remark group as saved
          this.groupsSavedToday.add(selectedGroup);
          this.cdr.markForCheck();
          this.showSuccess = true;
          setTimeout(() => {
            this.showSuccess = false;
            // Go back to group selection after success message disappears
            this.activeTabIndex = -1;
            this.cdr.markForCheck();
          }, 2000);
          return;
        }

      // For a specific group: build insert data only for inventory items that belong to this group
      const inventoryInsertData: InventoryInsertModel[] = this.inventories.controls
        .filter(ctrl => ctrl.get('item_group')?.value === selectedGroup)
        .map(ctrl => ({
          M_INVENTORY_ID: ctrl.get('master_id')?.value,
          AMOUNT: ctrl.get('amount')?.value == null || ctrl.get('amount')?.value === '' ? 0 : ctrl.get('amount')?.value,
          CREATED_BY: username
        }));

       // If there are no items for this group, still upsert remark and show success
        if (inventoryInsertData.length === 0) {
          await this.upsertRemark(remark);
          // Mark this group as saved even if no items were entered
          this.groupsSavedToday.add(selectedGroup);
          this.cdr.markForCheck();
          this.showSuccess = true;
          setTimeout(() => {
            this.showSuccess = false;
            // Go back to group selection after success message disappears
            this.activeTabIndex = -1;
            this.cdr.markForCheck();
          }, 2000);
          return;
        }

      // Collect master ids to delete existing records for this group for today
      const idsToDelete = inventoryInsertData.map(i => i.M_INVENTORY_ID);

       // Delete & insert only for the selected group
       const inventoryResult = await this.insertTInventory(inventoryInsertData, idsToDelete);

       // Mark this group as saved
        this.groupsSavedToday.add(selectedGroup);
        this.cdr.markForCheck();

        // Only save remark when the remark panel is active. (Do not upsert remark when saving a group.)
        if (!inventoryResult) {
          this.showSuccess = true;
          setTimeout(() => {
            this.showSuccess = false;
            // Go back to group selection after success message disappears
            this.activeTabIndex = -1;
            this.cdr.markForCheck();
          }, 2000);
        }
     } finally {
       this.isLoading = false;
     }
   }

  cancelSave() {
    this.showConfirm = false;
  }

  /**
   * Insert inventory records for today. If idsToDelete is provided, only delete existing
   * records for those M_INVENTORY_IDs; otherwise delete all records for today (legacy behaviour).
   */
  async insertTInventory(inventoryInsertData: InventoryInsertModel[], idsToDelete?: any[]) {
    const today = this.getDate();

    // First, delete existing records for today for the provided IDs (or all if none provided)
    let deleteQuery = this.supabase.from('T_INVENTORY').delete();
    if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
      deleteQuery = deleteQuery.in('M_INVENTORY_ID', idsToDelete);
    }
    deleteQuery = deleteQuery.gte('CREATED_DATETIME', `${today}T00:00:00`).lte('CREATED_DATETIME', `${today}T23:59:59`);

    const {error: deleteError} = await deleteQuery;
    if (deleteError) throw deleteError;

    // Then insert new records with current datetime for the provided data
    const dataWithDateTime = inventoryInsertData.map(item => ({
      ...item,
      CREATED_DATETIME: new Date().toISOString()
    }));

    const {error: insertError} = await this.supabase
      .from('T_INVENTORY')
      .insert(dataWithDateTime);

    if (insertError) throw insertError;
    return insertError;
  }

  async upsertRemark(remark: string) {
    const today = this.getDate();
    const username = this.auth.currentUser()?.USERNAME || 'unknown';

    // First, delete existing records for today
    const {error: deleteError} = await this.supabase
      .from('T_INVENTORY_REMARK')
      .delete()
      .gte('CREATED_DATETIME', `${today}T00:00:00`)
      .lte('CREATED_DATETIME', `${today}T23:59:59`);

    if (deleteError) throw deleteError;

    // Then insert new record
    const {error: insertError} = await this.supabase
      .from('T_INVENTORY_REMARK')
      .insert({
        REMARK: remark,
        CREATED_BY: username,
        CREATED_DATETIME: new Date().toISOString()
      });

    if (insertError) throw insertError;
    return insertError;
  }

  getThaiDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มจาก 0
    const yearBE = today.getFullYear() + 543; // แปลงเป็น พ.ศ.

    return `${day}/${month}/${yearBE}`;
  }

  getDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${year}-${month}-${day}`; // 2025-09-11
  }

   getInventoriesByGroup(groupName: string) {
     return this.inventories.controls.filter(inv =>
       inv.get('item_group')?.value === groupName
     );
   }

   isGroupSavedToday(groupName: string): boolean {
     return this.groupsSavedToday.has(groupName);
   }



  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showBackToTop = window.pageYOffset > 300;
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // async getTransactionInventory() {
  //   const {data, error} = await this.supabase
  //     .from<'T_INVENTORY', InventoryModel>('T_INVENTORY') // ✅ T = table name, R = row type
  //     .select(`
  //   ID,
  //   AMOUNT,
  //   M_INVENTORY!inner(ID, DESC)
  // `);
  //   console.log(data);
  //   if (error) throw error;
  //
  //   if (data) {
  //     data?.forEach(inv => {
  //       const masters = Array.isArray(inv.M_INVENTORY) ? inv.M_INVENTORY : [inv.M_INVENTORY];
  //       masters.forEach(master => {
  //         this.inventories.push(this.fb.group({
  //           tran_id: [inv.ID],
  //           amount: [inv.AMOUNT],
  //           master_id: [master.ID],
  //           desc: [master.DESC]
  //         }));
  //       });
  //     });
  //   }
  //   return data;
  // }
}

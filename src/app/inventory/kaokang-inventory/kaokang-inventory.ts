import {Component, ElementRef, OnInit, QueryList, ViewChildren, HostListener} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatCard} from '@angular/material/card';
import {MatTabsModule} from '@angular/material/tabs';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {InventoryInsertModel} from './kaokang-inventory.model';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {AuthService} from '../../auth/auth.service';

@Component({
  selector: 'app-kaokang-inventory',
  imports: [
    MatButton,
    MatCard,
    ReactiveFormsModule,
    MatTabsModule
  ],
  templateUrl: './kaokang-inventory.html',
  styleUrl: './kaokang-inventory.scss'
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

  // Properties for dynamic tabs
  itemGroups: { [key: string]: any[] } = {};
  groupNames: string[] = [];


  constructor(private auth: AuthService) {
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
      .from('M_INVENTORY') // ✅ T = table name, R = row type
      .select(`
    ID,
    ITEM_DESC,
    ITEM_GROUP
  `).eq('IS_ACTIVE_YN', 'Y').order('ITEM_GROUP').order('SEQ');
    console.log(data);
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
    console.log(data);
    if (error) throw error;

    if (this.inventories.length > 0) {
      this.inventories.controls.forEach(group => {
        const transaction = data?.find((item: any) => item.M_INVENTORY_ID === group.get('master_id')?.value);
        group.get('amount')?.setValue(transaction?.AMOUNT ?? null);
      });
    }

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

    console.log(this.formGroup.value);
    const formData = this.formGroup.value;
    const inventoryData = formData.inventories;
    const remark = formData.remark || '';
    const username = this.auth.currentUser()?.USERNAME || 'unknown';

    const inventoryInsertData: InventoryInsertModel[] = inventoryData.map((item: { master_id: any; amount: any; }) => ({
      M_INVENTORY_ID: item.master_id,
      AMOUNT: item.amount == null || item.amount === '' ? 0 : item.amount,
      CREATED_BY: username
    }));

    // ส่งกลับ Supabase ตามต้องการ
    this.isLoading = true;
    try {
      // Insert inventory data
      const inventoryResult = await this.insertTInventory(inventoryInsertData);

      // Upsert remark data
      await this.upsertRemark(remark);

      if (!inventoryResult) {
        this.showSuccess = true;
        setTimeout(() => this.showSuccess = false, 2000);
      }
    } finally {
      this.isLoading = false;
    }
  }

  cancelSave() {
    this.showConfirm = false;
  }

  async insertTInventory(inventoryInsertData: InventoryInsertModel[]) {
    const today = this.getDate();

    // First, delete existing records for today
    const {error: deleteError} = await this.supabase
      .from('T_INVENTORY')
      .delete()
      .gte('CREATED_DATETIME', `${today}T00:00:00`)
      .lte('CREATED_DATETIME', `${today}T23:59:59`);

    if (deleteError) throw deleteError;

    // Then insert new records with current datetime
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


  onEnterKey(event: Event, currentIndex: number) {
    event.preventDefault();
    const inputs = this.amountInputs.toArray();
    const nextInput = inputs[currentIndex + 1];
    if (nextInput) {
      nextInput.nativeElement.focus();
    }
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

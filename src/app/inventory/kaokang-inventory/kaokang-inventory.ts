import {Component, ElementRef, OnInit, QueryList, ViewChildren} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatCard} from '@angular/material/card';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {InventoryInsertModel} from './kaokang-inventory.model';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-kaokang-inventory',
  imports: [
    MatButton,
    MatCard,
    ReactiveFormsModule
  ],
  templateUrl: './kaokang-inventory.html',
  styleUrl: './kaokang-inventory.scss'
})
export class KaokangInventory implements OnInit {
  @ViewChildren('amountInput') amountInputs!: QueryList<ElementRef>;

  private supabase: SupabaseClient;

  fb: FormBuilder;
  formGroup!: FormGroup;
  isReadonly = false;
  showSuccess = false;

  constructor() {
    this.supabase = createClient(
      'https://batxjgnynvnykoingkij.supabase.co',
      'sb_publishable_UtUV7xSJeNC44WeOprBeDg_8tDWXA1w'
    );
    this.fb = new FormBuilder;
  }

  async ngOnInit() {
    this.initForm();
    await this.getMasterInventory();
    await this.getTransactionInventory();
  }

  initForm() {
    this.formGroup = this.fb.group({
      inventories: this.fb.array([])
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
    ITEM_DESC
  `).eq('IS_ACTIVE_YN', 'Y').order('ITEM_GROUP').order('SEQ');
    console.log(data);
    if (error) throw error;

    if (data) {
      data?.forEach(inv => {
        this.inventories.push(this.fb.group({
          tran_id: [],
          amount: [null],
          master_id: [inv.ID],
          item_desc: [inv.ITEM_DESC]
        }));
      });
    }
    return data;
  }

  async getTransactionInventory() {
    const today = this.getDate();
    const {data, error} = await this.supabase
      .from('T_INVENTORY')
      .select('M_INVENTORY_ID, AMOUNT')
      .gte('CREATED_DATETIME', `${today}T00:00:00`)
      .lte('CREATED_DATETIME', `${today}T23:59:59`);
    console.log(data);
    if (error) throw error;

    if (this.inventories.length > 0) {
      this.inventories.controls.forEach(group => {
        group.get('amount')?.setValue(
          data?.find(item => item.M_INVENTORY_ID === group.get('master_id')?.value)?.AMOUNT ?? null
        );
      });
    }

    if (data?.length > 0) {
      this.isReadonly = true;
    }
  }

  submit() {
    console.log(this.formGroup.value.inventories);
    const data = this.formGroup.value.inventories;
    const inventoryInsertData: InventoryInsertModel[] = data.map((item: { master_id: any; amount: any; }) => ({
      M_INVENTORY_ID: item.master_id,
      AMOUNT: item.amount
    }));

    // ส่งกลับ Supabase ตามต้องการ
    this.insertTInventory(inventoryInsertData).then(r => {
      if (!r) {
        this.isReadonly = true;
        this.showSuccess = true;
        setTimeout(() => this.showSuccess = false, 2000);
      }
    });
  }

  async insertTInventory(inventoryInsertData: InventoryInsertModel[]) {
    const {error} = await this.supabase.from('T_INVENTORY').insert(inventoryInsertData);
    if (error) throw error;
    return error;
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

  onEnterKey(event: Event, currentIndex: number) {
    event.preventDefault();
    const inputs = this.amountInputs.toArray();
    const nextInput = inputs[currentIndex + 1];
    if (nextInput) {
      nextInput.nativeElement.focus();
    }
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

import {Component, OnInit} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatCard} from '@angular/material/card';
import {MatFormField} from '@angular/material/form-field';
import {MatInput, MatLabel} from '@angular/material/input';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {InventoryInsertModel, InventoryModel, MasterInventory} from './kaokang-inventory.model';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatDivider} from '@angular/material/divider';

@Component({
  selector: 'app-kaokang-inventory',
  imports: [
    MatButton,
    MatCard,
    MatFormField,
    MatInput,
    MatLabel,
    // MatDivider,
    ReactiveFormsModule
  ],
  templateUrl: './kaokang-inventory.html',
  styleUrl: './kaokang-inventory.scss'
})
export class KaokangInventory implements OnInit {
  private supabase: SupabaseClient;

  fb: FormBuilder;
  formGroup!: FormGroup;
  isReadonly = false;

  masterInventory: InventoryModel[] = [];

  constructor() {
    this.supabase = createClient(
      'https://wqvdzicazdozhcojkgaz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdmR6aWNhemRvemhjb2prZ2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDE1NTUsImV4cCI6MjA3MzA3NzU1NX0.zvuFQ7u6xCT1qGqNyBV1Tdg28A7EfiUcKZ53Xam_6OM'
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
      .from<'M_INVENTORY', MasterInventory>('M_INVENTORY') // ✅ T = table name, R = row type
      .select(`
    ID,
    DESC
  `);
    console.log(data);
    if (error) throw error;

    if (data) {
      data?.forEach(inv => {
        this.inventories.push(this.fb.group({
          tran_id: [],
          amount: [0],
          master_id: [inv.ID],
          desc: [inv.DESC]
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
          data?.find(item => item.M_INVENTORY_ID === group.get('master_id')?.value)?.AMOUNT ?? 0
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
      if (r) {
        console.log('Failed to insert data:');
      }
    });
  }

  async insertTInventory(inventoryInsertData: InventoryInsertModel[]) {
    const {data, error} = await this.supabase.from('T_INVENTORY').insert(inventoryInsertData);
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

  // เพิ่ม inventory ใหม่
  addInventory() {
    this.inventories.push(
      this.fb.group({
        tran_id: [null],
        amount: [null, Validators.required],
        master_id: [null],
        desc: ['', Validators.required]
      })
    );
  }

  // ลบ inventory
  removeInventory(index: number) {
    this.inventories.removeAt(index);
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

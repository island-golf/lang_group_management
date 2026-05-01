import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface MInventory {
  ID?: number;
  ITEM_DESC: string;
  DEFAULT_AMOUNT?: number;
  UNIT?: string;
  VENDOR_GROUP?: string;
  ITEM_GROUP?: string;
  SEQ?: number;
  IS_ACTIVE_YN: string;
}

export interface DialogData {
  title: string;
  item?: MInventory;
}

@Component({
  selector: 'app-inventory-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './inventory-dialog.html'
})
export class InventoryDialogComponent {
  inventoryForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<InventoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.initForm();
  }

  initForm(): void {
    this.inventoryForm = this.fb.group({
      item_desc: [this.data.item?.ITEM_DESC || '', Validators.required],
      default_amount: [this.data.item?.DEFAULT_AMOUNT || null, [Validators.min(0)]],
      unit: [this.data.item?.UNIT || ''],
      vendor_group: [this.data.item?.VENDOR_GROUP || ''],
      item_group: [this.data.item?.ITEM_GROUP || ''],
      seq: [this.data.item?.SEQ || null, [Validators.min(0)]],
      is_active_yn: [this.data.item?.IS_ACTIVE_YN || 'Y', Validators.required]
    });
  }

  onSave(): void {
    if (this.inventoryForm.valid) {
      this.dialogRef.close(this.inventoryForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

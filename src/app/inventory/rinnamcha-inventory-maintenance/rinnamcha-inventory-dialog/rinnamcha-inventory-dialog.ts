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
  isDeleteMode?: boolean;
  groupedItems?: { [key: string]: MInventory[] };
}

@Component({
  selector: 'app-rinnamcha-inventory-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './rinnamcha-inventory-dialog.html'
})
export class RinnamchaInventoryDialogComponent {
  inventoryForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RinnamchaInventoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.initForm();
  }

  calculateNextSequence(itemGroup: string): number {
    if (!this.data.groupedItems) {
      return 1;
    }

    const group = itemGroup || 'ไม่ระบุกลุ่ม';
    const items = this.data.groupedItems[group] || [];

    if (items.length === 0) {
      return 1;
    }

    // Find the maximum SEQ in the group
    const maxSeq = Math.max(...items.map(item => item.SEQ || 0));
    return maxSeq + 1;
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

    // For new items, auto-calculate sequence when item group changes
    if (!this.data.item) {
      this.inventoryForm.get('item_group')?.valueChanges.subscribe(itemGroup => {
        const nextSeq = this.calculateNextSequence(itemGroup);
        this.inventoryForm.get('seq')?.setValue(nextSeq);
      });
    }
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


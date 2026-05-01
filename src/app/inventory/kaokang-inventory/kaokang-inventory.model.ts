export interface InventoryModel {
  ID: number;
  AMOUNT: number;
  M_INVENTORY?: MasterInventory | MasterInventory[];
}

export interface MasterInventory {
  ID: number;
  ITEM_DESC: string;
  ITEM_GROUP: string;
  DEFAULT_AMOUNT: number;
  UNIT: string;
  VENDOR_GROUP: string;
}

export interface SummaryItem {
  master_id: number;
  item_desc: string;
  default_amount: number;
  actual_amount: number;
  unit: string;
  vendor_group: string;
}

export interface SummaryGroup {
  vendor_group: string;
  items: SummaryItem[];
}

export interface InventoryInsertModel {
  M_INVENTORY_ID: number;
  AMOUNT: number;
}

export interface InventoryModel {
  ID: number;
  AMOUNT: number;
  M_INVENTORY?: MasterInventory | MasterInventory[];
}

export interface MasterInventory {
  ID: number;
  DESC: string;
}

export interface InventoryInsertModel {
  M_INVENTORY_ID: number;
  AMOUNT: number;
}

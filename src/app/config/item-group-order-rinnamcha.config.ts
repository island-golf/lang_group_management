// ============================================================
//  Item Group Order Config - Rinnamcha
//  กำหนดลำดับการแสดงผลของ ITEM_GROUP
// ============================================================

/**
 * ลำดับการแสดงผลของ ITEM_GROUP
 * ถ้ามีชนิดใหม่เพิ่มขึ้นมา ให้เพิ่มต่อท้ายรายการนี้
 */
export const ITEM_GROUP_ORDER_RINNAMCHA: string[] = [
  'ชาและกาแฟ',
  'เฮลซ์บลูบอย',
  'วัตถุดิบ',
  'ท็อปปิ้ง',
  'ซอส',
  'ผลไม้',
  'เครื่องดื่ม',
  'บรรจุภัณฑ์',
  'ทำความสะอาด',
];

/**
 * คืนค่าลำดับของ ITEM_GROUP สำหรับใช้ในการ sort
 * ถ้าไม่พบในรายการที่กำหนดไว้ จะคืนค่าเป็นลำดับสูงสุด + 1
 */
export function getItemGroupOrderRinnamcha(itemGroup: string): number {
  const order = ITEM_GROUP_ORDER_RINNAMCHA.indexOf(itemGroup);
  return order === -1 ? ITEM_GROUP_ORDER_RINNAMCHA.length : order;
}

/**
 * เรียงลำดับ ITEM_GROUP ตามลำดับที่กำหนดใน config
 * ถ้าไม่พบในรายการที่กำหนดไว้ จะแสดงหลังรายการที่กำหนดไว้ทั้งหมด
 */
export function sortItemGroupsRinnamcha(itemGroups: string[]): string[] {
  return itemGroups.sort((a, b) => {
    const orderA = getItemGroupOrderRinnamcha(a);
    const orderB = getItemGroupOrderRinnamcha(b);

    if (orderA === orderB) {
      // ถ้าลำดับเท่ากัน ให้เรียงตามภาษาไทย
      return a.localeCompare(b, 'th');
    }

    return orderA - orderB;
  });
}

/**
 * เพิ่ม ITEM_GROUP ใหม่เข้าไปในรายการ (ถ้ายังไม่มี)
 * สำหรับใช้ในกรณีที่ต้องการเพิ่มชนิดใหม่แบบ dynamic
 */
export function addItemGroupOrderRinnamcha(itemGroup: string): void {
  if (!ITEM_GROUP_ORDER_RINNAMCHA.includes(itemGroup)) {
    ITEM_GROUP_ORDER_RINNAMCHA.push(itemGroup);
  }
}


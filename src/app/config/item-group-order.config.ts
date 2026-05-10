// ============================================================
//  Item Group Order Config
//  กำหนดลำดับการแสดงผลของ ITEM_GROUP
// ============================================================

/**
 * ลำดับการแสดงผลของ ITEM_GROUP
 * ถ้ามีชนิดใหม่เพิ่มขึ้นมา ให้เพิ่มต่อท้ายรายการนี้
 */
export const ITEM_GROUP_ORDER: string[] = [
  'เครื่องปรุง',
  'พริกแกง',
  'หน้าร้าน',
  'ก๋วยเตี๋ยว',
  'ตามสั่ง',
];

/**
 * คืนค่าลำดับของ ITEM_GROUP สำหรับใช้ในการ sort
 * ถ้าไม่พบในรายการที่กำหนดไว้ จะคืนค่าเป็นลำดับสูงสุด + 1
 */
export function getItemGroupOrder(itemGroup: string): number {
  const order = ITEM_GROUP_ORDER.indexOf(itemGroup);
  return order === -1 ? ITEM_GROUP_ORDER.length : order;
}

/**
 * เรียงลำดับ ITEM_GROUP ตามลำดับที่กำหนดใน config
 * ถ้าไม่พบในรายการที่กำหนดไว้ จะแสดงหลังรายการที่กำหนดไว้ทั้งหมด
 */
export function sortItemGroups(itemGroups: string[]): string[] {
  return itemGroups.sort((a, b) => {
    const orderA = getItemGroupOrder(a);
    const orderB = getItemGroupOrder(b);

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
export function addItemGroupOrder(itemGroup: string): void {
  if (!ITEM_GROUP_ORDER.includes(itemGroup)) {
    ITEM_GROUP_ORDER.push(itemGroup);
  }
}

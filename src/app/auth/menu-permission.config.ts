// ============================================================
//  Menu Permission Config
//  กำหนดว่า username ไหน เห็นเมนูอะไรได้บ้าง
// ============================================================

export interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

/** รายการเมนูทั้งหมดในระบบ */
export const ALL_MENUS: MenuItem[] = [
  { icon: '🏠', label: 'หน้าแรก',             route: '/dashboard' },
  { icon: '📊', label: 'ระบบนับสต็อก',          route: '/kaokang-inventory' },
  { icon: '📋', label: 'สรุประบบสต็อก',  route: '/kaokang-inventory-summary' },
];

/**
 * กำหนดสิทธิ์แต่ละ username (ตัวพิมพ์เล็ก)
 * key   = username (lowercase)
 * value = array ของ route ที่อนุญาต
 *
 * ตัวอย่าง:
 *   'admin'        → เห็นทุกเมนู
 *   'kaokang_user' → เห็นแค่ Kaokang inventory
 */
const USER_MENU_PERMISSION: Record<string, string[]> = {
  admin: [
    '/dashboard',
    '/kaokang-inventory',
    '/kaokang-inventory-summary',
  ],
  kaokang_user: [
    '/kaokang-inventory',
  ],
  nok: [
    '/dashboard',
    '/kaokang-inventory',
  ],
  nam: [
    '/dashboard',
    '/kaokang-inventory',
  ],
  // เพิ่ม user ใหม่ตรงนี้
};

/** เมนู default สำหรับ user ที่ไม่ได้กำหนดไว้ */
const DEFAULT_PERMITTED_ROUTES: string[] = ['/dashboard'];

/**
 * รับ username แล้วคืน MenuItem[] ที่ user นั้นๆ มีสิทธิ์เห็น
 */
export function getMenusForUser(username: string): MenuItem[] {
  const permitted =
    USER_MENU_PERMISSION[username.toLowerCase()] ?? DEFAULT_PERMITTED_ROUTES;
  return ALL_MENUS.filter((menu) => permitted.includes(menu.route));
}


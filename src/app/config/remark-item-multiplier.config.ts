export interface WordConfig {
  pattern: string;
  multiplier: number;
  unit: string;
}

export const wordConfigs: WordConfig[] = [
  { pattern: 'หมูบด', multiplier: 0.7, unit: 'โล' },
  { pattern: 'หมูชิ้น', multiplier: 0.7, unit: 'โล' },
  { pattern: 'ตับหมู', multiplier: 0.7, unit: 'โล' },
  { pattern: 'ไก่บด', multiplier: 3, unit: 'โล' },
  { pattern: 'ไก่แกง', multiplier: 3.5, unit: 'โล' },
  { pattern: 'ลูกชิ้นหมูผสมไก่', multiplier: 2, unit: 'โล' },
  { pattern: 'น่องไก่ทอด', multiplier: 30, unit: 'ชิ้น' },
  { pattern: 'ใบกะเพรา', multiplier: 2, unit: 'โล' },
  { pattern: 'ใบโหระพา', multiplier: 2, unit: 'โล' },
];

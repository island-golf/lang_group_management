export interface WordConfig {
  pattern: string;
  multiplier: number;
  unit: string;
}

export const wordConfigs: WordConfig[] = [
  { pattern: 'หมูบด', multiplier: 0.7, unit: 'โล' },
  { pattern: 'หมูสับ', multiplier: 0.7, unit: 'โล' },
  { pattern: 'หมูชิ้น', multiplier: 0.7, unit: 'โล' },
  { pattern: 'ตับหมู', multiplier: 0.7, unit: 'โล' },
  { pattern: 'ไก่บด', multiplier: 3, unit: 'โล' },
  { pattern: 'ไก่แกง', multiplier: 4.5, unit: 'โล' },
  { pattern: 'ไก่BL', multiplier: 3, unit: 'โล' },
  { pattern: 'หนังไก่', multiplier: 3, unit: 'โล' },
  { pattern: 'ตับไก่', multiplier: 3, unit: 'โล' },
  { pattern: 'ลูกชิ้นหมูผสมไก่', multiplier: 2, unit: 'โล' },
  { pattern: 'น่องไก่ทอด', multiplier: 30, unit: 'ชิ้น' },
  { pattern: 'ใบกะเพรา', multiplier: 1, unit: 'โล' },
  { pattern: 'ใบโหระพา', multiplier: 1, unit: 'โล' },
];

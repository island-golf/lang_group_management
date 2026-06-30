import {Component, OnInit} from '@angular/core';
import {NgClass} from '@angular/common';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {SummaryGroup, SummaryItem} from '../kaokang-inventory/kaokang-inventory.model';
import {ThaiSpellCheckerService} from '../../services/thai-spell-checker.service';
import {wordConfigs} from '../../config/remark-item-multiplier.config';

@Component({
  selector: 'app-kaokang-inventory-summary',
  imports: [NgClass],
  templateUrl: './kaokang-inventory-summary.html',
  standalone: true,
  styleUrl: './kaokang-inventory-summary.scss'
})
export class KaokangInventorySummary implements OnInit {
  private supabase: SupabaseClient;

  summaryGroups: SummaryGroup[] = [];
  allStockItems: SummaryItem[] = [];
  allStockGroups: Map<string, SummaryItem[]> = new Map();
  allStockGroupList: string[] = [];
  selectedStockGroupIndex: number = 0;
  isLoading = true;
  displayDate: string = '';
  lastUpdatedText: string = 'ยังไม่เคยอัปเดต';
  latestRemark: string = '';
  processedRemark: string = '';
  correctedRemark: string = '';
  enableTypoCorrection: boolean = true;
  activeTab: 'needs-order' | 'all-stock' = 'needs-order';
  Math = Math;

  constructor(public spellChecker: ThaiSpellCheckerService) {
    this.supabase = createClient(
      'https://batxjgnynvnykoingkij.supabase.co',
      'sb_publishable_UtUV7xSJeNC44WeOprBeDg_8tDWXA1w'
    );
  }

  async ngOnInit() {
    await this.loadSummary();
  }

  async loadSummary() {
    this.isLoading = true;

    // Get the latest date with data in T_INVENTORY
    const { data: latestDateData, error: latestError } = await this.supabase
      .from('T_INVENTORY')
      .select('CREATED_DATETIME')
      .order('CREATED_DATETIME', { ascending: false })
      .limit(1);

    if (latestError) throw latestError;

    let latestDate = this.getDate(); // default to today
    if (latestDateData && latestDateData.length > 0) {
      const latestDatetime = new Date(latestDateData[0].CREATED_DATETIME);
      const day = String(latestDatetime.getDate()).padStart(2, '0');
      const month = String(latestDatetime.getMonth() + 1).padStart(2, '0');
      const year = latestDatetime.getFullYear();
      latestDate = `${year}-${month}-${day}`;
      this.displayDate = this.getThaiDateForDate(latestDatetime);
    } else {
      this.displayDate = this.getThaiDate();
    }

    const [{data: masterData, error: masterError}, {data: tranData, error: tranError}, {data: remarkData, error: remarkError}] = await Promise.all([
      this.supabase.from('M_INVENTORY').select('ID, ITEM_DESC, DEFAULT_AMOUNT, UNIT, VENDOR_GROUP, ITEM_GROUP').eq('IS_ACTIVE_YN', 'Y').order('ITEM_GROUP').order('SEQ'),
      this.supabase.from('T_INVENTORY')
        .select('M_INVENTORY_ID, AMOUNT')
        .gte('CREATED_DATETIME', `${latestDate}T00:00:00`)
        .lte('CREATED_DATETIME', `${latestDate}T23:59:59`),
      this.supabase.from('T_INVENTORY_REMARK')
        .select('REMARK')
        .order('CREATED_DATETIME', { ascending: false })
        .limit(1)
    ]);

    if (masterError) throw masterError;
    if (tranError) throw tranError;
    if (remarkError) throw remarkError;

    // Set the latest remark
    this.latestRemark = remarkData && remarkData.length > 0 ? remarkData[0].REMARK : '';

    // Process the remark to extract text after emojis (excluding red triangle)
    this.processedRemark = this.processRemark(this.latestRemark);

    // Apply Thai typo correction if enabled
    this.correctedRemark = this.enableTypoCorrection ?
      this.spellChecker.correctThaiTypos(this.processedRemark) :
      this.processedRemark;

    const belowThreshold: SummaryItem[] = (masterData ?? [])
      .flatMap(master => {
        const tran = tranData?.find(t => t.M_INVENTORY_ID === master.ID);
        const baseItem = {
          master_id: master.ID,
          item_desc: master.ITEM_DESC,
          default_amount: master.DEFAULT_AMOUNT,
          actual_amount: tran?.AMOUNT ?? 0,
          unit: master.UNIT,
          vendor_group: master.VENDOR_GROUP
        };

        // Check if this is "ข้าวสาร" and needs to be split
        if (master.ITEM_DESC === "ข้าวสาร" && baseItem.actual_amount < baseItem.default_amount) {
          const calculatedAmount = (baseItem.default_amount - baseItem.actual_amount) * 5;

          console.log(`แยกรายการ ข้าวสาร: จำนวนที่ต้องสั่ง = ${calculatedAmount} หน่วย: ${baseItem.unit}`);

          return [
            {
              ...baseItem,
              item_desc: "ข้าวสารตรามังกรทอง",
              default_amount: calculatedAmount,
              actual_amount: 0
            },
            {
              ...baseItem,
              item_desc: "ข้าวสารตราบัวชมพู",
              default_amount: calculatedAmount,
              actual_amount: 0
            }
          ];
        }

        return baseItem;
      })
      .filter(item => item.actual_amount < item.default_amount);

    // Store all stock items for the "all stock" tab
    this.allStockItems = (masterData ?? [])
      .map(master => {
        const tran = tranData?.find(t => t.M_INVENTORY_ID === master.ID);
        return {
          master_id: master.ID,
          item_desc: master.ITEM_DESC,
          default_amount: master.DEFAULT_AMOUNT,
          actual_amount: tran?.AMOUNT ?? 0,
          unit: master.UNIT,
          vendor_group: master.VENDOR_GROUP
        };
      })
      .sort((a, b) => {
        if (a.vendor_group !== b.vendor_group) {
          if (a.vendor_group === '-') return 1;
          if (b.vendor_group === '-') return -1;
          return a.vendor_group.localeCompare(b.vendor_group, 'th');
        }
        return a.item_desc.localeCompare(b.item_desc, 'th');
      });

    // Organize all stock items by vendor group for tabs
    this.allStockGroups.clear();
    for (const item of this.allStockItems) {
      if (!this.allStockGroups.has(item.vendor_group)) {
        this.allStockGroups.set(item.vendor_group, []);
      }
      this.allStockGroups.get(item.vendor_group)!.push(item);
    }

    // Create sorted list of group names
    this.allStockGroupList = Array.from(this.allStockGroups.keys())
      .sort((a, b) => {
        if (a === '-') return 1;
        if (b === '-') return -1;
        return a.localeCompare(b, 'th');
      });

    this.selectedStockGroupIndex = 0;

    const groupMap = new Map<string, SummaryItem[]>();
    const itemDescMap = new Map<string, SummaryItem>();

    for (const item of belowThreshold) {
      const key = `${item.vendor_group}_${item.item_desc}`;
      const difference = item.default_amount - item.actual_amount;

      if (itemDescMap.has(key)) {
        const existingItem = itemDescMap.get(key)!;
        const existingDifference = existingItem.default_amount - existingItem.actual_amount;

        // Sum the differences and update the default_amount
        const newDifference = existingDifference + difference;
        existingItem.default_amount = existingItem.actual_amount + newDifference;
      } else {
        itemDescMap.set(key, {...item});
      }
    }

    for (const item of itemDescMap.values()) {
      if (!groupMap.has(item.vendor_group)) {
        groupMap.set(item.vendor_group, []);
      }
      groupMap.get(item.vendor_group)!.push(item);
    }

    this.summaryGroups = Array.from(groupMap.entries())
      .map(([vendor_group, items]) => ({
        vendor_group,
        items
      }))
      .sort((a, b) => {
        // Put '-' at the end
        if (a.vendor_group === '-') return 1;
        if (b.vendor_group === '-') return -1;
        return a.vendor_group.localeCompare(b.vendor_group, 'th');
      });

    this.lastUpdatedText = this.getThaiDateTimeForDate(new Date());
    this.isLoading = false;
  }

  get hasItems(): boolean {
    return this.summaryGroups.length > 0;
  }

  switchTab(tab: 'needs-order' | 'all-stock') {
    this.activeTab = tab;
  }

  processRemark(remark: string): string {
    if (!remark) return '';

    let result = remark;

    // Remove patterns like "🔺**** (ตัวเลข) บาท"
    result = result.replace(/🔺[^🔺]*\d+\s*บาท/g, '');

    // Remove patterns like "เมนูวัน****"
    result = result.replace(/เมนูวัน.*/g, '');

    // Remove red triangle emoji
    result = result.replace(/🔺/g, '');

    // Remove cross mark emoji
    result = result.replace(/❌/g, '');

    // Remove text within parentheses
    result = result.replace(/\([^)]*\)/g, '');

    // Remove the words "หมด" and "ขาด"
    result = result.replace(/หมด|ขาด/g, '');

    // Replace "น่องไก่ทอด" with "ปีกบนไก่"
    // result = result.replace(/น่องไก่ทอด/g, 'ปีกบนไก่');

    // Replace "ลูกชิ้นหมู" with "ลูกชิ้นหมูผสมไก่"
    result = result.replace(/ลูกชิ้นหมู/g, 'ลูกชิ้นหมูผสมไก่');

    // Count and replace words based on configuration
    const wordCounts = new Map<string, number>();
    const words = result.split(/\s+/);

    // Map synonyms to canonical patterns (use 'หมูสับ' for both 'หมูบด' and 'หมูสับ')
    const synonymMap = new Map<string, string>([
      ['หมูบด', 'หมูสับ']
    ]);

    for (const word of words) {
      const cleanWord = word.trim();
      const canonical = synonymMap.get(cleanWord) ?? cleanWord;
      for (const config of wordConfigs) {
        if (canonical === config.pattern) {
          wordCounts.set(config.pattern, (wordCounts.get(config.pattern) || 0) + 1);
          break;
        }
      }
    }

    // Replace words with calculated format, but emit each calculated item only once
    const originalWords = result.split(/\s+/);
    const emittedCalculated = new Set<string>();
    result = originalWords.map(word => {
      const cleanWord = word.trim();
      const canonical = synonymMap.get(cleanWord) ?? cleanWord;
      for (const config of wordConfigs) {
        if (canonical === config.pattern) {
          // If we've already emitted the calculated value for this pattern,
          // skip additional occurrences to avoid duplicates when count > 1
          if (emittedCalculated.has(config.pattern)) {
            return '';
          }
          emittedCalculated.add(config.pattern);

          const count = wordCounts.get(config.pattern) || 0;
          const total = (count * config.multiplier).toFixed(1).replace(/\.0$/, '');
          return `${config.pattern} = ${total} ${config.unit}`;
        }
      }
      // Return the canonical form for synonyms (e.g. 'หมูบด' -> 'หมูสับ')
      return canonical;
    }).filter(w => w.length > 0).join(' ');

    // Split by lines and filter out empty lines
    const lines = result.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Sort lines to group "หมู" items together, then "ไก่" items, then others
    const sortedLines = lines.sort((a, b) => {
      const aHasPork = a.includes('หมู') && !a.includes('ลูกชิ้นหมู');
      const bHasPork = b.includes('หมู') && !b.includes('ลูกชิ้นหมู');
      const aHasChicken = a.includes('ไก่');
      const bHasChicken = b.includes('ไก่');

      // Priority: pork lines first, then chicken lines, then others
      if (aHasPork && !bHasPork) return -1;
      if (!aHasPork && bHasPork) return 1;

      if (aHasChicken && !bHasChicken) return -1;
      if (!aHasChicken && bHasChicken) return 1;

      // If both have same keyword or neither has, keep original order
      return 0;
    });

    // Split each line into separate items while keeping calculated amounts with their items
    const splitLines: string[] = [];
    for (const line of sortedLines) {
      // Create a single regex pattern that matches all units from config
      const allUnits = wordConfigs.map(config => config.unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const withCalculation = line.match(new RegExp(`\\S+\\s*=\\s*\\d+\\.?\\d*\\s*(${allUnits})`, 'g')) || [];

      // Extract item names from calculations
      withCalculation.map(calc => calc.split('=')[0].trim());

      // Remove calculated items from the line to get standalone items
      let remainingLine = line;
      for (const calc of withCalculation) {
        remainingLine = remainingLine.replace(calc, '');
      }

      // Get standalone items (trim and filter empty)
      const standaloneItems = remainingLine.split(/\s+/)
        .map(item => item.trim())
        .filter(item => item.length > 0);

      // Add all items to splitLines
      standaloneItems.forEach(item => splitLines.push(item));
      withCalculation.forEach(calc => splitLines.push(calc.trim()));
    }

    return splitLines.join('\n');
  }

  getDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
  }

  getThaiDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const yearBE = today.getFullYear() + 543;
    return `${day}/${month}/${yearBE}`;
  }

  getThaiDateForDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearBE = date.getFullYear() + 543;
    return `${day}/${month}/${yearBE}`;
  }

  getThaiDateTimeForDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearBE = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${yearBE} เวลา ${hours}:${minutes} น.`;
  }

  toggleTypoCorrection() {
    this.enableTypoCorrection = !this.enableTypoCorrection;
    this.correctedRemark = this.enableTypoCorrection ?
      this.spellChecker.correctThaiTypos(this.processedRemark) :
      this.processedRemark;
  }

  get displayCorrectedRemark(): string {
    return this.enableTypoCorrection ? this.correctedRemark : this.processedRemark;
  }
}

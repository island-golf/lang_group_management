import {Component, OnInit} from '@angular/core';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {SummaryGroup, SummaryItem} from '../kaokang-inventory/kaokang-inventory.model';
import {ThaiSpellCheckerService} from '../../services/thai-spell-checker.service';

@Component({
  selector: 'app-kaokang-inventory-summary',
  imports: [],
  templateUrl: './kaokang-inventory-summary.html',
  styleUrl: './kaokang-inventory-summary.scss'
})
export class KaokangInventorySummary implements OnInit {
  private supabase: SupabaseClient;

  summaryGroups: SummaryGroup[] = [];
  isLoading = true;
  displayDate: string = '';
  lastUpdatedText: string = 'ยังไม่เคยอัปเดต';
  latestRemark: string = '';
  processedRemark: string = '';
  correctedRemark: string = '';
  enableTypoCorrection: boolean = true;

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
      .filter(item => item.actual_amount < item.default_amount);

    const groupMap = new Map<string, SummaryItem[]>();
    for (const item of belowThreshold) {
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

  processRemark(remark: string): string {
    if (!remark) return '';

    // Split by emojis and filter out content after red triangle emoji (🔺)
    const parts = remark.split(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);

    let result = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part) {
        // Check if this part comes after a red triangle emoji
        const beforeEmoji = remark.substring(0, remark.indexOf(part));
        const lastCharIndex = beforeEmoji.length - 1;
        const lastChar = beforeEmoji[lastCharIndex];

        // Red triangle emoji is \u{1F534}
        if (lastChar === '\u{1F534}') {
          // Skip this part as it comes after red triangle
          continue;
        }

        // Skip parts containing "บาท"
        if (part.includes('บาท')) {
          continue;
        }

        // Remove only the words "หมด" and "ขาด" from the text part
        const cleanedPart = part.replace(/หมด|ขาด/g, '').trim();

        // Skip if the part becomes empty after removing these words
        if (!cleanedPart) {
          continue;
        }

        // Add line break before new text part (except first part)
        if (result) {
          result += '\n';
        }

        result += cleanedPart;
      }
    }

    return result.trim();
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

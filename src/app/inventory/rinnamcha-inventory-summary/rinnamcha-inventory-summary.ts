import {Component, OnInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef} from '@angular/core';
import {NgClass} from '@angular/common';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {SummaryGroup, SummaryItem} from '../rinnamcha-inventory/rinnamcha-inventory.model';
import {ThaiSpellCheckerService} from '../../services/thai-spell-checker.service';

@Component({
  selector: 'app-rinnamcha-inventory-summary',
  imports: [NgClass],
  templateUrl: './rinnamcha-inventory-summary.html',
  standalone: true,
  styleUrl: './rinnamcha-inventory-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RinnamchaInventorySummary implements OnInit, OnDestroy {
  private supabase: SupabaseClient;
  private readonly RICE_ITEM_NAME = 'ข้าวสาร';
  private readonly RICE_MULTIPLIER = 5;

  summaryGroups: SummaryGroup[] = [];
  allStockItems: SummaryItem[] = [];
  allStockGroups: Map<string, SummaryItem[]> = new Map();
  allStockGroupList: string[] = [];
  selectedStockGroupIndex: number = 0;
  isLoading = true;
  displayDate: string = '';
  lastUpdatedText: string = 'ยังไม่เคยอัปเดต';
  latestRemark: string = '';
  activeTab: 'needs-order' | 'all-stock' | 'out-of-stock' = 'out-of-stock';


  constructor(
    public spellChecker: ThaiSpellCheckerService,
    private cdr: ChangeDetectorRef
  ) {
    this.supabase = createClient(
      'https://batxjgnynvnykoingkij.supabase.co',
      'sb_publishable_UtUV7xSJeNC44WeOprBeDg_8tDWXA1w'
    );
  }

  async ngOnInit() {
    await this.loadSummary();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  async loadSummary() {
    this.isLoading = true;

    // Get the latest date with data in T_INVENTORY_RINNAMCHA
    const { data: latestDateData, error: latestError } = await this.supabase
      .from('T_INVENTORY_RINNAMCHA')
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
      this.supabase.from('M_INVENTORY_RINNAMCHA').select('ID, ITEM_DESC, DEFAULT_AMOUNT, UNIT, VENDOR_GROUP, ITEM_GROUP').eq('IS_ACTIVE_YN', 'Y').order('ITEM_GROUP').order('SEQ'),
      this.supabase.from('T_INVENTORY_RINNAMCHA')
        .select('ID, AMOUNT')
        .gte('CREATED_DATETIME', `${latestDate}T00:00:00`)
        .lte('CREATED_DATETIME', `${latestDate}T23:59:59`),
      this.supabase.from('T_INVENTORY_RINNAMCHA_REMARK')
        .select('REMARK')
        .order('CREATED_DATETIME', { ascending: false })
        .limit(1)
    ]);

    if (masterError) throw masterError;
    if (tranError) throw tranError;
    if (remarkError) throw remarkError;

    // Set the latest remark
    this.latestRemark = remarkData && remarkData.length > 0 ? remarkData[0].REMARK : '';


    const belowThreshold: SummaryItem[] = (masterData ?? [])
      .flatMap(master => {
        const tran = tranData?.find(t => t.ID === master.ID);
        const baseItem: SummaryItem = {
          master_id: master.ID,
          item_desc: master.ITEM_DESC,
          default_amount: master.DEFAULT_AMOUNT,
          actual_amount: tran?.AMOUNT ?? 0,
          unit: master.UNIT,
          vendor_group: master.VENDOR_GROUP
        };

        // Check if this is "ข้าวสาร" and needs to be split
        if (master.ITEM_DESC === this.RICE_ITEM_NAME && baseItem.actual_amount < baseItem.default_amount) {
          const calculatedAmount = (baseItem.default_amount - baseItem.actual_amount) * this.RICE_MULTIPLIER;

          const riceItem1: SummaryItem = {
            ...baseItem,
            item_desc: "ข้าวสารตรามังกรทอง",
            default_amount: calculatedAmount,
            actual_amount: 0
          };
          this.calculateStockMetrics(riceItem1);

          const riceItem2: SummaryItem = {
            ...baseItem,
            item_desc: "ข้าวสารตราบัวชมพู",
            default_amount: calculatedAmount,
            actual_amount: 0
          };
          this.calculateStockMetrics(riceItem2);

          return [riceItem1, riceItem2];
        }

        return baseItem;
      })
      .filter(item => item.actual_amount < item.default_amount);

    // Store all stock items for the "all stock" tab - WITH pre-calculated metrics
    this.allStockItems = (masterData ?? [])
      .map(master => {
        const tran = tranData?.find(t => t.ID === master.ID);
        const item: SummaryItem = {
          master_id: master.ID,
          item_desc: master.ITEM_DESC,
          default_amount: master.DEFAULT_AMOUNT,
          actual_amount: tran?.AMOUNT ?? 0,
          unit: master.UNIT,
          vendor_group: master.VENDOR_GROUP
        };
        // Pre-calculate metrics for rendering
        this.calculateStockMetrics(item);
        return item;
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

    // Manually trigger change detection for OnPush strategy
    this.cdr.markForCheck();
  }

  get hasItems(): boolean {
    return this.summaryGroups.length > 0;
  }

  /** Are there any items with actual_amount === 0 across all summary groups */
  get hasOutOfStockItems(): boolean {
    return this.summaryGroups.some(g => !!g.items && g.items.some(i => i.actual_amount === 0));
  }

  /** Groups containing only out-of-stock items (actual_amount === 0) */
  get outOfStockGroups(): { vendor_group: string; items: SummaryItem[] }[] {
    return this.summaryGroups
      .map(g => ({ vendor_group: g.vendor_group, items: (g.items || []).filter(i => i.actual_amount === 0) }))
      .filter(g => g.items.length > 0);
  }

  switchTab(tab: 'needs-order' | 'all-stock' | 'out-of-stock') {
    this.activeTab = tab;
  }

  private calculateStockMetrics(item: SummaryItem): void {
    const percentage = item.default_amount > 0
      ? Math.round((item.actual_amount / item.default_amount) * 100)
      : 0;

    item.stockPercentage = Math.min(percentage, 100);

    if (item.actual_amount === 0) {
      item.stockStatus = 'empty';
      item.stockColor = 'text-red-400';
    } else if (item.actual_amount < item.default_amount) {
      item.stockStatus = 'low';
      item.stockColor = 'text-yellow-400';
    } else {
      item.stockStatus = 'normal';
      item.stockColor = 'text-green-400';
    }
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
}


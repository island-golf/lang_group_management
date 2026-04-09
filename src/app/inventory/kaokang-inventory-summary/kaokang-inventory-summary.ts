import {Component, OnInit} from '@angular/core';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {SummaryGroup, SummaryItem} from '../kaokang-inventory/kaokang-inventory.model';

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

  constructor() {
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

    const [{data: masterData, error: masterError}, {data: tranData, error: tranError}] = await Promise.all([
      this.supabase.from('M_INVENTORY').select('ID, ITEM_DESC, DEFAULT_AMOUNT, UNIT, VENDOR_GROUP, ITEM_GROUP').eq('IS_ACTIVE_YN', 'Y').order('ITEM_GROUP').order('SEQ'),
      this.supabase.from('T_INVENTORY')
        .select('M_INVENTORY_ID, AMOUNT')
        .gte('CREATED_DATETIME', `${latestDate}T00:00:00`)
        .lte('CREATED_DATETIME', `${latestDate}T23:59:59`)
    ]);

    if (masterError) throw masterError;
    if (tranError) throw tranError;

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

    this.summaryGroups = Array.from(groupMap.entries()).map(([vendor_group, items]) => ({
      vendor_group,
      items
    }));

    this.lastUpdatedText = this.getThaiDateTimeForDate(new Date());
    this.isLoading = false;
  }

  get hasItems(): boolean {
    return this.summaryGroups.length > 0;
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

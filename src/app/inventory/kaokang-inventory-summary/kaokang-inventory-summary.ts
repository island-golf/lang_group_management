import {Component, OnInit} from '@angular/core';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {MasterInventory, SummaryGroup, SummaryItem} from '../kaokang-inventory/kaokang-inventory.model';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-kaokang-inventory-summary',
  imports: [NgClass],
  templateUrl: './kaokang-inventory-summary.html',
  styleUrl: './kaokang-inventory-summary.scss'
})
export class KaokangInventorySummary implements OnInit {
  private supabase: SupabaseClient;

  summaryGroups: SummaryGroup[] = [];
  isLoading = true;

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

    const today = this.getDate();

    const [{data: masterData, error: masterError}, {data: tranData, error: tranError}] = await Promise.all([
      this.supabase.from<'M_INVENTORY', MasterInventory>('M_INVENTORY').select('ID, ITEM_DESC, DEFAULT_AMOUNT, UNIT, VENDOR_GROUP'),
      this.supabase.from('T_INVENTORY')
        .select('M_INVENTORY_ID, AMOUNT')
        .gte('CREATED_DATETIME', `${today}T00:00:00`)
        .lte('CREATED_DATETIME', `${today}T23:59:59`)
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
}

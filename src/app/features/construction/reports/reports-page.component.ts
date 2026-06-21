import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { DateFilterComponent } from '../../../shared/components/date-filter/date-filter.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading/loading-spinner.component';
import { ReportRepository } from '../repositories/construction.repository';
import { ProjectContextService } from '../../../core/services/project-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [DecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="loading()" />
    <div class="space-y-6">
      <div class="page-header"><h2 class="page-title">{{ 'REPORTS.TITLE' | t }}</h2></div>
      <app-date-filter (filterChange)="load($event)" />

      <div class="auth-tabs max-w-3xl">
        @for (tab of tabs; track tab.id) {
          <button type="button" class="auth-tab text-xs" [class.auth-tab--active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
            {{ tab.labelKey | t }}
          </button>
        }
      </div>

      @if (report()) {
        @if (activeTab() === 'inventory') {
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>{{ 'INVENTORY.WAREHOUSES' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th><th>{{ 'INVENTORY.DESCRIPTION' | t }}</th><th>{{ 'INVENTORY.CATEGORY' | t }}</th><th>{{ 'INVENTORY.QUANTITY_IN' | t }}</th><th>{{ 'INVENTORY.REMAINING' | t }}</th><th>{{ 'INVENTORY.INVOICE_TOTAL' | t }}</th></tr></thead>
              <tbody>
                @for (row of report()!.lists.inventory; track $index) {
                  <tr>
                    <td>{{ row.warehouse }}</td><td>{{ row.entry_date | date:'shortDate' }}</td><td>{{ row.item_name }}</td><td>{{ row.category }}</td>
                    <td>{{ row.quantity_in }} m²</td><td>{{ row.remaining }} m²</td><td>{{ row.line_total | number:'1.2-2' }}</td>
                  </tr>
                } @empty { <tr><td colspan="7" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
              </tbody>
            </table>
          </div>
        }

        @if (activeTab() === 'assets') {
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>{{ 'COMMON.NAME' | t }}</th><th>{{ 'ASSETS.VALUE' | t }}</th><th>{{ 'ASSETS.TOTAL_DEPRECIATION' | t }}</th><th>{{ 'ASSETS.NET_ASSET' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th></tr></thead>
              <tbody>
                @for (a of report()!.lists.assets; track a.id) {
                  <tr>
                    <td>{{ a.name_ar }}</td><td>{{ a.value | number:'1.2-2' }}</td><td>{{ a.totalDepreciation | number:'1.2-2' }}</td>
                    <td>{{ a.netAsset | number:'1.2-2' }}</td><td>{{ a.transaction_date | date:'shortDate' }}</td>
                  </tr>
                } @empty { <tr><td colspan="5" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
              </tbody>
            </table>
          </div>
        }

        @if (activeTab() === 'banks') {
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>#</th><th>{{ 'BANKS.CLIENT_NAME' | t }}</th><th>{{ 'BANKS.BANK_NAME' | t }}</th><th>{{ 'BANKS.DEPOSIT' | t }}</th><th>{{ 'BANKS.WITHDRAWAL' | t }}</th><th>{{ 'BANKS.EXPENSE' | t }}</th><th>{{ 'BANKS.INTEREST' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th><th>{{ 'BANKS.BALANCE' | t }}</th></tr></thead>
              <tbody>
                @for (b of report()!.lists.banks; track $index) {
                  <tr>
                    <td>{{ b.seq }}</td><td>{{ b.client_name || '—' }}</td><td>{{ b.bank_name }}</td>
                    <td>{{ b.deposit | number:'1.2-2' }}</td><td>{{ b.withdrawal | number:'1.2-2' }}</td>
                    <td>{{ b.expense_amount | number:'1.2-2' }}</td><td>{{ b.interest_amount | number:'1.2-2' }}</td>
                    <td>{{ b.transaction_date | date:'shortDate' }}</td><td>{{ b.balance | number:'1.2-2' }}</td>
                  </tr>
                } @empty { <tr><td colspan="9" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
              </tbody>
            </table>
          </div>
        }

        @if (activeTab() === 'income') {
          <div class="table-wrap">
            <div class="p-4 border-b"><h3 class="font-semibold">{{ 'REPORTS.INCOME_STATEMENT' | t }}</h3></div>
            <table class="data-table">
              <tbody>
                <tr><td>{{ 'REPORTS.TOTAL_REVENUE' | t }}</td><td class="font-medium">{{ is().revenue | number:'1.2-2' }}</td></tr>
                <tr><td class="ps-6">({{ 'REPORTS.COST_OF_REVENUE' | t }})</td><td>({{ is().costOfRevenue | number:'1.2-2' }})</td></tr>
                <tr><td class="ps-6">({{ 'REPORTS.LATHE_DEPRECIATION' | t }})</td><td>({{ is().latheDepreciation | number:'1.2-2' }})</td></tr>
                <tr class="font-bold text-emerald-700 bg-emerald-50"><td>{{ 'DASHBOARD.GROSS_PROFIT' | t }}</td><td>{{ is().grossProfit | number:'1.2-2' }}</td></tr>
                <tr><td class="ps-6">({{ 'EXPENSES.TITLE' | t }})</td><td>({{ is().generalExpenses | number:'1.2-2' }})</td></tr>
                <tr><td class="ps-6">({{ 'REPORTS.BANK_INTEREST_COMMISSIONS' | t }})</td><td>({{ is().bankInterestCommissions | number:'1.2-2' }})</td></tr>
                <tr><td class="ps-6">({{ 'REPORTS.FURNITURE_DEPRECIATION' | t }})</td><td>({{ is().furnitureDepreciation | number:'1.2-2' }})</td></tr>
                <tr class="font-bold text-teal-700 bg-teal-50"><td>{{ 'REPORTS.NET_BEFORE_TAX' | t }}</td><td>{{ is().netProfitBeforeTax | number:'1.2-2' }}</td></tr>
                <tr><td class="ps-6">({{ 'REPORTS.TAX' | t }})</td><td>({{ is().tax | number:'1.2-2' }})</td></tr>
                <tr class="font-bold text-slate-800 bg-slate-100"><td>{{ 'REPORTS.NET_AFTER_TAX' | t }}</td><td>{{ is().netProfitAfterTax | number:'1.2-2' }}</td></tr>
              </tbody>
            </table>
          </div>
        }

        @if (activeTab() === 'balance') {
          <div class="table-wrap">
            <div class="p-4 border-b"><h3 class="font-semibold">{{ 'REPORTS.BALANCE_SHEET' | t }}</h3></div>
            <table class="data-table">
              <tbody>
                <tr class="bg-emerald-50 font-semibold"><td colspan="2">{{ 'REPORTS.ASSETS' | t }}</td></tr>
                <tr><td class="ps-6">{{ 'BANKS.TITLE' | t }}</td><td>{{ report()!.balanceSheet.assets.banks | number:'1.2-2' }}</td></tr>
                <tr><td class="ps-6">{{ 'INVENTORY.TITLE' | t }}</td><td>{{ report()!.balanceSheet.assets.inventory | number:'1.2-2' }}</td></tr>
                <tr><td class="ps-6">{{ 'NAV.ASSETS' | t }}</td><td>{{ report()!.balanceSheet.assets.fixedAssets | number:'1.2-2' }}</td></tr>
                <tr class="font-bold"><td>{{ 'COMMON.TOTAL' | t }}</td><td>{{ report()!.balanceSheet.assets.total | number:'1.2-2' }}</td></tr>
                <tr class="bg-rose-50 font-semibold"><td colspan="2">{{ 'REPORTS.LIABILITIES' | t }}</td></tr>
                <tr><td class="ps-6">{{ 'SUPPLIERS.TITLE' | t }}</td><td>{{ report()!.balanceSheet.liabilities.suppliersDue | number:'1.2-2' }}</td></tr>
                <tr class="font-bold"><td>{{ 'COMMON.TOTAL' | t }}</td><td>{{ report()!.balanceSheet.liabilities.total | number:'1.2-2' }}</td></tr>
                <tr class="bg-teal-50 font-semibold"><td>{{ 'REPORTS.EQUITY' | t }}</td><td>{{ report()!.balanceSheet.equity.netProfit | number:'1.2-2' }}</td></tr>
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class ReportsPageComponent implements OnInit {
  private reportRepo = inject(ReportRepository);
  private projectContext = inject(ProjectContextService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  report = signal<any>(null);
  loading = signal(false);
  activeTab = signal('income');
  tabs = [
    { id: 'inventory', labelKey: 'REPORTS.INVENTORY_LIST' },
    { id: 'assets', labelKey: 'REPORTS.ASSETS_LIST' },
    { id: 'banks', labelKey: 'REPORTS.BANKS_LIST' },
    { id: 'income', labelKey: 'REPORTS.INCOME_STATEMENT' },
    { id: 'balance', labelKey: 'REPORTS.BALANCE_SHEET' },
  ];
  private filters: { fromDate?: string; toDate?: string } = {};

  is() {
    return this.report()?.incomeStatement ?? {};
  }

  ngOnInit(): void { this.load({}); }

  async load(filters: { fromDate?: string; toDate?: string }): Promise<void> {
    const projectId = await this.projectContext.ensureReady();
    if (!projectId) return;
    this.filters = filters;
    this.loading.set(true);
    try {
      const params: Record<string, string> = {};
      if (filters.fromDate) params['fromDate'] = filters.fromDate;
      if (filters.toDate) params['toDate'] = filters.toDate;
      const res = await this.reportRepo.getFullReport(projectId, params);
      this.report.set(res.data);
    } catch {
      this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR'));
      this.report.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}

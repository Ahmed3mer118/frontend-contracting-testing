import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { SmartDecimalPipe } from '../../../shared/pipes/smart-decimal.pipe';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { DateFilterComponent, DateFilterValue } from '../../../shared/components/date-filter/date-filter.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading/loading-spinner.component';
import { BarChartComponent } from '../../../shared/components/charts/bar-chart.component';
import { ReportRepository } from '../repositories/construction.repository';
import { ProjectContextService } from '../../../core/services/project-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateService } from '../../../core/services/translate.service';

interface DashboardTotals {
  grossProfit: number;
  netProfit: number;
  totalSales: number;
  totalPurchases: number;
  totalContractors: number;
  totalSuppliers: number;
  totalExpenses: number;
  totalDepreciation: number;
  totalBankExpenses: number;
}

interface ProjectSummary {
  project: { id: string; name_ar: string; name_en: string; code: string };
  grossProfit: number;
  netProfit: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SmartDecimalPipe, TranslatePipe, DateFilterComponent, LoadingSpinnerComponent, BarChartComponent],
  template: `
    <app-loading-spinner [show]="initialLoading()" [message]="'APP.LOADING' | t" />
    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ 'DASHBOARD.TITLE' | t }}</h2>
      </div>
      <app-date-filter (filterChange)="load($event)" />

      @if (data()) {
        <div>
          <h3 class="text-lg font-semibold text-slate-700 mb-3">{{ 'DASHBOARD.COMPANY_STATS' | t }}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="stat-card border-s-emerald-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.GROSS_PROFIT' | t }}</p>
              <p class="text-2xl font-bold" [class.text-emerald-600]="data()!.totals.grossProfit >= 0" [class.text-rose-600]="data()!.totals.grossProfit < 0">
                {{ data()!.totals.grossProfit | smartDecimal }} EGP
              </p>
            </div>
            <div class="stat-card border-s-teal-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.NET_PROFIT' | t }}</p>
              <p class="text-2xl font-bold" [class.text-teal-600]="data()!.totals.netProfit >= 0" [class.text-rose-600]="data()!.totals.netProfit < 0">
                {{ data()!.totals.netProfit | smartDecimal }} EGP
              </p>
            </div>
            <div class="stat-card border-s-blue-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.TOTAL_SALES' | t }}</p>
              <p class="text-2xl font-bold text-blue-600">{{ data()!.totals.totalSales | smartDecimal }} EGP</p>
            </div>
            <div class="stat-card border-s-amber-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.TOTAL_PURCHASES' | t }}</p>
              <p class="text-2xl font-bold text-amber-600">{{ data()!.totals.totalPurchases | smartDecimal }} EGP</p>
            </div>
            <div class="stat-card border-s-violet-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.TOTAL_CONTRACTORS' | t }}</p>
              <p class="text-2xl font-bold text-violet-600">{{ data()!.totals.totalContractors | smartDecimal }} EGP</p>
            </div>
            <div class="stat-card border-s-indigo-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.TOTAL_SUPPLIERS' | t }}</p>
              <p class="text-2xl font-bold text-indigo-600">{{ data()!.totals.totalSuppliers | smartDecimal }} EGP</p>
            </div>
            <div class="stat-card border-s-orange-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.TOTAL_EXPENSES' | t }}</p>
              <p class="text-2xl font-bold text-orange-600">{{ data()!.totals.totalExpenses | smartDecimal }} EGP</p>
            </div>
            <div class="stat-card border-s-rose-500">
              <p class="text-sm text-slate-500">{{ 'DASHBOARD.TOTAL_BANK_EXPENSES' | t }}</p>
              <p class="text-2xl font-bold text-rose-600">{{ data()!.totals.totalBankExpenses | smartDecimal }} EGP</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="pbi-chart-card">
            <div class="pbi-chart-card-header"><h3 class="pbi-chart-card-title">{{ 'DASHBOARD.SALES_VS_PURCHASES' | t }}</h3></div>
            <div class="pbi-chart-card-body"><app-bar-chart layout="column" [items]="salesVsPurchasesChart()" /></div>
          </div>
          <div class="pbi-chart-card">
            <div class="pbi-chart-card-header"><h3 class="pbi-chart-card-title">{{ 'DASHBOARD.COSTS_BREAKDOWN' | t }}</h3></div>
            <div class="pbi-chart-card-body"><app-bar-chart layout="donut" [items]="costsChart()" /></div>
          </div>
          <div class="pbi-chart-card">
            <div class="pbi-chart-card-header"><h3 class="pbi-chart-card-title">{{ 'DASHBOARD.PROFIT_OVERVIEW' | t }}</h3></div>
            <div class="pbi-chart-card-body"><app-bar-chart layout="column" [items]="profitChart()" /></div>
          </div>
          <div class="pbi-chart-card">
            <div class="pbi-chart-card-header"><h3 class="pbi-chart-card-title">{{ 'DASHBOARD.DEDUCTIONS_BREAKDOWN' | t }}</h3></div>
            <div class="pbi-chart-card-body"><app-bar-chart layout="bar" [items]="deductionsChart()" /></div>
          </div>
        </div>

        @if (projects().length) {
          <div class="pbi-chart-card">
            <div class="pbi-chart-card-header"><h3 class="pbi-chart-card-title">{{ 'DASHBOARD.PROJECTS_PROFIT' | t }}</h3></div>
            <div class="pbi-chart-card-body"><app-bar-chart layout="column" [items]="projectsChart()" /></div>
          </div>
        }
      }
      @else {
        <div class="card text-center text-slate-400 py-12">{{ 'COMMON.NO_DATA' | t }}</div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private reportRepo = inject(ReportRepository);
  private projectContext = inject(ProjectContextService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  initialLoading = signal(false);
  private loadedOnce = false;
  data = signal<{ totals: DashboardTotals; projectCount: number } | null>(null);
  projects = signal<ProjectSummary[]>([]);
  private dateFilters: { fromDate?: string; toDate?: string } = {};

  salesVsPurchasesChart = computed(() => {
    const d = this.data()?.totals;
    if (!d) return [];
    return [
      { label: this.translate.instant('DASHBOARD.TOTAL_SALES'), value: d.totalSales },
      { label: this.translate.instant('DASHBOARD.TOTAL_PURCHASES'), value: d.totalPurchases },
    ];
  });

  costsChart = computed(() => {
    const d = this.data()?.totals;
    if (!d) return [];
    return [
      { label: this.translate.instant('DASHBOARD.TOTAL_PURCHASES'), value: d.totalPurchases },
      { label: this.translate.instant('DASHBOARD.TOTAL_CONTRACTORS'), value: d.totalContractors },
      { label: this.translate.instant('DASHBOARD.TOTAL_SUPPLIERS'), value: d.totalSuppliers },
    ];
  });

  profitChart = computed(() => {
    const d = this.data()?.totals;
    if (!d) return [];
    return [
      { label: this.translate.instant('DASHBOARD.GROSS_PROFIT'), value: Math.abs(d.grossProfit) },
      { label: this.translate.instant('DASHBOARD.NET_PROFIT'), value: Math.abs(d.netProfit) },
    ];
  });

  deductionsChart = computed(() => {
    const d = this.data()?.totals;
    if (!d) return [];
    return [
      { label: this.translate.instant('DASHBOARD.TOTAL_EXPENSES'), value: d.totalExpenses },
      { label: this.translate.instant('DASHBOARD.TOTAL_BANK_EXPENSES'), value: d.totalBankExpenses },
      { label: this.translate.instant('DASHBOARD.TOTAL_DEPRECIATION'), value: d.totalDepreciation },
    ];
  });

  projectsChart = computed(() => {
    return this.projects().map((p) => ({
      label: this.translate.currentLang() === 'ar' ? p.project.name_ar : (p.project.name_en || p.project.name_ar),
      value: p.netProfit,
    }));
  });

  ngOnInit(): void { this.load({ reload: true }); }

  async load(filters: DateFilterValue): Promise<void> {
    const showSpinner = !this.loadedOnce || filters.reload !== false;
    if (showSpinner) this.initialLoading.set(true);
    this.dateFilters = { fromDate: filters.fromDate, toDate: filters.toDate };
    try {
      const projectId = await this.projectContext.ensureReady();
      if (!projectId) return;
      const params: Record<string, string> = {};
      if (filters.fromDate) params['fromDate'] = filters.fromDate;
      if (filters.toDate) params['toDate'] = filters.toDate;
      const res = await this.reportRepo.getDashboard(params);
      const raw = res.data as {
        projectCount: number;
        totals: DashboardTotals;
        projects: ProjectSummary[];
      };
      this.data.set({ totals: raw.totals, projectCount: raw.projectCount });
      this.projects.set(raw.projects ?? []);
      this.loadedOnce = true;
    } catch {
      this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR'));
      this.data.set(null);
      this.projects.set([]);
    } finally {
      if (showSpinner) this.initialLoading.set(false);
    }
  }
}

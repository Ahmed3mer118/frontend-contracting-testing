import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { DateFilterComponent } from '../../../../shared/components/date-filter/date-filter.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading/loading-spinner.component';
import { DailyJournalRepository } from '../../repositories/construction.repository';
import { ProjectContextService } from '../../../../core/services/project-context.service';
import { TranslateService } from '../../../../core/services/translate.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Asset, TotalsMap } from '../../models/construction.models';

@Component({
  selector: 'app-assets-page',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, ModalComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="loading()" />
    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ 'ASSETS.TITLE' | t }}</h2>
        <button type="button" class="btn-primary" (click)="openAdd()">{{ 'COMMON.ADD' | t }}</button>
      </div>
      <app-date-filter (filterChange)="load($event)" />
      @if (totals()) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="stat-card border-s-blue-500"><p class="text-sm text-slate-500">{{ 'ASSETS.TOTAL_VALUE' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalValue'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-amber-500"><p class="text-sm text-slate-500">{{ 'ASSETS.TOTAL_DEPRECIATION' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalDepreciation'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-emerald-500"><p class="text-sm text-slate-500">{{ 'ASSETS.TOTAL_NET' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalNet'] | number:'1.2-2' }}</p></div>
        </div>
      }
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>{{ 'COMMON.NAME' | t }}</th><th>{{ 'ASSETS.ASSET_VALUE' | t }}</th><th>{{ 'ASSETS.DEPRECIATION' | t }}</th><th>{{ 'ASSETS.NET_ASSET' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th><th>{{ 'COMMON.ACTIONS' | t }}</th></tr></thead>
          <tbody>
            @for (a of items(); track a.id) {
              <tr>
                <td>{{ translate.currentLang() === 'ar' ? a.name_ar : a.name_en }}</td>
                <td>{{ a.value | number:'1.2-2' }}</td>
                <td>{{ a.totalDepreciation | number:'1.2-2' }}</td>
                <td class="font-medium text-emerald-600">{{ a.netAsset | number:'1.2-2' }}</td>
                <td>{{ a.transaction_date | date:'shortDate' }}</td>
                <td><button type="button" class="btn-secondary !py-1 !px-2" (click)="openEdit(a)">{{ 'COMMON.EDIT' | t }}</button></td>
              </tr>
            } @empty { <tr><td colspan="6" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
    <app-modal [open]="modalOpen()" [title]="editId ? ('ASSETS.EDIT_TITLE'|t) : ('ASSETS.ADD_TITLE'|t)" (close)="closeModal()">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="form-field"><label class="form-label">{{ 'ASSETS.ASSET_NAME' | t }}</label><input class="input" [(ngModel)]="form.name" /></div>
        <div class="form-field"><label class="form-label">{{ 'ASSETS.ASSET_VALUE' | t }}</label><input class="input" type="number" [(ngModel)]="form.value" /></div>
        <div class="form-field"><label class="form-label">{{ 'ASSETS.DEPRECIATION_RATE' | t }}</label><input class="input" type="number" step="0.01" [(ngModel)]="form.depreciation_rate" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.DATE' | t }}</label><input class="input" type="date" [(ngModel)]="form.transaction_date" /></div>
      </div>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="closeModal()">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="save()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>
  `,
})
export class AssetsPageComponent implements OnInit {
  private repo = inject(DailyJournalRepository);
  private projectContext = inject(ProjectContextService);
  translate = inject(TranslateService);
  private toast = inject(ToastService);
  items = signal<Asset[]>([]);
  totals = signal<TotalsMap | null>(null);
  loading = signal(false);
  modalOpen = signal(false);
  editId: string | null = null;
  form = { name: '', value: 0, depreciation_rate: 0.1, transaction_date: new Date().toISOString().slice(0, 10) };
  private filters: Record<string, string> = {};

  ngOnInit(): void { this.load({}); }

  async load(filters: { fromDate?: string; toDate?: string }): Promise<void> {
    const pid = await this.projectContext.ensureReady(); if (!pid) return;
    this.loading.set(true);
    this.filters = {}; if (filters.fromDate) this.filters['fromDate'] = filters.fromDate; if (filters.toDate) this.filters['toDate'] = filters.toDate;
    try {
      const res = await this.repo.list<Asset>(pid, 'assets', this.filters);
      this.items.set(res.data); this.totals.set(res.totals ?? null);
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { this.loading.set(false); }
  }

  openAdd(): void { this.editId = null; this.form = { name: '', value: 0, depreciation_rate: 0.1, transaction_date: new Date().toISOString().slice(0, 10) }; this.modalOpen.set(true); }
  openEdit(a: Asset): void {
    this.editId = a.id;
    this.form = { name: a.name_ar, value: a.value, depreciation_rate: (a as Asset & { depreciation_rate?: number }).depreciation_rate || 0.1, transaction_date: String(a.transaction_date).slice(0, 10) };
    this.modalOpen.set(true);
  }
  closeModal(): void { this.modalOpen.set(false); }

  async save(): Promise<void> {
    const pid = await this.projectContext.ensureReady(); if (!pid) return;
    const body = { name_ar: this.form.name, name_en: this.form.name, value: this.form.value, depreciation_rate: this.form.depreciation_rate, transaction_date: this.form.transaction_date };
    this.loading.set(true);
    try {
      if (this.editId) await this.repo.update(pid, 'assets', this.editId, body);
      else await this.repo.create(pid, 'assets', body);
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.closeModal(); await this.load(this.filters);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
    finally { this.loading.set(false); }
  }
}

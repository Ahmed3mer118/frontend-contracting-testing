import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { matchesSearch } from '../../../../shared/utils/filter.util';
import { DateFilterComponent, DateFilterValue } from '../../../../shared/components/date-filter/date-filter.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading/loading-spinner.component';
import { DailyJournalRepository } from '../../repositories/construction.repository';
import { ProjectContextService } from '../../../../core/services/project-context.service';
import { FormDraftService } from '../../../../core/services/form-draft.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslateService } from '../../../../core/services/translate.service';
import { Purchase, TotalsMap } from '../../models/construction.models';

@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, ModalComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="initialLoading()" />
    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ 'PURCHASES.TITLE' | t }}</h2>
        <button type="button" class="btn-primary" (click)="openAdd()">{{ 'COMMON.ADD' | t }}</button>
      </div>
      <app-date-filter [showSearch]="true" searchPlaceholderKey="PURCHASES.SEARCH_PLACEHOLDER" (filterChange)="load($event)" />
      @if (totals()) {
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="stat-card border-s-emerald-500"><p class="text-sm text-slate-500">{{ 'PURCHASES.TOTAL_CASH' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalCash'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-amber-500"><p class="text-sm text-slate-500">{{ 'PURCHASES.TOTAL_CREDIT' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalCredit'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-teal-500"><p class="text-sm text-slate-500">{{ 'COMMON.TOTAL' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalPurchases'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-rose-500"><p class="text-sm text-slate-500">{{ 'COMMON.DUE' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalDue'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-blue-500"><p class="text-sm text-slate-500">{{ 'PURCHASES.ACQUISITION_COST' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalAcquisitionCost'] | number:'1.2-2' }}</p></div>
        </div>
      }
      @for (p of items(); track p.id) {
        <div class="table-wrap">
          <div class="p-4 flex flex-wrap justify-between gap-2 border-b border-slate-100">
            <div>
              <p class="font-bold text-slate-800">{{ p.supplier_name }}</p>
              <p class="text-sm text-slate-500">{{ p.invoice_number || '—' }}</p>
              <p class="text-sm text-slate-600 mt-1">{{ 'SALES.INVOICE_DATE' | t }}: {{ p.invoice_date | date:'shortDate' }}</p>
              <p class="acquisition-cost">
                <span>{{ 'PURCHASES.ACQUISITION_COST' | t }}</span>
                <span>{{ acquisitionCost(p) | number:'1.2-2' }} EGP</span>
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span class="text-lg font-bold text-teal-700">{{ 'PURCHASES.INVOICE_TOTAL' | t }}: {{ invoiceTotal(p) | number:'1.2-2' }} EGP</span>
              <span class="badge">{{ p.payment_type === 'cash' ? ('COMMON.CASH' | t) : ('COMMON.CREDIT' | t) }}</span>
              <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEdit(p)">{{ 'COMMON.EDIT' | t }}</button>
            </div>
          </div>
          <table class="data-table">
            <thead><tr><th>{{ 'PURCHASES.ROW_NUMBER' | t }}</th><th>{{ 'PURCHASES.ITEM' | t }}</th><th>{{ 'COMMON.VALUE' | t }}</th><th>{{ 'COMMON.TOTAL' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th></tr></thead>
            <tbody>
              @for (item of p.items; track item.id) {
                <tr>
                  <td>{{ item.rowNumber ?? (item.sort_order ?? 0) + 1 }}</td>
                  <td>{{ item.item_name_ar }}</td>
                  <td>{{ item.amount | number:'1.2-2' }}</td>
                  <td class="font-medium">{{ item.runningTotal | number:'1.2-2' }}</td>
                  <td>{{ p.invoice_date | date:'shortDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @empty {
        <div class="card text-center text-slate-400 py-12">{{ 'COMMON.NO_DATA' | t }}</div>
      }
    </div>

    <app-modal [open]="modalOpen()" [title]="editId ? ('PURCHASES.EDIT_TITLE' | t) : ('PURCHASES.ADD_TITLE' | t)" (close)="closeModal()">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="form-field"><label class="form-label">{{ 'PURCHASES.SUPPLIER_NAME' | t }}</label><input class="input" [(ngModel)]="form.supplier_name" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'SALES.INVOICE_NUMBER' | t }}</label><input class="input" [(ngModel)]="form.invoice_number" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'SALES.INVOICE_DATE' | t }}</label><input class="input" type="date" [(ngModel)]="form.invoice_date" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'PURCHASES.PURCHASE_TYPE' | t }}</label>
          <select class="input" [(ngModel)]="form.payment_type" (ngModelChange)="saveDraft()"><option value="cash">{{ 'COMMON.CASH' | t }}</option><option value="credit">{{ 'COMMON.CREDIT' | t }}</option></select>
        </div>
        <div class="form-field"><label class="form-label">{{ 'PURCHASES.ACQUISITION_COST' | t }}</label><input class="input" type="number" [(ngModel)]="form.acquisition_cost" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.DUE' | t }}</label><input class="input" type="number" [(ngModel)]="form.due_amount" (ngModelChange)="saveDraft()" /></div>
      </div>
      <p class="form-label mt-4">{{ 'PURCHASES.ITEMS_TABLE' | t }}</p>
      <table class="data-table mb-2">
        <thead><tr><th>{{ 'PURCHASES.ROW_NUMBER' | t }}</th><th>{{ 'PURCHASES.ITEM' | t }}</th><th>{{ 'COMMON.VALUE' | t }}</th><th>{{ 'COMMON.TOTAL' | t }}</th><th></th></tr></thead>
        <tbody>
          @for (item of form.items; track $index; let i = $index) {
            <tr>
              <td>{{ i + 1 }}</td>
              <td><input class="input" [(ngModel)]="item.item_name_ar" (ngModelChange)="saveDraft()" /></td>
              <td><input class="input" type="number" [(ngModel)]="item.amount" (ngModelChange)="recalc()" /></td>
              <td class="font-medium">{{ runningTotal(i) | number:'1.2-2' }}</td>
              <td><button type="button" class="btn-danger !py-1 !px-2" (click)="removeItem(i)" [disabled]="form.items.length === 1">×</button></td>
            </tr>
          }
        </tbody>
      </table>
      <button type="button" class="btn-secondary" (click)="addItem()">+ {{ 'COMMON.ADD' | t }}</button>
      <p class="text-end font-bold text-teal-700 mt-3">{{ 'PURCHASES.INVOICE_TOTAL' | t }}: {{ formInvoiceTotal() | number:'1.2-2' }} EGP</p>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="closeModal()">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="save()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>
  `,
})
export class PurchasesPageComponent implements OnInit {
  private repo = inject(DailyJournalRepository);
  private projectContext = inject(ProjectContextService);
  private draft = inject(FormDraftService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  allItems = signal<Purchase[]>([]);
  items = signal<Purchase[]>([]);
  totals = signal<TotalsMap | null>(null);
  initialLoading = signal(false);
  loading = signal(false);
  modalOpen = signal(false);
  editId: string | null = null;
  form = this.emptyForm();
  private dateFilters: Record<string, string> = {};
  private searchQuery = '';

  emptyForm() {
    return {
      supplier_name: '', invoice_number: '', invoice_date: new Date().toISOString().slice(0, 10),
      payment_type: 'cash', acquisition_cost: 0, due_amount: 0,
      items: [{ item_name_ar: '', item_name_en: '', amount: 0 }],
    };
  }

  ngOnInit(): void { this.load({ reload: true }); }

  acquisitionCost(p: Purchase): number {
    return Number((p as Purchase & { acquisition_cost?: number }).acquisition_cost ?? 0);
  }

  invoiceTotal(p: Purchase): number {
    const itemsSum = p.items.reduce((s, i) => s + Number(i.amount || 0), 0);
    return itemsSum + this.acquisitionCost(p);
  }

  formInvoiceTotal(): number {
    const itemsSum = this.form.items.reduce((s, i) => s + Number(i.amount || 0), 0);
    return itemsSum + Number(this.form.acquisition_cost || 0);
  }

  applyLocalFilter(): void {
    const filtered = this.allItems().filter((p) =>
      matchesSearch(p.supplier_name, this.searchQuery) ||
      matchesSearch(p.invoice_number || '', this.searchQuery)
    );
    this.items.set(filtered);
  }

  runningTotal(index: number): number {
    return this.form.items.slice(0, index + 1).reduce((s, i) => s + Number(i.amount || 0), 0);
  }

  recalc(): void { if (!this.editId) this.saveDraft(); }
  addItem(): void { this.form.items.push({ item_name_ar: '', item_name_en: '', amount: 0 }); this.saveDraft(); }
  removeItem(i: number): void { if (this.form.items.length > 1) { this.form.items.splice(i, 1); this.saveDraft(); } }
  saveDraft(): void { if (!this.editId) this.draft.save('purchases_add', this.form); }

  async load(filters: DateFilterValue): Promise<void> {
    if (filters.reload === false) {
      this.searchQuery = filters.search ?? '';
      this.applyLocalFilter();
      return;
    }
    const projectId = await this.projectContext.ensureReady(); if (!projectId) return;
    this.initialLoading.set(true);
    this.dateFilters = {};
    if (filters.fromDate) this.dateFilters['fromDate'] = filters.fromDate;
    if (filters.toDate) this.dateFilters['toDate'] = filters.toDate;
    try {
      const res = await this.repo.list<Purchase>(projectId, 'purchases', this.dateFilters);
      this.allItems.set(res.data);
      this.totals.set(res.totals ?? null);
      this.searchQuery = filters.search ?? '';
      this.applyLocalFilter();
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { this.initialLoading.set(false); }
  }

  openAdd(): void {
    this.editId = null;
    this.form = this.draft.load('purchases_add') ?? this.emptyForm();
    this.modalOpen.set(true);
  }

  openEdit(p: Purchase): void {
    this.editId = p.id;
    this.form = {
      supplier_name: p.supplier_name, invoice_number: p.invoice_number || '', invoice_date: String(p.invoice_date).slice(0, 10),
      payment_type: p.payment_type, acquisition_cost: this.acquisitionCost(p), due_amount: Number((p as Purchase & { due_amount?: number }).due_amount ?? 0),
      items: p.items.map((i) => ({ item_name_ar: i.item_name_ar, item_name_en: i.item_name_en || i.item_name_ar, amount: i.amount })),
    };
    this.modalOpen.set(true);
  }

  closeModal(): void { this.modalOpen.set(false); }

  async save(): Promise<void> {
    const projectId = await this.projectContext.ensureReady();
    if (!projectId) return;
    const body = { ...this.form, items: this.form.items.map((i) => ({ ...i, item_name_en: i.item_name_ar })) };
    this.loading.set(true);
    try {
      if (this.editId) await this.repo.update(projectId, 'purchases', this.editId, body);
      else await this.repo.create(projectId, 'purchases', body);
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      if (!this.editId) this.draft.clear('purchases_add');
      this.closeModal();
      await this.load({ ...this.dateFilters, reload: true });
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
    finally { this.loading.set(false); }
  }
}

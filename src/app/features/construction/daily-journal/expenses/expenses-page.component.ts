import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { SmartDecimalPipe } from '../../../../shared/pipes/smart-decimal.pipe';
import { DateFilterComponent, DateFilterValue } from '../../../../shared/components/date-filter/date-filter.component';
import { matchesSearch } from '../../../../shared/utils/filter.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading/loading-spinner.component';
import { DailyJournalRepository } from '../../repositories/construction.repository';
import { ProjectContextService } from '../../../../core/services/project-context.service';
import { FormDraftService } from '../../../../core/services/form-draft.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslateService } from '../../../../core/services/translate.service';
import { Expense, TotalsMap } from '../../models/construction.models';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [FormsModule, SmartDecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, ModalComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="initialLoading()" />
    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ 'EXPENSES.TITLE' | t }}</h2>
        <button type="button" class="btn-primary" (click)="openAdd()">{{ 'COMMON.ADD' | t }}</button>
      </div>
      <app-date-filter [showSearch]="true" searchPlaceholderKey="EXPENSES.SEARCH_PLACEHOLDER" (filterChange)="load($event)" />
      @if (totals()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="stat-card border-s-emerald-500"><p class="text-sm text-slate-500">{{ 'EXPENSES.TOTAL_EXPENSES' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalPayments'] | smartDecimal }}</p></div>
          <div class="stat-card border-s-teal-500"><p class="text-sm text-slate-500">{{ 'EXPENSES.RECORDS' | t }}</p><p class="text-xl font-bold">{{ totals()!['count'] }}</p></div>
        </div>
      }
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>{{ 'EXPENSES.DESCRIPTION' | t }}</th><th>{{ 'COMMON.PAYMENT' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th><th>{{ 'COMMON.ACTIONS' | t }}</th></tr></thead>
          <tbody>
            @for (e of items(); track e.id) {
              <tr>
                <td>{{ translate.currentLang() === 'ar' ? e.description_ar : (e.description_en || e.description_ar) }}</td>
                <td>{{ e.payment_amount | smartDecimal }}</td>
                <td>{{ e.transaction_date | date:'shortDate' }}</td>
                <td class="flex gap-1">
                  <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEdit(e)">{{ 'COMMON.EDIT' | t }}</button>
                  <button type="button" class="btn-danger !py-1 !px-2" (click)="deleteExpense(e.id)">{{ 'COMMON.DELETE' | t }}</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="4" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
          </tbody>
        </table>
      </div>
    </div>

    <app-modal [open]="modalOpen()" [title]="editId ? ('EXPENSES.EDIT_TITLE' | t) : ('EXPENSES.ADD_TITLE' | t)" (close)="closeModal()">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="form-field"><label class="form-label">{{ 'EXPENSES.DESCRIPTION' | t }}</label><input class="input" [(ngModel)]="form.description_ar" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'EXPENSES.DESCRIPTION_EN' | t }}</label><input class="input" [(ngModel)]="form.description_en" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.PAYMENT' | t }}</label><input class="input" type="number" step="0.01" [(ngModel)]="form.payment_amount" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.DATE' | t }}</label><input class="input" type="date" [(ngModel)]="form.transaction_date" (ngModelChange)="saveDraft()" /></div>
      </div>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="clearForm()">{{ 'COMMON.CLEAR' | t }}</button>
        <button type="button" class="btn-secondary" (click)="closeModal()">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="save()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>
  `,
})
export class ExpensesPageComponent implements OnInit {
  private repo = inject(DailyJournalRepository);
  private projectContext = inject(ProjectContextService);
  private draft = inject(FormDraftService);
  private toast = inject(ToastService);
  translate = inject(TranslateService);

  allItems = signal<Expense[]>([]);
  items = signal<Expense[]>([]);
  totals = signal<TotalsMap | null>(null);
  initialLoading = signal(false);
  loading = signal(false);
  modalOpen = signal(false);
  editId: string | null = null;
  form = this.emptyForm();
  private dateFilters: Record<string, string> = {};
  private searchQuery = '';

  emptyForm() {
    return { description_ar: '', description_en: '', payment_amount: 0, due_amount: 0, transaction_date: new Date().toISOString().slice(0, 10) };
  }

  ngOnInit(): void { this.load({ reload: true }); }

  applyLocalFilter(): void {
    this.items.set(this.allItems().filter((e) =>
      matchesSearch(e.description_ar, this.searchQuery) ||
      matchesSearch(e.description_en || '', this.searchQuery)
    ));
  }

  async load(f: DateFilterValue): Promise<void> {
    if (f.reload === false) {
      this.searchQuery = f.search ?? '';
      this.applyLocalFilter();
      return;
    }
    const pid = await this.projectContext.ensureReady();
    if (!pid) return;
    this.initialLoading.set(true);
    this.dateFilters = {};
    if (f.fromDate) this.dateFilters['fromDate'] = f.fromDate;
    if (f.toDate) this.dateFilters['toDate'] = f.toDate;
    try {
      const res = await this.repo.list(pid, 'expenses', this.dateFilters);
      this.allItems.set(res.data as Expense[]);
      this.totals.set(res.totals ?? null);
      this.searchQuery = f.search ?? '';
      this.applyLocalFilter();
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { this.initialLoading.set(false); }
  }

  openAdd(): void {
    this.editId = null;
    this.form = this.draft.load('expenses_add') ?? this.emptyForm();
    if (!this.form.description_en && this.form.description_ar) this.form.description_en = this.form.description_ar;
    this.modalOpen.set(true);
  }

  openEdit(e: Expense): void {
    this.editId = e.id;
    this.form = {
      description_ar: e.description_ar,
      description_en: e.description_en || e.description_ar,
      payment_amount: Number(e.payment_amount),
      due_amount: 0,
      transaction_date: String(e.transaction_date).slice(0, 10),
    };
    this.modalOpen.set(true);
  }

  closeModal(): void { this.modalOpen.set(false); this.editId = null; }

  saveDraft(): void {
    if (!this.editId && !this.form.description_en && this.form.description_ar) {
      this.form.description_en = this.form.description_ar;
    }
    if (!this.editId) this.draft.save('expenses_add', this.form);
  }

  clearForm(): void { this.form = this.emptyForm(); this.draft.clear('expenses_add'); }

  async save(): Promise<void> {
    const pid = await this.projectContext.ensureReady();
    if (!pid) return;
    if (!this.form.description_ar.trim()) {
      this.toast.error(this.translate.instant('MESSAGES.DESCRIPTION_REQUIRED'));
      return;
    }
    const body = { ...this.form, due_amount: 0, description_en: this.form.description_en || this.form.description_ar };
    this.loading.set(true);
    try {
      if (this.editId) await this.repo.update(pid, 'expenses', this.editId, body);
      else await this.repo.create(pid, 'expenses', body);
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.draft.clear('expenses_add');
      this.closeModal();
      await this.load({ ...this.dateFilters, reload: true });
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
    finally { this.loading.set(false); }
  }

  async deleteExpense(id: string): Promise<void> {
    const pid = await this.projectContext.ensureReady();
    if (!pid) return;
    if (!confirm(this.translate.instant('MESSAGES.DELETE_CONFIRM'))) return;
    try {
      await this.repo.delete(pid, 'expenses', id);
      this.toast.success(this.translate.instant('MESSAGES.DELETE_SUCCESS'));
      await this.load({ ...this.dateFilters, reload: true });
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }
}

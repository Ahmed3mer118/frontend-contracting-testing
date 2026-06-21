import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

import { DateFilterComponent, DateFilterValue } from '../../../../shared/components/date-filter/date-filter.component';
import { matchesSearch } from '../../../../shared/utils/filter.util';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';

import { LoadingSpinnerComponent } from '../../../../shared/components/loading/loading-spinner.component';

import { DailyJournalRepository } from '../../repositories/construction.repository';

import { ProjectContextService } from '../../../../core/services/project-context.service';

import { FormDraftService } from '../../../../core/services/form-draft.service';

import { ToastService } from '../../../../core/services/toast.service';

import { TranslateService } from '../../../../core/services/translate.service';

import { Sale, TotalsMap } from '../../models/construction.models';



@Component({

  selector: 'app-sales-page',

  standalone: true,

  imports: [FormsModule, DecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, ModalComponent, LoadingSpinnerComponent],

  template: `

    <app-loading-spinner [show]="initialLoading()" />

    <div class="space-y-6">

      <div class="page-header">

        <h2 class="page-title">{{ 'SALES.TITLE' | t }}</h2>

        <button type="button" class="btn-primary" (click)="openAdd()">{{ 'COMMON.ADD' | t }}</button>

      </div>

      <app-date-filter [showSearch]="true" searchPlaceholderKey="SALES.SEARCH_PLACEHOLDER" (filterChange)="load($event)" />

      @if (totals()) {

        <div class="grid grid-cols-3 gap-4">

          <div class="stat-card border-s-emerald-500"><p class="text-sm text-slate-500">{{ 'SALES.TOTAL_CASH' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalCash'] | number:'1.2-2' }}</p></div>

          <div class="stat-card border-s-amber-500"><p class="text-sm text-slate-500">{{ 'SALES.TOTAL_CREDIT' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalCredit'] | number:'1.2-2' }}</p></div>

          <div class="stat-card border-s-teal-500"><p class="text-sm text-slate-500">{{ 'COMMON.TOTAL' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalSales'] | number:'1.2-2' }}</p></div>

        </div>

      }

      <div class="table-wrap">

        <table class="data-table">

          <thead><tr><th>{{ 'SALES.CLIENT_NAME' | t }}</th><th>{{ 'SALES.INVOICE_NUMBER' | t }}</th><th>{{ 'COMMON.VALUE' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th><th>{{ 'COMMON.ACTIONS' | t }}</th></tr></thead>

          <tbody>

            @for (s of items(); track s.id) {

              <tr>

                <td>{{ s.client_name }}</td><td>{{ s.invoice_number }}</td>

                <td>{{ s.amount | number:'1.2-2' }}</td><td>{{ s.invoice_date | date:'shortDate' }}</td>

                <td><button type="button" class="btn-secondary !py-1 !px-2" (click)="openEdit(s)">{{ 'COMMON.EDIT' | t }}</button></td>

              </tr>

            } @empty { <tr><td colspan="5" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }

          </tbody>

        </table>

      </div>

    </div>



    <app-modal [open]="modalOpen()" [title]="editId ? ('SALES.EDIT_TITLE' | t) : ('SALES.ADD_TITLE' | t)" (close)="closeModal()">

      <div class="grid md:grid-cols-2 gap-4">

        <div class="form-field"><label class="form-label">{{ 'SALES.CLIENT_NAME' | t }}</label><input class="input" [(ngModel)]="form.client_name" (ngModelChange)="saveDraft()" /></div>

        <div class="form-field"><label class="form-label">{{ 'SALES.INVOICE_NUMBER' | t }}</label><input class="input" [(ngModel)]="form.invoice_number" (ngModelChange)="saveDraft()" /></div>

        <div class="form-field"><label class="form-label">{{ 'SALES.INVOICE_DATE' | t }}</label><input class="input" type="date" [(ngModel)]="form.invoice_date" (ngModelChange)="saveDraft()" /></div>

        <div class="form-field"><label class="form-label">{{ 'SALES.INVOICE_AMOUNT' | t }}</label><input class="input" type="number" [(ngModel)]="form.amount" (ngModelChange)="saveDraft()" /></div>

        <div class="form-field"><label class="form-label">{{ 'PURCHASES.PURCHASE_TYPE' | t }}</label>

          <select class="input" [(ngModel)]="form.payment_type" (ngModelChange)="saveDraft()"><option value="cash">{{ 'COMMON.CASH' | t }}</option><option value="credit">{{ 'COMMON.CREDIT' | t }}</option></select>

        </div>

      </div>

      <div modal-footer class="flex gap-2 justify-end w-full">

        <button type="button" class="btn-secondary" (click)="clearForm()">{{ 'COMMON.CLEAR' | t }}</button>

        <button type="button" class="btn-secondary" (click)="closeModal()">{{ 'COMMON.CANCEL' | t }}</button>

        <button type="button" class="btn-primary" (click)="save()">{{ 'COMMON.SAVE' | t }}</button>

      </div>

    </app-modal>

  `,

})

export class SalesPageComponent implements OnInit {
  private repo = inject(DailyJournalRepository);
  private projectContext = inject(ProjectContextService);
  private draft = inject(FormDraftService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);



  allItems = signal<Sale[]>([]);
  items = signal<Sale[]>([]);
  totals = signal<TotalsMap | null>(null);
  initialLoading = signal(false);
  loading = signal(false);
  modalOpen = signal(false);
  editId: string | null = null;
  form = this.emptyForm();
  private dateFilters: Record<string, string> = {};
  private searchQuery = '';



  emptyForm() {

    return { client_name: '', invoice_number: '', invoice_date: new Date().toISOString().slice(0, 10), amount: 0, payment_type: 'cash' };

  }



  ngOnInit(): void { this.load({ reload: true }); }

  applyLocalFilter(): void {
    this.items.set(this.allItems().filter((s) =>
      matchesSearch(s.client_name, this.searchQuery) ||
      matchesSearch(s.invoice_number || '', this.searchQuery)
    ));
  }

  async load(f: DateFilterValue): Promise<void> {
    if (f.reload === false) {
      this.searchQuery = f.search ?? '';
      this.applyLocalFilter();
      return;
    }
    const pid = await this.projectContext.ensureReady(); if (!pid) return;
    this.initialLoading.set(true);
    this.dateFilters = {};
    if (f.fromDate) this.dateFilters['fromDate'] = f.fromDate;
    if (f.toDate) this.dateFilters['toDate'] = f.toDate;
    try {
      const res = await this.repo.list(pid, 'sales', this.dateFilters);
      this.allItems.set(res.data as Sale[]);
      this.totals.set(res.totals ?? null);
      this.searchQuery = f.search ?? '';
      this.applyLocalFilter();
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { this.initialLoading.set(false); }
  }



  draftKey(): string { return this.editId ? `sales_edit_${this.editId}` : 'sales_add'; }

  openAdd(): void {

    this.editId = null;

    this.form = this.draft.load(this.draftKey()) ?? this.emptyForm();

    this.modalOpen.set(true);

  }



  openEdit(s: Sale): void {

    this.editId = s.id;

    this.form = {

      client_name: s.client_name, invoice_number: s.invoice_number || '',

      invoice_date: String(s.invoice_date).slice(0, 10), amount: s.amount, payment_type: s.payment_type,

    };

    this.modalOpen.set(true);

  }



  closeModal(): void { this.modalOpen.set(false); }

  saveDraft(): void { if (!this.editId) this.draft.save(this.draftKey(), this.form); }

  clearForm(): void { this.form = this.emptyForm(); this.draft.clear(this.draftKey()); }



  async save(): Promise<void> {

    const pid = await this.projectContext.ensureReady();
    if (!pid) { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); return; }

    this.loading.set(true);

    try {

      if (this.editId) {

        await this.repo.update(pid, 'sales', this.editId, this.form);

      } else {

        await this.repo.create(pid, 'sales', this.form);

      }

      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));

      this.draft.clear(this.draftKey());

      this.closeModal();

      await this.load({ ...this.dateFilters, reload: true });

    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }

    finally { this.loading.set(false); }

  }

}


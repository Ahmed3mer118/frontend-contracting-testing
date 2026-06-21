import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { DateFilterComponent, DateFilterValue } from '../../../../shared/components/date-filter/date-filter.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading/loading-spinner.component';
import { DailyJournalRepository } from '../../repositories/construction.repository';
import { ProjectContextService } from '../../../../core/services/project-context.service';
import { FormDraftService } from '../../../../core/services/form-draft.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslateService } from '../../../../core/services/translate.service';
import { matchesSearch } from '../../../../shared/utils/filter.util';
import { PartyPayment, TotalsMap } from '../../models/construction.models';

interface PartyEntity { id: string; name_ar: string; name_en: string; }

@Component({
  selector: 'app-party-payments-page',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, ModalComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="initialLoading()" />
    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ titleKey | t }}</h2>
        <button type="button" class="btn-primary" (click)="openModal()">{{ 'COMMON.ADD' | t }}</button>
      </div>
      <app-date-filter [showSearch]="true" searchPlaceholderKey="PARTIES.SEARCH_PLACEHOLDER" (filterChange)="load($event)" />
      @if (totals()) {
        <div class="grid grid-cols-3 gap-4">
          <div class="stat-card border-s-teal-500"><p class="text-sm text-slate-500">{{ 'COMMON.PAYMENT' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalPayments'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-amber-500"><p class="text-sm text-slate-500">{{ 'COMMON.DUE' | t }}</p><p class="text-xl font-bold">{{ totals()!['totalDue'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-emerald-500"><p class="text-sm text-slate-500">{{ 'COMMON.TOTAL' | t }}</p><p class="text-xl font-bold">{{ totals()!['total'] | number:'1.2-2' }}</p></div>
        </div>
      }
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>{{ 'COMMON.NAME' | t }}</th><th>{{ 'COMMON.PAYMENT' | t }}</th><th>{{ 'COMMON.DUE' | t }}</th><th>{{ 'COMMON.DATE' | t }}</th><th>{{ 'COMMON.ACTIONS' | t }}</th></tr></thead>
          <tbody>
            @for (row of items(); track row.id) {
              <tr>
                <td>{{ entityName(row) }}</td>
                <td>{{ row.payment_amount | number:'1.2-2' }}</td>
                <td>{{ row.due_amount | number:'1.2-2' }}</td>
                <td>{{ row.transaction_date | date:'shortDate' }}</td>
                <td class="flex gap-1">
                  <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEdit(row)">{{ 'COMMON.EDIT' | t }}</button>
                  <button type="button" class="btn-danger !py-1 !px-2" (click)="deletePayment(row.id)">{{ 'COMMON.DELETE' | t }}</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="5" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
    <app-modal [open]="modalOpen()" [title]="editPaymentId ? ('PARTIES.EDIT_PAYMENT' | t) : (titleKey | t)" (close)="modalOpen.set(false)">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="form-field md:col-span-2">
          <label class="form-label">{{ 'PARTIES.SELECT_OR_NEW' | t }}</label>
          @if (!editPaymentId) {
            <select class="input mb-2" [(ngModel)]="form.entityId" (ngModelChange)="onEntitySelect()">
              <option value="">{{ 'PARTIES.NEW_ENTITY' | t }}</option>
              @for (e of entities(); track e.id) {
                <option [value]="e.id">{{ entityLabel(e) }}</option>
              }
            </select>
          }
          @if (!form.entityId && !editPaymentId) {
            <input class="input" [(ngModel)]="form.entityName" (ngModelChange)="saveDraft()" [placeholder]="'COMMON.NAME' | t" />
          }
          @if (editPaymentId) {
            <input class="input" [ngModel]="form.entityName" disabled />
          }
        </div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.PAYMENT' | t }}</label><input class="input" type="number" [(ngModel)]="form.payment_amount" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.DUE' | t }}</label><input class="input" type="number" [(ngModel)]="form.due_amount" (ngModelChange)="saveDraft()" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.DATE' | t }}</label><input class="input" type="date" [(ngModel)]="form.transaction_date" (ngModelChange)="saveDraft()" /></div>
      </div>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="clearForm()">{{ 'COMMON.CLEAR' | t }}</button>
        <button type="button" class="btn-secondary" (click)="modalOpen.set(false)">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="save()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>
  `,
})
export class PartyPaymentsPageComponent implements OnInit {
  @Input({ required: true }) segment!: string;
  @Input({ required: true }) titleKey!: string;

  private repo = inject(DailyJournalRepository);
  private projectContext = inject(ProjectContextService);
  private draft = inject(FormDraftService);
  private toast = inject(ToastService);
  translate = inject(TranslateService);

  allItems = signal<PartyPayment[]>([]);
  items = signal<PartyPayment[]>([]);
  entities = signal<PartyEntity[]>([]);
  totals = signal<TotalsMap | null>(null);
  initialLoading = signal(false);
  modalOpen = signal(false);
  editPaymentId: string | null = null;
  searchQuery = '';
  form = { entityId: '', entityName: '', payment_amount: 0, due_amount: 0, transaction_date: new Date().toISOString().slice(0, 10) };
  private dateFilters: Record<string, string> = {};

  ngOnInit(): void { this.load({ reload: true }); }

  entityFk(): string {
    return this.segment === 'contractors' ? 'contractor_id' : this.segment === 'suppliers' ? 'supplier_id' : 'customer_id';
  }

  entityName(row: PartyPayment): string {
    return this.translate.currentLang() === 'ar' ? row.name_ar : (row.name_en || row.name_ar);
  }

  entityLabel(e: PartyEntity): string {
    return this.translate.currentLang() === 'ar' ? e.name_ar : (e.name_en || e.name_ar);
  }

  buildEntities(rows: PartyPayment[]): PartyEntity[] {
    const fk = this.entityFk();
    const map = new Map<string, PartyEntity>();
    for (const row of rows as Array<PartyPayment & Record<string, string>>) {
      const id = row[fk];
      if (id && !map.has(id)) map.set(id, { id, name_ar: row.name_ar, name_en: row.name_en });
    }
    return [...map.values()];
  }

  draftKey(): string { return `${this.segment}_payment`; }

  applyLocalFilter(): void {
    const filtered = this.allItems().filter((row) =>
      matchesSearch(row.name_ar, this.searchQuery) || matchesSearch(row.name_en || '', this.searchQuery)
    );
    this.items.set(filtered);
    const totalPayments = filtered.reduce((s, p) => s + Number(p.payment_amount), 0);
    const totalDue = filtered.reduce((s, p) => s + Number(p.due_amount), 0);
    this.totals.set({ totalPayments, totalDue, total: totalPayments + totalDue });
  }

  async load(filters: DateFilterValue): Promise<void> {
    if (filters.reload === false) {
      this.searchQuery = filters.search ?? '';
      this.applyLocalFilter();
      return;
    }
    const projectId = await this.projectContext.ensureReady();
    if (!projectId) return;
    this.initialLoading.set(true);
    this.dateFilters = {};
    if (filters.fromDate) this.dateFilters['fromDate'] = filters.fromDate;
    if (filters.toDate) this.dateFilters['toDate'] = filters.toDate;
    try {
      const res = await this.repo.list<PartyPayment>(projectId, this.segment, this.dateFilters);
      this.allItems.set(res.data);
      this.entities.set(this.buildEntities(res.data));
      this.searchQuery = filters.search ?? '';
      this.applyLocalFilter();
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { this.initialLoading.set(false); }
  }

  openModal(): void {
    this.editPaymentId = null;
    this.form = this.draft.load(this.draftKey()) ?? {
      entityId: '', entityName: '', payment_amount: 0, due_amount: 0,
      transaction_date: new Date().toISOString().slice(0, 10),
    };
    this.modalOpen.set(true);
  }

  openEdit(row: PartyPayment): void {
    this.editPaymentId = row.id;
    const fk = this.entityFk();
    this.form = {
      entityId: (row as PartyPayment & Record<string, string>)[fk] || '',
      entityName: row.name_ar,
      payment_amount: Number(row.payment_amount),
      due_amount: Number(row.due_amount),
      transaction_date: String(row.transaction_date).slice(0, 10),
    };
    this.modalOpen.set(true);
  }

  async deletePayment(id: string): Promise<void> {
    if (!confirm(this.translate.instant('MESSAGES.DELETE_CONFIRM'))) return;
    const projectId = await this.projectContext.ensureReady();
    if (!projectId) return;
    try {
      await this.repo.deleteSub(projectId, this.segment, `payments/${id}`);
      this.toast.success(this.translate.instant('MESSAGES.DELETE_SUCCESS'));
      await this.load({ ...this.dateFilters, reload: true });
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  onEntitySelect(): void {
    if (this.form.entityId) {
      const entity = this.entities().find((e) => e.id === this.form.entityId);
      this.form.entityName = entity?.name_ar ?? '';
    }
    this.saveDraft();
  }

  saveDraft(): void { if (!this.editPaymentId) this.draft.save(this.draftKey(), this.form); }

  clearForm(): void {
    this.form = { entityId: '', entityName: '', payment_amount: 0, due_amount: 0, transaction_date: new Date().toISOString().slice(0, 10) };
    this.draft.clear(this.draftKey());
  }

  async save(): Promise<void> {
    const projectId = await this.projectContext.ensureReady();
    if (!projectId) { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); return; }
    if (!this.editPaymentId && !this.form.entityId && !this.form.entityName.trim()) {
      this.toast.error(this.translate.instant('MESSAGES.NAME_REQUIRED'));
      return;
    }
    const body = {
      payment_amount: Number(this.form.payment_amount) || 0,
      due_amount: Number(this.form.due_amount) || 0,
      transaction_date: this.form.transaction_date || new Date().toISOString().slice(0, 10),
    };
    try {
      if (this.editPaymentId) {
        await this.repo.putSub(projectId, this.segment, `payments/${this.editPaymentId}`, body);
      } else {
        let entityId = this.form.entityId;
        if (!entityId) {
          const entityRes = await this.repo.postSub<{ id: string }>(projectId, this.segment, 'entities', {
            name_ar: this.form.entityName.trim(), name_en: this.form.entityName.trim(),
          });
          entityId = entityRes.data.id;
        }
        await this.repo.postSub(projectId, this.segment, `${entityId}/payments`, body);
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.draft.clear(this.draftKey());
      this.modalOpen.set(false);
      this.editPaymentId = null;
      await this.load({ ...this.dateFilters, reload: true });
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }
}

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { DateFilterComponent } from '../../../../shared/components/date-filter/date-filter.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading/loading-spinner.component';
import { DailyJournalRepository } from '../../repositories/construction.repository';
import { ProjectContextService } from '../../../../core/services/project-context.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslateService } from '../../../../core/services/translate.service';
import { Bank, BankTransaction, TotalsMap } from '../../models/construction.models';

type TxRow = BankTransaction & { bank_name: string; seq: number; balance: number };

@Component({
  selector: 'app-banks-page',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, ModalComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="loading()" />
    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ 'BANKS.TITLE' | t }}</h2>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary" (click)="openBankModal()">{{ 'BANKS.ADD_BANK' | t }}</button>
          <button type="button" class="btn-primary" (click)="openTxModal()">{{ 'BANKS.ADD_TRANSACTION' | t }}</button>
        </div>
      </div>
      <app-date-filter (filterChange)="load($event)" />
      @if (summary()) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="stat-card border-s-emerald-500"><p class="text-sm text-slate-500">{{ 'BANKS.TOTAL_DEPOSITS' | t }}</p><p class="text-xl font-bold">{{ summary()!['total_deposits'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-amber-500"><p class="text-sm text-slate-500">{{ 'BANKS.TOTAL_WITHDRAWALS' | t }}</p><p class="text-xl font-bold">{{ summary()!['total_withdrawals'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-rose-500"><p class="text-sm text-slate-500">{{ 'BANKS.TOTAL_EXPENSES' | t }}</p><p class="text-xl font-bold">{{ summary()!['total_expenses'] | number:'1.2-2' }}</p></div>
          <div class="stat-card border-s-teal-500"><p class="text-sm text-slate-500">{{ 'BANKS.TOTAL_INTEREST' | t }}</p><p class="text-xl font-bold">{{ summary()!['total_interest'] | number:'1.2-2' }}</p></div>
        </div>
      }
      <div class="table-wrap">
        <div class="p-4 border-b border-slate-100"><h3 class="font-semibold text-slate-700">{{ 'BANKS.ALL_TRANSACTIONS' | t }}</h3></div>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ 'BANKS.CLIENT_NAME' | t }}</th>
              <th>{{ 'BANKS.BANK_NAME' | t }}</th>
              <th>{{ 'BANKS.DEPOSIT' | t }}</th>
              <th>{{ 'BANKS.WITHDRAWAL' | t }}</th>
              <th>{{ 'BANKS.EXPENSE' | t }}</th>
              <th>{{ 'BANKS.INTEREST' | t }}</th>
              <th>{{ 'COMMON.DATE' | t }}</th>
              <th>{{ 'BANKS.BALANCE' | t }}</th>
              <th>{{ 'COMMON.ACTIONS' | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (tx of allTransactions(); track tx.id) {
              <tr>
                <td>{{ tx.seq }}</td>
                <td>{{ tx.client_name || '—' }}</td>
                <td>{{ tx.bank_name }}</td>
                <td>{{ depositOf(tx) | number:'1.2-2' }}</td>
                <td>{{ withdrawalOf(tx) | number:'1.2-2' }}</td>
                <td>{{ expenseOf(tx) | number:'1.2-2' }}</td>
                <td>{{ interestOf(tx) | number:'1.2-2' }}</td>
                <td>{{ tx.transaction_date | date:'shortDate' }}</td>
                <td class="font-semibold">{{ tx.balance | number:'1.2-2' }}</td>
                <td class="flex gap-1">
                  <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEditTx(tx)">{{ 'COMMON.EDIT' | t }}</button>
                  <button type="button" class="btn-danger !py-1 !px-2" (click)="deleteTx(tx)">{{ 'COMMON.DELETE' | t }}</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="10" class="text-center py-8 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
          </tbody>
        </table>
      </div>
    </div>

    <app-modal [open]="bankModal()" [title]="editBankId ? ('BANKS.EDIT_BANK' | t) : ('BANKS.ADD_BANK' | t)" (close)="bankModal.set(false)">
      <div class="grid gap-4">
        <div class="form-field"><label class="form-label">{{ 'BANKS.BANK_NAME' | t }}</label><input class="input" [(ngModel)]="bankForm.name" /></div>
        <div class="form-field"><label class="form-label">{{ 'BANKS.INTEREST_RATE' | t }}</label><input class="input" type="number" step="0.01" [(ngModel)]="bankForm.interest_rate_percent" /></div>
      </div>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="bankModal.set(false)">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="saveBank()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>

    <app-modal [open]="txModal()" [title]="editTxId ? ('BANKS.EDIT_TRANSACTION' | t) : ('BANKS.ADD_TRANSACTION' | t)" (close)="txModal.set(false)">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="form-field"><label class="form-label">{{ 'BANKS.CLIENT_NAME' | t }}</label><input class="input" [(ngModel)]="txForm.client_name" /></div>
        <div class="form-field"><label class="form-label">{{ 'BANKS.BANK_NAME' | t }}</label>
          <select class="input" [(ngModel)]="txForm.bank_id"><option value="">—</option>@for (b of banks(); track b.id){<option [value]="b.id">{{ b.name_ar }}</option>}</select>
        </div>
        <div class="form-field"><label class="form-label">{{ 'BANKS.MOVEMENT_TYPE' | t }}</label>
          <select class="input" [(ngModel)]="txForm.movement_type"><option value="deposit">{{ 'BANKS.DEPOSIT' | t }}</option><option value="withdrawal">{{ 'BANKS.WITHDRAWAL' | t }}</option></select>
        </div>
        <div class="form-field"><label class="form-label">{{ 'BANKS.DEPOSIT_OR_WITHDRAWAL' | t }}</label><input class="input" type="number" [(ngModel)]="txForm.movement_amount" /></div>
        <div class="form-field"><label class="form-label">{{ 'BANKS.EXPENSE' | t }}</label><input class="input" type="number" [(ngModel)]="txForm.expense_amount" /></div>
        <div class="form-field"><label class="form-label">{{ 'BANKS.INTEREST' | t }}</label><input class="input" type="number" [(ngModel)]="txForm.interest_amount" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.DATE' | t }}</label><input class="input" type="date" [(ngModel)]="txForm.transaction_date" /></div>
        <div class="form-field md:col-span-2">
          <p class="text-sm text-slate-500">{{ 'BANKS.BALANCE_FORMULA' | t }}: <strong>{{ previewBalance() | number:'1.2-2' }}</strong></p>
        </div>
      </div>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="txModal.set(false)">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="saveTx()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>
  `,
})
export class BanksPageComponent implements OnInit {
  private repo = inject(DailyJournalRepository);
  private projectContext = inject(ProjectContextService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  banks = signal<Bank[]>([]);
  summary = signal<TotalsMap | null>(null);
  loading = signal(false);
  bankModal = signal(false);
  txModal = signal(false);
  editBankId: string | null = null;
  editTxId: string | null = null;
  bankForm = { name: '', interest_rate_percent: 0 };
  txForm = {
    bank_id: '', client_name: '', movement_type: 'deposit' as 'deposit' | 'withdrawal',
    movement_amount: 0, expense_amount: 0, interest_amount: 0,
    transaction_date: new Date().toISOString().slice(0, 10),
  };
  private filters: Record<string, string> = {};

  allTransactions = computed(() => {
    const rows: TxRow[] = [];
    let seq = 0;
    for (const bank of this.banks()) {
      const txs = [...(bank.transactions ?? [])].sort((a, b) =>
        String(a.transaction_date).localeCompare(String(b.transaction_date)) ||
        String(a.id).localeCompare(String(b.id))
      );
      for (const tx of txs) {
        seq += 1;
        const deposit = this.depositOf(tx);
        const withdrawal = this.withdrawalOf(tx);
        const movement = deposit || withdrawal;
        const expense = this.expenseOf(tx);
        const interest = this.interestOf(tx);
        rows.push({
          ...tx,
          bank_name: bank.name_ar,
          seq,
          balance: movement - (expense + interest),
        });
      }
    }
    return rows;
  });

  ngOnInit(): void { this.load({}); }

  depositOf(tx: BankTransaction): number {
    return tx.type === 'deposit' ? Number(tx.amount) : 0;
  }

  withdrawalOf(tx: BankTransaction): number {
    return tx.type === 'withdrawal' ? Number(tx.amount) : 0;
  }

  expenseOf(tx: BankTransaction): number {
    return Number(tx.expense_amount ?? (tx.type === 'expense' ? tx.amount : 0));
  }

  interestOf(tx: BankTransaction): number {
    return Number(tx.interest_amount ?? (tx.type === 'interest' ? tx.amount : 0));
  }

  previewBalance(): number {
    const movement = Number(this.txForm.movement_amount) || 0;
    const expense = Number(this.txForm.expense_amount) || 0;
    const interest = Number(this.txForm.interest_amount) || 0;
    return movement - (expense + interest);
  }

  async load(f: { fromDate?: string; toDate?: string }): Promise<void> {
    const pid = await this.projectContext.ensureReady(); if (!pid) return;
    this.loading.set(true);
    this.filters = {}; if (f.fromDate) this.filters['fromDate'] = f.fromDate; if (f.toDate) this.filters['toDate'] = f.toDate;
    try {
      const res = await this.repo.list<Bank>(pid, 'banks', this.filters);
      this.banks.set(res.data); this.summary.set(res.totals ?? null);
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { this.loading.set(false); }
  }

  interestRatePercent(b: Bank): number {
    return Number(b.interest_rate ?? 0) * 100;
  }

  openBankModal(): void { this.editBankId = null; this.bankForm = { name: '', interest_rate_percent: 0 }; this.bankModal.set(true); }
  openEditBank(b: Bank): void {
    this.editBankId = b.id;
    this.bankForm = { name: b.name_ar, interest_rate_percent: this.interestRatePercent(b) };
    this.bankModal.set(true);
  }

  openTxModal(): void {
    this.editTxId = null;
    this.txForm = {
      bank_id: this.banks()[0]?.id || '', client_name: '', movement_type: 'deposit',
      movement_amount: 0, expense_amount: 0, interest_amount: 0,
      transaction_date: new Date().toISOString().slice(0, 10),
    };
    this.txModal.set(true);
  }

  openEditTx(tx: TxRow): void {
    this.editTxId = tx.id;
    this.txForm = {
      bank_id: tx.bank_id,
      client_name: tx.client_name || '',
      movement_type: tx.type === 'withdrawal' ? 'withdrawal' : 'deposit',
      movement_amount: tx.type === 'withdrawal' ? this.withdrawalOf(tx) : this.depositOf(tx),
      expense_amount: this.expenseOf(tx),
      interest_amount: this.interestOf(tx),
      transaction_date: String(tx.transaction_date).slice(0, 10),
    };
    this.txModal.set(true);
  }

  async saveBank(): Promise<void> {
    const pid = await this.projectContext.ensureReady(); if (!pid || !this.bankForm.name) return;
    this.loading.set(true);
    try {
      const body = {
        name_ar: this.bankForm.name,
        name_en: this.bankForm.name,
        interest_rate: Number(this.bankForm.interest_rate_percent) / 100,
      };
      if (this.editBankId) await this.repo.update(pid, 'banks', this.editBankId, body);
      else await this.repo.create(pid, 'banks', body);
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.bankModal.set(false); await this.load(this.filters);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
    finally { this.loading.set(false); }
  }

  async deleteBank(id: string): Promise<void> {
    const pid = await this.projectContext.ensureReady(); if (!pid) return;
    if (!confirm(this.translate.instant('MESSAGES.DELETE_CONFIRM'))) return;
    try {
      await this.repo.delete(pid, 'banks', id);
      this.toast.success(this.translate.instant('MESSAGES.DELETE_SUCCESS'));
      await this.load(this.filters);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  async saveTx(): Promise<void> {
    const pid = await this.projectContext.ensureReady(); if (!pid || !this.txForm.bank_id) return;
    this.loading.set(true);
    try {
      const body = {
        type: this.txForm.movement_type,
        amount: Number(this.txForm.movement_amount) || 0,
        expense_amount: Number(this.txForm.expense_amount) || 0,
        interest_amount: Number(this.txForm.interest_amount) || 0,
        client_name: this.txForm.client_name,
        transaction_date: this.txForm.transaction_date,
      };
      if (this.editTxId) {
        await this.repo.putSub(pid, 'banks', `${this.txForm.bank_id}/transactions/${this.editTxId}`, body);
      } else {
        await this.repo.postSub(pid, 'banks', `${this.txForm.bank_id}/transactions`, body);
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.txModal.set(false); await this.load(this.filters);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
    finally { this.loading.set(false); }
  }

  async deleteTx(tx: BankTransaction): Promise<void> {
    const pid = await this.projectContext.ensureReady(); if (!pid) return;
    if (!confirm(this.translate.instant('MESSAGES.DELETE_CONFIRM'))) return;
    try {
      await this.repo.deleteSub(pid, 'banks', `${tx.bank_id}/transactions/${tx.id}`);
      this.toast.success(this.translate.instant('MESSAGES.DELETE_SUCCESS'));
      await this.load(this.filters);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }
}

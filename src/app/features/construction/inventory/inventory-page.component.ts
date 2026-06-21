import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SmartDecimalPipe } from '../../../shared/pipes/smart-decimal.pipe';
import { DateFilterComponent, DateFilterValue } from '../../../shared/components/date-filter/date-filter.component';
import { matchesSearch } from '../../../shared/utils/filter.util';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading/loading-spinner.component';
import { ApiService } from '../../../core/services/api.service';
import { ProjectContextService } from '../../../core/services/project-context.service';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateService } from '../../../core/services/translate.service';
import { AuthService } from '../../../core/services/auth.service';
import { WarehouseEntry, TotalsMap, InventoryCategory } from '../models/construction.models';
import { firstValueFrom } from 'rxjs';

interface Warehouse { id: string; name_ar: string; name_en: string; }

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [FormsModule, SmartDecimalPipe, DatePipe, TranslatePipe, DateFilterComponent, ModalComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="initialLoading()" />
    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ 'INVENTORY.TITLE' | t }}</h2>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary" (click)="openWarehouseModal()">{{ 'INVENTORY.ADD_WAREHOUSE' | t }}</button>
          <button type="button" class="btn-primary" (click)="openEntryModal()">{{ 'INVENTORY.ADD_ENTRY' | t }}</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat-card border-s-teal-500">
          <p class="text-sm text-slate-500">{{ 'INVENTORY.WAREHOUSE_COUNT' | t }}</p>
          <p class="text-2xl font-bold">{{ warehouses().length }}</p>
        </div>
        @if (totals()) {
          <div class="stat-card border-s-emerald-500 md:col-span-2">
            <p class="text-sm text-slate-500">{{ 'INVENTORY.GRAND_TOTAL' | t }}</p>
            <p class="text-2xl font-bold">{{ totals()!['grandTotal'] | smartDecimal }} EGP</p>
          </div>
        }
      </div>

      @if (auth.canManageCategories()) {
        <div class="card">
          <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h3 class="font-semibold text-slate-800">{{ 'SETTINGS.CATEGORIES' | t }}</h3>
            <button type="button" class="btn-primary" (click)="openCategoryModal()">{{ 'SETTINGS.ADD_CATEGORY' | t }}</button>
          </div>
          <table class="data-table">
            <thead><tr><th>{{ 'COMMON.NAME' | t }}</th><th>{{ 'COMMON.ACTIONS' | t }}</th></tr></thead>
            <tbody>
              @for (c of categories(); track c.id) {
                <tr>
                  <td>{{ categoryLabel(c) }}</td>
                  <td class="flex gap-1">
                    <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEditCategory(c)">{{ 'COMMON.EDIT' | t }}</button>
                    <button type="button" class="btn-danger !py-1 !px-2" (click)="deleteCategory(c.id)">{{ 'COMMON.DELETE' | t }}</button>
                  </td>
                </tr>
              } @empty { <tr><td colspan="2" class="text-center py-6 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
            </tbody>
          </table>
        </div>
      }

      <div>
        <h3 class="font-semibold text-slate-700 mb-3">{{ 'INVENTORY.WAREHOUSES' | t }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div class="warehouse-card cursor-pointer" [class.warehouse-card-active]="!selectedWarehouseId()" (click)="selectWarehouse(null)">
            <div>
              <p class="font-semibold text-slate-800">{{ 'INVENTORY.ALL_WAREHOUSES' | t }}</p>
              <p class="text-sm text-slate-500">{{ warehouses().length }} {{ 'INVENTORY.WAREHOUSE_COUNT' | t }}</p>
            </div>
          </div>
          @for (w of warehouses(); track w.id) {
            <div class="warehouse-card" [class.warehouse-card-active]="selectedWarehouseId() === w.id">
              <div class="flex-1 min-w-0 cursor-pointer" (click)="selectWarehouse(w.id)">
                <p class="font-semibold text-slate-800 truncate">{{ warehouseName(w) }}</p>
                <p class="text-sm text-slate-500">{{ 'INVENTORY.WAREHOUSE_DETAILS' | t }}</p>
              </div>
              <div class="flex gap-1 shrink-0">
                <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEditWarehouse(w); $event.stopPropagation()">{{ 'COMMON.EDIT' | t }}</button>
                <button type="button" class="btn-danger !py-1 !px-2" (click)="deleteWarehouse(w.id); $event.stopPropagation()">{{ 'COMMON.DELETE' | t }}</button>
              </div>
            </div>
          } @empty {
            <div class="col-span-full text-slate-400 text-sm">{{ 'COMMON.NO_DATA' | t }}</div>
          }
        </div>
      </div>

      <app-date-filter [showCategory]="true" (filterChange)="onFilterChange($event)" />

      @for (entry of entries(); track entry.id; let g = $index) {
        <div class="table-wrap">
          <div class="p-4 border-b border-slate-100 flex flex-wrap justify-between gap-2">
            <div>
              <span class="text-slate-400 me-2">#{{ g + 1 }}</span>
              <span class="font-semibold">{{ entryWarehouseName(entry) }}</span>
              <span class="text-slate-500 ms-2">{{ entry.entry_date | date:'shortDate' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-teal-700">{{ entry.totalInvoiceAmount | smartDecimal }} EGP</span>
              <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEditEntry(entry)">{{ 'COMMON.EDIT' | t }}</button>
            </div>
          </div>
          <table class="data-table text-xs md:text-sm">
            <thead>
              <tr>
                <th>{{ 'PURCHASES.ROW_NUMBER' | t }}</th>
                <th>{{ 'INVENTORY.DESCRIPTION' | t }}</th>
                <th>{{ 'INVENTORY.QUANTITY_IN' | t }} (m²)</th>
                <th>{{ 'INVENTORY.QUANTITY_OUT' | t }} (m²)</th>
                <th>{{ 'INVENTORY.CATEGORY' | t }}</th>
                <th>{{ 'INVENTORY.REMAINING' | t }}</th>
                <th>{{ 'INVENTORY.INVOICE_TOTAL' | t }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of entry.items; track item.id; let i = $index) {
                <tr>
                  <td>{{ i + 1 }}</td>
                  <td>{{ item.item_name_ar }}</td>
                  <td>{{ item.quantity_in | smartDecimal }} m²</td>
                  <td>{{ item.quantity_out | smartDecimal }} m²</td>
                  <td>{{ item.category }}</td>
                  <td class="font-medium">{{ item.remaining | smartDecimal }} m²</td>
                  <td>{{ item.line_total | smartDecimal }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @empty {
        <div class="card text-center text-slate-400 py-12">{{ 'COMMON.NO_DATA' | t }}</div>
      }
    </div>

    <app-modal [open]="whModal()" [title]="editWhId ? ('INVENTORY.EDIT_WAREHOUSE' | t) : ('INVENTORY.ADD_WAREHOUSE' | t)" (close)="whModal.set(false)">
      <div class="form-field"><label class="form-label">{{ 'INVENTORY.WAREHOUSE_NAME' | t }}</label><input class="input" [(ngModel)]="whForm.name" (ngModelChange)="draft.save('inventory_wh', whForm)" /></div>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="clearWhForm()">{{ 'COMMON.CLEAR' | t }}</button>
        <button type="button" class="btn-secondary" (click)="whModal.set(false)">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="saveWarehouse()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>

    <app-modal [open]="entryModal()" [wide]="true" [title]="editEntryId ? ('INVENTORY.EDIT_ENTRY' | t) : ('INVENTORY.ADD_ENTRY' | t)" (close)="entryModal.set(false)">
      <div class="grid md:grid-cols-2 gap-4 mb-4">
        <div class="form-field"><label class="form-label">{{ 'INVENTORY.WAREHOUSES' | t }}</label>
          <select class="input input-lg" [(ngModel)]="entryForm.warehouse_id" (ngModelChange)="saveEntryDraft()">@for (w of warehouses(); track w.id){<option [value]="w.id">{{ warehouseName(w) }}</option>}</select>
        </div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.DATE' | t }}</label><input class="input input-lg" type="date" [(ngModel)]="entryForm.entry_date" (ngModelChange)="saveEntryDraft()" /></div>
      </div>
      <div class="inventory-entry-table mb-2">
        <table class="data-table modal-form-table">
          <thead><tr>
            <th>{{ 'PURCHASES.ROW_NUMBER' | t }}</th>
            <th>{{ 'INVENTORY.DESCRIPTION' | t }}</th>
            <th>{{ 'INVENTORY.CATEGORY' | t }}</th>
            <th>{{ 'INVENTORY.QUANTITY_IN' | t }} (m²)</th>
            <th>{{ 'INVENTORY.QUANTITY_OUT' | t }} (m²)</th>
            <th>{{ 'INVENTORY.INVOICE_TOTAL' | t }}</th>
            <th></th>
          </tr></thead>
          <tbody>
            @for (item of entryForm.items; track $index; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td>
                <td><input class="input input-lg" [(ngModel)]="item.item_name_ar" (ngModelChange)="saveEntryDraft()" /></td>
                <td><select class="input input-lg" [(ngModel)]="item.category" (ngModelChange)="saveEntryDraft()">
                  <option value="">{{ 'INVENTORY.SELECT_CATEGORY' | t }}</option>
                  @for (c of categories(); track c.id) {
                    <option [value]="c.name_ar">{{ categoryLabel(c) }}</option>
                  }
                </select></td>
                <td><input class="input input-lg qty-input" type="number" step="0.01" min="0" [(ngModel)]="item.quantity_in" (ngModelChange)="saveEntryDraft()" placeholder="0" /></td>
                <td><input class="input input-lg qty-input" type="number" step="0.01" min="0" [(ngModel)]="item.quantity_out" (ngModelChange)="saveEntryDraft()" placeholder="0" /></td>
                <td><input class="input input-lg" type="number" step="0.01" min="0" [(ngModel)]="item.line_total" (ngModelChange)="saveEntryDraft()" /></td>
                <td><button type="button" class="btn-danger !py-1 !px-2" (click)="removeEntryItem(i)" [disabled]="entryForm.items.length === 1">×</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <button type="button" class="btn-secondary mb-2" (click)="addEntryItem()">+ {{ 'COMMON.ADD' | t }}</button>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="clearEntryForm()">{{ 'INVENTORY.CLEAR_ENTRY' | t }}</button>
        <button type="button" class="btn-secondary" (click)="entryModal.set(false)">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="saveEntry()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>

    @if (auth.canManageCategories()) {
      <app-modal [open]="categoryModal()" [title]="editCategoryId ? ('SETTINGS.EDIT_CATEGORY' | t) : ('SETTINGS.ADD_CATEGORY' | t)" (close)="categoryModal.set(false)">
        <div class="form-field"><label class="form-label">{{ 'COMMON.NAME' | t }}</label><input class="input" [(ngModel)]="categoryForm.name_ar" /></div>
        <div modal-footer class="flex gap-2 justify-end w-full">
          <button type="button" class="btn-secondary" (click)="categoryModal.set(false)">{{ 'COMMON.CANCEL' | t }}</button>
          <button type="button" class="btn-primary" (click)="saveCategory()">{{ 'COMMON.SAVE' | t }}</button>
        </div>
      </app-modal>
    }
  `,
})
export class InventoryPageComponent implements OnInit {
  private api = inject(ApiService);
  private projectContext = inject(ProjectContextService);
  draft = inject(FormDraftService);
  private toast = inject(ToastService);
  translate = inject(TranslateService);
  auth = inject(AuthService);

  warehouses = signal<Warehouse[]>([]);
  categories = signal<InventoryCategory[]>([]);
  allEntries = signal<WarehouseEntry[]>([]);
  entries = signal<WarehouseEntry[]>([]);
  totals = signal<TotalsMap | null>(null);
  selectedWarehouseId = signal<string | null>(null);
  initialLoading = signal(false);
  categoryQuery = '';
  whModal = signal(false);
  entryModal = signal(false);
  categoryModal = signal(false);
  editEntryId: string | null = null;
  editWhId: string | null = null;
  editCategoryId: string | null = null;
  whForm = { name: '' };
  categoryForm = { name_ar: '', name_en: '' };
  entryForm = {
    warehouse_id: '', entry_date: new Date().toISOString().slice(0, 10),
    items: [{ item_name_ar: '', item_name_en: '', category: '', unit: 'm²', quantity_in: 0, quantity_out: 0, line_total: 0 }],
  };
  private filters: Record<string, string> = {};
  private lastDateFilter: { fromDate?: string; toDate?: string; category?: string } = {};

  ngOnInit(): void { this.load({}, true); }

  applyLocalFilter(): void {
    const q = this.categoryQuery.trim().toLowerCase();
    const filtered = this.allEntries().filter((entry) => {
      if (!q) return true;
      return entry.items.some((item) => matchesSearch(item.category || '', q) || matchesSearch(item.item_name_ar || '', q));
    });
    this.entries.set(filtered);
  }

  onFilterChange(filters: DateFilterValue): void {
    this.lastDateFilter = filters;
    if (filters.reload === false) {
      this.categoryQuery = filters.category ?? '';
      this.applyLocalFilter();
      return;
    }
    this.load(filters, false);
  }

  selectWarehouse(id: string | null): void {
    this.selectedWarehouseId.set(id);
    this.load(this.lastDateFilter, false);
  }

  async load(filters: { fromDate?: string; toDate?: string; category?: string }, showSpinner = false): Promise<void> {
    const projectId = await this.projectContext.ensureReady();
    if (!projectId) return;
    if (showSpinner) this.initialLoading.set(true);
    this.filters = {};
    if (filters.fromDate) this.filters['fromDate'] = filters.fromDate;
    if (filters.toDate) this.filters['toDate'] = filters.toDate;
    if (this.selectedWarehouseId()) this.filters['warehouseId'] = this.selectedWarehouseId()!;
    try {
      const wh = await firstValueFrom(this.api.get<Warehouse[]>(`${this.base(projectId)}/warehouses`));
      this.warehouses.set(wh.data);
      await this.loadCategories(projectId);
      const res = await firstValueFrom(this.api.get<WarehouseEntry[]>(`${this.base(projectId)}/entries`, this.filters));
      this.allEntries.set(res.data);
      this.totals.set(res.totals ?? null);
      this.categoryQuery = filters.category ?? this.categoryQuery;
      this.applyLocalFilter();
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { if (showSpinner) this.initialLoading.set(false); }
  }

  warehouseName(w: Warehouse): string {
    return this.translate.currentLang() === 'ar' ? w.name_ar : (w.name_en || w.name_ar);
  }

  categoryLabel(c: InventoryCategory): string {
    return this.translate.currentLang() === 'ar' ? c.name_ar : (c.name_en || c.name_ar);
  }

  async loadCategories(projectId: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.get<InventoryCategory[]>(`${this.base(projectId)}/categories`));
      this.categories.set(res.data);
    } catch { this.categories.set([]); }
  }

  entryWarehouseName(entry: WarehouseEntry): string {
    return this.translate.currentLang() === 'ar' ? entry.warehouse_name_ar : ((entry as WarehouseEntry & { warehouse_name_en?: string }).warehouse_name_en || entry.warehouse_name_ar);
  }

  base(projectId: string): string { return `/construction/projects/${projectId}/inventory`; }

  emptyEntryItem() {
    return { item_name_ar: '', item_name_en: '', category: '', unit: 'm²', quantity_in: 0, quantity_out: 0, line_total: 0 };
  }

  openWarehouseModal(): void {
    this.editWhId = null;
    this.whForm = this.draft.load('inventory_wh') ?? { name: '' };
    this.whModal.set(true);
  }

  openEditWarehouse(w: Warehouse): void {
    this.editWhId = w.id;
    this.whForm = { name: this.warehouseName(w) };
    this.whModal.set(true);
  }

  async deleteWarehouse(id: string): Promise<void> {
    if (!confirm(this.translate.instant('MESSAGES.DELETE_CONFIRM'))) return;
    const pid = await this.projectContext.ensureReady();
    if (!pid) return;
    try {
      await firstValueFrom(this.api.delete(`${this.base(pid)}/warehouses/${id}`));
      this.toast.success(this.translate.instant('MESSAGES.DELETE_SUCCESS'));
      if (this.selectedWarehouseId() === id) this.selectedWarehouseId.set(null);
      await this.load(this.lastDateFilter, false);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  openEntryModal(): void {
    this.editEntryId = null;
    this.entryForm = this.draft.load('inventory_entry') ?? {
      warehouse_id: this.selectedWarehouseId() || this.warehouses()[0]?.id || '',
      entry_date: new Date().toISOString().slice(0, 10),
      items: [this.emptyEntryItem()],
    };
    this.entryModal.set(true);
  }

  openEditEntry(entry: WarehouseEntry): void {
    this.editEntryId = entry.id;
    const e = entry as WarehouseEntry & { warehouse_id?: string };
    this.entryForm = {
      warehouse_id: e.warehouse_id || '',
      entry_date: String(entry.entry_date).slice(0, 10),
      items: entry.items.map((i) => ({
        item_name_ar: i.item_name_ar, item_name_en: i.item_name_en || i.item_name_ar,
        category: i.category, unit: i.unit || 'm²',
        quantity_in: i.quantity_in, quantity_out: i.quantity_out, line_total: i.line_total,
      })),
    };
    this.entryModal.set(true);
  }

  addEntryItem(): void { this.entryForm.items.push(this.emptyEntryItem()); this.saveEntryDraft(); }
  removeEntryItem(i: number): void { if (this.entryForm.items.length > 1) { this.entryForm.items.splice(i, 1); this.saveEntryDraft(); } }
  saveEntryDraft(): void { if (!this.editEntryId) this.draft.save('inventory_entry', this.entryForm); }
  clearWhForm(): void { this.whForm = { name: '' }; this.editWhId = null; this.draft.clear('inventory_wh'); }

  clearEntryForm(): void {
    this.entryForm = {
      warehouse_id: this.selectedWarehouseId() || this.warehouses()[0]?.id || '',
      entry_date: new Date().toISOString().slice(0, 10),
      items: [this.emptyEntryItem()],
    };
    if (!this.editEntryId) this.draft.clear('inventory_entry');
  }

  async saveEntry(): Promise<void> {
    const pid = await this.projectContext.ensureReady();
    if (!pid) return;
    if (!this.entryForm.warehouse_id) {
      this.toast.error(this.translate.instant('INVENTORY.SELECT_WAREHOUSE'));
      return;
    }
    const items = this.entryForm.items.filter((i) => i.item_name_ar.trim()).map((i) => ({
      ...i,
      item_name_en: i.item_name_ar,
      quantity_in: Number(i.quantity_in) || 0,
      quantity_out: Number(i.quantity_out) || 0,
      line_total: Number(i.line_total) || 0,
    }));
    if (!items.length) { this.toast.error(this.translate.instant('MESSAGES.DESCRIPTION_REQUIRED')); return; }
    try {
      const body = { ...this.entryForm, items };
      if (this.editEntryId) {
        await firstValueFrom(this.api.put(`${this.base(pid)}/entries/${this.editEntryId}`, body));
      } else {
        await firstValueFrom(this.api.post(`${this.base(pid)}/entries`, body));
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.draft.clear('inventory_entry');
      this.entryModal.set(false);
      this.editEntryId = null;
      await this.load(this.lastDateFilter, false);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  openCategoryModal(): void {
    this.editCategoryId = null;
    this.categoryForm = { name_ar: '', name_en: '' };
    this.categoryModal.set(true);
  }

  openEditCategory(c: InventoryCategory): void {
    this.editCategoryId = c.id;
    this.categoryForm = { name_ar: c.name_ar, name_en: c.name_en || c.name_ar };
    this.categoryModal.set(true);
  }

  async saveCategory(): Promise<void> {
    const pid = await this.projectContext.ensureReady();
    if (!pid || !this.categoryForm.name_ar.trim()) return;
    try {
      const body = { name_ar: this.categoryForm.name_ar, name_en: this.categoryForm.name_ar };
      if (this.editCategoryId) {
        await firstValueFrom(this.api.put(`${this.base(pid)}/categories/${this.editCategoryId}`, body));
      } else {
        await firstValueFrom(this.api.post(`${this.base(pid)}/categories`, body));
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.categoryModal.set(false);
      await this.load(this.lastDateFilter, false);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  async deleteCategory(id: string): Promise<void> {
    if (!confirm(this.translate.instant('MESSAGES.DELETE_CONFIRM'))) return;
    const pid = await this.projectContext.ensureReady();
    if (!pid) return;
    try {
      await firstValueFrom(this.api.delete(`${this.base(pid)}/categories/${id}`));
      this.toast.success(this.translate.instant('MESSAGES.DELETE_SUCCESS'));
      await this.load(this.lastDateFilter, false);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  async saveWarehouse(): Promise<void> {
    const pid = await this.projectContext.ensureReady();
    if (!pid || !this.whForm.name.trim()) return;
    try {
      const body = { name_ar: this.whForm.name, name_en: this.whForm.name };
      if (this.editWhId) {
        await firstValueFrom(this.api.put(`${this.base(pid)}/warehouses/${this.editWhId}`, body));
      } else {
        await firstValueFrom(this.api.post(`${this.base(pid)}/warehouses`, body));
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.draft.clear('inventory_wh');
      this.editWhId = null;
      this.whModal.set(false);
      await this.load(this.lastDateFilter, false);
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }
}

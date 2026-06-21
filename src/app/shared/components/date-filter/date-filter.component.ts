import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface DateFilterValue {
  fromDate?: string;
  toDate?: string;
  category?: string;
  search?: string;
  /** When false, only search/category changed — filter locally without API reload. */
  reload?: boolean;
}

@Component({
  selector: 'app-date-filter',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="filter-bar">
      <div class="filter-fields">
        <div class="form-field filter-field-item">
          <label class="form-label">{{ 'COMMON.FROM_DATE' | t }}</label>
          <input type="date" [(ngModel)]="fromDate" class="input" (ngModelChange)="onFieldChange()" />
        </div>
        <div class="form-field filter-field-item">
          <label class="form-label">{{ 'COMMON.TO_DATE' | t }}</label>
          <input type="date" [(ngModel)]="toDate" class="input" (ngModelChange)="onFieldChange()" />
        </div>
        @if (showCategory) {
          <div class="form-field filter-field-item">
            <label class="form-label">{{ 'INVENTORY.CATEGORY' | t }}</label>
            <input type="text" [(ngModel)]="category" class="input" [placeholder]="'INVENTORY.CATEGORY' | t" (ngModelChange)="onSearchInput()" />
          </div>
        }
        @if (showSearch) {
          <div class="form-field filter-field-search">
            <label class="form-label">{{ 'COMMON.SEARCH' | t }}</label>
            <input type="text" [(ngModel)]="search" class="input" [placeholder]="searchPlaceholderKey | t" (ngModelChange)="onSearchInput()" />
          </div>
        }
      </div>
      <div class="filter-actions">
        <button type="button" class="btn-secondary" (click)="clear()">{{ 'COMMON.CLEAR' | t }}</button>
      </div>
    </div>
  `,
})
export class DateFilterComponent implements OnDestroy {
  @Input() showCategory = false;
  @Input() showSearch = false;
  @Input() searchPlaceholderKey = 'COMMON.SEARCH';
  fromDate = '';
  toDate = '';
  category = '';
  search = '';
  @Output() filterChange = new EventEmitter<DateFilterValue>();

  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onFieldChange(): void {
    this.emit(true);
  }

  onSearchInput(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.emit(false), 350);
  }

  emit(reload: boolean): void {
    this.filterChange.emit({
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      category: this.category || undefined,
      search: this.search || undefined,
      reload,
    });
  }

  clear(): void {
    this.fromDate = '';
    this.toDate = '';
    this.category = '';
    this.search = '';
    this.filterChange.emit({ reload: true });
  }
}

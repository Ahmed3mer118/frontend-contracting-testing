import { Component, OnInit, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslateService, Lang } from '../../../core/services/translate.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-construction-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <div class="min-h-screen flex bg-slate-50">
      <aside class="w-64 bg-slate-800 text-white flex flex-col shrink-0">
        <div class="p-5 border-b border-slate-700">
          <h1 class="text-lg font-bold truncate">{{ auth.systemTitle() }}</h1>
          @if (auth.companySubtitle()) {
            <p class="text-xs text-slate-400 mt-1 truncate">{{ auth.companySubtitle() }}</p>
          }
        </div>
        <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
          @for (item of visibleNavItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-teal-600 text-white" [routerLinkActiveOptions]="{ exact: false }"
              class="block px-3 py-2.5 rounded-lg hover:bg-slate-700 transition text-sm text-slate-200">
              {{ item.labelKey | t }}
            </a>
          }
        </nav>
        <div class="p-3 border-t border-slate-700 space-y-3">
          @if (auth.user(); as user) {
            <div class="px-2">
              <p class="text-xs text-slate-400">{{ 'AUTH.LOGGED_IN_AS' | t }}</p>
              <p class="text-sm font-medium truncate">{{ auth.displayName(translate.currentLang()) }}</p>
            </div>
          }
          <button type="button" class="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm" (click)="auth.logout()">
            {{ 'AUTH.LOGOUT' | t }}
          </button>
          <div class="flex gap-2">
            <button type="button" class="flex-1 py-1.5 rounded text-sm font-medium" [class.bg-teal-600]="translate.currentLang() === 'ar'" (click)="setLang('ar')">AR</button>
            <button type="button" class="flex-1 py-1.5 rounded text-sm font-medium" [class.bg-teal-600]="translate.currentLang() === 'en'" (click)="setLang('en')">EN</button>
          </div>
        </div>
      </aside>
      <div class="flex-1 flex flex-col min-w-0">
        <main class="flex-1 p-6 overflow-auto"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class ConstructionLayoutComponent implements OnInit {
  translate = inject(TranslateService);
  auth = inject(AuthService);
  private router = inject(Router);

  private allNavItems = [
    { path: '/construction/dashboard', labelKey: 'NAV.DASHBOARD', perm: 'construction.dashboard.view' },
    { path: '/construction/journal/assets', labelKey: 'NAV.ASSETS', perm: 'construction.assets.manage' },
    { path: '/construction/journal/banks', labelKey: 'NAV.BANKS', perm: 'construction.banks.manage' },
    { path: '/construction/journal/sales', labelKey: 'NAV.SALES', perm: 'construction.sales.manage' },
    { path: '/construction/journal/purchases', labelKey: 'NAV.PURCHASES', perm: 'construction.purchases.manage' },
    { path: '/construction/journal/contractors', labelKey: 'NAV.CONTRACTORS', perm: 'construction.contractors.manage' },
    { path: '/construction/journal/suppliers', labelKey: 'NAV.SUPPLIERS', perm: 'construction.suppliers.manage' },
    { path: '/construction/journal/customers', labelKey: 'NAV.CUSTOMERS', perm: 'construction.customers.manage' },
    { path: '/construction/journal/expenses', labelKey: 'NAV.EXPENSES', perm: 'construction.expenses.manage' },
    { path: '/construction/inventory', labelKey: 'NAV.INVENTORY', perm: 'construction.inventory.manage' },
    { path: '/construction/reports', labelKey: 'NAV.REPORTS', perm: 'construction.reports.view' },
    { path: '/construction/settings', labelKey: 'NAV.SETTINGS', perm: 'construction.settings.manage' },
  ];

  visibleNavItems = computed(() => {
    const role = this.auth.user()?.role;
    if (role === 'warehouse') {
      return this.allNavItems.filter((i) => i.path === '/construction/inventory');
    }
    return this.allNavItems.filter((i) => this.auth.hasPermission(i.perm));
  });

  ngOnInit(): void {
    if (this.auth.user()?.role === 'warehouse') {
      const url = this.router.url;
      if (url.includes('/construction/dashboard') || url === '/construction' || url.endsWith('/construction/')) {
        this.router.navigate(['/construction/inventory']);
      }
    }
  }

  setLang(lang: Lang): void { this.translate.use(lang); }
}

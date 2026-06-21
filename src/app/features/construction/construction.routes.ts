import { Routes } from '@angular/router';
import { ConstructionLayoutComponent } from './layout/construction-layout.component';

export const constructionRoutes: Routes = [
  {
    path: '',
    component: ConstructionLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./projects/projects.component').then((m) => m.ProjectsComponent),
      },
      {
        path: 'journal/assets',
        loadComponent: () =>
          import('./daily-journal/assets/assets-page.component').then((m) => m.AssetsPageComponent),
      },
      {
        path: 'journal/banks',
        loadComponent: () =>
          import('./daily-journal/banks/banks-page.component').then((m) => m.BanksPageComponent),
      },
      {
        path: 'journal/sales',
        loadComponent: () =>
          import('./daily-journal/sales/sales-page.component').then((m) => m.SalesPageComponent),
      },
      {
        path: 'journal/purchases',
        loadComponent: () =>
          import('./daily-journal/purchases/purchases-page.component').then((m) => m.PurchasesPageComponent),
      },
      {
        path: 'journal/contractors',
        loadComponent: () =>
          import('./daily-journal/parties/parties-pages.component').then((m) => m.ContractorsPageComponent),
      },
      {
        path: 'journal/suppliers',
        loadComponent: () =>
          import('./daily-journal/parties/parties-pages.component').then((m) => m.SuppliersJournalPageComponent),
      },
      {
        path: 'journal/customers',
        loadComponent: () =>
          import('./daily-journal/parties/parties-pages.component').then((m) => m.CustomersPageComponent),
      },
      {
        path: 'journal/expenses',
        loadComponent: () =>
          import('./daily-journal/expenses/expenses-page.component').then((m) => m.ExpensesPageComponent),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./inventory/inventory-page.component').then((m) => m.InventoryPageComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./reports/reports-page.component').then((m) => m.ReportsPageComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings-page.component').then((m) => m.SettingsPageComponent),
      },
      {
        path: '**',
        loadComponent: () =>
          import('../../shared/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];

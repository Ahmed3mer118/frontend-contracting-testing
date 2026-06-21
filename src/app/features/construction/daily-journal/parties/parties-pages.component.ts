import { Component } from '@angular/core';
import { PartyPaymentsPageComponent } from '../shared/party-payments-page.component';

@Component({
  selector: 'app-contractors-page',
  standalone: true,
  imports: [PartyPaymentsPageComponent],
  template: `<app-party-payments-page segment="contractors" titleKey="CONTRACTORS.TITLE" />`,
})
export class ContractorsPageComponent {}

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [PartyPaymentsPageComponent],
  template: `<app-party-payments-page segment="suppliers" titleKey="SUPPLIERS.TITLE" />`,
})
export class SuppliersJournalPageComponent {}

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [PartyPaymentsPageComponent],
  template: `<app-party-payments-page segment="customers" titleKey="CUSTOMERS.TITLE" />`,
})
export class CustomersPageComponent {}

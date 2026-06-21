export interface Asset {
  id: string;
  name_ar: string;
  name_en: string;
  value: number;
  totalDepreciation: number;
  netAsset: number;
  transaction_date: string;
}

export interface Bank {
  id: string;
  name_ar: string;
  name_en: string;
  balance: number;
  interest_amount: number;
  interest_rate?: number;
  transactions?: BankTransaction[];
}

export interface InventoryCategory {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface SystemUser {
  id: string;
  email: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  is_verified: boolean;
  role: string;
}

export interface BankTransaction {
  id: string;
  bank_id: string;
  type: string;
  amount: number;
  expense_amount?: number;
  interest_amount?: number;
  client_name?: string;
  transaction_date: string;
}

export interface Sale {
  id: string;
  client_name: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  payment_type: string;
}

export interface PurchaseItem {
  id: string;
  item_name_ar: string;
  item_name_en: string;
  amount: number;
  runningTotal?: number;
  rowNumber?: number;
  sort_order?: number;
}

export interface Purchase {
  id: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  payment_type: string;
  acquisition_cost?: number;
  due_amount?: number;
  total_amount?: number;
  items: PurchaseItem[];
}

export interface PartyPayment {
  id: string;
  name_ar: string;
  name_en: string;
  payment_amount: number;
  due_amount: number;
  transaction_date: string;
}

export interface Expense {
  id: string;
  description_ar: string;
  description_en: string;
  payment_amount: number;
  due_amount: number;
  transaction_date: string;
}

export interface WarehouseItem {
  id: string;
  item_name_ar: string;
  item_name_en?: string;
  quantity_in: number;
  quantity_out: number;
  remaining: number;
  unit: string;
  category: string;
  line_total: number;
}

export interface WarehouseEntry {
  id: string;
  warehouse_id?: string;
  warehouse_name_ar: string;
  entry_date: string;
  totalInvoiceAmount: number;
  items: WarehouseItem[];
}

export interface ProfitReport {
  grossProfit: number;
  netProfit: number;
  sales: { totalSales: number };
  purchases: { totalPurchases: number };
  contractors: { totalPayments: number };
  suppliers: { totalPayments: number };
  expenses: { totalPayments: number };
  assets: { totalDepreciation: number };
  banks?: Record<string, number>;
}

export interface TotalsMap {
  [key: string]: number;
}

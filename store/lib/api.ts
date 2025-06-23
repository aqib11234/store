const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://aqib007.pythonanywhere.com/api';

// Types based on our Django models
export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  unit: string;
  unit_display: string;
  quantity: number;
  price: string;
  sale_price?: string; // Added sale price field
  supplier: number;
  supplier_name: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  status_display: string;
  low_stock_threshold: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: string;
  total: string;
}

export interface SalesLoanPayment {
  id: number;
  amount: string;
  date: string;
  notes: string;
  created_at: string;
}

export interface SalesInvoice {
  id: number;
  invoice_id: string;
  customer: number;
  customer_name: string;
  date: string;
  time: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  notes: string;
  is_loan: boolean;
  amount_paid: string;
  remaining_balance: string;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_status_display: string;
  items: InvoiceItem[];
  loan_payments: SalesLoanPayment[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseLoanPayment {
  id: number;
  amount: string;
  date: string;
  notes: string;
  created_at: string;
}

export interface PurchaseInvoice {
  id: number;
  invoice_id: string;
  supplier: number;
  supplier_name: string;
  date: string;
  time: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  notes: string;
  is_loan: boolean;
  amount_paid: string;
  remaining_balance: string;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_status_display: string;
  items: InvoiceItem[];
  loan_payments: PurchaseLoanPayment[];
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_sales: string;
  today_sales: string;
  total_purchases: string;
  today_purchases: string;
  total_customers: number;
  total_suppliers: number;
}

export interface AccountTransaction {
  id: number;
  type: 'add' | 'withdraw';
  amount: string;
  description: string;
  date: string;
}

export interface LastSalePriceResponse {
  found: boolean;
  last_price?: string;
  last_sale_date?: string;
  invoice_id?: string;
  quantity_sold?: number;
  customer_name: string;
  product_name: string;
  message: string;
}

// API client class
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (typeof errorData === 'object') {
            errorMessage = JSON.stringify(errorData);
          }
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = `${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Handle empty responses (like DELETE operations)
      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
        return null as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // Products - Fetch all products by iterating through all pages
  async getProducts(params?: URLSearchParams): Promise<{ results: Product[] }> {
    let allProducts: Product[] = [];
    let page = 1;
    let hasMore = true;
    
    console.log('Starting to fetch all products...');
    
    while (hasMore) {
      try {
        // Create new URLSearchParams for each page
        const pageParams = new URLSearchParams(params || '');
        pageParams.set('page', page.toString());
        pageParams.set('page_size', '100'); // Use reasonable page size
        
        const query = `?${pageParams.toString()}`;
        console.log(`Fetching page ${page} with query:`, query);
        
        const response = await this.request<{ 
          results: Product[], 
          next: string | null,
          count: number,
          previous: string | null
        }>(`/products/${query}`);
        
        console.log(`Page ${page}: Got ${response.results.length} products`);
        allProducts = [...allProducts, ...response.results];
        
        // Check if there are more pages
        hasMore = response.next !== null;
        page++;
        
        // Safety break to prevent infinite loops
        if (page > 100) {
          console.warn('Reached maximum page limit (100), stopping pagination');
          break;
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        break;
      }
    }
    
    console.log(`Total products fetched: ${allProducts.length}`);
    console.log('All product names:', allProducts.map(p => p.name).sort());
    
    return { results: allProducts };
  }

  async getProduct(id: number): Promise<Product> {
    return this.request<Product>(`/products/${id}/`);
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    return this.request<Product>('/products/', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/products/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: number): Promise<void> {
    await this.request<void>(`/products/${id}/`, {
      method: 'DELETE',
    });
  }

  // Sales Invoices - Get all invoices by fetching all pages
  async getSalesInvoices(): Promise<{ results: SalesInvoice[] }> {
    let allInvoices: SalesInvoice[] = [];
    let page = 1;
    let hasMore = true;
    
    console.log('Starting to fetch all sales invoices...');
    
    while (hasMore) {
      try {
        const pageParams = new URLSearchParams();
        pageParams.set('page', page.toString());
        pageParams.set('page_size', '100'); // Get 100 items per page
        
        const query = `?${pageParams.toString()}`;
        console.log(`Fetching sales invoices page ${page} with query:`, query);
        
        const response = await this.request<{ 
          results: SalesInvoice[], 
          next: string | null,
          count: number,
          previous: string | null
        }>(`/sales-invoices/${query}`);
        
        console.log(`Sales invoices page ${page}: Got ${response.results.length} invoices`);
        allInvoices = [...allInvoices, ...response.results];
        
        // Check if there are more pages
        hasMore = response.next !== null;
        page++;
        
        // Safety break to prevent infinite loops
        if (page > 100) {
          console.warn('Reached maximum page limit (100), stopping pagination');
          break;
        }
      } catch (error) {
        console.error(`Error fetching sales invoices page ${page}:`, error);
        break;
      }
    }
    
    console.log(`Total sales invoices fetched: ${allInvoices.length}`);
    
    return { results: allInvoices };
  }

  async getSalesInvoice(id: number): Promise<SalesInvoice> {
    return this.request<SalesInvoice>(`/sales-invoices/${id}/`);
  }

  async createSalesInvoice(invoice: {
    customer: number;
    date: string;
    items: Array<{
      product: number;
      quantity: number;
      price: string;
    }>;
    tax_rate?: number;
    notes?: string;
    is_loan?: boolean;
    amount_paid?: number;
  }): Promise<SalesInvoice> {
    return this.request<SalesInvoice>('/sales-invoices/', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  async getLastSalePrice(customerId: number, productId: number): Promise<LastSalePriceResponse> {
    return this.request<LastSalePriceResponse>(`/sales-invoices/last_price/?customer_id=${customerId}&product_id=${productId}`);
  }

  // Purchase Invoices - Get all invoices by fetching all pages
  async getPurchaseInvoices(): Promise<{ results: PurchaseInvoice[] }> {
    let allInvoices: PurchaseInvoice[] = [];
    let page = 1;
    let hasMore = true;
    
    console.log('Starting to fetch all purchase invoices...');
    
    while (hasMore) {
      try {
        const pageParams = new URLSearchParams();
        pageParams.set('page', page.toString());
        pageParams.set('page_size', '100'); // Get 100 items per page
        
        const query = `?${pageParams.toString()}`;
        console.log(`Fetching purchase invoices page ${page} with query:`, query);
        
        const response = await this.request<{ 
          results: PurchaseInvoice[], 
          next: string | null,
          count: number,
          previous: string | null
        }>(`/purchase-invoices/${query}`);
        
        console.log(`Purchase invoices page ${page}: Got ${response.results.length} invoices`);
        allInvoices = [...allInvoices, ...response.results];
        
        // Check if there are more pages
        hasMore = response.next !== null;
        page++;
        
        // Safety break to prevent infinite loops
        if (page > 100) {
          console.warn('Reached maximum page limit (100), stopping pagination');
          break;
        }
      } catch (error) {
        console.error(`Error fetching purchase invoices page ${page}:`, error);
        break;
      }
    }
    
    console.log(`Total purchase invoices fetched: ${allInvoices.length}`);
    
    return { results: allInvoices };
  }

  async getPurchaseInvoice(id: number): Promise<PurchaseInvoice> {
    return this.request<PurchaseInvoice>(`/purchase-invoices/${id}/`);
  }

  async deleteSalesInvoice(id: number): Promise<void> {
    await this.request<void>(`/sales-invoices/${id}/`, {
      method: 'DELETE',
    });
  }

  async deletePurchaseInvoice(id: number): Promise<void> {
    await this.request<void>(`/purchase-invoices/${id}/`, {
      method: 'DELETE',
    });
  }

  async createPurchaseInvoice(invoice: {
    supplier: number;
    date: string;
    items: Array<{
      product: number;
      quantity: number;
      price: string;
    }>;
    tax_rate?: number;
    notes?: string;
    is_loan?: boolean;
    amount_paid?: number;
  }): Promise<PurchaseInvoice> {
    return this.request<PurchaseInvoice>('/purchase-invoices/', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  async addLoanPayment(invoiceId: number, payment: {
    amount: number;
    notes?: string;
  }): Promise<PurchaseLoanPayment> {
    return this.request<PurchaseLoanPayment>(`/purchase-invoices/${invoiceId}/add-payment/`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async addSalesLoanPayment(invoiceId: number, payment: {
    amount: number;
    notes?: string;
  }): Promise<SalesLoanPayment> {
    return this.request<SalesLoanPayment>(`/sales-invoices/${invoiceId}/add-payment/`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard-stats/');
  }

  // Suppliers
  async getSuppliers(): Promise<{ results: Supplier[] }> {
    return this.request<{ results: Supplier[] }>('/suppliers/');
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    return this.request<Supplier>('/suppliers/', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
  }

  // Customers
  async getCustomers(): Promise<{ results: Customer[] }> {
    return this.request<{ results: Customer[] }>('/customers/');
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    return this.request<Customer>('/customers/', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  // Account Transactions
  async getAccountTransactions(): Promise<{ results: AccountTransaction[] }> {
    return this.request<{ results: AccountTransaction[] }>('/account-transactions/');
  }

  async createAccountTransaction(data: {
    type: 'add' | 'withdraw';
    amount: string;
    description: string;
  }): Promise<AccountTransaction> {
    return this.request<AccountTransaction>('/account-transactions/', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual functions for convenience
export const getProducts = (params?: URLSearchParams) => apiClient.getProducts(params);
export const getProduct = (id: number) => apiClient.getProduct(id);
export const createProduct = (product: Partial<Product>) => apiClient.createProduct(product);
export const updateProduct = (id: number, product: Partial<Product>) => apiClient.updateProduct(id, product);
export const deleteProduct = (id: number) => apiClient.deleteProduct(id);
export const getSalesInvoices = () => apiClient.getSalesInvoices();
export const getSalesInvoice = (id: number) => apiClient.getSalesInvoice(id);
export const createSalesInvoice = (invoice: Parameters<typeof apiClient.createSalesInvoice>[0]) => apiClient.createSalesInvoice(invoice);
export const deleteSalesInvoice = (id: number) => apiClient.deleteSalesInvoice(id);
export const getPurchaseInvoices = () => apiClient.getPurchaseInvoices();
export const getPurchaseInvoice = (id: number) => apiClient.getPurchaseInvoice(id);
export const deletePurchaseInvoice = (id: number) => apiClient.deletePurchaseInvoice(id);
export const createPurchaseInvoice = (invoice: Parameters<typeof apiClient.createPurchaseInvoice>[0]) => apiClient.createPurchaseInvoice(invoice);
export const addLoanPayment = (invoiceId: number, payment: Parameters<typeof apiClient.addLoanPayment>[1]) => apiClient.addLoanPayment(invoiceId, payment);
export const addSalesLoanPayment = (invoiceId: number, payment: Parameters<typeof apiClient.addSalesLoanPayment>[1]) => apiClient.addSalesLoanPayment(invoiceId, payment);
export const getDashboardStats = () => apiClient.getDashboardStats();
export const getSuppliers = () => apiClient.getSuppliers();
export const createSupplier = (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => apiClient.createSupplier(supplier);
export const getCustomers = () => apiClient.getCustomers();
export const createCustomer = (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => apiClient.createCustomer(customer);
export const getAccountTransactions = () => apiClient.getAccountTransactions();
export const createAccountTransaction = (data: Parameters<typeof apiClient.createAccountTransaction>[0]) => apiClient.createAccountTransaction(data);
export const getLastSalePrice = (customerId: number, productId: number) => apiClient.getLastSalePrice(customerId, productId);
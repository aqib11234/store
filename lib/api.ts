const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
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
  items: InvoiceItem[];
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

  // Products
  async getProducts(params?: URLSearchParams): Promise<{ results: Product[] }> {
    const query = params ? `?${params.toString()}` : '';
    return this.request<{ results: Product[] }>(`/products/${query}`);
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

  // Sales Invoices
  async getSalesInvoices(): Promise<{ results: SalesInvoice[] }> {
    return this.request<{ results: SalesInvoice[] }>('/sales-invoices/');
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
  }): Promise<SalesInvoice> {
    return this.request<SalesInvoice>('/sales-invoices/', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  // Purchase Invoices
  async getPurchaseInvoices(): Promise<{ results: PurchaseInvoice[] }> {
    return this.request<{ results: PurchaseInvoice[] }>('/purchase-invoices/');
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

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard-stats/');
  }

  // Suppliers
  async getSuppliers(): Promise<{ results: Supplier[] }> {
    return this.request<{ results: Supplier[] }>('/suppliers/');
  }

  async createSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    return this.request<Supplier>('/suppliers/', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
  }

  // Customers
  async getCustomers(): Promise<{ results: Customer[] }> {
    return this.request<{ results: Customer[] }>('/customers/');
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
export const getDashboardStats = () => apiClient.getDashboardStats();
export const getSuppliers = () => apiClient.getSuppliers();
export const createSupplier = (supplier: Parameters<typeof apiClient.createSupplier>[0]) => apiClient.createSupplier(supplier);
export const getCustomers = () => apiClient.getCustomers();

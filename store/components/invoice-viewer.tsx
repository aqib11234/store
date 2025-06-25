"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getSalesInvoices, getPurchaseInvoices, deleteSalesInvoice, deletePurchaseInvoice, type SalesInvoice, type PurchaseInvoice } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Printer, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AddLoanPaymentDialog } from "./add-loan-payment-dialog"

interface PaginationInfo {
  count: number
  total_pages: number
  current_page: number
  page_size: number
  next: string | null
  previous: string | null
  has_next: boolean
  has_previous: boolean
}

export function InvoiceViewer() {
  const [activeTab, setActiveTab] = useState("sales")
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | PurchaseInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [salesPaginationInfo, setSalesPaginationInfo] = useState<PaginationInfo | null>(null)
  const [purchasePaginationInfo, setPurchasePaginationInfo] = useState<PaginationInfo | null>(null)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1) // Reset to first page when searching
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, activeTab])

  // Fetch invoices with pagination
  const fetchInvoices = useCallback(async (page: number = 1, forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('page_size', pageSize.toString())
      
      // Add search query if present
      if (debouncedSearchQuery.trim()) {
        params.set('search', debouncedSearchQuery.trim())
      }
      
      // Add status filter if not "all"
      if (statusFilter && statusFilter !== "all") {
        params.set('payment_status', statusFilter)
      }
      
      // Add cache busting parameter for force refresh
      if (forceRefresh) {
        params.set('_t', Date.now().toString())
      }

      console.log(`Fetching ${activeTab} invoices page ${page} with params:`, params.toString())
      
      if (activeTab === "sales") {
        const response = await getSalesInvoices(params)
        
        console.log(`Fetched ${response.results.length} sales invoices (page ${response.current_page} of ${response.total_pages})`)
        
        setSalesInvoices(response.results)
        setSalesPaginationInfo({
          count: response.count,
          total_pages: response.total_pages,
          current_page: response.current_page,
          page_size: response.page_size,
          next: response.next,
          previous: response.previous,
          has_next: response.has_next,
          has_previous: response.has_previous
        })
        
        // Set initial selected invoice only for first page
        if (response.results.length > 0 && page === 1) {
          setSelectedInvoice(response.results[0])
        }
      } else {
        const response = await getPurchaseInvoices(params)
        
        console.log(`Fetched ${response.results.length} purchase invoices (page ${response.current_page} of ${response.total_pages})`)
        
        setPurchaseInvoices(response.results)
        setPurchasePaginationInfo({
          count: response.count,
          total_pages: response.total_pages,
          current_page: response.current_page,
          page_size: response.page_size,
          next: response.next,
          previous: response.previous,
          has_next: response.has_next,
          has_previous: response.has_previous
        })
        
        // Set initial selected invoice only for first page
        if (response.results.length > 0 && page === 1) {
          setSelectedInvoice(response.results[0])
        }
      }
      
      setCurrentPage(page)
      
    } catch (err) {
      setError('Failed to fetch invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, pageSize, debouncedSearchQuery, statusFilter])

  // Initial load and when dependencies change
  useEffect(() => {
    fetchInvoices(currentPage)
  }, [fetchInvoices, currentPage])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setCurrentPage(1)
    setSearchQuery("")
    setDebouncedSearchQuery("")
    setStatusFilter("all")
    setSelectedInvoice(null)
  }

  const handleInvoiceSelect = (invoiceId: string) => {
    const invoices = activeTab === "sales" ? salesInvoices : purchaseInvoices
    const invoice = invoices.find((inv) => inv.invoice_id === invoiceId)
    if (invoice) {
      setSelectedInvoice(invoice)
    }
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page
  }

  // Force refresh
  const handleForceRefresh = useCallback(() => {
    console.log('Force refreshing invoices...')
    fetchInvoices(currentPage, true)
  }, [fetchInvoices, currentPage])

  // Get current pagination info
  const currentPaginationInfo = activeTab === "sales" ? salesPaginationInfo : purchasePaginationInfo

  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    if (!currentPaginationInfo) return []
    
    const { current_page, total_pages } = currentPaginationInfo
    const pages: (number | string)[] = []
    
    if (total_pages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page
      pages.push(1)
      
      if (current_page > 4) {
        pages.push('...')
      }
      
      // Show pages around current page
      const start = Math.max(2, current_page - 1)
      const end = Math.min(total_pages - 1, current_page + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (current_page < total_pages - 3) {
        pages.push('...')
      }
      
      // Show last page
      if (total_pages > 1) {
        pages.push(total_pages)
      }
    }
    
    return pages
  }, [currentPaginationInfo])

  const handlePrint = () => {
    if (!selectedInvoice) return

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = generatePrintableInvoice(selectedInvoice)
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  const handleDownload = () => {
    if (!selectedInvoice) return

    // Generate HTML content
    const htmlContent = generatePrintableInvoice(selectedInvoice)

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedInvoice.invoice_id.replace(/[^a-zA-Z0-9]/g, '_')}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!selectedInvoice) return

    try {
      if (activeTab === "sales") {
        await deleteSalesInvoice(selectedInvoice.id)
      } else {
        await deletePurchaseInvoice(selectedInvoice.id)
      }

      // Refresh the current page
      fetchInvoices(currentPage, true)
      setSelectedInvoice(null)

    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice. Please try again.')
    }
  }

  const generatePrintableInvoice = (invoice: SalesInvoice | PurchaseInvoice) => {
    const isSupplier = 'supplier_name' in invoice
    const partnerName = isSupplier ? (invoice as PurchaseInvoice).supplier_name : (invoice as SalesInvoice).customer_name
    const partnerLabel = isSupplier ? 'Supplier' : 'Customer'

    // Debug logging to see what data we have
    console.log('Generating invoice for:', invoice.invoice_id)
    console.log('Is supplier:', isSupplier)
    console.log('Amount paid:', invoice.amount_paid)
    console.log('Is loan:', invoice.is_loan)

    // Check if we have valid payment data - amount_paid is a string from the API
    const paidAmount = parseFloat(invoice.amount_paid || '0')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${invoice.invoice_id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 14px;
            max-width: 400px;
            margin: 0 auto;
            line-height: 1.6;
          }
          .business-name {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .invoice-type {
            text-align: center;
            font-size: 16px;
            margin-bottom: 20px;
            color: #333;
          }
          .invoice-details {
            margin-bottom: 20px;
            font-size: 14px;
          }
          .invoice-details div { 
            margin: 5px 0; 
            font-weight: bold;
          }
          .actions {
            text-align: center;
            margin: 15px 0;
            font-weight: bold;
            font-size: 14px;
            color: #333;
          }
          .items-header {
            font-weight: bold;
            font-size: 14px;
            margin: 15px 0 10px 0;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            margin: 3px 0;
            align-items: center;
          }
          .item-name {
            flex: 2;
          }
          .item-qty {
            flex: 1;
            text-align: center;
          }
          .item-price {
            flex: 1;
            text-align: right;
          }
          .item-total {
            flex: 1;
            text-align: right;
          }
          .totals-section {
            margin-top: 20px;
            border-top: 2px solid #333;
            padding-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
          }
          .balance-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="business-name">TAJJAMUL TRADERS</div>
        <div class="invoice-type">${isSupplier ? 'PURCHASE INVOICE' : 'SALES INVOICE'}</div>

        <div class="invoice-details">
          <div><strong>Date:</strong> ${invoice.date}</div>
          <div><strong>Time:</strong> ${new Date(invoice.time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}</div>
          <div><strong>${partnerLabel}:</strong> ${partnerName}</div>
        </div>

        <div class="actions">
          <strong>Print</strong> <strong>Download</strong> <strong>Delete</strong>
        </div>

        <div class="items-header">
          <div class="item-name">Item</div>
          <div class="item-qty">Qty</div>
          <div class="item-price">Price</div>
          <div class="item-total">Total</div>
        </div>

        ${invoice.items.map(item => `
          <div class="item-row">
            <div class="item-name">${item.product_name}</div>
            <div class="item-qty">${item.quantity}</div>
            <div class="item-price">₨${Math.round(parseFloat(item.price)).toLocaleString('en-PK')}</div>
            <div class="item-total">₨${Math.round(parseFloat(item.total)).toLocaleString('en-PK')}</div>
          </div>
        `).join('')}

        <div class="totals-section">
          <div class="total-row">
            <span>TOTAL</span>
            <span>₨${Math.round(parseFloat(invoice.total)).toLocaleString('en-PK')}</span>
          </div>
          <div class="payment-row">
            <span>AMOUNT PAID</span>
            <span>₨${Math.round(paidAmount).toLocaleString('en-PK')}</span>
          </div>
          ${invoice.is_loan ? `
          <div class="balance-row">
            <span>REMAINING BALANCE</span>
            <span>₨${Math.round(parseFloat(invoice.remaining_balance)).toLocaleString('en-PK')}</span>
          </div>
          <div class="payment-row">
            <span>PAYMENT STATUS</span>
            <span>${invoice.payment_status === 'paid' ? 'Fully Paid' : invoice.payment_status === 'partial' ? 'Partially Paid' : 'Unpaid'}</span>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${isSupplier ? "Purchase completed" : "Return policy: Products can be returned within 7 days"}</p>
        </div>
      </body>
      </html>
    `
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="sales">
          Sales Invoices {salesPaginationInfo && `(${salesPaginationInfo.count})`}
        </TabsTrigger>
        <TabsTrigger value="purchases">
          Purchase Invoices {purchasePaginationInfo && `(${purchasePaginationInfo.count})`}
        </TabsTrigger>
      </TabsList>

      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search invoices..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Pagination info and page size selector */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {currentPaginationInfo && (
              <>
                Showing {((currentPaginationInfo.current_page - 1) * currentPaginationInfo.page_size) + 1} to{' '}
                {Math.min(currentPaginationInfo.current_page * currentPaginationInfo.page_size, currentPaginationInfo.count)} of{' '}
                {currentPaginationInfo.count} invoices
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{activeTab === "sales" ? "Sales Invoices" : "Purchase Invoices"}</CardTitle>
              <CardDescription className="text-lg">Select an invoice to view details</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-4 max-h-96 overflow-y-auto">
                {(activeTab === "sales" ? salesInvoices : purchaseInvoices).map((invoice) => (
                  <Button
                    key={invoice.id}
                    variant={selectedInvoice?.invoice_id === invoice.invoice_id ? "default" : "ghost"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleInvoiceSelect(invoice.invoice_id)}
                  >
                    <div className="flex w-full flex-col items-start gap-1">
                      <span className="text-base font-medium leading-tight text-left">{invoice.invoice_id}</span>
                      <span className="text-sm text-muted-foreground">
                        {invoice.date} • {new Date(invoice.time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  </Button>
                ))}
                {(activeTab === "sales" ? salesInvoices : purchaseInvoices).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {debouncedSearchQuery || statusFilter !== "all"
                      ? "No invoices found matching your criteria"
                      : "No invoices available"
                    }
                  </div>
                )}
              </div>
              
              {/* Pagination Controls for Invoice List */}
              {currentPaginationInfo && currentPaginationInfo.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!currentPaginationInfo.has_previous}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers.map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                        ) : (
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page as number)}
                            className="min-w-[32px]"
                          >
                            {page}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!currentPaginationInfo.has_next}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          {selectedInvoice ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Invoice {selectedInvoice.invoice_id}</CardTitle>
                  <CardDescription>
                    Date: {selectedInvoice.date} • Time: {new Date(selectedInvoice.time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })} •{" "}
                    {activeTab === "sales"
                      ? `Customer: ${(selectedInvoice as SalesInvoice).customer_name}`
                      : `Supplier: ${(selectedInvoice as PurchaseInvoice).supplier_name}`}
                  </CardDescription>
                </div>
              <div className="flex gap-2">
                {activeTab === "purchase" && selectedInvoice.is_loan && selectedInvoice.payment_status !== 'paid' && (
                  <AddLoanPaymentDialog
                    invoice={selectedInvoice as PurchaseInvoice}
                    onPaymentAdded={() => {
                      // Refresh the invoices to show updated payment status
                      window.location.reload()
                    }}
                  />
                )}
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete invoice {selectedInvoice?.invoice_id}?
                        This action cannot be undone and will restore product quantities for sales invoices
                        or reduce quantities for purchase invoices.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Invoice
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base font-bold">Item</TableHead>
                    <TableHead className="text-right text-base font-bold">Quantity</TableHead>
                    <TableHead className="text-right text-base font-bold">Price</TableHead>
                    <TableHead className="text-right text-base font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInvoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.product_name}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">₨{Math.round(parseFloat(item.price)).toLocaleString('en-PK')}</TableCell>
                      <TableCell className="text-right text-sm">₨{Math.round(parseFloat(item.total)).toLocaleString('en-PK')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-base font-bold">Total</TableCell>
                    <TableCell className="text-right text-base font-bold">₨{Math.round(parseFloat(selectedInvoice.total)).toLocaleString('en-PK')}</TableCell>
                  </TableRow>
                  {/* Show Amount Paid for both sales and purchase invoices */}
                  <TableRow>
                    <TableCell colSpan={3} className="text-base font-bold text-blue-600">Amount Paid</TableCell>
                    <TableCell className="text-right text-base font-bold text-blue-600">₨{Math.round(parseFloat(selectedInvoice.amount_paid || '0')).toLocaleString('en-PK')}</TableCell>
                  </TableRow>
                  {/* Show remaining balance and payment status for loans (both sales and purchase) */}
                  {selectedInvoice.is_loan && (
                    <>
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm font-medium text-red-600">Remaining Balance</TableCell>
                        <TableCell className="text-right text-sm font-medium text-red-600">₨{Math.round(parseFloat(selectedInvoice.remaining_balance)).toLocaleString('en-PK')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm font-medium">Payment Status</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            selectedInvoice.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : selectedInvoice.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedInvoice.payment_status_display}
                          </span>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableFooter>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">Tajjamul Traders - Thank you!</div>
              <div className="text-sm font-medium">
                {activeTab === "sales"
                  ? "Return within 7 days"
                  : selectedInvoice.is_loan
                    ? `Loan - ${selectedInvoice.payment_status_display}`
                    : "Purchase completed"
                }
              </div>
            </CardFooter>
          </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    {activeTab === "sales"
                      ? salesInvoices.length === 0
                        ? "No sales invoices found. Create your first sale!"
                        : "Select a sales invoice to view details"
                      : purchaseInvoices.length === 0
                        ? "No purchase invoices found"
                        : "Select a purchase invoice to view details"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Tabs>
  )
}
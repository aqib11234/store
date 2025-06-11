"use client"

import { useState, useEffect } from "react"
import { getSalesInvoices, getPurchaseInvoices, deleteSalesInvoice, deletePurchaseInvoice, type SalesInvoice, type PurchaseInvoice } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Printer, Trash2 } from "lucide-react"
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

export function InvoiceViewer() {
  const [activeTab, setActiveTab] = useState("sales")
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | PurchaseInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch invoices data
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true)
        const [salesResponse, purchaseResponse] = await Promise.all([
          getSalesInvoices(),
          getPurchaseInvoices()
        ])

        setSalesInvoices(salesResponse.results)
        setPurchaseInvoices(purchaseResponse.results)

        // Set initial selected invoice
        if (activeTab === "sales" && salesResponse.results.length > 0) {
          setSelectedInvoice(salesResponse.results[0])
        } else if (activeTab === "purchases" && purchaseResponse.results.length > 0) {
          setSelectedInvoice(purchaseResponse.results[0])
        }

        setError(null)
      } catch (err) {
        setError('Failed to fetch invoices')
        console.error('Error fetching invoices:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const invoices = value === "sales" ? salesInvoices : purchaseInvoices
    setSelectedInvoice(invoices.length > 0 ? invoices[0] : null)
  }

  const handleInvoiceSelect = (invoiceId: string) => {
    const invoices = activeTab === "sales" ? salesInvoices : purchaseInvoices
    const invoice = invoices.find((inv) => inv.invoice_id === invoiceId)
    if (invoice) {
      setSelectedInvoice(invoice)
    }
  }

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
        setSalesInvoices(prev => prev.filter(invoice => invoice.id !== selectedInvoice.id))
      } else {
        await deletePurchaseInvoice(selectedInvoice.id)
        setPurchaseInvoices(prev => prev.filter(invoice => invoice.id !== selectedInvoice.id))
      }

      // Clear selected invoice and select the first available one
      const remainingInvoices = activeTab === "sales"
        ? salesInvoices.filter(invoice => invoice.id !== selectedInvoice.id)
        : purchaseInvoices.filter(invoice => invoice.id !== selectedInvoice.id)

      setSelectedInvoice(remainingInvoices.length > 0 ? remainingInvoices[0] : null)

    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice. Please try again.')
    }
  }

  const generatePrintableInvoice = (invoice: SalesInvoice | PurchaseInvoice) => {
    const isSupplier = 'supplier_name' in invoice
    const partnerName = isSupplier ? (invoice as PurchaseInvoice).supplier_name : (invoice as SalesInvoice).customer_name
    const partnerLabel = isSupplier ? 'Supplier' : 'Customer'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${invoice.invoice_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 20px; }
          .invoice-details div { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>${invoice.invoice_id}</h2>
        </div>

        <div class="invoice-details">
          <div><strong>Date:</strong> ${invoice.date}</div>
          <div><strong>Time:</strong> ${new Date(invoice.time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}</div>
          <div><strong>${partnerLabel}:</strong> ${partnerName}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">₨${Math.round(parseFloat(item.price)).toLocaleString('en-PK')}</td>
                <td class="text-right">₨${Math.round(parseFloat(item.total)).toLocaleString('en-PK')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3"><strong>Total</strong></td>
              <td class="text-right"><strong>₨${Math.round(parseFloat(invoice.total)).toLocaleString('en-PK')}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${activeTab === "sales" ? "Payment due within 30 days" : "Payment processed"}</p>
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
        <TabsTrigger value="sales">Sales Invoices</TabsTrigger>
        <TabsTrigger value="purchases">Purchase Invoices</TabsTrigger>
      </TabsList>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{activeTab === "sales" ? "Sales Invoices" : "Purchase Invoices"}</CardTitle>
              <CardDescription>Select an invoice to view details</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <TabsContent value="sales" className="m-0">
                <div className="space-y-1 p-4">
                  {salesInvoices.map((invoice) => (
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
                </div>
              </TabsContent>
              <TabsContent value="purchases" className="m-0">
                <div className="space-y-1 p-4">
                  {purchaseInvoices.map((invoice) => (
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
                </div>
              </TabsContent>
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
                </TableFooter>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">Thank you for your business</div>
              <div className="text-sm font-medium">
                {activeTab === "sales" ? "Payment due within 30 days" : "Payment processed"}
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

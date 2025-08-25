"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import { getSuppliers, getProducts, createPurchaseInvoice, createAccountTransaction, type Supplier, type Product } from "@/lib/api"
import { toast } from "sonner"

interface PurchaseItem {
  product: number
  quantity: number
  price: number
  salePrice?: number // Added sale price field
}

interface AddPurchaseDialogProps {
  onPurchaseAdded?: () => void
}

export function AddPurchaseDialog({ onPurchaseAdded }: AddPurchaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null)
  const [items, setItems] = useState<PurchaseItem[]>([{ product: 0, quantity: 1, price: 0 }])
  const [isLoan, setIsLoan] = useState(false)
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [notes, setNotes] = useState("")
  const [supplierBalance, setSupplierBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  // Fetch supplier balance when supplier changes
  useEffect(() => {
    if (selectedSupplier) {
      fetchSupplierBalance(selectedSupplier)
    } else {
      setSupplierBalance(null)
    }
  }, [selectedSupplier])

  const loadData = async () => {
    try {
      const [suppliersResponse, productsResponse] = await Promise.all([
        getSuppliers(),
        getProducts(new URLSearchParams({ page_size: '1000' }))
      ])
      setSuppliers(suppliersResponse.results)
      setProducts(productsResponse.results)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load suppliers and products')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form
      setSelectedSupplier(null)
      setItems([{ product: 0, quantity: 1, price: 0 }])
      setIsLoan(false)
      setAmountPaid(0)
      setNotes("")
      setLoading(false)
      setSupplierBalance(null)
      setLoadingBalance(false)
    }
  }

  // Fetch supplier balance when supplier is selected
  const fetchSupplierBalance = async (supplierId: number) => {
    if (!supplierId) {
      setSupplierBalance(null)
      return
    }

    try {
      setLoadingBalance(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/supplier-ledgers/?supplier=${supplierId}`)
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        setSupplierBalance(data.results[0].current_balance)
      } else {
        setSupplierBalance(0)
      }
    } catch (error) {
      console.error('Error fetching supplier balance:', error)
      setSupplierBalance(null)
    } finally {
      setLoadingBalance(false)
    }
  }

  const addItem = () => {
    setItems([...items, { product: 0, quantity: 1, price: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof PurchaseItem, value: number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSupplier) {
      toast.error('Please select a supplier')
      return
    }

    if (items.some(item => !item.product || item.quantity <= 0 || item.price <= 0)) {
      toast.error('Please fill in all item details correctly')
      return
    }

    const total = calculateTotal()
    if (amountPaid > total) {
      toast.error('Amount paid cannot exceed total amount')
      return
    }

    setLoading(true)

    try {
      const purchaseData = {
        supplier: selectedSupplier,
        date: new Date().toISOString().split('T')[0],
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price.toString()
        })),
        notes,
        is_loan: isLoan,
        amount_paid: amountPaid // Always use the user's input for amount paid
      }

      const invoice = await createPurchaseInvoice(purchaseData)
      
      // Create account transaction for the amount paid
      const paidAmount = amountPaid
      if (paidAmount > 0) {
        try {
          const supplierName = suppliers.find(s => s.id === selectedSupplier)?.name || 'Unknown Supplier'
          const itemsDescription = items.map(item => {
            const productName = getProductName(item.product)
            return `${productName} (${item.quantity})`
          }).join(', ')
          
          await createAccountTransaction({
            type: 'withdraw',
            amount: paidAmount.toString(),
            description: `Purchase: Invoice ${invoice.invoice_id} - ${supplierName} - ${itemsDescription}`
          })
          console.log(`Deducted ₨${paidAmount} from account balance for purchase invoice ${invoice.invoice_id}`)
        } catch (error) {
          console.error('Failed to create account transaction for purchase:', error)
          // Don't fail the purchase if account transaction fails
        }
      }
      
      const remainingBalance = total - amountPaid
      toast.success(`Purchase invoice created successfully!${remainingBalance > 0 ? ` Remaining balance: ₨${remainingBalance.toLocaleString('en-PK')}` : ' Fully paid!'}`)
      
      handleOpenChange(false)
      onPurchaseAdded?.()
    } catch (error) {
      console.error('Error creating purchase invoice:', error)
      toast.error('Failed to create purchase invoice')
    } finally {
      setLoading(false)
    }
  }

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId)
    return product ? product.name : 'Unknown Product'
  }

  const total = calculateTotal()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Purchase Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier *</Label>
            <Select value={selectedSupplier?.toString() || ""} onValueChange={(value) => setSelectedSupplier(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                <div className="col-span-4">
                  <Label htmlFor={`product-${index}`}>Product *</Label>
                  <Select value={item.product.toString()} onValueChange={(value) => updateItem(index, 'product', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} (₨{Math.round(parseFloat(product.price)).toLocaleString('en-PK')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor={`quantity-${index}`}>Quantity *</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="col-span-3">
                  <Label htmlFor={`purchase-price-${index}`}>Purchase Price (₨) *</Label>
                  <Input
                    id={`purchase-price-${index}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="col-span-3">
                  <Label htmlFor={`sale-price-${index}`}>Sale Price (₨) *</Label>
                  <Input
                    id={`sale-price-${index}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.salePrice || 0}
                    onChange={(e) => updateItem(index, 'salePrice', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label>Total</Label>
                  <div className="text-sm font-medium p-2 bg-gray-50 rounded">
                    ₨{(item.quantity * item.price).toLocaleString('en-PK')}
                  </div>
                </div>

                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Loan Options */}
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-loan"
                checked={isLoan}
                onCheckedChange={(checked) => {
                  setIsLoan(checked as boolean)
                  if (!checked) {
                    setAmountPaid(0)
                  }
                }}
              />
              <Label htmlFor="is-loan" className="text-sm font-medium">
                This is a loan/credit purchase
              </Label>
            </div>

            {/* Supplier Balance Display */}
            {supplierBalance !== null && (
              <div className={`p-2 rounded text-sm ${
                supplierBalance > 0
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : supplierBalance < 0
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-gray-50 border border-gray-200 text-gray-800'
              }`}>
                💰 Supplier Previous Balance: {supplierBalance > 0 ? 'We Owe' : supplierBalance < 0 ? 'Advance' : 'Clear'} ₨{Math.abs(supplierBalance).toLocaleString('en-PK')}
                {supplierBalance > 0 && (
                  <div className="text-xs mt-1">
                    New Total with Previous Balance: ₨{(total + supplierBalance).toLocaleString('en-PK')}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount-paid">Amount Paid (₨)</Label>
              <Input
                id="amount-paid"
                type="number"
                step="0.01"
                min="0"
                max={total}
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <div className="text-sm text-gray-600">
                Total: ₨{total.toLocaleString('en-PK')} |
                Remaining: ₨{(total - amountPaid).toLocaleString('en-PK')}
                {amountPaid === 0 && " (Leave empty or 0 for unpaid invoice)"}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-lg font-semibold">Total Amount:</span>
            <span className="text-xl font-bold">₨{total.toLocaleString('en-PK')}</span>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Purchase Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

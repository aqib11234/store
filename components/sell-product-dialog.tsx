"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ShoppingCart, Plus, Minus } from "lucide-react"
import { getProducts, getCustomers, createSalesInvoice, type Product, type Customer } from "@/lib/api"

interface SellProductDialogProps {
  onSaleCompleted?: () => void
}

interface SaleItem {
  product: Product
  quantity: number
  price: number
}

export function SellProductDialog({ onSaleCompleted }: SellProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("1")

  // Clear form when dialog is closed
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Clear all form fields when dialog is closed
      setSaleItems([])
      setSelectedCustomer("")
      setSelectedProduct("")
      setQuantity("1")
      setLoading(false)
    }
  }

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    try {
      const [productsResponse, customersResponse] = await Promise.all([
        getProducts(),
        getCustomers()
      ])
      setProducts(productsResponse.results.filter(p => p.quantity > 0))
      setCustomers(customersResponse.results)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const addItemToSale = () => {
    if (!selectedProduct || !quantity) return

    const product = products.find(p => p.id.toString() === selectedProduct)
    if (!product) return

    const qty = parseInt(quantity)
    if (qty <= 0 || qty > product.quantity) {
      alert(`Invalid quantity. Available: ${product.quantity}`)
      return
    }

    // Ensure price is a valid number
    const productPrice = parseFloat(product.price)
    if (isNaN(productPrice) || productPrice <= 0) {
      alert(`Invalid product price: ${product.price}`)
      return
    }

    const existingItemIndex = saleItems.findIndex(item => item.product.id === product.id)

    if (existingItemIndex >= 0) {
      // Update existing item
      const newItems = [...saleItems]
      const newQuantity = newItems[existingItemIndex].quantity + qty

      if (newQuantity > product.quantity) {
        alert(`Total quantity cannot exceed available stock: ${product.quantity}`)
        return
      }

      newItems[existingItemIndex].quantity = newQuantity
      setSaleItems(newItems)
    } else {
      // Add new item
      setSaleItems([...saleItems, {
        product,
        quantity: qty,
        price: productPrice
      }])
    }

    setSelectedProduct("")
    setQuantity("1")
  }

  const removeItemFromSale = (productId: number) => {
    setSaleItems(saleItems.filter(item => item.product.id !== productId))
  }

  const updateItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromSale(productId)
      return
    }

    const product = products.find(p => p.id === productId)
    if (!product || newQuantity > product.quantity) {
      alert(`Quantity cannot exceed available stock: ${product?.quantity}`)
      return
    }

    setSaleItems(saleItems.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const calculateTotal = () => {
    return saleItems.reduce((total, item) => total + (item.quantity * item.price), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer || saleItems.length === 0) {
      alert('Please select a customer and add at least one item')
      return
    }

    setLoading(true)

    try {
      // Create sales invoice
      const invoiceData = {
        customer: parseInt(selectedCustomer),
        date: new Date().toISOString().split('T')[0], // Today's date
        tax_rate: 0, // No tax
        notes: `Sale of ${saleItems.length} item(s)`,
        items: saleItems.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          price: item.price.toString()
        }))
      }

      const invoice = await createSalesInvoice(invoiceData)

      alert(`Sale completed!\nInvoice: ${invoice.invoice_id}\nTotal: ₨${Math.round(calculateTotal()).toLocaleString('en-PK')}`)

      // Close dialog (this will automatically clear the form)
      handleOpenChange(false)
      onSaleCompleted?.()

    } catch (error) {
      console.error('Error processing sale:', error)

      // Show more detailed error information
      let errorMessage = 'Failed to process sale. Please try again.'
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Sell Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Create Sale</DialogTitle>
          <DialogDescription>
            Select products and quantities to create a new sale.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Customer Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer" className="text-right">
                Customer *
              </Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Product Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Add Products</h4>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} (Stock: {product.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-3">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value
                      // Only allow positive integers
                      if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0)) {
                        setQuantity(value)
                      }
                    }}
                    min="1"
                    step="1"
                  />
                </div>

                <div className="col-span-3">
                  <Button type="button" onClick={addItemToSale} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Sale Items */}
            {saleItems.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Sale Items</h4>
                <div className="space-y-2">
                  {saleItems.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <span className="font-medium">{item.product.name}</span>
                        <span className="text-sm text-gray-500 ml-2">₨{Math.round(item.price).toLocaleString('en-PK')} each</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <span className="w-8 text-center">{item.quantity}</span>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>

                        <span className="w-20 text-right font-medium">
                          ₨{Math.round(item.quantity * item.price).toLocaleString('en-PK')}
                        </span>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItemFromSale(item.product.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-2 mt-3">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total:</span>
                      <span>₨{Math.round(calculateTotal()).toLocaleString('en-PK')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedCustomer || saleItems.length === 0}
            >
              {loading ? "Processing..." : `Complete Sale (₨${Math.round(calculateTotal()).toLocaleString('en-PK')})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

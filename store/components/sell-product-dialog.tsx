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
import { ShoppingCart, Plus, Minus, Info } from "lucide-react"
import { getProducts, getCustomers, createSalesInvoice, getLastSalePrice, type Product, type Customer } from "@/lib/api"
import { formatCurrency, formatForInput } from "@/lib/utils"

interface SellProductDialogProps {
  onSaleCompleted?: () => void
}

interface SaleItem {
  product: Product
  quantity: number
  price: number
  wasSuggested?: boolean
  lastSaleDate?: string
  originalPrice?: number
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
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [amountPaid, setAmountPaid] = useState("")
  const [lastPriceInfo, setLastPriceInfo] = useState<string | null>(null)
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null)
  const [lastSaleDate, setLastSaleDate] = useState<string | null>(null)
  const [customPrice, setCustomPrice] = useState("")
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [customerBalance, setCustomerBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  // Clear form when dialog is closed
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Clear all form fields when dialog is closed
      setSaleItems([])
      setSelectedCustomer("")
      setSelectedProduct("")
      setQuantity("1")
      setAmountPaid("")
      setLastPriceInfo(null)
      setSuggestedPrice(null)
      setLastSaleDate(null)
      setCustomPrice("")
      setUseCustomPrice(false)
      setLoading(false)
    }
  }

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  // Check last price when customer and product are selected
  useEffect(() => {
    if (selectedCustomer && selectedProduct) {
      checkLastPrice()
    } else {
      setLastPriceInfo(null)
      setSuggestedPrice(null)
      setLastSaleDate(null)
      setCustomPrice("")
      setUseCustomPrice(false)
      setCustomerBalance(null)
      setLoadingBalance(false)
    }

    // Fetch customer balance when customer changes
    if (selectedCustomer) {
      fetchCustomerBalance(selectedCustomer)
    }
  }, [selectedCustomer, selectedProduct])

  // Fetch customer balance when customer is selected
  const fetchCustomerBalance = async (customerId: string) => {
    if (!customerId) {
      setCustomerBalance(null)
      return
    }

    try {
      setLoadingBalance(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customer-ledgers/?customer=${customerId}`)
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        setCustomerBalance(data.results[0].current_balance)
      } else {
        setCustomerBalance(0)
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error)
      setCustomerBalance(null)
    } finally {
      setLoadingBalance(false)
    }
  }, [selectedCustomer, selectedProduct])

  const fetchData = async () => {
    try {
      const [productsResponse, customersResponse] = await Promise.all([
        getProducts(new URLSearchParams({ page_size: '1000' })),
        getCustomers()
      ])
      setProducts(productsResponse.results.filter(p => p.quantity > 0))
      setCustomers(customersResponse.results)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const checkLastPrice = async () => {
    if (!selectedCustomer || !selectedProduct) return

    try {
      const customerId = parseInt(selectedCustomer)
      const productId = parseInt(selectedProduct)
      
      const response = await getLastSalePrice(customerId, productId)
      
      if (response.found && response.last_price) {
        const lastPrice = parseFloat(response.last_price)
        setLastPriceInfo(response.message)
        setSuggestedPrice(lastPrice)
        setLastSaleDate(response.last_sale_date || null)
      } else {
        setLastPriceInfo(response.message)
        setSuggestedPrice(null)
        setLastSaleDate(null)
      }
    } catch (error) {
      console.error('Error checking last price:', error)
      setLastPriceInfo(null)
      setSuggestedPrice(null)
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

    // Determine which price to use
    let productPrice: number
    let wasSuggested = false
    const originalPrice = parseFloat(product.sale_price || product.price)
    
    if (useCustomPrice && customPrice) {
      productPrice = parseFloat(customPrice)
      if (isNaN(productPrice) || productPrice <= 0) {
        alert(`Invalid custom price: ${customPrice}`)
        return
      }
    } else if (suggestedPrice) {
      productPrice = suggestedPrice
      wasSuggested = true
    } else {
      productPrice = originalPrice
    }
    
    if (isNaN(productPrice) || productPrice <= 0) {
      alert(`Invalid product price: ${productPrice}`)
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
        price: productPrice,
        wasSuggested,
        lastSaleDate: wasSuggested ? lastSaleDate || undefined : undefined,
        originalPrice: wasSuggested ? originalPrice : undefined
      }])
    }

    setSelectedProduct("")
    setQuantity("1")
    setLastPriceInfo(null)
    setSuggestedPrice(null)
    setLastSaleDate(null)
    setCustomPrice("")
    setUseCustomPrice(false)
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
    // Set default amount paid to total amount (properly formatted)
    setAmountPaid(formatForInput(calculateTotal(), true))
    setShowPaymentDialog(true)
  }

  // Payment dialog submit handler
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const totalAmount = calculateTotal()
      const paidAmount = parseFloat(amountPaid) || 0
      const isLoan = paidAmount < totalAmount
      const remainingBalance = totalAmount - paidAmount

      // Create sales invoice
      const invoiceData = {
        customer: parseInt(selectedCustomer),
        date: new Date().toISOString().split('T')[0],
        tax_rate: 0, // No tax
        notes: `Sale of ${saleItems.length} item(s). ${isLoan ? `Loan: ₨${remainingBalance.toFixed(2)} remaining` : 'Fully paid'}`,
        items: saleItems.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          price: item.price.toString()
        })),
        is_loan: isLoan,
        amount_paid: paidAmount
      }
      const invoice = await createSalesInvoice(invoiceData)
      
      let message = `Sale completed!\nInvoice: ${invoice.invoice_id}\nTotal: ₨${Math.round(totalAmount).toLocaleString('en-PK')}\nPaid: ₨${paidAmount.toLocaleString('en-PK')}`
      if (isLoan) {
        message += `\nRemaining: ₨${Math.round(remainingBalance).toLocaleString('en-PK')}`
      }
      
      alert(message)
      setShowPaymentDialog(false)
      handleOpenChange(false)
      onSaleCompleted?.()
    } catch (error) {
      console.error('Error processing sale:', error)
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
    <>
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

                <div className="space-y-3">
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

                  {/* Price Selection Section */}
                  {selectedProduct && selectedCustomer && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">💰 Price Selection</Label>
                      <div className="space-y-2">
                        {/* Suggested Price Option */}
                        {suggestedPrice && (
                          <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded">
                            <input
                              type="radio"
                              id="suggested-price"
                              name="price-option"
                              checked={!useCustomPrice}
                              onChange={() => setUseCustomPrice(false)}
                              className="text-green-600"
                            />
                            <label htmlFor="suggested-price" className="flex-1 text-sm cursor-pointer">
                              <span className="font-medium text-green-700">
                              💡 Suggested: {formatCurrency(suggestedPrice, 0)}
                              </span>
                              <span className="text-green-600 ml-2 block text-xs">
                                Last sold on {lastSaleDate}
                              </span>
                            </label>
                          </div>
                        )}
                        
                        {/* Default Price Option */}
                        <div className="flex items-center space-x-2 p-2 bg-gray-100 border border-gray-200 rounded">
                          <input
                            type="radio"
                            id="default-price"
                            name="price-option"
                            checked={!useCustomPrice && !suggestedPrice}
                            onChange={() => setUseCustomPrice(false)}
                            className="text-blue-600"
                          />
                          <label htmlFor="default-price" className="flex-1 text-sm cursor-pointer">
                            <span className="font-medium text-gray-700">
                              🏷️ Default: {formatCurrency(products.find(p => p.id.toString() === selectedProduct)?.sale_price || products.find(p => p.id.toString() === selectedProduct)?.price || '0', 0)}
                            </span>
                            <span className="text-gray-500 block text-xs">Regular selling price</span>
                          </label>
                        </div>

                        {/* Custom Price Option */}
                        <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <input
                            type="radio"
                            id="custom-price"
                            name="price-option"
                            checked={useCustomPrice}
                            onChange={() => setUseCustomPrice(true)}
                            className="text-blue-600"
                          />
                          <div className="flex-1 flex items-center space-x-2">
                            <label htmlFor="custom-price" className="text-sm font-medium text-blue-700 cursor-pointer">
                              ✏️ Custom:
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                              placeholder="Enter price"
                              className="w-32 h-8 text-sm"
                              disabled={!useCustomPrice}
                              onFocus={() => setUseCustomPrice(true)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price History Information */}
                  {lastPriceInfo && !suggestedPrice && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-yellow-800 font-medium">No Previous Sales</p>
                          <p className="text-yellow-700">{lastPriceInfo}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sale Items */}
              {saleItems.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Sale Items</h4>
                  <div className="space-y-2">
                    {saleItems.map((item) => (
                      <div key={item.product.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{item.product.name}</span>
                              {item.wasSuggested && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  💡 Suggested Price
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>{formatCurrency(item.price, 0)} each</span>
                              {item.wasSuggested && item.originalPrice && item.originalPrice !== item.price && (
                                <span className="text-gray-400 line-through">
                                  {formatCurrency(item.originalPrice, 0)} (default)
                                </span>
                              )}
                              {item.lastSaleDate && (
                                <span className="text-green-600 text-xs">
                                  Last sold: {item.lastSaleDate}
                                </span>
                              )}
                            </div>
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

                            <span className="w-8 text-center font-medium">{item.quantity}</span>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>

                            <span className="w-24 text-right font-bold text-gray-900">
                              {formatCurrency(item.quantity * item.price, 0)}
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
                      </div>
                    ))}

                    <div className="border-t pt-2 mt-3">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal(), 0)}</span>
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
                {loading ? "Processing..." : `Complete Sale (${formatCurrency(calculateTotal(), 0)})`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Payment Dialog */}
      {showPaymentDialog && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Customer Payment Details</DialogTitle>
              <DialogDescription>
                Enter payment details for this sale (Total: {formatCurrency(calculateTotal(), 0)})

                {/* Customer Balance Display */}
                {customerBalance !== null && (
                  <div className={`mt-2 p-2 rounded text-sm ${
                    customerBalance > 0
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : customerBalance < 0
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-gray-50 border border-gray-200 text-gray-800'
                  }`}>
                    💰 Customer Previous Balance: {customerBalance > 0 ? 'Owes' : customerBalance < 0 ? 'Credit' : 'Clear'} {formatCurrency(Math.abs(customerBalance), 0)}
                    {customerBalance > 0 && (
                      <div className="text-xs mt-1">
                        New Total with Previous Balance: {formatCurrency(calculateTotal() + customerBalance, 0)}
                      </div>
                    )}
                  </div>
                )}

                {saleItems.some(item => item.wasSuggested) && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    💡 This sale includes {saleItems.filter(item => item.wasSuggested).length} item(s) with suggested pricing based on previous sales to this customer.
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amountPaid" className="text-right">Amount Paid (₨)</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    step="0.01"
                    min="0"
                    max={calculateTotal()}
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter amount paid"
                    required
                  />
                </div>

                {/* Payment Status Display */}
                {amountPaid && parseFloat(amountPaid) > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="font-medium">{formatCurrency(calculateTotal(), 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(parseFloat(amountPaid), 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining Balance:</span>
                        <span className={`font-medium ${calculateTotal() - parseFloat(amountPaid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(calculateTotal() - parseFloat(amountPaid), 0)}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className={`text-sm font-medium ${calculateTotal() - parseFloat(amountPaid) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {calculateTotal() - parseFloat(amountPaid) > 0 ? '⚠️ This will create a customer loan' : '✅ Fully paid'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
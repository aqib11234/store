"use client"

import { useState, useEffect } from "react"
import { getProducts, getCustomers, createSalesInvoice, createCustomer, getLastSalePrice, type Product, type Customer } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, User } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"

interface CartItem {
  product: Product
  quantity: number
  price: number
  total: number
  customPrice?: boolean
  wasSuggested?: boolean
  lastSaleDate?: string
  originalPrice?: number
}

export function POSSystem() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [editingPrice, setEditingPrice] = useState<number | null>(null)
  const [customPriceValue, setCustomPriceValue] = useState("")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [amountPaid, setAmountPaid] = useState("")
  const [editingOrderPrice, setEditingOrderPrice] = useState<number | null>(null)
  const [orderCustomPriceValue, setOrderCustomPriceValue] = useState("")

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [productsResponse, customersResponse] = await Promise.all([
          getProducts(),
          getCustomers()
        ])
        
        setProducts(productsResponse.results)
        setFilteredProducts(productsResponse.results)
        setCustomers(customersResponse.results)
        setFilteredCustomers(customersResponse.results)
      } catch (error) {
        console.error('Error loading POS data:', error)
        toast.error('Failed to load POS data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter products based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchQuery, products])

  // Filter customers based on search
  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.phone?.includes(customerSearchQuery)
      )
      setFilteredCustomers(filtered)
    }
  }, [customerSearchQuery, customers])

  // Add product to cart with price suggestion
  const addToCart = async (product: Product) => {
    if (product.quantity <= 0) {
      toast.error('Product is out of stock')
      return
    }

    const existingItem = cart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        toast.error('Cannot add more than available stock')
        return
      }
      updateCartQuantity(product.id, existingItem.quantity + 1)
    } else {
      let price = parseFloat(product.sale_price || product.price)
      let wasSuggested = false
      let lastSaleDate: string | undefined
      let originalPrice: number | undefined

      // Check for suggested price if customer is selected
      if (selectedCustomer) {
        try {
          const response = await getLastSalePrice(selectedCustomer.id, product.id)
          if (response.found && response.last_price) {
            const suggestedPrice = parseFloat(response.last_price)
            originalPrice = price
            price = suggestedPrice
            wasSuggested = true
            lastSaleDate = response.last_sale_date || undefined
            toast.success(`💡 Using suggested price ₨${suggestedPrice.toLocaleString('en-PK')} for ${product.name}`)
          }
        } catch (error) {
          console.error('Error checking last price:', error)
          // Continue with default price if suggestion fails
        }
      }

      const newItem: CartItem = {
        product,
        quantity: 1,
        price,
        total: price,
        wasSuggested,
        lastSaleDate,
        originalPrice
      }
      setCart([...cart, newItem])
      
      if (!wasSuggested) {
        toast.success(`${product.name} added to cart`)
      }
    }
  }

  // Update cart item quantity
  const updateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find(p => p.id === productId)
    if (product && newQuantity > product.quantity) {
      toast.error('Cannot exceed available stock')
      return
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
        : item
    ))
  }

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId))
    toast.success('Item removed from cart')
  }

  // Clear entire cart
  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setCustomerSearchQuery("")
    setEditingPrice(null)
    setCustomPriceValue("")
    setEditingOrderPrice(null)
    setOrderCustomPriceValue("")
    setAmountPaid("")
    toast.success('Cart cleared')
  }

  // Update cart item price
  const updateCartPrice = (productId: number, newPrice: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              price: newPrice,
              total: newPrice * item.quantity,
              customPrice: true
            }
          : item
      )
    )
  }

  // Handle custom price editing
  const startEditingPrice = (productId: number, currentPrice: number) => {
    setEditingPrice(productId)
    setCustomPriceValue(currentPrice.toString())
  }

  const saveCustomPrice = (productId: number) => {
    const newPrice = parseFloat(customPriceValue)
    if (!isNaN(newPrice) && newPrice > 0) {
      updateCartPrice(productId, newPrice)
      toast.success('Price updated successfully')
    } else {
      toast.error('Please enter a valid price')
    }
    setEditingPrice(null)
    setCustomPriceValue("")
  }

  const cancelEditingPrice = () => {
    setEditingPrice(null)
    setCustomPriceValue("")
  }

  // Handle order summary price editing
  const startEditingOrderPrice = (productId: number, currentPrice: number) => {
    setEditingOrderPrice(productId)
    setOrderCustomPriceValue(currentPrice.toString())
  }

  const saveOrderCustomPrice = (productId: number) => {
    const newPrice = parseFloat(orderCustomPriceValue)
    if (!isNaN(newPrice) && newPrice > 0) {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId
            ? {
                ...item,
                price: newPrice,
                total: newPrice * item.quantity,
                customPrice: true,
                wasSuggested: false // Reset suggested flag when manually edited
              }
            : item
        )
      )
      toast.success('Price updated in order summary')
    } else {
      toast.error('Please enter a valid price')
    }
    setEditingOrderPrice(null)
    setOrderCustomPriceValue("")
  }

  const cancelEditingOrderPrice = () => {
    setEditingOrderPrice(null)
    setOrderCustomPriceValue("")
  }

  // Update cart with price suggestions when customer is selected
  const updateCartWithSuggestions = async (customer: Customer) => {
    if (cart.length === 0) return

    const updatedCart = await Promise.all(
      cart.map(async (item) => {
        // Skip if item already has a suggested price or custom price
        if (item.wasSuggested || item.customPrice) {
          return item
        }

        try {
          const response = await getLastSalePrice(customer.id, item.product.id)
          if (response.found && response.last_price) {
            const suggestedPrice = parseFloat(response.last_price)
            const originalPrice = parseFloat(item.product.sale_price || item.product.price)
            
            toast.success(`💡 Updated ${item.product.name} with suggested price ₨${suggestedPrice.toLocaleString('en-PK')}`)
            
            return {
              ...item,
              price: suggestedPrice,
              total: suggestedPrice * item.quantity,
              wasSuggested: true,
              lastSaleDate: response.last_sale_date || undefined,
              originalPrice: originalPrice
            }
          }
        } catch (error) {
          console.error('Error checking last price for', item.product.name, error)
        }
        return item
      })
    )

    setCart(updatedCart)
  }

  // Handle customer selection or creation
  const handleCustomerSelect = async (customerName: string) => {
    // Check if customer exists
    const existingCustomer = customers.find(c =>
      c.name.toLowerCase() === customerName.toLowerCase()
    )

    if (existingCustomer) {
      setSelectedCustomer(existingCustomer)
      setCustomerSearchQuery(existingCustomer.name)
      setShowCustomerDropdown(false)
      
      // Update cart with price suggestions for this customer
      await updateCartWithSuggestions(existingCustomer)
    } else if (customerName.trim()) {
      // Create new customer
      try {
        const newCustomer = await createCustomer({
          name: customerName.trim(),
          contact_person: customerName.trim(),
          email: '',
          phone: '',
          address: ''
        })

        // Update customers list
        const updatedCustomers = [...customers, newCustomer]
        setCustomers(updatedCustomers)
        setFilteredCustomers(updatedCustomers)

        // Select the new customer
        setSelectedCustomer(newCustomer)
        setCustomerSearchQuery(newCustomer.name)
        setShowCustomerDropdown(false)

        toast.success(`Customer "${customerName}" created and selected`)
        
        // No need to update cart prices for new customer (no previous sales)
      } catch (error) {
        console.error('Error creating customer:', error)
        toast.error('Failed to create customer')
      }
    }
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const taxRate = 0.0 // No tax as per user preference
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  // Handle checkout button click
  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }

    // Set default amount paid to total amount (as string)
    setAmountPaid(total.toString())
    setShowCheckout(false)
    setShowPaymentDialog(true)
  }

  // Process sale with payment details
  const processSale = async () => {
    try {
      setProcessing(true)

      const paidAmount = parseFloat(amountPaid) || 0
      const isLoan = paidAmount < total
      const remainingBalance = total - paidAmount

      const invoiceData = {
        customer: selectedCustomer!.id,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        items: cart.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          price: item.price.toFixed(2) // Ensure 2 decimal places
        })),
        tax_rate: 0.0, // Explicitly set as number
        notes: `POS Sale - ${cart.length} items. ${isLoan ? `Loan: ₨${remainingBalance.toFixed(2)} remaining` : 'Fully paid'}`,
        is_loan: isLoan,
        amount_paid: paidAmount
      }

      console.log('Sending invoice data:', invoiceData)
      const invoice = await createSalesInvoice(invoiceData)

      let message = `Sale completed!\nInvoice: ${invoice.invoice_id}\nTotal: ₨${Math.round(total).toLocaleString('en-PK')}\nPaid: ₨${paidAmount.toLocaleString('en-PK')}`
      if (isLoan) {
        message += `\nRemaining: ₨${Math.round(remainingBalance).toLocaleString('en-PK')}`
      }

      toast.success(message)

      // Clear cart and close dialogs
      clearCart()
      setShowPaymentDialog(false)
      setShowCheckout(false)

      // Refresh products to update stock
      const productsResponse = await getProducts()
      setProducts(productsResponse.results)
      setFilteredProducts(productsResponse.results)

      // Reset customer search
      setCustomerSearchQuery("")
      setShowCustomerDropdown(false)

    } catch (error: any) {
      console.error('Error processing sale:', error)

      // Try to get more specific error message
      let errorMessage = 'Failed to process sale'

      if (error?.message?.includes('HTTP error')) {
        // Parse the error message to get the actual server response
        const match = error.message.match(/message: (.+)$/)
        if (match) {
          try {
            const serverError = JSON.parse(match[1])
            if (typeof serverError === 'object') {
              if (serverError.detail) {
                errorMessage = serverError.detail
              } else if (serverError.error) {
                errorMessage = serverError.error
              } else if (serverError.non_field_errors) {
                errorMessage = Array.isArray(serverError.non_field_errors)
                  ? serverError.non_field_errors.join(', ')
                  : serverError.non_field_errors
              } else {
                errorMessage = JSON.stringify(serverError)
              }
            } else if (typeof serverError === 'string') {
              errorMessage = serverError
            }
          } catch {
            errorMessage = match[1]
          }
        }
      } else if (error?.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading POS system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="h-6 w-6" />
              Products
            </CardTitle>
            <CardDescription className="text-base">Select products to add to cart</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-base h-11"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    product.quantity <= 0 ? 'opacity-50' : ''
                  }`}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-lg leading-tight">{product.name}</h4>
                        <Badge variant={product.status === 'in_stock' ? 'default' : 'destructive'} className="text-base px-3 py-1">
                          {product.status_display}
                        </Badge>
                      </div>
                      <p className="text-base text-muted-foreground font-medium">{product.supplier_name}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xl">₨{Math.round(parseFloat(product.sale_price || product.price)).toLocaleString('en-PK')}</span>
                        <span className="text-base text-muted-foreground font-medium">Stock: {product.quantity}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl">
              <span className="flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Cart ({cart.length})
              </span>
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-lg">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-lg truncate">{item.product.name}</p>
                            {item.wasSuggested && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                💡 Suggested
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {editingPrice === item.product.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={customPriceValue}
                                  onChange={(e) => setCustomPriceValue(e.target.value)}
                                  className="w-24 h-10 text-base"
                                  placeholder="Price"
                                  step="0.01"
                                  min="0"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => saveCustomPrice(item.product.id)}
                                  className="h-10 px-3 text-base"
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditingPrice}
                                  className="h-10 px-3 text-base"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base text-muted-foreground font-medium">
                                    ₨{Math.round(item.price).toLocaleString('en-PK')} each
                                    {item.customPrice && <span className="text-blue-600 ml-1 font-semibold">(custom)</span>}
                                    {item.wasSuggested && <span className="text-green-600 ml-1 font-semibold">(suggested)</span>}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingPrice(item.product.id, item.price)}
                                    className="h-8 w-8 p-0 text-base"
                                    title="Edit price"
                                  >
                                    ✏️
                                  </Button>
                                </div>
                                {item.wasSuggested && item.originalPrice && item.originalPrice !== item.price && (
                                  <span className="text-xs text-gray-400 line-through">
                                    Default: ₨{Math.round(item.originalPrice).toLocaleString('en-PK')}
                                  </span>
                                )}
                                {item.lastSaleDate && (
                                  <span className="text-xs text-green-600">
                                    Last sold: {item.lastSaleDate}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="h-10 w-10 p-0"
                          >
                            <Minus className="h-5 w-5" />
                          </Button>
                          <span className="w-16 text-center text-xl font-bold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="h-10 w-10 p-0"
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xl">₨{Math.round(item.total).toLocaleString('en-PK')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-lg font-medium">
                    <span>Subtotal:</span>
                    <span>₨{Math.round(subtotal).toLocaleString('en-PK')}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-lg font-medium">
                      <span>Tax ({taxRate}%):</span>
                      <span>₨{Math.round(taxAmount).toLocaleString('en-PK')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-2xl border-t pt-3">
                    <span>Total:</span>
                    <span>₨{Math.round(total).toLocaleString('en-PK')}</span>
                  </div>
                </div>

                <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
                  <DialogTrigger asChild>
                    <Button className="w-full text-xl py-6" size="lg">
                      Checkout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Select Customer</DialogTitle>
                      <DialogDescription>
                        Choose a customer for this sale
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer">Customer</Label>
                        <div className="relative">
                          <Input
                            placeholder="Type customer name or search..."
                            value={customerSearchQuery}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value)
                              setShowCustomerDropdown(true)
                            }}
                            onFocus={() => setShowCustomerDropdown(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customerSearchQuery.trim()) {
                                handleCustomerSelect(customerSearchQuery)
                              }
                            }}
                            className="pr-10"
                          />
                          <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                          {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                              {filteredCustomers.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                                  onClick={() => handleCustomerSelect(customer.name)}
                                >
                                  <User className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">{customer.name}</div>
                                    {customer.phone && (
                                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {showCustomerDropdown && customerSearchQuery.trim() &&
                           !filteredCustomers.some(c => c.name.toLowerCase() === customerSearchQuery.toLowerCase()) && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-primary"
                                onClick={() => handleCustomerSelect(customerSearchQuery)}
                              >
                                <Plus className="h-4 w-4" />
                                <div>Create new customer: "{customerSearchQuery}"</div>
                              </button>
                            </div>
                          )}
                        </div>

                        {selectedCustomer && (
                          <div className="text-sm text-muted-foreground">
                            Selected: {selectedCustomer.name}
                          </div>
                        )}
                      </div>

                      <div className="bg-muted p-3 rounded">
                        <h4 className="font-medium mb-2">Order Summary</h4>
                        <div className="space-y-3 text-sm">
                          {cart.map((item) => (
                            <div key={item.product.id} className="space-y-2 p-3 bg-gray-50 rounded border border-gray-200 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900">{item.product.name} x{item.quantity}</span>
                                    {item.wasSuggested && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        💡
                                      </span>
                                    )}
                                    {item.customPrice && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        ✏️
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Price editing section */}
                                  {editingOrderPrice === item.product.id ? (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input
                                        type="number"
                                        value={orderCustomPriceValue}
                                        onChange={(e) => setOrderCustomPriceValue(e.target.value)}
                                        className="w-24 h-8 text-sm font-medium text-black bg-white border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        placeholder="Enter price"
                                        step="0.01"
                                        min="0"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => saveOrderCustomPrice(item.product.id)}
                                        className="h-8 px-3 text-sm bg-green-600 hover:bg-green-700"
                                      >
                                        ✓
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={cancelEditingOrderPrice}
                                        className="h-8 px-3 text-sm border-gray-300 hover:bg-gray-100"
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-black font-semibold">₨{Math.round(item.price).toLocaleString('en-PK')} each</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditingOrderPrice(item.product.id, item.price)}
                                        className="h-7 w-7 p-0 text-sm hover:bg-blue-100 rounded-full"
                                        title="Edit price"
                                      >
                                        ✏️
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {item.wasSuggested && item.lastSaleDate && (
                                    <div className="text-xs text-green-600 mt-1 font-medium">
                                      Last sold: ₨{Math.round(item.originalPrice || item.price).toLocaleString('en-PK')} on {item.lastSaleDate}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-lg text-gray-900">₨{Math.round(item.total).toLocaleString('en-PK')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <Separator className="my-2" />
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>���{Math.round(total).toLocaleString('en-PK')}</span>
                          </div>
                        </div>
                        {cart.some(item => item.wasSuggested) && (
                          <div className="text-xs text-green-600 mt-2 p-2 bg-green-50 rounded">
                            💡 This order includes {cart.filter(item => item.wasSuggested).length} item(s) with suggested pricing based on previous sales to this customer.
                          </div>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCheckout(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCheckoutClick} 
                        disabled={!selectedCustomer}
                      >
                        Continue to Payment
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Customer Payment Details</DialogTitle>
            <DialogDescription>
              Enter payment details for this sale (Total: ₨{Math.round(total).toLocaleString('en-PK')})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amountPaid" className="text-right">Amount Paid (₨)</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min="0"
                max={total}
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
                    <span className="font-medium">₨{Math.round(total).toLocaleString('en-PK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span className="font-medium text-blue-600">₨{parseFloat(amountPaid).toLocaleString('en-PK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Balance:</span>
                    <span className={`font-medium ${total - parseFloat(amountPaid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₨{Math.round(total - parseFloat(amountPaid)).toLocaleString('en-PK')}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className={`text-sm font-medium ${total - parseFloat(amountPaid) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {total - parseFloat(amountPaid) > 0 ? '⚠️ This will create a customer loan' : '✅ Fully paid'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={processSale} disabled={processing}>
              {processing ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
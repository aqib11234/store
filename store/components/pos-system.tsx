"use client"

import { useState, useEffect } from "react"
import { getProducts, getCustomers, createSalesInvoice, createCustomer, type Product, type Customer } from "@/lib/api"
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
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
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
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.contact_person.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.phone.includes(customerSearchQuery)
      )
      setFilteredCustomers(filtered)
    }
  }, [customerSearchQuery, customers])

  // Add product to cart
  const addToCart = (product: Product) => {
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
      const newItem: CartItem = {
        product,
        quantity: 1,
        price: parseFloat(product.price),
        total: parseFloat(product.price)
      }
      setCart([...cart, newItem])
      toast.success(`${product.name} added to cart`)
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
    toast.success('Cart cleared')
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

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }

    try {
      setProcessing(true)

      const invoiceData = {
        customer: selectedCustomer.id,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        items: cart.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          price: item.price.toFixed(2) // Ensure 2 decimal places
        })),
        tax_rate: 0.0, // Explicitly set as number
        notes: `POS Sale - ${cart.length} items`
      }

      console.log('Sending invoice data:', invoiceData)
      const invoice = await createSalesInvoice(invoiceData)

      toast.success(`Sale completed! Invoice: ${invoice.invoice_id}`)

      // Clear cart and close checkout
      clearCart()
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
      if (error?.response?.data) {
        errorMessage = JSON.stringify(error.response.data)
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
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Products
            </CardTitle>
            <CardDescription>Select products to add to cart</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
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
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm leading-tight">{product.name}</h4>
                        <Badge variant={product.status === 'in_stock' ? 'default' : 'destructive'} className="text-xs">
                          {product.status_display}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{product.supplier_name}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">₨{Math.round(parseFloat(product.price)).toLocaleString('en-PK')}</span>
                        <span className="text-xs text-muted-foreground">Stock: {product.quantity}</span>
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
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
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
              <p className="text-center text-muted-foreground py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">₨{item.price.toLocaleString('en-PK')} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₨{Math.round(subtotal).toLocaleString('en-PK')}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax ({taxRate}%):</span>
                      <span>₨{Math.round(taxAmount).toLocaleString('en-PK')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>₨{Math.round(total).toLocaleString('en-PK')}</span>
                  </div>
                </div>

                <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      Checkout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Complete Sale</DialogTitle>
                      <DialogDescription>
                        Select customer and confirm the sale
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
                        <div className="space-y-1 text-sm">
                          {cart.map((item) => (
                            <div key={item.product.id} className="flex justify-between">
                              <span>{item.product.name} x{item.quantity}</span>
                              <span>₨{Math.round(item.total).toLocaleString('en-PK')}</span>
                            </div>
                          ))}
                          <Separator className="my-2" />
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>₨{Math.round(total).toLocaleString('en-PK')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCheckout(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={processSale} 
                        disabled={processing || !selectedCustomer}
                      >
                        {processing ? 'Processing...' : 'Complete Sale'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { updateProduct, getSuppliers, createSupplier, createPurchaseInvoice, createAccountTransaction, getAccountTransactions, type Product, type Supplier } from "@/lib/api"
import { formatCurrency, formatForInput } from "@/lib/utils"

interface EditProductDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductUpdated?: () => void
}

export function EditProductDialog({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [accountBalance, setAccountBalance] = useState(0)
  const [originalQuantity, setOriginalQuantity] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    quantity: "",
    price: "",
    sale_price: "",
    supplier_name: "",
    description: "",
    low_stock_threshold: "10",
    amount_paid: "",
    deduct_from_balance: false
  })

  // Update form data when product changes
  useEffect(() => {
    if (product && open) {
      setOriginalQuantity(product.quantity)
      setFormData({
        name: product.name || "",
        unit: product.unit || "",
        quantity: product.quantity.toString() || "",
        price: product.price || "",
        sale_price: product.sale_price || "",
        supplier_name: product.supplier_name || "",
        description: product.description || "",
        low_stock_threshold: product.low_stock_threshold.toString() || "10",
        amount_paid: "",
        deduct_from_balance: false
      })
      fetchSuppliers()
      fetchAccountBalance()
    }
  }, [product, open])

  const fetchSuppliers = async () => {
    try {
      const response = await getSuppliers()
      setSuppliers(response.results)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchAccountBalance = async () => {
    try {
      const transactions = await getAccountTransactions()
      const balance = transactions.results.reduce((sum, t) => 
        sum + (t.type === 'add' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0
      )
      setAccountBalance(balance)
    } catch (error) {
      console.error('Error fetching account balance:', error)
      setAccountBalance(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    setLoading(true)

    try {
      // Find or create supplier
      let supplierId = null;
      if (formData.supplier_name.trim()) {
        const existingSupplier = suppliers.find(
          (s) => s.name.toLowerCase() === formData.supplier_name.toLowerCase()
        );
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          const newSupplier = await createSupplier({
            name: formData.supplier_name.trim(),
            contact_person: "",
            phone: "",
            email: "",
            address: "",
          });
          supplierId = newSupplier.id;
        }
      }

      const newQuantity = parseInt(formData.quantity)
      const quantityDifference = newQuantity - originalQuantity

      // Handle account balance deduction if checkbox is checked and quantity increased
      if (formData.deduct_from_balance && quantityDifference > 0) {
        const totalCost = parseFloat(formData.price) * quantityDifference
        
        if (totalCost > accountBalance) {
          alert(`Insufficient balance! Total cost: ${formatCurrency(totalCost)}, Available balance: ${formatCurrency(accountBalance)}`)
          setLoading(false)
          return
        }
        
        try {
          const supplierName = formData.supplier_name || 'Direct Purchase'
          await createAccountTransaction({
            type: 'withdraw',
            amount: totalCost.toString(),
            description: `Purchase: ${formData.name} (+${quantityDifference} ${formData.unit}) - ${supplierName} - Balance Deduction`
          })
          console.log(`Deducted ₨${totalCost} from account balance for quantity increase`)
        } catch (error) {
          console.error('Failed to deduct from account balance:', error)
          alert('Failed to deduct amount from account balance')
          setLoading(false)
          return
        }
      }

      const productData = {
        name: formData.name,
        unit: formData.unit,
        quantity: newQuantity,
        price: formData.price,
        sale_price: formData.sale_price,
        supplier: supplierId || undefined,
        description: formData.description,
        low_stock_threshold: parseInt(formData.low_stock_threshold)
      }

      await updateProduct(product.id, productData)

      // Create purchase invoice if quantity increased and supplier/amount_paid provided
      if (quantityDifference > 0 && supplierId && formData.amount_paid && parseFloat(formData.amount_paid) > 0) {
        try {
          const totalCost = parseFloat(formData.price) * quantityDifference
          const amountPaid = parseFloat(formData.amount_paid)
          
          await createPurchaseInvoice({
            supplier: supplierId,
            date: new Date().toISOString().split('T')[0],
            items: [{
              product: product.id,
              quantity: quantityDifference,
              price: parseFloat(formData.price).toFixed(2)
            }],
            is_loan: amountPaid < totalCost,
            amount_paid: amountPaid
          })
          console.log(`Created purchase invoice for quantity increase of ${quantityDifference}`)
        } catch (invoiceError) {
          console.error('Failed to create purchase invoice:', invoiceError)
          // Don't throw here as the product was updated successfully
        }
      }
      
      onOpenChange(false)
      onProductUpdated?.()
      
    } catch (error) {
      console.error('Error updating product:', error)
      
      let errorMessage = 'Failed to update product. Please try again.'
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product information. Make changes and save.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            


            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-unit" className="text-right">
                Unit *
              </Label>
              <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="liter">Liter</SelectItem>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="can">Can</SelectItem>
                  <SelectItem value="gram">Gram</SelectItem>
                  <SelectItem value="ml">Milliliter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-quantity" className="text-right">
                Quantity *
              </Label>
              <Input
                id="edit-quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                    handleInputChange("quantity", value)
                  }
                }}
                className="col-span-3"
                min="0"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-price" className="text-right">
                Purchase Price (₨) *
              </Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    handleInputChange("price", value)
                  }
                }}
                className="col-span-3"
                min="0.01"
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sale-price" className="text-right">
                Sale Price (₨) *
              </Label>
              <Input
                id="edit-sale-price"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    handleInputChange("sale_price", value)
                  }
                }}
                className="col-span-3"
                min="0.01"
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-supplier" className="text-right">
                Supplier
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="edit-supplier"
                  value={formData.supplier_name}
                  onChange={(e) => handleInputChange("supplier_name", e.target.value)}
                  placeholder="Enter supplier name or select from list"
                  list="edit-suppliers-list"
                />
                <datalist id="edit-suppliers-list">
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-threshold" className="text-right">
                Low Stock
              </Label>
              <Input
                id="edit-threshold"
                type="number"
                value={formData.low_stock_threshold}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                    handleInputChange("low_stock_threshold", value)
                  }
                }}
                className="col-span-3"
                min="0"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="col-span-3"
                placeholder="Optional description"
              />
            </div>

            {/* Show purchase invoice options only if quantity is being increased */}
            {parseInt(formData.quantity || "0") > originalQuantity && formData.supplier_name && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-amount-paid" className="text-right">
                    Amount Paid (₨)
                  </Label>
                  <Input
                    id="edit-amount-paid"
                    type="number"
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={(e) => handleInputChange("amount_paid", e.target.value)}
                    className="col-span-3"
                    min="0"
                    placeholder={(() => {
                      const quantityDiff = parseInt(formData.quantity || "0") - originalQuantity
                      return formData.price && quantityDiff > 0 ? 
                        formatForInput(parseFloat(formData.price) * quantityDiff, true) : 
                        "0"
                    })()}
                  />
                </div>

                {formData.amount_paid && formData.price && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right text-sm text-gray-600">
                      Payment Status:
                    </div>
                    <div className="col-span-3 text-sm">
                      {(() => {
                        const quantityDiff = parseInt(formData.quantity || "0") - originalQuantity
                        const totalCost = parseFloat(formData.price) * quantityDiff
                        const amountPaid = parseFloat(formData.amount_paid)
                        const remaining = totalCost - amountPaid
                        
                        if (remaining > 0) {
                          return (
                            <span className="text-orange-600 font-medium">
                              ⚠️ Loan: {formatCurrency(remaining)} remaining to pay
                            </span>
                          )
                        } else if (remaining === 0) {
                          return (
                            <span className="text-green-600 font-medium">
                              ✅ Fully paid
                            </span>
                          )
                        } else {
                          return (
                            <span className="text-red-600 font-medium">
                              ❌ Amount paid exceeds total cost
                            </span>
                          )
                        }
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Account Balance Deduction Option */}
            {parseInt(formData.quantity || "0") > originalQuantity && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-sm">
                    Deduct from Balance
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Checkbox
                      id="edit-deduct-balance"
                      checked={formData.deduct_from_balance}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, deduct_from_balance: checked as boolean }))
                      }
                    />
                    <Label htmlFor="edit-deduct-balance" className="text-sm">
                      Deduct purchase amount from account balance
                    </Label>
                  </div>
                </div>

                {formData.deduct_from_balance && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right text-sm text-gray-600">
                      Balance Info:
                    </div>
                    <div className="col-span-3 text-sm">
                      {(() => {
                        const quantityDiff = parseInt(formData.quantity || "0") - originalQuantity
                        const totalCost = formData.price && quantityDiff > 0 ? 
                          parseFloat(formData.price) * quantityDiff : 0
                        const remainingBalance = accountBalance - totalCost
                        
                        return (
                          <div className="space-y-1">
                            <div>Current Balance: <span className="font-medium">{formatCurrency(accountBalance)}</span></div>
                            <div>Additional Cost: <span className="font-medium">{formatCurrency(totalCost)}</span></div>
                            <div className={`font-medium ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Remaining: {formatCurrency(remainingBalance)}
                              {remainingBalance < 0 && ' (Insufficient balance!)'}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

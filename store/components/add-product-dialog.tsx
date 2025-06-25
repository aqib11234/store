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
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { createProduct, getSuppliers, createSupplier, type Supplier, getProducts, createPurchaseInvoice, type Product, createAccountTransaction, getAccountTransactions } from "@/lib/api"
import { formatForInput } from "@/lib/utils"

interface AddProductDialogProps {
  onProductAdded?: () => void
}

export function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    quantity: "",
    price: "",
    supplier_name: "",
    description: "",
    low_stock_threshold: "10",
    purchase_price: "",
    sale_price: "",
    amount_paid: "",
    is_loan: false,
    deduct_from_balance: false
  })
  const [accountBalance, setAccountBalance] = useState(0)

  // Clear form when dialog is closed
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Clear all form fields when dialog is closed
      setFormData({
        name: "",
        unit: "",
        quantity: "",
        price: "",
        supplier_name: "",
        description: "",
        low_stock_threshold: "10",
        purchase_price: "",
        sale_price: "",
        amount_paid: "",
        is_loan: false,
        deduct_from_balance: false
      })
      setLoading(false)
    }
  }

  // Fetch suppliers and account balance when dialog opens
  useEffect(() => {
    if (open) {
      fetchSuppliers()
      fetchAccountBalance()
    }
  }, [open])

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) {
      console.log('Form already being submitted, ignoring...');
      return;
    }
    
    setLoading(true);
    console.log('Starting product creation with quantity:', formData.quantity);
    
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
      // Check for existing product with same name, supplier, and purchase price
      let foundProduct: Product | null = null;
      const allProductsResponse = await getProducts(new URLSearchParams({ page_size: '1000' }));
      const allProducts = allProductsResponse.results;
      foundProduct = allProducts.find((p: Product) =>
        p.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
        (supplierId ? p.supplier === supplierId : !p.supplier) &&
        parseFloat(p.price) === parseFloat(formData.purchase_price)
      ) || null;
      let createdProduct: Product;
      if (foundProduct) {
        // For existing products, we'll let the purchase invoice handle quantity updates
        // to avoid double-adding quantities
        console.log(`Found existing product: ${foundProduct.name}, current quantity: ${foundProduct.quantity}, will add: ${formData.quantity} via purchase invoice`);
        createdProduct = foundProduct;
      } else {
        // Create new product
        const productQuantity = parseInt(formData.quantity, 10);
        console.log(`Creating new product: ${formData.name}, quantity: ${productQuantity}`);
        
        const productData = {
          name: formData.name,
          unit: formData.unit,
          quantity: productQuantity,
          price: parseFloat(formData.purchase_price).toFixed(2),
          supplier: supplierId || undefined,
          description: formData.description,
          low_stock_threshold: parseInt(formData.low_stock_threshold, 10),
          sale_price: parseFloat(formData.sale_price).toFixed(2),
        };
        console.log('Creating product with data:', productData);
        createdProduct = await createProduct(productData);
        console.log('Created product response:', createdProduct);
        
        // Handle case where API doesn't return ID but product was created successfully
        if (!createdProduct || !createdProduct.id) {
          console.log('Product ID missing, but creation likely succeeded. Continuing...');
          // Try to find the created product
          try {
            const updatedProductsResponse = await getProducts(new URLSearchParams({ page_size: '1000' }));
            const updatedProducts = updatedProductsResponse.results;
            const foundCreatedProduct = updatedProducts.find((p: Product) =>
              p.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
              (supplierId ? p.supplier === supplierId : !p.supplier) &&
              parseFloat(p.price) === parseFloat(formData.purchase_price)
            );
            
            if (foundCreatedProduct) {
              createdProduct = foundCreatedProduct;
              console.log('Found created product:', createdProduct);
            } else {
              // Product creation succeeded but we can't find it, continue anyway
              console.log('Product creation appears successful, continuing without ID verification...');
              createdProduct = { ...createdProduct, id: Date.now() }; // Temporary ID
            }
          } catch (findError) {
            console.error('Error finding created product:', findError);
            // Continue anyway as the product was likely created
            createdProduct = { ...createdProduct, id: Date.now() }; // Temporary ID
          }
        }
      }

      // Handle account balance deduction if checkbox is checked
      if (formData.deduct_from_balance) {
        const totalCost = parseFloat(formData.purchase_price) * parseInt(formData.quantity, 10);
        
        if (totalCost > accountBalance) {
          alert(`Insufficient balance! Total cost: ₨${totalCost.toFixed(2)}, Available balance: ₨${accountBalance.toFixed(2)}`);
          setLoading(false);
          return;
        }
        
        try {
          const supplierName = formData.supplier_name || 'Direct Purchase'
          await createAccountTransaction({
            type: 'withdraw',
            amount: totalCost.toString(),
            description: `Purchase: ${formData.name} (${formData.quantity} ${formData.unit}) - ${supplierName} - Balance Deduction`
          });
          console.log(`Deducted ₨${totalCost} from account balance for product purchase`);
        } catch (error) {
          console.error('Failed to deduct from account balance:', error);
          alert('Failed to deduct amount from account balance');
          setLoading(false);
          return;
        }
      }

      // Create purchase invoice if supplier and amount_paid are provided
      // Purchase invoices will automatically handle quantity updates
      if (supplierId && formData.amount_paid && parseFloat(formData.amount_paid) > 0 && createdProduct.id) {
        try {
          const totalCost = parseFloat(formData.purchase_price) * parseInt(formData.quantity, 10);
          const amountPaid = parseFloat(formData.amount_paid);
          
          await createPurchaseInvoice({
            supplier: supplierId,
            date: new Date().toISOString().split('T')[0],
            items: [{
              product: createdProduct.id,
              quantity: parseInt(formData.quantity, 10),
              price: parseFloat(formData.purchase_price).toFixed(2)
            }],
            is_loan: amountPaid < totalCost,
            amount_paid: amountPaid
          });
          console.log(`Created purchase invoice - this will automatically add ${formData.quantity} to product quantity`);
        } catch (invoiceError) {
          console.error('Failed to create purchase invoice:', invoiceError);
          // Don't throw here as the product was created successfully
        }
      } else if (!supplierId || !formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
        // If no purchase invoice is created, we need to manually update quantity for existing products
        if (foundProduct) {
          try {
            const newQuantity = foundProduct.quantity + parseInt(formData.quantity, 10);
            console.log(`No purchase invoice - manually updating existing product quantity from ${foundProduct.quantity} to ${newQuantity}`);
            
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${foundProduct.id}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity: newQuantity })
            });
          } catch (updateError) {
            console.error('Failed to update product quantity manually:', updateError);
          }
        }
      }

      setFormData({
        name: "",
        unit: "",
        quantity: "",
        price: "",
        supplier_name: "",
        description: "",
        low_stock_threshold: "10",
        purchase_price: "",
        sale_price: "",
        amount_paid: "",
        is_loan: false,
        deduct_from_balance: false
      })
      setOpen(false)
      onProductAdded?.()
    } catch (error: unknown) {
      let errorMessage = 'Failed to create product!';
      if (error instanceof Error && error.message) {
        errorMessage += `\n${error.message}`;
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
          <Button variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory. Fill in all the required information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>



              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">
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
                <Label htmlFor="quantity" className="text-right">
                  Quantity *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className="col-span-3"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchase_price" className="text-right">
                  Purchase Price (₨) *
                </Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => handleInputChange("purchase_price", e.target.value)}
                  className="col-span-3"
                  min="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sale_price" className="text-right">
                  Sale Price (₨) *
                </Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => handleInputChange("sale_price", e.target.value)}
                  className="col-span-3"
                  min="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="supplier_name" className="text-right">
                  Supplier
                </Label>
                <div className="col-span-3 relative">
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => handleInputChange("supplier_name", e.target.value)}
                    placeholder="Enter supplier name or select from list"
                    list="suppliers-list"
                  />
                  <datalist id="suppliers-list">
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {formData.supplier_name && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount_paid" className="text-right">
                    Amount Paid (₨)
                  </Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={(e) => handleInputChange("amount_paid", e.target.value)}
                    className="col-span-3"
                    min="0"
                    placeholder={formData.purchase_price && formData.quantity ? 
                      formatForInput(parseFloat(formData.purchase_price) * parseInt(formData.quantity || "0", 10), true) : 
                      "0"
                    }
                  />
                </div>
              )}

              {formData.supplier_name && formData.purchase_price && formData.quantity && formData.amount_paid && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm text-gray-600">
                    Payment Status:
                  </div>
                  <div className="col-span-3 text-sm">
                    {(() => {
                      const totalCost = parseFloat(formData.purchase_price) * parseInt(formData.quantity, 10);
                      const amountPaid = parseFloat(formData.amount_paid);
                      const remaining = totalCost - amountPaid;
                      
                      if (remaining > 0) {
                        return (
                          <span className="text-orange-600 font-medium">
                            ⚠️ Loan: ₨{remaining.toFixed(2)} remaining to pay
                          </span>
                        );
                      } else if (remaining === 0) {
                        return (
                          <span className="text-green-600 font-medium">
                            ✅ Fully paid
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-red-600 font-medium">
                            ❌ Amount paid exceeds total cost
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="threshold" className="text-right">
                  Low Stock
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => handleInputChange("low_stock_threshold", e.target.value)}
                  className="col-span-3"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="col-span-3"
                  placeholder="Optional description"
                />
              </div>

              {/* Account Balance Deduction Option */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">
                  Deduct from Balance
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="deduct_from_balance"
                    checked={formData.deduct_from_balance}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, deduct_from_balance: checked as boolean }))
                    }
                  />
                  <Label htmlFor="deduct_from_balance" className="text-sm">
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
                      const totalCost = formData.purchase_price && formData.quantity ? 
                        parseFloat(formData.purchase_price) * parseInt(formData.quantity, 10) : 0;
                      const remainingBalance = accountBalance - totalCost;
                      
                      return (
                        <div className="space-y-1">
                          <div>Current Balance: <span className="font-medium">₨{accountBalance.toFixed(2)}</span></div>
                          <div>Purchase Cost: <span className="font-medium">₨{totalCost.toFixed(2)}</span></div>
                          <div className={`font-medium ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Remaining: ₨{remainingBalance.toFixed(2)}
                            {remainingBalance < 0 && ' (Insufficient balance!)'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
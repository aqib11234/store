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
import { Plus } from "lucide-react"
import { createProduct, getSuppliers, createSupplier, type Supplier } from "@/lib/api"

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
    low_stock_threshold: "10"
  })

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
        low_stock_threshold: "10"
      })
      setLoading(false)
    }
  }

  // Fetch suppliers when dialog opens
  useEffect(() => {
    if (open) {
      fetchSuppliers()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Find or create supplier
      let supplierId = null
      if (formData.supplier_name.trim()) {
        // Check if supplier already exists
        const existingSupplier = suppliers.find(
          s => s.name.toLowerCase() === formData.supplier_name.toLowerCase()
        )

        if (existingSupplier) {
          supplierId = existingSupplier.id
        } else {
          // Create new supplier
          const newSupplier = await createSupplier({
            name: formData.supplier_name.trim(),
            contact_person: "",
            phone: "",
            email: "",
            address: ""
          })
          supplierId = newSupplier.id
        }
      }

      const productData = {
        name: formData.name,
        unit: formData.unit,
        quantity: parseInt(formData.quantity),
        price: formData.price,
        supplier: supplierId || undefined,
        description: formData.description,
        low_stock_threshold: parseInt(formData.low_stock_threshold)
      }

      await createProduct(productData)

      // Close dialog (this will automatically clear the form)
      handleOpenChange(false)
      onProductAdded?.()

    } catch (error) {
      console.error('Error creating product:', error)

      // Show more detailed error information
      let errorMessage = 'Failed to create product. Please try again.'
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
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
              <Label htmlFor="price" className="text-right">
                Price (₨) *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow valid decimal numbers
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
              <Label htmlFor="supplier_name" className="text-right">
                Supplier
              </Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => handleInputChange("supplier_name", e.target.value)}
                className="col-span-3"
                placeholder="Enter supplier name"
                list="suppliers-list"
              />
              <datalist id="suppliers-list">
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.name} />
                ))}
              </datalist>
            </div>

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
  )
}

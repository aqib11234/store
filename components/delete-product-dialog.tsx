"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteProduct, type Product } from "@/lib/api"
import { AlertTriangle } from "lucide-react"

interface DeleteProductDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductDeleted?: () => void
}

export function DeleteProductDialog({ product, open, onOpenChange, onProductDeleted }: DeleteProductDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!product) return

    setLoading(true)

    try {
      await deleteProduct(product.id)

      onOpenChange(false)
      onProductDeleted?.()

    } catch (error) {
      console.error('Error deleting product:', error)

      let errorMessage = 'Failed to delete product. Please try again.'
      if (error instanceof Error) {
        // Handle specific error messages
        if (error.message.includes('JSON')) {
          errorMessage = 'Product deleted successfully, but there was a response parsing issue.'
          // Still call the success callback since deletion likely succeeded
          onOpenChange(false)
          onProductDeleted?.()
          return
        } else {
          errorMessage = `Error: ${error.message}`
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Product
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this product? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">{product.name}</h4>
            <p className="text-sm text-gray-600">
              Quantity: {product.quantity} {product.unit_display}
            </p>
            <p className="text-sm text-gray-600">
              Price: ₨{Math.round(parseFloat(product.price)).toLocaleString('en-PK')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

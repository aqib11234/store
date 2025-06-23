"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CreditCard } from "lucide-react"
import { addLoanPayment, type PurchaseInvoice } from "@/lib/api"
import { toast } from "sonner"

interface AddLoanPaymentDialogProps {
  invoice: PurchaseInvoice
  onPaymentAdded?: () => void
}

export function AddLoanPaymentDialog({ invoice, onPaymentAdded }: AddLoanPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [notes, setNotes] = useState("")

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form
      setAmount(0)
      setNotes("")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }

    if (amount > parseFloat(invoice.remaining_balance)) {
      toast.error(`Payment amount cannot exceed remaining balance of ₨${Math.round(parseFloat(invoice.remaining_balance)).toLocaleString('en-PK')}`)
      return
    }

    setLoading(true)

    try {
      await addLoanPayment(invoice.id, {
        amount,
        notes
      })
      
      const newBalance = parseFloat(invoice.remaining_balance) - amount
      toast.success(`Payment of ₨${amount.toLocaleString('en-PK')} added successfully!${newBalance > 0 ? ` Remaining balance: ₨${Math.round(newBalance).toLocaleString('en-PK')}` : ' Loan fully paid!'}`)
      
      handleOpenChange(false)
      onPaymentAdded?.()
    } catch (error) {
      console.error('Error adding payment:', error)
      toast.error('Failed to add payment')
    } finally {
      setLoading(false)
    }
  }

  const remainingBalance = parseFloat(invoice.remaining_balance)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CreditCard className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Loan Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Invoice:</span>
              <span className="text-sm font-medium">{invoice.invoice_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Supplier:</span>
              <span className="text-sm font-medium">{invoice.supplier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Amount:</span>
              <span className="text-sm font-medium">₨{Math.round(parseFloat(invoice.total)).toLocaleString('en-PK')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Amount Paid:</span>
              <span className="text-sm font-medium text-blue-600">₨{Math.round(parseFloat(invoice.amount_paid)).toLocaleString('en-PK')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Remaining Balance:</span>
              <span className="text-sm font-medium text-red-600">₨{Math.round(remainingBalance).toLocaleString('en-PK')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (₨) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
              <div className="text-xs text-gray-500">
                Maximum: ₨{Math.round(remainingBalance).toLocaleString('en-PK')}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment notes (optional)..."
                rows={3}
              />
            </div>

            {/* New Balance Preview */}
            {amount > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>New remaining balance:</span>
                  <span className="font-medium">
                    ₨{Math.round(remainingBalance - amount).toLocaleString('en-PK')}
                  </span>
                </div>
                {remainingBalance - amount <= 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ This payment will fully settle the loan
                  </div>
                )}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || amount <= 0}>
                {loading ? "Processing..." : "Add Payment"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

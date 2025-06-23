import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AccountMoneyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (type: "add" | "withdraw", amount: number, description: string) => void
}

export const AccountMoneyDialog: React.FC<AccountMoneyDialogProps> = ({ open, onOpenChange, onSubmit }) => {
  const [type, setType] = useState<"add" | "withdraw">("add")
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState("")

  const handleSubmit = () => {
    if (amount > 0 && description.trim()) {
      onSubmit(type, amount, description)
      setAmount(0)
      setDescription("")
      setType("add")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "add" ? "Add Money" : "Withdraw Money"}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Button variant={type === "add" ? "default" : "outline"} onClick={() => setType("add")}>Add</Button>
          <Button variant={type === "withdraw" ? "default" : "outline"} onClick={() => setType("withdraw")}>Withdraw</Button>
        </div>
        <Input
          type="number"
          min={1}
          placeholder="Amount"
          value={amount === 0 ? "" : amount}
          onChange={e => setAmount(Number(e.target.value))}
          className="mb-2"
        />
        <Input
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="mb-4"
        />
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={amount <= 0 || !description.trim()}>
            {type === "add" ? "Add Money" : "Withdraw Money"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

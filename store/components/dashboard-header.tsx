"use client"

import { AddProductDialog } from "@/components/add-product-dialog"
import { SellProductDialog } from "@/components/sell-product-dialog"

interface DashboardHeaderProps {
  onProductAdded?: () => void
  onSaleCompleted?: () => void
}

export function DashboardHeader({ onProductAdded, onSaleCompleted }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Manage your product inventory</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SellProductDialog onSaleCompleted={onSaleCompleted} />
        <AddProductDialog onProductAdded={onProductAdded} />
      </div>
    </div>
  )
}

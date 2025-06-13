"use client"

import { AddProductDialog } from "@/components/add-product-dialog"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import Link from "next/link"

interface DashboardHeaderProps {
  onProductAdded?: () => void
}

export function DashboardHeader({ onProductAdded }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Manage your product inventory</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="default">
          <Link href="/pos">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Sell Products
          </Link>
        </Button>
        <AddProductDialog onProductAdded={onProductAdded} />
      </div>
    </div>
  )
}

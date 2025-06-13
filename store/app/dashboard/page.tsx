"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { ProductsTable } from "@/components/products-table"
import { DashboardStats } from "@/components/dashboard-stats"

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDataRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardHeader
        onProductAdded={handleDataRefresh}
      />
      <DashboardStats key={`stats-${refreshKey}`} />
      <ProductsTable key={`products-${refreshKey}`} onDataChanged={handleDataRefresh} />
    </div>
  )
}

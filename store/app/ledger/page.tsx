"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Users, Building2, TrendingUp, TrendingDown } from "lucide-react"
import { CustomerLedgerTable } from "@/components/customer-ledger-table"
import { SupplierLedgerTable } from "@/components/supplier-ledger-table"

interface LedgerSummary {
  total_customers: number
  total_receivables: number
  customers_with_balance: number
  total_suppliers: number
  total_payables: number
  suppliers_with_balance: number
}

export default function LedgerPage() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      
      // Fetch both customer and supplier summaries
      const [customerResponse, supplierResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/customer-ledgers/summary/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/supplier-ledgers/summary/`)
      ])

      const customerData = await customerResponse.json()
      const supplierData = await supplierResponse.json()

      setSummary({
        ...customerData,
        ...supplierData
      })
    } catch (error) {
      console.error('Error fetching ledger summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₨${amount.toLocaleString('en-PK')}`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger Management</h1>
          <p className="text-muted-foreground">
            Track customer and supplier accounts, loans, and payment history
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary ? formatCurrency(summary.total_receivables) : '₨0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.customers_with_balance || 0} customers with outstanding balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary ? formatCurrency(summary.total_payables) : '₨0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.suppliers_with_balance || 0} suppliers with outstanding balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.total_customers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active customer accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.total_suppliers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active supplier accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers or suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Ledger Tables */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Customer Ledgers</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Ledgers</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Accounts</CardTitle>
              <CardDescription>
                View customer balances, sales history, and payment records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerLedgerTable searchTerm={searchTerm} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Accounts</CardTitle>
              <CardDescription>
                View supplier balances, purchase history, and payment records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupplierLedgerTable searchTerm={searchTerm} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

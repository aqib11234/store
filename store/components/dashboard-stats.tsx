"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, AlertTriangle, DollarSign, ShoppingBag, ShoppingCart, TrendingUp } from "lucide-react"
import { getDashboardStats, updateDashboardStats, type DashboardStats, getAccountTransactions, createAccountTransaction, AccountTransaction } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { AccountMoneyDialog } from "@/components/account-money-dialog"
import { EditableStatCard } from "@/components/editable-stat-card"

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTotalPurchases, setShowTotalPurchases] = useState(true)
  const [moneyDialogOpen, setMoneyDialogOpen] = useState(false)
  const [transactions, setTransactions] = useState<AccountTransaction[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const data = await getDashboardStats()
        setStats(data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch dashboard stats')
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Fetch transactions from backend
  useEffect(() => {
    getAccountTransactions()
      .then(res => setTransactions(res.results))
      .catch(() => setTransactions([]))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {/* First Row - Inventory & Sales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-center p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Second Row - Purchases */}
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i + 4}>
              <CardContent className="flex items-center justify-center p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center p-6">
              <p className="text-red-600">{error || 'No data available'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Calculate net balance from account transactions (this should match account invoices page)
  const netBalance = transactions.reduce((sum, t) => 
    sum + (t.type === 'add' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0
  )

  // Handle stat updates by creating adjustment transactions
  const handleStatUpdate = async (field: string, newValue: number) => {
    try {
      if (!stats) return
      
      const currentValue = parseFloat(stats[field as keyof DashboardStats] as string)
      const difference = newValue - currentValue
      
      if (difference === 0) {
        return // No change needed
      }
      
      // Create descriptive transaction based on field type
      let description = ''
      let transactionType: 'add' | 'withdraw' = 'add'
      
      if (field.includes('sales')) {
        // For sales adjustments, positive difference means more sales income
        transactionType = difference > 0 ? 'add' : 'withdraw'
        description = `Sales Adjustment: ${difference > 0 ? 'Added' : 'Removed'} ₨${Math.abs(difference).toLocaleString('en-PK')} (${field.replace('_', ' ').toUpperCase()})`
      } else if (field.includes('purchase')) {
        // For purchase adjustments, positive difference means more expenses
        transactionType = difference > 0 ? 'withdraw' : 'add'
        description = `Purchase Adjustment: ${difference > 0 ? 'Added' : 'Removed'} ₨${Math.abs(difference).toLocaleString('en-PK')} (${field.replace('_', ' ').toUpperCase()})`
      } else {
        // Generic adjustment
        transactionType = difference > 0 ? 'add' : 'withdraw'
        description = `${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Adjustment: ${difference > 0 ? 'Added' : 'Removed'} ₨${Math.abs(difference).toLocaleString('en-PK')}`
      }
      
      await createAccountTransaction({
        type: transactionType,
        amount: Math.abs(difference).toString(),
        description: description
      })
      
      // Update the local stats to reflect the change
      setStats(prev => prev ? { ...prev, [field]: newValue.toString() } : null)
      
      // Refresh transactions to update the balance
      const res = await getAccountTransactions()
      setTransactions(res.results)
      
      console.log(`Created ${transactionType} transaction for ${field} adjustment: ₨${Math.abs(difference)}`)
      
    } catch (error) {
      console.error('Failed to create adjustment transaction:', error)
      alert('Failed to update stats. Please try again.')
    }
  }

  // Handle balance update by creating adjustment transaction
  const handleBalanceUpdate = async (newValue: number) => {
    try {
      const currentBalance = netBalance
      const difference = newValue - currentBalance
      
      if (difference === 0) {
        return // No change needed
      }
      
      const transactionType = difference > 0 ? 'add' : 'withdraw'
      const amount = Math.abs(difference)
      const description = `Balance Adjustment: ${difference > 0 ? 'Added' : 'Removed'} ₨${amount.toLocaleString('en-PK')} (Manual Edit)`
      
      await createAccountTransaction({
        type: transactionType,
        amount: amount.toString(),
        description: description
      })
      
      // Refresh transactions to update the balance
      const res = await getAccountTransactions()
      setTransactions(res.results)
      
    } catch (error) {
      console.error('Failed to update account balance:', error)
      alert('Failed to update balance. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {/* First Row - Total Products, Low Stock, Total Sales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_products.toLocaleString()}</div>
            <p className="text-lg font-medium">Products in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.low_stock_count}</div>
            <p className="text-lg font-medium">Products below threshold</p>
          </CardContent>
        </Card>
        <EditableStatCard
          title="Total Sales"
          value={parseFloat(stats.total_sales)}
          description="All time sales"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          onValueChange={(newValue) => handleStatUpdate('total_sales', newValue)}
        />
      </div>
      {/* Second Row - Total Money, Purchases (toggle), Today's Sales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <EditableStatCard
            title="Account Balance"
            value={netBalance}
            description={netBalance >= 0 ? 'Available balance' : 'Overdraft amount'}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            onValueChange={(newValue) => handleBalanceUpdate(newValue)}
            formatValue={(val) => {
              const isPositive = val >= 0
              return (
                <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                  ₨{Math.round(val).toLocaleString('en-PK')}
                </span>
              )
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMoneyDialogOpen(true)}
            className="absolute bottom-2 right-2 h-6 w-6 p-0 text-xs"
            title="Add/Withdraw Money"
          >
            +/-
          </Button>
        </div>
        <div className="relative">
          <EditableStatCard
            title={showTotalPurchases ? "Total Purchases" : "Today's Purchases"}
            value={parseFloat(showTotalPurchases ? stats.total_purchases : stats.today_purchases)}
            description={showTotalPurchases ? "All time purchases" : "Purchases made today"}
            icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
            onValueChange={(newValue) => handleStatUpdate(showTotalPurchases ? 'total_purchases' : 'today_purchases', newValue)}
          />
          <div className="absolute top-2 right-12 flex items-center gap-2">
            <span className="text-xs">Show</span>
            <Switch checked={showTotalPurchases} onCheckedChange={setShowTotalPurchases} id="toggle-purchases" />
            <span className="text-xs">{showTotalPurchases ? "Total" : "Today"}</span>
          </div>
        </div>
        <EditableStatCard
          title="Today's Sales"
          value={parseFloat(stats.today_sales)}
          description="Sales processed today"
          icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
          onValueChange={(newValue) => handleStatUpdate('today_sales', newValue)}
        />
      </div>
      <AccountMoneyDialog
        open={moneyDialogOpen}
        onOpenChange={setMoneyDialogOpen}
        onSubmit={async (type, amount, description) => {
          await createAccountTransaction({ type, amount: amount.toString(), description })
          // Refresh transactions from backend
          const res = await getAccountTransactions()
          setTransactions(res.results)
        }}
      />
    </div>
  )
}

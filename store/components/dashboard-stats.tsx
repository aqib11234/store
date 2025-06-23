"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, DollarSign, ShoppingBag, ShoppingCart, TrendingUp } from "lucide-react"
import { getDashboardStats, type DashboardStats, getAccountTransactions, createAccountTransaction, AccountTransaction } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { AccountMoneyDialog } from "@/components/account-money-dialog"

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₨{Math.round(parseFloat(stats.total_sales)).toLocaleString('en-PK')}</div>
            <p className="text-base text-muted-foreground">All time sales</p>
          </CardContent>
        </Card>
      </div>
      {/* Second Row - Total Money, Purchases (toggle), Today's Sales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card onClick={() => setMoneyDialogOpen(true)} className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Account Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₨{Math.round(netBalance).toLocaleString('en-PK')}
            </div>
            <p className="text-base text-muted-foreground">
              {netBalance >= 0 ? 'Available balance' : 'Overdraft amount'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-medium">{showTotalPurchases ? "Total Purchases" : "Today's Purchases"}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base">Show</span>
                <Switch checked={showTotalPurchases} onCheckedChange={setShowTotalPurchases} id="toggle-purchases" />
                <span className="text-base">{showTotalPurchases ? "Total" : "Today"}</span>
              </div>
            </div>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₨{Math.round(parseFloat(showTotalPurchases ? stats.total_purchases : stats.today_purchases)).toLocaleString('en-PK')}</div>
            <p className="text-base text-muted-foreground">{showTotalPurchases ? "All time purchases" : "Purchases made today"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Today&apos;s Sales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₨{Math.round(parseFloat(stats.today_sales)).toLocaleString('en-PK')}</div>
            <p className="text-base text-muted-foreground">Sales processed today</p>
          </CardContent>
        </Card>
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

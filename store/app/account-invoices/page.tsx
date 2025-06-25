"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { getAccountTransactions, AccountTransaction } from "@/lib/api"

export default function AccountInvoicesPage() {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await getAccountTransactions()
      setTransactions(res.results)
      setError(null)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setError("Failed to fetch transactions")
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchTransactions()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchTransactions().finally(() => setLoading(false))
  }, [fetchTransactions])

  // Auto-refresh every 30 seconds to catch new transactions
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchTransactions()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [fetchTransactions, loading, refreshing])

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Account Money Transactions</h1>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-lg">No transactions yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Transactions will appear here when you add or withdraw money from your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Total transactions: {transactions.length}
          </div>
          
          {/* Scrollable container with fixed height */}
          <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
            {transactions.map((t) => (
              <Card key={t.id} className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg font-medium">
                    {(() => {
                      if (t.description.includes('Sale:')) return "🛒 Sale Income"
                      if (t.description.includes('Purchase:')) return "📦 Purchase Payment"
                      if (t.description.includes('Sales Adjustment:')) return "📈 Sales Adjustment"
                      if (t.description.includes('Purchase Adjustment:')) return "📉 Purchase Adjustment"
                      if (t.description.includes('Balance Adjustment:')) return "⚖️ Balance Adjustment"
                      return t.type === "add" ? "💰 Deposit" : "💸 Withdrawal"
                    })()}
                  </CardTitle>
                  <span className={`text-xl font-bold ${t.type === "add" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "add" ? "+" : "-"}₨{parseFloat(t.amount).toLocaleString("en-PK")}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-base mb-2 text-gray-700">{t.description}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-PK", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                      ID: {t.id}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary at the bottom */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Sales Income</p>
                  <p className="text-lg font-bold text-green-600">
                    ₨{transactions
                      .filter(t => t.type === 'add' && t.description.includes('Sale:'))
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                      .toLocaleString("en-PK")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Payments</p>
                  <p className="text-lg font-bold text-red-600">
                    ₨{transactions
                      .filter(t => t.type === 'withdraw' && t.description.includes('Purchase:'))
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                      .toLocaleString("en-PK")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Manual & Adjustments</p>
                  <p className="text-lg font-bold text-gray-600">
                    ₨{transactions
                      .filter(t => !t.description.includes('Sale:') && !t.description.includes('Purchase:'))
                      .reduce((sum, t) => sum + (t.type === 'add' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0)
                      .toLocaleString("en-PK")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Balance</p>
                  <p className="text-lg font-bold text-blue-600">
                    ₨{transactions
                      .reduce((sum, t) => sum + (t.type === 'add' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0)
                      .toLocaleString("en-PK")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, FileText, CreditCard } from "lucide-react"

interface CustomerTransaction {
  id: number
  transaction_type: string
  transaction_type_display: string
  amount: number
  description: string
  date: string
  created_at: string
  reference_invoice?: number
  reference_payment?: number
}

interface CustomerLedgerTransactionsProps {
  ledgerId: number
}

export function CustomerLedgerTransactions({ ledgerId }: CustomerLedgerTransactionsProps) {
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [ledgerId])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customer-ledgers/${ledgerId}/transactions/`)
      const data = await response.json()
      setTransactions(data.results || data)
    } catch (error) {
      console.error('Error fetching customer transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₨${amount.toLocaleString('en-PK')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />
      case 'return':
        return <FileText className="h-4 w-4 text-orange-600" />
      case 'discount':
        return <FileText className="h-4 w-4 text-purple-600" />
      case 'interest':
        return <FileText className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'sale':
        return <Badge variant="default">Sale</Badge>
      case 'payment':
        return <Badge variant="secondary">Payment</Badge>
      case 'return':
        return <Badge variant="outline">Return</Badge>
      case 'discount':
        return <Badge variant="secondary">Discount</Badge>
      case 'interest':
        return <Badge variant="destructive">Interest</Badge>
      case 'adjustment':
        return <Badge variant="outline">Adjustment</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getAmountColor = (type: string) => {
    // Debit transactions (increase customer balance - they owe us more)
    if (['sale', 'interest'].includes(type)) {
      return 'text-red-600'
    }
    // Credit transactions (decrease customer balance - they owe us less)
    if (['payment', 'return', 'discount'].includes(type)) {
      return 'text-green-600'
    }
    return 'text-gray-600'
  }

  const getAmountPrefix = (type: string) => {
    // Debit transactions
    if (['sale', 'interest'].includes(type)) {
      return '+'
    }
    // Credit transactions
    if (['payment', 'return', 'discount'].includes(type)) {
      return '-'
    }
    return ''
  }

  if (loading) {
    return <div className="text-center py-4">Loading transactions...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found for this customer
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {getTransactionIcon(transaction.transaction_type)}
                        <span className="ml-2 text-sm">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTransactionBadge(transaction.transaction_type)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium text-sm">
                          {transaction.transaction_type_display}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {transaction.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getAmountColor(transaction.transaction_type)}`}>
                      {getAmountPrefix(transaction.transaction_type)}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {transaction.reference_invoice && (
                          <div>Invoice #{transaction.reference_invoice}</div>
                        )}
                        {transaction.reference_payment && (
                          <div>Payment #{transaction.reference_payment}</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

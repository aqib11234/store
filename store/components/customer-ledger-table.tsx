"use client"

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Phone, Mail, Calendar } from "lucide-react"
import { CustomerLedgerTransactions } from "@/components/customer-ledger-transactions"

interface CustomerLedger {
  id: number
  customer: number
  customer_name: string
  customer_phone: string
  customer_email: string
  current_balance: number
  total_sales: number
  total_payments: number
  credit_limit: number
  created_at: string
  updated_at: string
}

interface CustomerLedgerTableProps {
  searchTerm: string
}

export function CustomerLedgerTable({ searchTerm }: CustomerLedgerTableProps) {
  const [ledgers, setLedgers] = useState<CustomerLedger[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLedger, setSelectedLedger] = useState<CustomerLedger | null>(null)

  useEffect(() => {
    fetchLedgers()
  }, [])

  const fetchLedgers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customer-ledgers/`)
      const data = await response.json()
      setLedgers(data.results || data)
    } catch (error) {
      console.error('Error fetching customer ledgers:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₨${amount.toLocaleString('en-PK')}`
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600' // Customer owes us
    if (balance < 0) return 'text-green-600' // We owe customer (credit)
    return 'text-gray-600' // No balance
  }

  const getBalanceBadge = (balance: number) => {
    if (balance > 0) return <Badge variant="destructive">Owes</Badge>
    if (balance < 0) return <Badge variant="secondary">Credit</Badge>
    return <Badge variant="outline">Clear</Badge>
  }

  const filteredLedgers = ledgers.filter(ledger =>
    ledger.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.customer_phone.includes(searchTerm) ||
    ledger.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-4">Loading customer ledgers...</div>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
              <TableHead className="text-right">Total Payments</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLedgers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                  No customer ledgers found
                </TableCell>
              </TableRow>
            ) : (
              filteredLedgers.map((ledger) => (
                <TableRow key={ledger.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{ledger.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {ledger.customer}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {ledger.customer_phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {ledger.customer_phone}
                        </div>
                      )}
                      {ledger.customer_email && (
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {ledger.customer_email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getBalanceColor(ledger.current_balance)}`}>
                    {formatCurrency(Math.abs(ledger.current_balance))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(ledger.total_sales)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(ledger.total_payments)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(ledger.credit_limit)}
                  </TableCell>
                  <TableCell>
                    {getBalanceBadge(ledger.current_balance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLedger(ledger)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Customer Ledger - {ledger.customer_name}</DialogTitle>
                          <DialogDescription>
                            Complete transaction history and account details
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedLedger && (
                          <div className="space-y-6">
                            {/* Account Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Current Balance</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className={`text-lg font-bold ${getBalanceColor(selectedLedger.current_balance)}`}>
                                    {formatCurrency(Math.abs(selectedLedger.current_balance))}
                                  </div>
                                  {getBalanceBadge(selectedLedger.current_balance)}
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Total Sales</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-lg font-bold">
                                    {formatCurrency(selectedLedger.total_sales)}
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Total Payments</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-lg font-bold">
                                    {formatCurrency(selectedLedger.total_payments)}
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Credit Limit</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-lg font-bold">
                                    {formatCurrency(selectedLedger.credit_limit)}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Transaction History */}
                            <CustomerLedgerTransactions ledgerId={selectedLedger.id} />
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

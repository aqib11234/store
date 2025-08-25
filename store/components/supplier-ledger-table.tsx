"use client"

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Phone, Mail, Calendar } from "lucide-react"
import { SupplierLedgerTransactions } from "@/components/supplier-ledger-transactions"

interface SupplierLedger {
  id: number
  supplier: number
  supplier_name: string
  supplier_phone: string
  supplier_email: string
  current_balance: number
  total_purchases: number
  total_payments: number
  created_at: string
  updated_at: string
}

interface SupplierLedgerTableProps {
  searchTerm: string
}

export function SupplierLedgerTable({ searchTerm }: SupplierLedgerTableProps) {
  const [ledgers, setLedgers] = useState<SupplierLedger[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLedger, setSelectedLedger] = useState<SupplierLedger | null>(null)

  useEffect(() => {
    fetchLedgers()
  }, [])

  const fetchLedgers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/supplier-ledgers/`)
      const data = await response.json()
      setLedgers(data.results || data)
    } catch (error) {
      console.error('Error fetching supplier ledgers:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₨${amount.toLocaleString('en-PK')}`
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600' // We owe supplier
    if (balance < 0) return 'text-green-600' // Supplier owes us (advance payment)
    return 'text-gray-600' // No balance
  }

  const getBalanceBadge = (balance: number) => {
    if (balance > 0) return <Badge variant="destructive">We Owe</Badge>
    if (balance < 0) return <Badge variant="secondary">Advance</Badge>
    return <Badge variant="outline">Clear</Badge>
  }

  const filteredLedgers = ledgers.filter(ledger =>
    ledger.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.supplier_phone.includes(searchTerm) ||
    ledger.supplier_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-4">Loading supplier ledgers...</div>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead className="text-right">Total Purchases</TableHead>
              <TableHead className="text-right">Total Payments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLedgers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                  No supplier ledgers found
                </TableCell>
              </TableRow>
            ) : (
              filteredLedgers.map((ledger) => (
                <TableRow key={ledger.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{ledger.supplier_name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {ledger.supplier}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {ledger.supplier_phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {ledger.supplier_phone}
                        </div>
                      )}
                      {ledger.supplier_email && (
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {ledger.supplier_email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getBalanceColor(ledger.current_balance)}`}>
                    {formatCurrency(Math.abs(ledger.current_balance))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(ledger.total_purchases)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(ledger.total_payments)}
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
                          <DialogTitle>Supplier Ledger - {ledger.supplier_name}</DialogTitle>
                          <DialogDescription>
                            Complete transaction history and account details
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedLedger && (
                          <div className="space-y-6">
                            {/* Account Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                  <CardTitle className="text-sm">Total Purchases</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-lg font-bold">
                                    {formatCurrency(selectedLedger.total_purchases)}
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
                            </div>

                            {/* Transaction History */}
                            <SupplierLedgerTransactions ledgerId={selectedLedger.id} />
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

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, FileText, DollarSign, BookOpen } from "lucide-react"

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-2">
      <Button asChild variant={pathname === "/dashboard" ? "default" : "ghost"} className="justify-start text-base">
        <Link href="/dashboard">
          <LayoutDashboard className="mr-2 h-5 w-5" />
          Dashboard
        </Link>
      </Button>
      <Button asChild variant={pathname === "/invoices" ? "default" : "ghost"} className="justify-start text-base">
        <Link href="/invoices">
          <FileText className="mr-2 h-5 w-5" />
          Invoices
        </Link>
      </Button>
      <Button asChild variant={pathname === "/account-invoices" ? "default" : "ghost"} className="justify-start text-base">
        <Link href="/account-invoices">
          <DollarSign className="mr-2 h-5 w-5" />
          Account Invoices
        </Link>
      </Button>
      <Button asChild variant={pathname === "/ledger" ? "default" : "ghost"} className="justify-start text-base">
        <Link href="/ledger">
          <BookOpen className="mr-2 h-5 w-5" />
          Ledger
        </Link>
      </Button>
    </nav>
  )
}

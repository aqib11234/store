import { InvoiceViewer } from "@/components/invoice-viewer"

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">View and manage sales and purchase invoices</p>
        </div>
      </div>
      <InvoiceViewer />
    </div>
  )
}

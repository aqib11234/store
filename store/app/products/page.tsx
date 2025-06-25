import { ProductsTable } from "@/components/products-table"

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Products</h1>
          <p className="text-lg text-muted-foreground">Manage your product inventory with pagination and search</p>
        </div>
      </div>
      <ProductsTable />
    </div>
  )
}
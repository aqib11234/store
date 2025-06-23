"use client"

import { useState, useEffect } from "react"
import { getProducts, type Product, deleteProduct as deleteProductApi } from "@/lib/api"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { DeleteProductDialog } from "@/components/delete-product-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Search, Trash, X, RefreshCw } from "lucide-react"

interface ProductsTableProps {
  onDataChanged?: () => void
}

export function ProductsTable({ onDataChanged }: ProductsTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Fetch products from API
  const fetchProducts = async (forceRefresh = false) => {
    try {
      setLoading(true)
      // Add cache busting parameter to force fresh data
      const params = forceRefresh ? new URLSearchParams({ _t: Date.now().toString() }) : undefined
      const response = await getProducts(params)
      console.log('Fetched products:', response.results.length, 'products')
      console.log('Product names:', response.results.map(p => p.name))
      setProducts(response.results)
      setError(null)
    } catch (err) {
      setError('Failed to fetch products')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  // Force refresh products
  const handleForceRefresh = () => {
    console.log('Force refreshing products...')
    fetchProducts(true)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Filter products based on search query and status filter
  useEffect(() => {
    let filtered = products

    // Debug logs
    console.log('Search Query:', searchQuery)
    console.log('Active Filter:', activeFilter)
    console.log('Products before filtering:', products.length)

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.supplier_name?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (activeFilter && activeFilter !== "all") {
      filtered = filtered.filter(product => {
        switch (activeFilter) {
          case "in-stock":
            return product.status === "in_stock"
          case "low-stock":
            return product.status === "low_stock"
          case "out-of-stock":
            return product.status === "out_of_stock"
          default:
            return true
        }
      })
    }

    console.log('Filtered products:', filtered.length)
    setFilteredProducts(filtered)
  }, [products, searchQuery, activeFilter])

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setEditProduct(product)
    setEditDialogOpen(true)
  }

  // Handle delete product
  const handleDeleteProduct = (product: Product) => {
    setDeleteProduct(product)
    setDeleteDialogOpen(true)
  }

  // Handle product updated
  const handleProductUpdated = () => {
    console.log('Product updated, refreshing list...')
    fetchProducts(true) // Force refresh with cache busting
    // Small delay to ensure backend has processed the update
    setTimeout(() => {
      onDataChanged?.() // Notify parent component to refresh dashboard stats
    }, 500)
  }

  // Handle product deleted
  const handleProductDeleted = () => {
    console.log('Product deleted, refreshing list...')
    fetchProducts(true) // Force refresh with cache busting
    // Small delay to ensure backend has processed the deletion
    setTimeout(() => {
      onDataChanged?.() // Notify parent component to refresh dashboard stats
    }, 500)
  }

  // Bulk delete selected products
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} selected products?`)) return;
    const failed: number[] = [];
    for (const id of selectedProducts) {
      try {
        await deleteProductApi(id);
      } catch (error) {
        console.error(`Failed to delete product with id ${id}:`, error);
        failed.push(id);
      }
    }
    setSelectedProducts([]);
    fetchProducts(true); // Force refresh
    if (failed.length > 0) {
      alert(`Failed to delete the following product IDs: ${failed.join(', ')}`);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    )
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map((product) => product.id))
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading products...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Button
              onClick={() => fetchProducts(true)}
              variant="outline"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {activeFilter && activeFilter !== "all" && (
              <Badge variant="outline" className="flex items-center gap-1">
                {activeFilter === "in-stock" ? "In Stock" :
                 activeFilter === "low-stock" ? "Low Stock" :
                 activeFilter === "out-of-stock" ? "Out of Stock" : activeFilter}
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => setActiveFilter("all")}>
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove filter</span>
                </Button>
              </Badge>
            )}
            <Select value={activeFilter || "all"} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <div className="flex items-center gap-2 p-4">
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedProducts.length === 0}
            onClick={handleBulkDelete}
          >
            Delete Selected ({selectedProducts.length})
          </Button>
          <div className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-base font-bold">
                <Checkbox
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all products"
                />
              </TableHead>
              <TableHead className="text-base font-bold">Product Name</TableHead>
              <TableHead className="text-base font-bold">Unit</TableHead>
              <TableHead className="text-base font-bold">Quantity</TableHead>
              <TableHead className="text-base font-bold">Purchase Price</TableHead>
              <TableHead className="text-base font-bold">Sale Price</TableHead>
              <TableHead className="text-base font-bold">Company/Person</TableHead>
              <TableHead className="text-base font-bold">Status</TableHead>
              <TableHead className="w-[100px] text-base font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchQuery || activeFilter !== "all"
                      ? "No products found matching your criteria"
                      : "No products available"
                    }
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={handleForceRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Products
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                <TableCell className="text-sm">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => toggleProductSelection(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </TableCell>
                <TableCell className="font-semibold text-lg">{product.name}</TableCell>
                <TableCell className="text-base">{product.unit_display}</TableCell>
                <TableCell className="text-base">{product.quantity}</TableCell>
                <TableCell className="text-base font-medium">₨{Math.round(parseFloat(product.price || '0')).toLocaleString('en-PK')}</TableCell>
                <TableCell className="text-base font-medium">₨{Math.round(parseFloat(product.sale_price || '0')).toLocaleString('en-PK')}</TableCell>
                <TableCell className="text-base">{product.supplier_name}</TableCell>
                <TableCell className="text-base">
                  <Badge
                    variant={
                      product.status === "in_stock"
                        ? "default"
                        : product.status === "low_stock"
                          ? "secondary"
                          : "destructive"
                    }
                    className={
                      product.status === "in_stock"
                        ? "bg-green-100 text-green-800 hover:bg-green-100 text-sm"
                        : product.status === "low_stock"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-sm"
                          : "bg-red-100 text-red-800 hover:bg-red-100 text-sm"
                    }
                  >
                    {product.status_display}
                  </Badge>
                </TableCell>
                <TableCell className="text-base">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteProduct(product)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Edit Product Dialog */}
    <EditProductDialog
      product={editProduct}
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      onProductUpdated={handleProductUpdated}
    />

    {/* Delete Product Dialog */}
    <DeleteProductDialog
      product={deleteProduct}
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      onProductDeleted={handleProductDeleted}
    />
    </>
  )
}
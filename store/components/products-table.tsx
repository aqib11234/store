"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Edit, Search, X, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface ProductsTableProps {
  onDataChanged?: () => void
}

interface PaginationInfo {
  count: number
  total_pages: number
  current_page: number
  page_size: number
  next: string | null
  previous: string | null
  has_next: boolean
  has_previous: boolean
}

export function ProductsTable({ onDataChanged }: ProductsTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  // const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null)

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1) // Reset to first page when searching
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter])

  // Fetch products from API with pagination
  const fetchProducts = useCallback(async (page: number = 1, forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('page_size', pageSize.toString())
      
      // Add search query if present
      if (debouncedSearchQuery.trim()) {
        params.set('search', debouncedSearchQuery.trim())
      }
      
      // Add status filter if not "all"
      if (activeFilter && activeFilter !== "all") {
        const statusMap: Record<string, string> = {
          "in-stock": "in_stock",
          "low-stock": "low_stock", 
          "out-of-stock": "out_of_stock"
        }
        if (statusMap[activeFilter]) {
          params.set('status', statusMap[activeFilter])
        }
      }
      
      // Add cache busting parameter for force refresh
      if (forceRefresh) {
        params.set('_t', Date.now().toString())
      }

      console.log(`Fetching products page ${page} with params:`, params.toString())
      
      const response = await getProducts(params)
      
      console.log(`Fetched ${response.results.length} products (page ${response.current_page} of ${response.total_pages})`)
      
      setProducts(response.results)
      setPaginationInfo({
        count: response.count,
        total_pages: response.total_pages,
        current_page: response.current_page,
        page_size: response.page_size,
        next: response.next,
        previous: response.previous,
        has_next: response.has_next,
        has_previous: response.has_previous
      })
      setCurrentPage(response.current_page)
      
    } catch (err) {
      setError('Failed to fetch products')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [pageSize, debouncedSearchQuery, activeFilter])

  // Initial load and when dependencies change
  useEffect(() => {
    fetchProducts(currentPage)
  }, [fetchProducts, currentPage])

  // Force refresh products
  const handleForceRefresh = useCallback(() => {
    console.log('Force refreshing products...')
    fetchProducts(currentPage, true)
  }, [fetchProducts, currentPage])

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setEditProduct(product)
    setEditDialogOpen(true)
  }

  // Handle delete product (currently unused but kept for future use)
  // const handleDeleteProduct = (product: Product) => {
  //   setDeleteProduct(product)
  //   setDeleteDialogOpen(true)
  // }

  // Handle product updated
  const handleProductUpdated = useCallback(() => {
    console.log('Product updated, refreshing list...')
    fetchProducts(currentPage, true) // Force refresh with cache busting
    // Small delay to ensure backend has processed the update
    setTimeout(() => {
      onDataChanged?.() // Notify parent component to refresh dashboard stats
    }, 500)
  }, [fetchProducts, currentPage, onDataChanged])

  // Handle product deleted
  const handleProductDeleted = useCallback(() => {
    console.log('Product deleted, refreshing list...')
    fetchProducts(currentPage, true) // Force refresh with cache busting
    // Small delay to ensure backend has processed the deletion
    setTimeout(() => {
      onDataChanged?.() // Notify parent component to refresh dashboard stats
    }, 500)
  }, [fetchProducts, currentPage, onDataChanged])

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
    fetchProducts(currentPage, true); // Force refresh
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
    if (selectedProducts.length === products.length && products.length > 0) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map((product) => product.id))
    }
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedProducts([]) // Clear selections when changing pages
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page
    setSelectedProducts([]) // Clear selections
  }

  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    if (!paginationInfo) return []
    
    const { current_page, total_pages } = paginationInfo
    const pages: (number | string)[] = []
    
    if (total_pages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page
      pages.push(1)
      
      if (current_page > 4) {
        pages.push('...')
      }
      
      // Show pages around current page
      const start = Math.max(2, current_page - 1)
      const end = Math.min(total_pages - 1, current_page + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (current_page < total_pages - 3) {
        pages.push('...')
      }
      
      // Show last page
      if (total_pages > 1) {
        pages.push(total_pages)
      }
    }
    
    return pages
  }, [paginationInfo])

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
        <div className="flex flex-col gap-4">
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
              <Select value={activeFilter} onValueChange={setActiveFilter}>
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
          
          {/* Pagination info and page size selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {paginationInfo && (
                <>
                  Showing {((paginationInfo.current_page - 1) * paginationInfo.page_size) + 1} to{' '}
                  {Math.min(paginationInfo.current_page * paginationInfo.page_size, paginationInfo.count)} of{' '}
                  {paginationInfo.count} products
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
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
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-base font-bold">
                <Checkbox
                  checked={selectedProducts.length === products.length && products.length > 0}
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
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {debouncedSearchQuery || activeFilter !== "all"
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
              products.map((product) => (
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
                <TableCell className="text-base font-medium">{formatCurrency(product.price, 0)}</TableCell>
                <TableCell className="text-base font-medium">{formatCurrency(product.sale_price, 0)}</TableCell>
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
                  </div>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Pagination Controls */}
      {paginationInfo && paginationInfo.total_pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={!paginationInfo.has_previous}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!paginationInfo.has_previous}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            {getPageNumbers.map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page as number)}
                    className="min-w-[32px]"
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!paginationInfo.has_next}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(paginationInfo.total_pages)}
              disabled={!paginationInfo.has_next}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>

    {/* Edit Product Dialog */}
    <EditProductDialog
      product={editProduct}
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      onProductUpdated={handleProductUpdated}
    />

    {/* Delete Product Dialog */}
    {/* <DeleteProductDialog
      product={deleteProduct}
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      onProductDeleted={handleProductDeleted}
    /> */}
    </>
  )
}
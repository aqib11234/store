"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getProducts, type Product } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Loader2 } from "lucide-react"

interface InfiniteScrollProductsProps {
  onDataChanged?: () => void
}

export function InfiniteScrollProducts({ onDataChanged }: InfiniteScrollProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [totalCount, setTotalCount] = useState(0)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      // Reset when search changes
      setProducts([])
      setCurrentPage(1)
      setHasMore(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset when filter changes
  useEffect(() => {
    setProducts([])
    setCurrentPage(1)
    setHasMore(true)
  }, [activeFilter])

  // Fetch products with infinite scroll
  const fetchProducts = useCallback(async (page: number = 1, reset: boolean = false) => {
    if (loading || loadingMore) return
    
    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('page_size', '25') // Load 25 items at a time
      
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

      console.log(`Fetching products page ${page} with params:`, params.toString())
      
      const response = await getProducts(params)
      
      console.log(`Fetched ${response.results.length} products (page ${response.current_page} of ${response.total_pages})`)
      
      if (reset || page === 1) {
        setProducts(response.results)
      } else {
        setProducts(prev => [...prev, ...response.results])
      }
      
      setTotalCount(response.count)
      setHasMore(response.has_next)
      setCurrentPage(response.current_page)
      
    } catch (err) {
      setError('Failed to fetch products')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [debouncedSearchQuery, activeFilter, loading, loadingMore])

  // Load more products
  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      fetchProducts(currentPage + 1)
    }
  }, [hasMore, loading, loadingMore, currentPage, fetchProducts])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, loadingMore, loadMore])

  // Initial load and when dependencies change
  useEffect(() => {
    fetchProducts(1, true)
  }, [debouncedSearchQuery, activeFilter])

  // Force refresh
  const handleForceRefresh = () => {
    console.log('Force refreshing products...')
    setProducts([])
    setCurrentPage(1)
    setHasMore(true)
    fetchProducts(1, true)
  }

  if (loading && products.length === 0) {
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

  if (error && products.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Button
              onClick={handleForceRefresh}
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
          
          <div className="text-sm text-muted-foreground">
            Showing {products.length} of {totalCount} products
            {(debouncedSearchQuery || activeFilter !== "all") && " (filtered)"}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {products.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg truncate">{product.name}</h3>
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
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : product.status === "low_stock"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                    }
                  >
                    {product.status_display}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {product.supplier_name}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Qty: </span>
                    {product.quantity} {product.unit_display}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Price: </span>
                    ₨{Math.round(parseFloat(product.price || '0')).toLocaleString('en-PK')}
                  </div>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Sale Price: </span>
                  ₨{Math.round(parseFloat(product.sale_price || '0')).toLocaleString('en-PK')}
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {products.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            {debouncedSearchQuery || activeFilter !== "all"
              ? "No products found matching your criteria"
              : "No products available"
            }
          </div>
        )}
        
        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more products...
            </div>
          )}
          {!hasMore && products.length > 0 && (
            <div className="text-sm text-muted-foreground">
              No more products to load
            </div>
          )}
        </div>
        
        {/* Manual load more button (fallback) */}
        {hasMore && !loadingMore && products.length > 0 && (
          <div className="p-4 text-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loading || loadingMore}
            >
              Load More Products
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
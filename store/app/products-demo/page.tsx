"use client"

import { useState } from "react"
import { ProductsTable } from "@/components/products-table"
import { InfiniteScrollProducts } from "@/components/infinite-scroll-products"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProductsDemoPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Products Demo</h1>
          <p className="text-lg text-muted-foreground">
            Compare pagination vs infinite scroll approaches for handling large datasets
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance Optimization Features</CardTitle>
          <CardDescription>
            This demo showcases two different approaches to handle large product datasets efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Pagination Approach</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Loads 25-100 items per page</li>
                <li>• Server-side filtering and search</li>
                <li>• Page navigation controls</li>
                <li>• Debounced search (500ms delay)</li>
                <li>• Optimized for table views</li>
                <li>• Better for precise navigation</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Infinite Scroll Approach</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Loads 25 items at a time</li>
                <li>• Automatic loading on scroll</li>
                <li>• Card-based layout</li>
                <li>• Intersection Observer API</li>
                <li>• Better for browsing/discovery</li>
                <li>• Mobile-friendly experience</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pagination" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pagination">Pagination Table</TabsTrigger>
          <TabsTrigger value="infinite">Infinite Scroll Cards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pagination" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Paginated Products Table</h2>
              <div className="text-sm text-muted-foreground">
                Traditional pagination with server-side filtering
              </div>
            </div>
            <ProductsTable key={`pagination-${refreshKey}`} onDataChanged={handleDataChanged} />
          </div>
        </TabsContent>
        
        <TabsContent value="infinite" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Infinite Scroll Products</h2>
              <div className="text-sm text-muted-foreground">
                Lazy loading with automatic scroll detection
              </div>
            </div>
            <InfiniteScrollProducts key={`infinite-${refreshKey}`} onDataChanged={handleDataChanged} />
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Backend Optimization</CardTitle>
          <CardDescription>
            Your Django backend is already optimized with these features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Django REST Framework Features</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Custom pagination classes (25-200 items per page)</li>
                <li>• Database query optimization with select_related()</li>
                <li>• Search and filtering with django-filters</li>
                <li>• Ordering and sorting capabilities</li>
                <li>• Comprehensive pagination metadata</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">PostgreSQL Optimizations</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Indexed columns for fast searches</li>
                <li>• Efficient LIMIT/OFFSET queries</li>
                <li>• Foreign key relationships optimized</li>
                <li>• Query result caching</li>
                <li>• Connection pooling ready</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
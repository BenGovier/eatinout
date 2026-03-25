"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Pizza, Coffee, Beef, Beer, Salad, Cake, Store } from "lucide-react"

// Map of category names to icon components
const iconMap: any = {
  Italian: Pizza,
  Cafes: Coffee,
  Steakhouses: Beef,
  "Pubs & Bars": Beer,
  Vegetarian: Salad,
  Desserts: Cake
}

// Map of category names to color classes
const colorMap: any = {
  Italian: "bg-red-100 text-red-600",
  Cafes: "bg-amber-100 text-amber-600",
  Steakhouses: "bg-orange-100 text-orange-600",
  "Pubs & Bars": "bg-yellow-100 text-yellow-600",
  Vegetarian: "bg-green-100 text-green-600",
  Desserts: "bg-pink-100 text-pink-600"
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Request deduplication - prevent multiple simultaneous requests
  const fetchingRef = useRef(false)

  useEffect(() => {
    document.title = "Categories"
  }, [])

  const fetchCategories = useCallback(async () => {
    // Prevent duplicate requests
    if (fetchingRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      const response = await fetch('/api/categories', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300' // Cache for 5 minutes
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch categories")
      }

      // Categories are already filtered on the server side (offersCount > 0)
      setCategories(data.categories || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
      console.error('Error fetching categories:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  if (loading) {
    // return <div className="container px-4 py-6">Loading...</div>
    return (
      <div className="container px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Categories</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-full p-4 flex flex-col items-center justify-center text-center border rounded-2xl bg-white shadow animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 mb-3 mt-2"></div>
              <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="container px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Categories</h1>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => fetchCategories()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show message if no categories have offers
  if (!loading && categories.length === 0) {
    return (
      <div className="container px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Categories</h1>
        <div className="text-center py-8">
          <p className="text-gray-500">No categories with active offers available at the moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Categories</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category: any) => {
          const Icon: any = iconMap[category.name] || Store
          const colorClass = colorMap[category.name] || "bg-gray-100 text-gray-600"

          return (
            <Link 
              key={category.name || category._id} 
              href={`/categories/${encodeURIComponent(category.name)}`}
              className="block h-full"
            >
              <Card className="h-full hover:shadow-md transition-shadow py-0 cursor-pointer">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center mb-3 mt-2`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-red-500">{category.offersCount} deals</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

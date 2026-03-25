"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "react-toastify"
import { Plus, Edit, Trash2, AlertTriangle, Loader2, Search, X, Image as ImageIcon, Users, GripVertical } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import InfiniteScroll from "react-infinite-scroll-component"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
// import { uploadFileToAzure, deleteFileFromAzure } from "@/lib/azure-upload"
import { useImageUpload } from "@/hooks/use-image-upload"

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup timer on unmount or value change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [filteredCategories, setFilteredCategories] = useState<any[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [editingCategory, setEditingCategory] = useState<{ _id: string; name: string; isActive: boolean; image?: string; priority?: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Dynamic filter options
  const [filterOptions, setFilterOptions] = useState({
    statuses: []
  })

  // Global statistics
  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
    totalRestaurants: 0
  })

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedStatusFilter = useDebounce(statusFilter, 300)

  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState("")
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [categoryRestaurants, setCategoryRestaurants] = useState<Record<string, any[]>>({})
  const [loadingRestaurants, setLoadingRestaurants] = useState<Record<string, boolean>>({})
  const [isUnassigning, setIsUnassigning] = useState<string | null>(null)
  const [categoryImage, setCategoryImage] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingCategoryImage, setEditingCategoryImage] = useState<string>("")
  const [isUpdatingPriorities, setIsUpdatingPriorities] = useState(false)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    document.title = 'Manage Categories';
  }, []);

  const prefetchNextPages = useCallback(async (startPage: number, totalPages: number) => {
    try {
      let currentPage = startPage + 1

      while (currentPage <= totalPages) {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: '10',
          search: debouncedSearchTerm,
          status: debouncedStatusFilter
        })

        const res = await fetch(`/api/admin/categories?${queryParams}`)

        if (!res.ok) break

        const data = await res.json()

        if (data.success) {
          const sorted = [...data.categories].sort((a: any, b: any) => {
            const priorityA = a.priority ?? 999
            const priorityB = b.priority ?? 999
            if (priorityA !== priorityB) return priorityA - priorityB
            return a.name.localeCompare(b.name)
          })

          setCategories(prev => [...prev, ...sorted])
        }

        currentPage++
      }

      setHasMore(false) // sab load ho gaya
    } catch (err) {
      console.error("Prefetch error:", err)
    }
  }, [debouncedSearchTerm, debouncedStatusFilter])

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: debouncedSearchTerm,
        status: debouncedStatusFilter
      })

      const response = await fetch(`/api/admin/categories?${queryParams}`)

      if (!response.ok) {
        throw new Error("Failed to fetch categories")
      }

      const data = await response.json()

      if (data.success) {
        const sortedCategories = [...data.categories].sort((a: any, b: any) => {
          const priorityA = a.priority ?? 999
          const priorityB = b.priority ?? 999
          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }
          return a.name.localeCompare(b.name)
        })

        setCategories(prev =>
          page === 1 ? sortedCategories : [...prev, ...sortedCategories]
        )

        setFilterOptions(data.filters)
        setStats(data.stats)

        const totalPages = data.pagination.pages

        setHasMore(page < totalPages)

        // ✅ IMPORTANT: only trigger on first page
        if (page === 1 && totalPages > 1) {
          prefetchNextPages(1, totalPages)
        }
      } else {
        throw new Error(data.message || "Failed to fetch categories")
      }
    } catch (err: any) {
      console.error("Error fetching categories:", err)
      setCategories([])
      setHasMore(false)
      toast.error(err.message || "Failed to fetch categories")
    } finally {
      setIsLoading(false)
      setIsInitialLoading(false)
    }
  }, [page, debouncedSearchTerm, debouncedStatusFilter])

  // Fetch categories when page, search, or filters change
  useEffect(() => {
    fetchCategories()
  }, [page, debouncedSearchTerm, debouncedStatusFilter, fetchCategories])

  // Handle drag end - update priorities based on new order
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = filteredCategories.findIndex((cat: any) => cat._id === active.id)
    const newIndex = filteredCategories.findIndex((cat: any) => cat._id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder filtered categories
    const reorderedFiltered = arrayMove(filteredCategories, oldIndex, newIndex)

    // Get all categories sorted by current priority
    const sortedAllCategories = [...categories].sort((a: any, b: any) => {
      const priorityA = a.priority ?? 999
      const priorityB = b.priority ?? 999
      return priorityA - priorityB
    })

    // Get the IDs of filtered categories
    const filteredIds = new Set(filteredCategories.map((cat: any) => cat._id))

    // Create a map of old filtered category to new filtered category
    const filteredMap = new Map()
    filteredCategories.forEach((oldCat, idx) => {
      filteredMap.set(oldCat._id, reorderedFiltered[idx])
    })

    // Replace filtered categories in the full sorted list with reordered ones
    const newFullList = sortedAllCategories.map((cat: any) => {
      if (filteredIds.has(cat._id)) {
        return filteredMap.get(cat._id)
      }
      return cat
    })

    // Assign priorities based on new position (1, 2, 3, ...)
    const updatedCategories = newFullList.map((category: any, index: number) => ({
      ...category,
      priority: index + 1
    }))

    // Update local state immediately for better UX
    setCategories(updatedCategories)
    setFilteredCategories(reorderedFiltered)

    // Update priorities in backend - only update categories that changed priority
    setIsUpdatingPriorities(true)
    try {
      // Find categories that actually changed priority
      const categoriesToUpdate = updatedCategories.filter((cat: any) => {
        const original = sortedAllCategories.find((c: any) => c._id === cat._id)
        return !original || original.priority !== cat.priority
      })

      // Update only changed categories in parallel batches for better performance
      const BATCH_SIZE = 5
      const updateResults = []

      for (let i = 0; i < categoriesToUpdate.length; i += BATCH_SIZE) {
        const batch = categoriesToUpdate.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map(async (category: any) => {
          try {
            const response = await fetch(`/api/admin/categories?id=${category._id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: category.name,
                isActive: category.isActive,
                image: category.image || null,
                priority: category.priority,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(`Failed to update ${category.name}: ${errorData.message || 'Unknown error'}`)
            }

            const result = await response.json()
            return { success: true, category: result.category }
          } catch (err: any) {
            console.error(`Error updating category ${category.name}:`, err)
            return { success: false, category, error: err.message }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        updateResults.push(...batchResults)
      }

      // Check if any updates failed
      const failed = updateResults.filter(r => !r.success)
      if (failed.length > 0) {
        console.error("Some categories failed to update:", failed)
        throw new Error(`${failed.length} categories failed to update`)
      }

      toast.success("Category order updated successfully")

      // Update local state with the updated categories from backend responses
      const updatedCategoryMap = new Map()
      updateResults.forEach((result: any) => {
        if (result.success && result.category) {
          updatedCategoryMap.set(result.category._id, result.category)
        }
      })

      // Merge updated categories back into the full list, preserving restaurantCount
      const finalCategories = updatedCategories.map((cat: any) => {
        const updated = updatedCategoryMap.get(cat._id)
        if (updated) {
          // Preserve restaurantCount from original category
          return {
            ...updated,
            restaurantCount: cat.restaurantCount || 0
          }
        }
        return cat
      })

      // Sort final categories by priority to ensure correct order
      finalCategories.sort((a: any, b: any) => {
        const priorityA = a.priority ?? 999
        const priorityB = b.priority ?? 999
        return priorityA - priorityB
      })

      setCategories(finalCategories)

      // Re-apply filters to update filteredCategories using the final categories
      let filteredResults = finalCategories
      if (searchTerm) {
        const lowercaseTerm = searchTerm.toLowerCase()
        filteredResults = filteredResults.filter(
          (category: any) => category.name.toLowerCase().includes(lowercaseTerm)
        )
      }
      if (statusFilter !== "all") {
        filteredResults = filteredResults.filter((category: any) =>
          statusFilter === 'active' ? category.isActive : !category.isActive
        )
      }
      // Sort filtered results by priority
      filteredResults.sort((a: any, b: any) => {
        const priorityA = a.priority ?? 999
        const priorityB = b.priority ?? 999
        return priorityA - priorityB
      })
      setFilteredCategories(filteredResults)
    } catch (err: any) {
      console.error("Error updating priorities:", err.message)
      toast.error(err.message || "Failed to update category order")
      // Revert to original order on error
      await fetchCategories()
    } finally {
      setIsUpdatingPriorities(false)
    }
  }

  // Sortable row component
  function SortableCategoryRow({ category }: { category: any }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category._id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <>
        <TableRow
          ref={setNodeRef}
          style={style}
          className={isDragging ? "bg-gray-100" : ""}
        >
          <TableCell className="w-10">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
              disabled={isUpdatingPriorities}
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </button>
          </TableCell>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              {category.image && (
                <div className="relative w-8 h-8 rounded overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <span>{category.name}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="font-mono">
              {category.priority ?? 999}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <span>{category.restaurantCount}</span>
              {category.restaurantCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleCategory(category._id)}
                  className="h-6 px-2"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {expandedCategory === category._id ? "Hide" : "View"}
                </Button>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={
                category.isActive
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }
            >
              {category.isActive ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Edit className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Edit
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteCategory(category._id)}
              disabled={isDeleting === category._id}
            >
              {isDeleting === category._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Trash2 className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Delete
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </Button>
          </TableCell>
        </TableRow>
        {expandedCategory === category._id && (
          <TableRow>
            <TableCell colSpan={6} className="bg-gray-50">
              {loadingRestaurants[category._id] ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                  <span className="ml-2">Loading restaurants...</span>
                </div>
              ) : (categoryRestaurants[category._id] || []).length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No restaurants assigned to this category
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <h4 className="font-semibold mb-3">Restaurants in this category:</h4>
                  <div className="space-y-1">
                    {(categoryRestaurants[category._id] || []).map((restaurant: any) => (
                      <div
                        key={restaurant._id}
                        className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{restaurant.name}</span>
                          {restaurant.status && (
                            <Badge
                              variant="outline"
                              className={
                                restaurant.status === "approved"
                                  ? "bg-green-50 text-green-700 border-green-200 text-xs"
                                  : restaurant.status === "pending"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                                    : "bg-red-50 text-red-700 border-red-200 text-xs"
                              }
                            >
                              {restaurant.status}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnassignRestaurant(category._id, restaurant._id, restaurant.name)}
                          disabled={isUnassigning === `${category._id}-${restaurant._id}`}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isUnassigning === `${category._id}-${restaurant._id}` ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Unassigning...
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Unassign
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TableCell>
          </TableRow>
        )}
      </>
    )
  }

  // Apply local filtering for immediate UI feedback
  const applyLocalFilters = useCallback(() => {
    let results = categories

    // Filter by search term
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase()
      results = results.filter(
        (category) => category.name.toLowerCase().includes(lowercaseTerm)
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      results = results.filter((category) =>
        statusFilter === 'active' ? category.isActive : !category.isActive
      )
    }

    setFilteredCategories(results)
  }, [categories, searchTerm, statusFilter])

  // Apply local filters whenever source data or filters change
  useEffect(() => {
    applyLocalFilters()
  }, [applyLocalFilters])

  // Add image state for new category
  const newCatImage = useImageUpload({
    preset: "category",
    onSuccess: (url) => setCategoryImage(url)
  });

  const editCatImage = useImageUpload({
    preset: "category",
    onSuccess: (url) => setEditingCategoryImage(url)
  });

  // Replace handleImageUpload:
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await newCatImage.upload(file);
  };

  // Replace handleRemoveImage:
  const handleRemoveImage = async () => {
    await newCatImage.remove(categoryImage);
    setCategoryImage("");
  };

  // Replace handleEditImageUpload:
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editingCategoryImage) await editCatImage.remove(editingCategoryImage);
    await editCatImage.upload(file);
  };

  // Replace handleRemoveEditImage:
  const handleRemoveEditImage = async () => {
    await editCatImage.remove(editingCategoryImage);
    setEditingCategoryImage("");
  };

  const fetchCategoryRestaurants = async (categoryId: string) => {
    if (categoryRestaurants[categoryId]) {
      return; // Already loaded
    }

    setLoadingRestaurants(prev => ({ ...prev, [categoryId]: true }));
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}/restaurants`);
      const data = await response.json();

      if (data.success) {
        setCategoryRestaurants(prev => ({
          ...prev,
          [categoryId]: data.restaurants || []
        }));
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast.error("Failed to load restaurants");
    } finally {
      setLoadingRestaurants(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      fetchCategoryRestaurants(categoryId);
    }
  };

  const handleUnassignRestaurant = async (categoryId: string, restaurantId: string, restaurantName: string) => {
    if (!window.confirm(`Are you sure you want to unassign "${restaurantName}" from this category?`)) {
      return;
    }

    setIsUnassigning(`${categoryId}-${restaurantId}`);
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}/restaurants?restaurantId=${restaurantId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to unassign restaurant");
      }

      // Update local state
      setCategoryRestaurants(prev => ({
        ...prev,
        [categoryId]: (prev[categoryId] || []).filter((r: any) => r._id !== restaurantId)
      }));

      // Update category count
      setCategories(prevCategories =>
        prevCategories.map(cat =>
          cat._id === categoryId
            ? { ...cat, restaurantCount: Math.max(0, (cat.restaurantCount || 0) - 1) }
            : cat
        )
      );

      toast.success("Restaurant unassigned successfully");
    } catch (err: any) {
      console.error("Error unassigning restaurant:", err.message);
      toast.error(err.message || "Failed to unassign restaurant");
    } finally {
      setIsUnassigning(null);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      setIsAddingCategory(true)
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategory,
          image: categoryImage || undefined,
          priority: 999 // Default priority for new categories
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to add category")
      }

      // Add new category to state
      setCategories([data.category, ...categories])
      setNewCategory("")
      setCategoryImage("")
      toast.success("Category added successfully")

    } catch (err: any) {
      console.error("Error adding category:", err.message)
      toast.error(err.message || "Failed to add category")
    } finally {
      setIsAddingCategory(false)
    }
  }

  const handleEditCategory = (category: { _id: string; name: string; isActive: boolean; image?: string; priority?: number }) => {
    setEditingCategory({
      _id: category._id,
      name: category.name,
      isActive: category.isActive,
      priority: category.priority ?? 999,
    })
    setEditingCategoryImage(category.image || "")
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      setIsUpdatingCategory(true)
      const response = await fetch(`/api/admin/categories?id=${editingCategory._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingCategory.name,
          isActive: editingCategory.isActive,
          image: editingCategoryImage || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to update category")
      }

      // Update category in state
      setCategories(
        categories.map((category: any) =>
          category._id === editingCategory._id
            ? {
              ...category,
              name: data.category.name,
              isActive: data.category.isActive,
              image: data.category.image,
              priority: data.category.priority ?? 999,
            }
            : category,
        ),
      )

      setEditingCategory(null)
      setEditingCategoryImage("")
      toast.success("Category updated successfully")
    } catch (err: any) {
      console.error("Error updating category:", err.message)
      toast.error(err.message || "Failed to update category")
    } finally {
      setIsUpdatingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      return
    }

    try {
      setIsDeleting(id)
      const response = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if this is the "category in use" error message
        if (data.message && data.message.includes("cannot be deleted because it is currently assigned")) {
          setErrorModalMessage(data.message)
          setShowErrorModal(true)
        } else {
          // Show other errors in toast
          toast.error(data.message || "Failed to delete category")
        }
        return
      }

      setCategories(categories.filter((category: { _id: string }) => category._id !== id))
      toast.success("Category deleted successfully")
    } catch (err: any) {
      console.error("Error deleting category:", err)
      toast.error(err.message || "Failed to delete category")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Categories</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCategories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeCategories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inactive Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inactiveCategories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRestaurants}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add New Category</CardTitle>
            <CardDescription>Add a new category for restaurants to select during registration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newCategory">Category Name</Label>
                <Input
                  id="newCategory"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                  disabled={isAddingCategory}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryImage">Category Image (Optional)</Label>
                {categoryImage ? (
                  <div className="relative">
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      <Image
                        src={categoryImage}
                        alt="Category preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="mt-2"
                      disabled={uploadingImage}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="categoryImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || isAddingCategory}
                      className="hidden"
                    />
                    <Label
                      htmlFor="categoryImage"
                      className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4" />
                          Upload Image
                        </>
                      )}
                    </Label>
                  </div>
                )}
              </div>

              <Button onClick={handleAddCategory} disabled={isAddingCategory || !newCategory.trim() || uploadingImage} className="w-full">
                {isAddingCategory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {editingCategory && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Category</CardTitle>
              <CardDescription>Update the selected category name</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category Name</Label>
                  <Input
                    id="editCategory"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    placeholder="Enter category name"
                    disabled={isUpdatingCategory}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editCategoryImage">Category Image (Optional)</Label>
                  {editingCategoryImage ? (
                    <div className="relative">
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                        <Image
                          src={editingCategoryImage}
                          alt="Category preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveEditImage}
                        className="mt-2"
                        disabled={uploadingImage}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        id="editCategoryImage"
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        disabled={uploadingImage || isUpdatingCategory}
                        className="hidden"
                      />
                      <Label
                        htmlFor="editCategoryImage"
                        className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-4 w-4" />
                            Upload Image
                          </>
                        )}
                      </Label>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingCategory.isActive}
                    onChange={() => setEditingCategory({ ...editingCategory, isActive: !editingCategory.isActive })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="isActive" className="text-sm font-medium">
                    Active
                  </Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                onClick={handleUpdateCategory}
                disabled={isUpdatingCategory || !editingCategory.name.trim() || uploadingImage}
              >
                {isUpdatingCategory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCategory(null)
                  setEditingCategoryImage("")
                }}
                disabled={isUpdatingCategory}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Categories</CardTitle>
          <CardDescription>List of all available categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search categories..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {filterOptions.statuses.map((status: any) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && page === 1 || isInitialLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Restaurants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {/* Drag Icon */}
                    <TableCell>
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    </TableCell>

                    {/* Category Name */}
                    <TableCell>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
                    </TableCell>

                    {/* Restaurants */}
                    <TableCell>
                      <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Categories Found</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm || statusFilter !== 'all'
                  ? "Try adjusting your search or filters"
                  : "No categories have been added yet"}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <InfiniteScroll
              dataLength={filteredCategories.length}
              next={() => setPage(prevPage => prevPage + 1)}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                </div>
              }
              endMessage={
                filteredCategories.length > 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No more categories to load
                  </div>
                )
              }
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Restaurants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={filteredCategories.map((cat: any) => cat._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredCategories.map((category) => (
                        <SortableCategoryRow key={category._id} category={category} />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>

      {/* Error Modal for Category Deletion Restrictions */}
      <AlertDialog open={showErrorModal} onOpenChange={() => setShowErrorModal(false)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <AlertDialogTitle>Action Required Before Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 mt-2">
              {errorModalMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowErrorModal(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
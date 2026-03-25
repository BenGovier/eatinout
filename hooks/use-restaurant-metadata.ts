import { useQuery } from '@tanstack/react-query'

type AreaOption = {
  value: string
  label: string
}

type CuisineOption = {
  value: string
  label: string
  image?: string
}

type Category = {
  _id: string
  id: string
  name: string
  restaurantCount: number
  offersCount: number
  isGlobal: boolean
  priority?: number
}

export function useRestaurantMetadata() {
  const { data: areasData, isLoading: areasLoading, error: areasError } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await fetch('/api/areas', { next: { revalidate: 300 } })
      if (!response.ok) throw new Error('Failed to fetch areas')
      return response.json()
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  })

  const { data: cuisinesData, isLoading: cuisinesLoading, error: cuisinesError } = useQuery({
    queryKey: ['cuisines'],
    queryFn: async () => {
      const response = await fetch('/api/admin/categories?dropdown=true', { next: { revalidate: 300 } })
      if (!response.ok) throw new Error('Failed to fetch cuisines')
      return response.json()
    },
    staleTime: 300000,
    gcTime: 600000,
  })

  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories', { next: { revalidate: 60 } })
      if (!response.ok) throw new Error('Failed to fetch categories')
      return response.json()
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  })

  const areas: AreaOption[] = areasData?.success && areasData.areas
    ? areasData.areas
        .filter((area: any) => !area.hideRestaurant)
        .map((area: any) => ({
          value: area._id,
          label: area.name,
        }))
    : []

  const cuisineTypes: CuisineOption[] = cuisinesData?.success && Array.isArray(cuisinesData.categories)
    ? cuisinesData.categories
        .filter((cat: { isActive: boolean }) => cat.isActive)
        .map((category: { _id: string; name: string; image?: string }) => ({
          value: category._id,
          label: category.name,
          image: category.image || undefined,
        }))
    : []

  const categories: Category[] = categoriesData?.success && Array.isArray(categoriesData.categories)
    ? categoriesData.categories
        .map((category: any) => {
          const restaurantAreas = new Set<string>()
          if (category.restaurants && Array.isArray(category.restaurants)) {
            category.restaurants.forEach((restaurant: any) => {
              const areas = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area]
              areas.forEach((areaId: any) => {
                if (areaId) restaurantAreas.add(areaId.toString())
              })
            })
          }
          const isGlobal = restaurantAreas.size >= 3 || category.restaurantCount >= 10

          return {
            _id: category._id,
            id: category._id.toString(),
            name: category.name,
            priority: category.priority ?? 999,
            restaurantCount: category.restaurantCount || 0,
            offersCount: category.offersCount || 0,
            isGlobal
          }
        })
        .filter((cat: any) => cat.offersCount > 0)
        .sort((a: any, b: any) => {
          const priorityA = a.priority ?? 999
          const priorityB = b.priority ?? 999
          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }
          if (b.offersCount !== a.offersCount) {
            return b.offersCount - a.offersCount
          }
          return a.name.localeCompare(b.name)
        })
    : []

  return {
    areas,
    areasLoading,
    areasError: areasError ? String(areasError) : null,
    cuisineTypes,
    cuisineTypesLoading: cuisinesLoading,
    cuisineTypesError: cuisinesError ? String(cuisinesError) : null,
    categories,
    categoriesLoading,
    categoriesError: categoriesError ? String(categoriesError) : null,
  }
}

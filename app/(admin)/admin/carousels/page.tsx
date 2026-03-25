"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Globe,
  MapPin,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { Button } from "@componentsforadmin/ui/button";
import { Input } from "@componentsforadmin/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@componentsforadmin/ui/select";
import { StatsCard } from "@componentsforadmin/admin/stats-card";
import { CarouselFormDialog } from "@componentsforadmin/admin/carousel-form-dialog";
import { DeleteConfirmDialog } from "@componentsforadmin/admin/delete-confirm-dialog";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";

interface Area {
  _id: string;
  name: string;
}

interface Restaurant {
  _id: string;
  id: string;
  name: string;
  images: string[];
  imageUrl?: string;
}

interface CarouselRestaurant {
  restaurantId: string;
  order: number;
}

interface AreaOrder {
  areaId: string;
  order: number;
}

interface Carousel {
  _id: string;
  name: string;
  isGlobal: boolean;
  areaIds: string[];
  areaOrders: AreaOrder[];
  globalOrder: number;
  restaurants: Array<{
    restaurantId: Restaurant | string;
    order: number;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormCarousel {
  id?: string;
  name: string;
  isGlobal: boolean;
  areaIds: string[];
  areaOrders: AreaOrder[];
  globalOrder: number;
  restaurants: CarouselRestaurant[];
  isActive: boolean;
}

interface Stats {
  total: number;
  global: number;
  area: number;
  active: number;
}

export default function CarouselsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<FormCarousel | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCarouselId, setDeletingCarouselId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch carousels with React Query
  const { data: carouselsData, isLoading } = useQuery<{
    carousels: Carousel[];
    stats: Stats;
  }>({
    queryKey: ["carousels", search, areaFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (areaFilter !== "all") params.append("area", areaFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/admin/carousels?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch carousels");
      return data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch areas
  const { data: areasData } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => {
      const response = await fetch("/api/areas");
      const data = await response.json();
      if (!data.success) throw new Error("Failed to fetch areas");
      return data.areas;
    },
    staleTime: 300000, // 5 minutes
  });

  // Fetch restaurants
  const { data: restaurantsData } = useQuery<Restaurant[]>({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const response = await fetch("/api/admin/carousels/restaurants");
      const data = await response.json();
      if (!data.success) throw new Error("Failed to fetch restaurants");
      return data.restaurants.map((restaurant: any) => ({
        _id: restaurant._id,
        id: restaurant._id,
        name: restaurant.name,
        images: restaurant.images || [],
        imageUrl: restaurant.images?.[0] || null,
      }));
    },
    staleTime: 300000, // 5 minutes
  });

  const carousels = carouselsData?.carousels || [];
  const stats = carouselsData?.stats || { total: 0, global: 0, area: 0, active: 0 };
  const areas = areasData || [];
  const restaurants = restaurantsData || [];

  // Filter carousels based on selected area
  const filteredCarousels = useMemo(() => {
    let filtered = carousels.filter((carousel: Carousel) => {
      const matchesSearch = carousel.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && carousel.isActive) ||
        (statusFilter === "inactive" && !carousel.isActive);

      if (!matchesSearch || !matchesStatus) return false;

      if (areaFilter === "all") return true;
      if (areaFilter === "global") return carousel.isGlobal;

      // For specific area, show only area-specific carousels (not global)
      return carousel.areaIds.includes(areaFilter);
    });

    // Sort by order when viewing a specific area
    if (areaFilter !== "all" && areaFilter !== "global") {
      filtered = filtered.sort((a: Carousel, b: Carousel) => {
        const orderA = a.areaOrders.find((ao: AreaOrder) => ao.areaId === areaFilter)?.order ?? 999;
        const orderB = b.areaOrders.find((ao: AreaOrder) => ao.areaId === areaFilter)?.order ?? 999;

        return orderA - orderB;
      });
    } else if (areaFilter === "global") {
      filtered = filtered.sort((a: Carousel, b: Carousel) => a.globalOrder - b.globalOrder);
    }

    return filtered;
  }, [carousels, search, areaFilter, statusFilter]);

  const handleAddNew = () => {
    setEditingCarousel(null);
    setIsFormOpen(true);
  };

  const handleEdit = (carousel: Carousel) => {
    // Transform carousel data for the form
    const transformedCarousel = {
      id: carousel._id,
      name: carousel.name,
      isGlobal: carousel.isGlobal,
      areaIds: carousel.areaIds,
      areaOrders: carousel.areaOrders,
      globalOrder: carousel.globalOrder,
      restaurants: carousel.restaurants.map((r) => ({
        restaurantId: typeof r.restaurantId === 'string' ? r.restaurantId : r.restaurantId._id,
        order: r.order,
      })),
      isActive: carousel.isActive,
    };
    setEditingCarousel(transformedCarousel);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingCarouselId(id);
    setIsDeleteOpen(true);
  };

  const handleSave = async (data: Partial<FormCarousel>) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const url = editingCarousel
        ? `/api/admin/carousels/${editingCarousel.id}`
        : "/api/admin/carousels";

      const method = editingCarousel ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name || "",
          isGlobal: data.isGlobal ?? true,
          areaIds: data.areaIds || [],
          areaOrders: data.areaOrders || [],
          globalOrder: data.globalOrder ?? 1,
          restaurants: data.restaurants || [],
          isActive: data.isActive ?? true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          editingCarousel
            ? "Carousel updated successfully"
            : "Carousel created successfully"
        );
        queryClient.invalidateQueries({ queryKey: ["carousels"] });
        setIsFormOpen(false);
      } else {
        toast.error(result.message || "Failed to save carousel");
      }
    } catch (error) {
      console.error("Error saving carousel:", error);
      toast.error("Failed to save carousel");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCarouselId) return;

    try {
      const response = await fetch(`/api/admin/carousels/${deletingCarouselId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Carousel deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["carousels"] });
      } else {
        toast.error(result.message || "Failed to delete carousel");
      }
    } catch (error) {
      console.error("Error deleting carousel:", error);
      toast.error("Failed to delete carousel");
    } finally {
      setIsDeleteOpen(false);
      setDeletingCarouselId(null);
    }
  };

  // Move carousel up/down in the current area's order
  const moveCarousel = async (carouselId: string, direction: "up" | "down") => {
    const currentIndex = filteredCarousels.findIndex((c: Carousel) => c._id === carouselId);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= filteredCarousels.length) return;

    const currentCarousel = filteredCarousels[currentIndex];
    const swapCarousel = filteredCarousels[swapIndex];

    try {
      // Update both carousels
      const updates = [];

      if (areaFilter === "global" || areaFilter === "all") {
        // Update global order
        updates.push(
          fetch(`/api/admin/carousels/${currentCarousel._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ globalOrder: swapCarousel.globalOrder }),
          })
        );

        updates.push(
          fetch(`/api/admin/carousels/${swapCarousel._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ globalOrder: currentCarousel.globalOrder }),
          })
        );
      } else {
        // Update area-specific order
        const currentAreaOrder = getAreaOrder(currentCarousel, areaFilter);
        const swapAreaOrder = getAreaOrder(swapCarousel, areaFilter);

        const updateCurrentAreaOrders = [...currentCarousel.areaOrders];
        const updateSwapAreaOrders = [...swapCarousel.areaOrders];

        // Update or add area order for current carousel
        const currentOrderIndex = updateCurrentAreaOrders.findIndex(
          (ao) => ao.areaId === areaFilter
        );
        if (currentOrderIndex >= 0) {
          updateCurrentAreaOrders[currentOrderIndex].order = swapAreaOrder;
        } else {
          updateCurrentAreaOrders.push({ areaId: areaFilter, order: swapAreaOrder });
        }

        // Update or add area order for swap carousel
        const swapOrderIndex = updateSwapAreaOrders.findIndex(
          (ao) => ao.areaId === areaFilter
        );
        if (swapOrderIndex >= 0) {
          updateSwapAreaOrders[swapOrderIndex].order = currentAreaOrder;
        } else {
          updateSwapAreaOrders.push({ areaId: areaFilter, order: currentAreaOrder });
        }

        updates.push(
          fetch(`/api/admin/carousels/${currentCarousel._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ areaOrders: updateCurrentAreaOrders }),
          })
        );

        updates.push(
          fetch(`/api/admin/carousels/${swapCarousel._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ areaOrders: updateSwapAreaOrders }),
          })
        );
      }

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["carousels"] });
      toast.success("Carousel order updated");
    } catch (error) {
      console.error("Error updating carousel order:", error);
      toast.error("Failed to update carousel order");
    }
  };

  const getAreaOrder = (carousel: Carousel, areaId: string) => {
    if (carousel.isGlobal) return carousel.globalOrder;
    return carousel.areaOrders.find((ao) => ao.areaId === areaId)?.order ?? 999;
  };

  const getAreaNames = (areaIds: string[]) => {
    return areaIds
      .map((id) => areas.find((a: Area) => a._id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const getRestaurantNames = (carousel: Carousel) => {
    return carousel.restaurants
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      .map((cr) => {
        if (typeof cr.restaurantId === 'string') {
          const restaurant = restaurants.find((r: Restaurant) => r.id === cr.restaurantId);
          return restaurant?.name;
        } else {
          return cr.restaurantId?.name;
        }
      })
      .filter((name): name is string => Boolean(name));
  };

  const selectedArea = areas.find((a: Area) => a._id === areaFilter);
  const isOrderingMode = areaFilter !== "all";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">
        Manage Carousels
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Carousels" value={stats.total} />
        <StatsCard title="Global Carousels" value={stats.global} />
        <StatsCard title="Area Carousels" value={stats.area} />
        <StatsCard title="Active Carousels" value={stats.active} />
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Carousel Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage restaurant carousels for your app
          </p>
        </div>

        <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search carousels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Carousels</SelectItem>
                <SelectItem value="global">Global Only</SelectItem>
                <SelectItem value="separator" disabled className="text-xs text-muted-foreground font-medium">
                  ── Areas ──
                </SelectItem>
                {areas.map((area: Area) => (
                  <SelectItem key={area._id} value={area._id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleAddNew}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Carousel
            </Button>
          </div>
        </div>

        {isOrderingMode && (
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {areaFilter === "global" ? (
                <>Showing <span className="font-medium text-foreground">Global</span> carousels. Use arrows to reorder.</>
              ) : (
                <>Viewing carousels for <span className="font-medium text-foreground">{selectedArea?.name}</span>. Use arrows to change display order in this area.</>
              )}
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {isOrderingMode && (
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground w-[80px]">
                    Order
                  </th>
                )}
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Areas
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Restaurants
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Created
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-border animate-pulse">

                    {isOrderingMode && (
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-center">
                          <div className="h-3 w-3 bg-gray-200 rounded"></div>
                          <div className="h-3 w-3 bg-gray-200 rounded"></div>
                        </div>
                      </td>
                    )}

                    {/* Name */}
                    <td className="p-4">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    </td>

                    {/* Areas */}
                    <td className="p-4">
                      <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 w-28 bg-gray-200 rounded"></div>
                    </td>

                    {/* Restaurants */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full border"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded-full border"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded-full border"></div>
                        </div>
                        <div className="h-3 w-20 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-3 w-32 bg-gray-200 rounded mt-2"></div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </td>

                    {/* Created */}
                    <td className="p-4">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex gap-2">
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      </div>
                    </td>

                  </tr>
                ))
              ) : filteredCarousels.length === 0 ? (
                <tr>
                  <td
                    colSpan={isOrderingMode ? 7 : 6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No carousels found. Click "Add Carousel" to create one.
                  </td>
                </tr>
              ) : (
                filteredCarousels.map((carousel: Carousel, index: number) => {
                  const restaurantNames: string[] = getRestaurantNames(carousel);
                  const currentOrder = carousel.isGlobal
                    ? carousel.globalOrder
                    : carousel.areaOrders.find((ao: AreaOrder) => ao.areaId === areaFilter)?.order ?? index + 1;

                  return (
                    <tr
                      key={carousel._id}
                      className="border-b border-border last:border-0"
                    >
                      {isOrderingMode && (
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => moveCarousel(carousel._id, "up")}
                                disabled={index === 0}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveCarousel(carousel._id, "down")}
                                disabled={index === filteredCarousels.length - 1}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground ml-1 w-6 text-center">
                              {currentOrder}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <p className="text-sm font-medium text-foreground">
                          {carousel.name}
                        </p>
                      </td>
                      <td className="p-4">
                        {carousel.isGlobal ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-info/10 text-info">
                            <Globe className="h-3 w-3" />
                            Global
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-warning/20 text-warning-foreground">
                              <MapPin className="h-3 w-3" />
                              {carousel.areaIds.length} Area
                              {carousel.areaIds.length !== 1 ? "s" : ""}
                            </span>
                            <p
                              className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate"
                              title={getAreaNames(carousel.areaIds)}
                            >
                              {getAreaNames(carousel.areaIds)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-2">
                            {carousel.restaurants.slice(0, 3).map((cr: { restaurantId: Restaurant | string; order: number }) => {
                              let restaurant;
                              let restaurantKey;

                              if (typeof cr.restaurantId === 'string') {
                                restaurant = restaurants.find((r: Restaurant) => r.id === cr.restaurantId);
                                restaurantKey = cr.restaurantId;
                              } else {
                                restaurant = cr.restaurantId;
                                restaurantKey = cr.restaurantId._id;
                              }

                              const imageUrl = restaurant?.images?.[0] || "/placeholder.svg";

                              return restaurant ? (
                                <img
                                  key={restaurantKey}
                                  src={imageUrl}
                                  alt={restaurant.name}
                                  title={restaurant.name}
                                  className="w-8 h-8 rounded-full border-2 border-card object-cover"
                                />
                              ) : null;
                            })}
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {carousel.restaurants.length} restaurant
                            {carousel.restaurants.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p
                          className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate"
                          title={restaurantNames.join(", ")}
                        >
                          {restaurantNames.slice(0, 2).join(", ")}
                          {restaurantNames.length > 2
                            ? ` +${restaurantNames.length - 2} more`
                            : ""}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            carousel.isActive
                              ? "text-success"
                              : "text-destructive"
                          )}
                        >
                          {carousel.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(carousel.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(carousel)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(carousel._id)}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CarouselFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        carousel={editingCarousel}
        areas={areas.map((a: Area) => ({ id: a._id, name: a.name }))}
        restaurants={restaurants}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Carousel"
        description="Are you sure you want to delete this carousel? This action cannot be undone."
      />
    </div>
  );
}

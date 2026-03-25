"use client";

import { useState, useEffect } from "react";
import { Button } from "@componentsforadmin/ui/button";
import { Input } from "@componentsforadmin/ui/input";
import { Label } from "@componentsforadmin/ui/label";
import { Switch } from "@componentsforadmin/ui/switch";
import { Checkbox } from "@componentsforadmin/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@componentsforadmin/ui/dialog";
import { Search, X, Plus, ChevronUp, ChevronDown } from "lucide-react";

interface Area {
  id: string;
  name: string;
}

interface Restaurant {
  id: string;
  name: string;
  imageUrl?: string;
  cuisine?: string;
  location?: string;
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
  id?: string;
  name: string;
  isGlobal: boolean;
  areaIds: string[];
  areaOrders: AreaOrder[];
  globalOrder: number;
  restaurants: CarouselRestaurant[];
  isActive: boolean;
}

interface CarouselFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carousel: Carousel | null;
  areas: Area[];
  restaurants: Restaurant[];
  onSave: (carousel: Partial<Carousel>) => Promise<void> | void;
  isSaving?: boolean;
}

export function CarouselFormDialog({
  open,
  onOpenChange,
  carousel,
  areas,
  restaurants,
  onSave,
  isSaving = false,
}: CarouselFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    isGlobal: true,
    areaIds: [] as string[],
    areaOrders: [] as AreaOrder[],
    globalOrder: 1,
    restaurants: [] as CarouselRestaurant[],
    isActive: true,
  });

  const [restaurantSearch, setRestaurantSearch] = useState("");

  useEffect(() => {
    if (carousel) {
      setFormData({
        name: carousel.name,
        isGlobal: carousel.isGlobal,
        areaIds: carousel.areaIds || [],
        areaOrders: carousel.areaOrders || [],
        globalOrder: carousel.globalOrder || 1,
        restaurants: carousel.restaurants || [],
        isActive: carousel.isActive,
      });
    } else {
      setFormData({
        name: "",
        isGlobal: true,
        areaIds: [],
        areaOrders: [],
        globalOrder: 1,
        restaurants: [],
        isActive: true,
      });
    }
    setRestaurantSearch("");
  }, [carousel, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      areaIds: formData.isGlobal ? [] : formData.areaIds,
      areaOrders: formData.isGlobal ? [] : formData.areaOrders,
    });
  };

  const toggleArea = (areaId: string) => {
    setFormData((prev) => {
      const isAdding = !prev.areaIds.includes(areaId);
      const newAreaIds = isAdding
        ? [...prev.areaIds, areaId]
        : prev.areaIds.filter((id) => id !== areaId);

      const newAreaOrders = isAdding
        ? [...prev.areaOrders, { areaId, order: 1 }]
        : prev.areaOrders.filter((ao) => ao.areaId !== areaId);

      return {
        ...prev,
        areaIds: newAreaIds,
        areaOrders: newAreaOrders,
      };
    });
  };

  const addRestaurant = (restaurantId: string) => {
    if (formData.restaurants.some((r) => r.restaurantId === restaurantId))
      return;
    setFormData((prev) => ({
      ...prev,
      restaurants: [
        ...prev.restaurants,
        { restaurantId, order: prev.restaurants.length + 1 },
      ],
    }));
  };

  const removeRestaurant = (restaurantId: string) => {
    setFormData((prev) => ({
      ...prev,
      restaurants: prev.restaurants
        .filter((r) => r.restaurantId !== restaurantId)
        .map((r, idx) => ({ ...r, order: idx + 1 })),
    }));
  };

  const moveRestaurant = (index: number, direction: "up" | "down") => {
    const newRestaurants = [...formData.restaurants];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newRestaurants.length) return;
    [newRestaurants[index], newRestaurants[swapIndex]] = [
      newRestaurants[swapIndex],
      newRestaurants[index],
    ];
    setFormData((prev) => ({
      ...prev,
      restaurants: newRestaurants.map((r, idx) => ({ ...r, order: idx + 1 })),
    }));
  };

  const getRestaurantById = (id: string) =>
    restaurants.find((r) => r.id === id);

  const filteredRestaurants = restaurants.filter((r) => {
    const query = restaurantSearch.toLowerCase();
    const cuisine = (r.cuisine || "").toLowerCase();
    const location = (r.location || "").toLowerCase();

    return (
      r.name.toLowerCase().includes(query) ||
      cuisine.includes(query) ||
      location.includes(query)
    );
  });

  const selectedRestaurantIds = formData.restaurants.map((r) => r.restaurantId);
  const availableRestaurants = filteredRestaurants.filter(
    (r) => !selectedRestaurantIds.includes(r.id)
  );

  const isEditing = !!carousel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[850px] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isEditing ? "Edit Carousel" : "Add New Carousel"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 py-4 overflow-y-auto pr-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Carousel Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Featured Restaurants, Best in London"
                required
              />
            </div>

            {/* Areas Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Global Carousel</Label>
                <Switch
                  checked={formData.isGlobal}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isGlobal: checked, areaIds: [], areaOrders: [] })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.isGlobal
                  ? "This carousel will be displayed in all areas"
                  : "Select specific areas where this carousel will appear"}
              </p>
            </div>

            {/* Area Selection */}
            {!formData.isGlobal && (
              <div className="space-y-2">
                <Label>Select Areas</Label>
                <div className="border border-border rounded-md p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[120px] overflow-y-auto">
                  {areas.map((area) => (
                    <label
                      key={area.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded"
                    >
                      <Checkbox
                        checked={formData.areaIds.includes(area.id)}
                        onCheckedChange={() => toggleArea(area.id)}
                      />
                      <span className="text-sm">{area.name}</span>
                    </label>
                  ))}
                </div>
                {formData.areaIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected:{" "}
                    {formData.areaIds
                      .map((id) => areas.find((a) => a.id === id)?.name)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Restaurant Selection */}
            <div className="space-y-3">
              <Label>Restaurants</Label>

              {/* Selected Restaurants with Order */}
              {formData.restaurants.length > 0 && (
                <div className="border border-border rounded-md divide-y divide-border">
                  {formData.restaurants.map((cr, index) => {
                    const restaurant = getRestaurantById(cr.restaurantId);
                    if (!restaurant) return null;
                    return (
                      <div
                        key={cr.restaurantId}
                        className="flex items-center gap-3 p-3 bg-card"
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveRestaurant(index, "up")}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRestaurant(index, "down")}
                            disabled={index === formData.restaurants.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {cr.order}
                        </span>
                        <img
                          src={restaurant.imageUrl || "/placeholder.svg"}
                          alt={restaurant.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {restaurant.name}
                          </p>
                          {(restaurant.cuisine || restaurant.location) && (
                            <p className="text-xs text-muted-foreground">
                              {[restaurant.cuisine, restaurant.location].filter(Boolean).join(" • ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRestaurant(cr.restaurantId)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search and Add Restaurants */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search restaurants to add..."
                    value={restaurantSearch}
                    onChange={(e) => setRestaurantSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {restaurantSearch && (
                  <div className="border border-border rounded-md max-h-[150px] overflow-y-auto">
                    {availableRestaurants.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground text-center">
                        No restaurants found
                      </p>
                    ) : (
                      availableRestaurants.slice(0, 10).map((restaurant) => (
                        <button
                          key={restaurant.id}
                          type="button"
                          onClick={() => {
                            addRestaurant(restaurant.id);
                            setRestaurantSearch("");
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left border-b border-border last:border-0"
                        >
                          <img
                            src={restaurant.imageUrl || "/placeholder.svg"}
                            alt={restaurant.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {restaurant.name}
                            </p>
                            {(restaurant.cuisine || restaurant.location) && (
                              <p className="text-xs text-muted-foreground">
                                {[restaurant.cuisine, restaurant.location].filter(Boolean).join(" • ")}
                              </p>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {formData.restaurants.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Search and add restaurants to this carousel
                </p>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={
                isSaving ||
                formData.name.trim() === "" ||
                formData.restaurants.length === 0 ||
                (!formData.isGlobal && formData.areaIds.length === 0)
              }
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  {isEditing ? "Saving..." : "Adding..."}
                </>
              ) : (
                <>{isEditing ? "Save Changes" : "Add Carousel"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

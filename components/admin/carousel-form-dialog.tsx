"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

interface Area {
  id: string;
  name: string;
}

interface Restaurant {
  id: string;
  name: string;
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
  onSave: (data: Partial<Carousel>) => void;
}

export function CarouselFormDialog({
  open,
  onOpenChange,
  carousel,
  areas,
  restaurants,
  onSave,
}: CarouselFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Carousel>>({
    name: "",
    isGlobal: true,
    areaIds: [],
    areaOrders: [],
    restaurants: [],
    isActive: true,
  });

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (carousel) {
      setFormData({
        name: carousel.name,
        isGlobal: carousel.isGlobal,
        areaIds: carousel.areaIds || [],
        areaOrders: carousel.areaOrders || [],
        restaurants: carousel.restaurants || [],
        isActive: carousel.isActive,
      });
    } else {
      setFormData({
        name: "",
        isGlobal: true,
        areaIds: [],
        areaOrders: [],
        restaurants: [],
        isActive: true,
      });
    }
    setErrors({});
    setSelectedRestaurantId("");
  }, [carousel, open]);

  const handleAreaToggle = (areaId: string, checked: boolean) => {
    const currentAreas = formData.areaIds || [];
    const currentOrders = formData.areaOrders || [];

    if (checked) {
      // Add area
      const newAreas = [...currentAreas, areaId];
      const newOrders = [...currentOrders, { areaId, order: newAreas.length }];
      
      setFormData({
        ...formData,
        areaIds: newAreas,
        areaOrders: newOrders,
      });
    } else {
      // Remove area
      const newAreas = currentAreas.filter((id) => id !== areaId);
      const newOrders = currentOrders.filter((order) => order.areaId !== areaId);
      
      setFormData({
        ...formData,
        areaIds: newAreas,
        areaOrders: newOrders,
      });
    }
  };

  const addRestaurant = () => {
    if (!selectedRestaurantId) return;

    const currentRestaurants = formData.restaurants || [];
    
    // Check if restaurant is already added
    if (currentRestaurants.some((r) => r.restaurantId === selectedRestaurantId)) {
      return;
    }

    const newRestaurant: CarouselRestaurant = {
      restaurantId: selectedRestaurantId,
      order: currentRestaurants.length + 1,
    };

    setFormData({
      ...formData,
      restaurants: [...currentRestaurants, newRestaurant],
    });
    setSelectedRestaurantId("");
  };

  const removeRestaurant = (restaurantId: string) => {
    const currentRestaurants = formData.restaurants || [];
    const filteredRestaurants = currentRestaurants.filter(
      (r) => r.restaurantId !== restaurantId
    );

    // Reorder remaining restaurants
    const reorderedRestaurants = filteredRestaurants.map((r, index) => ({
      ...r,
      order: index + 1,
    }));

    setFormData({
      ...formData,
      restaurants: reorderedRestaurants,
    });
  };

  const moveRestaurant = (restaurantId: string, direction: "up" | "down") => {
    const currentRestaurants = [...(formData.restaurants || [])];
    const currentIndex = currentRestaurants.findIndex(
      (r) => r.restaurantId === restaurantId
    );

    if (currentIndex === -1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= currentRestaurants.length) return;

    // Swap the restaurants
    [currentRestaurants[currentIndex], currentRestaurants[swapIndex]] = [
      currentRestaurants[swapIndex],
      currentRestaurants[currentIndex],
    ];

    // Update orders
    const reorderedRestaurants = currentRestaurants.map((r, index) => ({
      ...r,
      order: index + 1,
    }));

    setFormData({
      ...formData,
      restaurants: reorderedRestaurants,
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.isGlobal && (!formData.areaIds || formData.areaIds.length === 0)) {
      newErrors.areas = "At least one area must be selected for area-specific carousels";
    }

    if (!formData.restaurants || formData.restaurants.length === 0) {
      newErrors.restaurants = "At least one restaurant must be added";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave(formData);
    onOpenChange(false);
  };

  const availableRestaurants = restaurants.filter(
    (restaurant) =>
      !formData.restaurants?.some((r) => r.restaurantId === restaurant.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {carousel ? "Edit Carousel" : "Create New Carousel"}
          </DialogTitle>
          <DialogDescription>
            {carousel
              ? "Update the carousel details and restaurant order."
              : "Create a new carousel with restaurants in your preferred order."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Carousel Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter carousel name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isGlobal"
                checked={formData.isGlobal}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isGlobal: checked, areaIds: [] })
                }
              />
              <Label htmlFor="isGlobal">Global Carousel</Label>
              <p className="text-sm text-muted-foreground">
                (Shows in all areas)
              </p>
            </div>
          </div>

          {/* Area Selection */}
          {!formData.isGlobal && (
            <div>
              <Label>Select Areas</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`area-${area.id}`}
                      checked={formData.areaIds?.includes(area.id) || false}
                      onCheckedChange={(checked) =>
                        handleAreaToggle(area.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`area-${area.id}`}>{area.name}</Label>
                  </div>
                ))}
              </div>
              {errors.areas && (
                <p className="text-sm text-red-500 mt-1">{errors.areas}</p>
              )}
            </div>
          )}

          {/* Restaurant Selection */}
          <div>
            <Label>Add Restaurants</Label>
            <div className="flex gap-2 mt-2">
              <Select
                value={selectedRestaurantId}
                onValueChange={setSelectedRestaurantId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {availableRestaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={addRestaurant}
                disabled={!selectedRestaurantId}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.restaurants && (
              <p className="text-sm text-red-500 mt-1">{errors.restaurants}</p>
            )}
          </div>

          {/* Restaurant List */}
          {formData.restaurants && formData.restaurants.length > 0 && (
            <div>
              <Label>Restaurant Order ({formData.restaurants.length})</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {formData.restaurants
                  .sort((a, b) => a.order - b.order)
                  .map((carouselRestaurant, index) => {
                    const restaurant = restaurants.find(
                      (r) => r.id === carouselRestaurant.restaurantId
                    );
                    if (!restaurant) return null;

                    return (
                      <div
                        key={carouselRestaurant.restaurantId}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium w-6">
                            {carouselRestaurant.order}
                          </span>
                          {restaurant.imageUrl && (
                            <img
                              src={restaurant.imageUrl}
                              alt={restaurant.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="text-sm">{restaurant.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              moveRestaurant(carouselRestaurant.restaurantId, "up")
                            }
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              moveRestaurant(carouselRestaurant.restaurantId, "down")
                            }
                            disabled={index === formData.restaurants!.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeRestaurant(carouselRestaurant.restaurantId)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {carousel ? "Update" : "Create"} Carousel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

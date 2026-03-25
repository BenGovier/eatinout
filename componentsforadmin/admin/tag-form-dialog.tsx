"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@componentsforadmin/ui/button";
import { Input } from "@componentsforadmin/ui/input";
import { Label } from "@componentsforadmin/ui/label";
import { Checkbox } from "@componentsforadmin/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@componentsforadmin/ui/dialog";
import { ScrollArea } from "@componentsforadmin/ui/scroll-area";
import { Search, Store } from "lucide-react";
import Image from "next/image";

interface Tag {
  id: string;
  name: string;
  slug: string;
  restaurantIds: string[];
  createdAt?: string;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine?: string;
  location?: string;
  imageUrl?: string;
}

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tag: Omit<Tag, "id" | "createdAt">) => void;
  tag: Tag | null;
  restaurants?: Restaurant[];
}

export function TagFormDialog({
  open,
  onOpenChange,
  onSave,
  tag,
  restaurants = [],
}: TagFormDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  const isEditing = !!tag;

  // Reset form when dialog opens/closes or tag changes
  useEffect(() => {
    if (open) {
      if (tag) {
        setName(tag.name);
        setSlug(tag.slug);
        setSelectedRestaurantIds(tag.restaurantIds);
        setAutoSlug(false);
      } else {
        setName("");
        setSlug("");
        setSelectedRestaurantIds([]);
        setAutoSlug(true);
      }
      setRestaurantSearch("");
    }
  }, [open, tag]);

  // Auto-generate slug from name
  useEffect(() => {
    if (autoSlug && name) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      );
    }
  }, [name, autoSlug]);

  // Filtered restaurants
  const filteredRestaurants = useMemo(() => {
    const query = restaurantSearch.toLowerCase();
    return restaurants.filter((r) => {
      const cuisine = (r.cuisine || "").toLowerCase();
      const location = (r.location || "").toLowerCase();
      return (
        r.name.toLowerCase().includes(query) ||
        cuisine.includes(query) ||
        location.includes(query)
      );
    });
  }, [restaurantSearch, restaurants]);

  const handleToggleRestaurant = (restaurantId: string) => {
    setSelectedRestaurantIds((prev) =>
      prev.includes(restaurantId)
        ? prev.filter((id) => id !== restaurantId)
        : [...prev, restaurantId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredRestaurants.map((r) => r.id);
    const allSelected = allFilteredIds.every((id) => selectedRestaurantIds.includes(id));
    
    if (allSelected) {
      setSelectedRestaurantIds((prev) =>
        prev.filter((id) => !allFilteredIds.includes(id))
      );
    } else {
      setSelectedRestaurantIds((prev) => [
        ...new Set([...prev, ...allFilteredIds]),
      ]);
    }
  };

  const handleSlugChange = (value: string) => {
    setAutoSlug(false);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleSave = () => {
    if (!name.trim() || !slug.trim()) return;

    onSave({
      name: name.trim(),
      slug: slug.trim(),
      restaurantIds: selectedRestaurantIds,
    });
    onOpenChange(false);
  };

  const isValid = name.trim() && slug.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Tag" : "Add New Tag"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tag Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Tag Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pizza, Vegan, Family Friendly"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug
              <span className="ml-2 text-xs text-muted-foreground">
                (used in URLs and search)
              </span>
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g., pizza, vegan, family-friendly"
            />
          </div>

          {/* Restaurant Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Associated Restaurants
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedRestaurantIds.length} selected)
                </span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {filteredRestaurants.every((r) =>
                  selectedRestaurantIds.includes(r.id)
                )
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={restaurantSearch}
                onChange={(e) => setRestaurantSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px] rounded-lg border border-border">
              <div className="p-2">
                {filteredRestaurants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Store className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No restaurants found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredRestaurants.map((restaurant) => {
                      const isSelected = selectedRestaurantIds.includes(restaurant.id);
                      return (
                        <div
                          key={restaurant.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                            isSelected
                              ? "border-primary/50 bg-primary/5"
                              : "border-transparent hover:bg-muted/50"
                          }`}
                          onClick={() => handleToggleRestaurant(restaurant.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleRestaurant(restaurant.id)}
                          />
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                            <Image
                              src={restaurant.imageUrl || "/placeholder.svg"}
                              alt={restaurant.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {restaurant.name}
                            </p>
                            {(restaurant.cuisine || restaurant.location) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[restaurant.cuisine, restaurant.location].filter(Boolean).join(" • ")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isEditing ? "Save Changes" : "Add Tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

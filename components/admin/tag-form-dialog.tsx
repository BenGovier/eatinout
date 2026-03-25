"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Store, Loader2 } from "lucide-react";
import Image from "next/image";
import { Badge } from "../ui/badge";

/* ───────────────── TYPES ───────────────── */

interface Restaurant {
  id: string;
  name: string;
  location: string;
  rating?: number;
  dealsCount?: number;
  imageUrl?: string;
  category?: { _id: string; name: string }[];
  city?: string;
}

interface Tag {
  _id: string;
  name: string;
  restaurants?: {
    _id: string;
    name: string;
  }[];
}

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    addRestaurants?: string[];
    removeRestaurants?: string[];
  }) => void;
  tag: Tag | null;
}

/* ───────────────── COMPONENT ───────────────── */

export function TagFormDialog({ open, onOpenChange, onSave, tag }: TagFormDialogProps) {
  const [name, setName] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [initialRestaurantIds, setInitialRestaurantIds] = useState<string[]>([]);

  // Infinite scroll states
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const isEditing = !!tag;

  /* ───────── Reset on open ───────── */

 useEffect(() => {
  if (!open) return;

  if (tag) {
    setName(tag.name);

    // ✅ extract IDs from tag.restaurants
    const ids = tag.restaurants?.map((r) => r._id) || [];

    setSelectedRestaurantIds(ids);
    setInitialRestaurantIds(ids);
  } else {
    setName("");
    setSelectedRestaurantIds([]);
    setInitialRestaurantIds([]);
  }

  setRestaurantSearch("");
  setAllRestaurants([]);
  setPage(1);
  setHasMore(true);
}, [open, tag]);

  /* ───────── Load restaurants ───────── */

const loadRestaurants = useCallback(
  async (pageNum: number) => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const res = await fetch(`/api/restaurants/all?page=${pageNum}&limit=30`, {
        credentials: "include",
      });
      const data = await res.json();

      setAllRestaurants((prev) => {
        const existing = new Set(prev.map((r) => r.id));
        const unique = data.restaurants.filter(
          (r: any) => !existing.has(r.id)
        );
        return [...prev, ...unique];
      });

      if (data.pagination?.hasNextPage === false) {
        setHasMore(false);
      } else {
        setPage(pageNum + 1);
      }
    } finally {
      setLoadingMore(false);
    }
  },
  [loadingMore, hasMore]
);


  // Initial load
  useEffect(() => {
    if (open && allRestaurants.length === 0) {
      loadRestaurants(1);
    }
  }, [open, loadRestaurants]);

  useEffect(() => {
  if (!open) return;

  setRestaurantSearch("");
  setAllRestaurants([]);
  setPage(1);
  setHasMore(true);

  // ⬇️ FORCE first load
  setTimeout(() => {
    loadRestaurants(1);
  }, 0);

}, [open]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current || !hasMore || loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadRestaurants(page);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loaderRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loadingMore, page, loadRestaurants]);

  /* ───────── Filter restaurants ───────── */

  const filteredRestaurants = useMemo(() => {
    return allRestaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(restaurantSearch.toLowerCase()) ||
        r.location.toLowerCase().includes(restaurantSearch.toLowerCase())
    );
  }, [allRestaurants, restaurantSearch]);

  /* ───────── Selection logic ───────── */

  const toggleRestaurant = (id: string) => {
    setSelectedRestaurantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const ids = filteredRestaurants.map((r) => r.id);
    const allSelected = ids.every((id) => selectedRestaurantIds.includes(id));
    setSelectedRestaurantIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  /* ───────── Save ───────── */

  const handleSave = async () => {
    if (!name.trim()) return;

    let body: any = { name };

    if (isEditing) {
      const addRestaurants = selectedRestaurantIds.filter(
        (id) => !initialRestaurantIds.includes(id)
      );

      const removeRestaurants = initialRestaurantIds.filter(
        (id) => !selectedRestaurantIds.includes(id)
      );

      body.addRestaurants = addRestaurants;
      body.removeRestaurants = removeRestaurants;
    } else {
      body.addRestaurants = selectedRestaurantIds;
    }

    if (onSave) onSave(body);
  };

  const isValid = name.trim();

  /* ───────── UI ───────── */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Tag" : "Add New Tag"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Tag Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Associated Restaurants
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedRestaurantIds.length} selected)
                </span>
              </Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search restaurants..."
                value={restaurantSearch}
                onChange={(e) => setRestaurantSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[250px] rounded-lg border">
              <div className="p-2">
                {filteredRestaurants.length === 0 && allRestaurants.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <Store className="h-8 w-8 opacity-50" />
                    <p className="text-sm text-muted-foreground">Loading restaurants...</p>
                  </div>
                ) : filteredRestaurants.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <Store className="h-8 w-8 opacity-50" />
                    <p className="text-sm text-muted-foreground">No restaurants found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredRestaurants.map((r) => {
                      const selected = selectedRestaurantIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                            selected ? "bg-primary/5 border-primary/50" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleRestaurant(r.id)}
                        >
                          <Checkbox checked={selectedRestaurantIds.includes(r.id)} />
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden">
                            <Image
                              src={r.imageUrl || "/placeholder.svg"}
                              alt={r.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center">
                              {r.category && r.category.length > 0 && (
                                <>
                                  {r.category.slice(0, 2).map((cat) => (
                                    <span key={cat._id} className="p-0.5">
                                      {cat.name}
                                    </span>
                                  ))}
                                  {r.category.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{r.category.length - 2} more
                                    </Badge>
                                  )}
                                </>
                              )}
                              {r.city ? ` • ${r.city}` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {hasMore && (
                  <div ref={loaderRef} className="py-4 flex justify-center">
                    {loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div> */}
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

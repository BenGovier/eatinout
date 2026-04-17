"use client";

import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type RestaurantLocationArea = {
  value: string;
  label: string;
};

type RestaurantLocationDropdownProps = {
  areas: RestaurantLocationArea[];
  areasLoading: boolean;
  selectedLocation: string;
  selectedLocationId: string;
  onChooseAll: () => void;
  onChooseArea: (area: RestaurantLocationArea) => void;
};

export function RestaurantLocationDropdown({
  areas,
  areasLoading,
  selectedLocation,
  selectedLocationId,
  onChooseAll,
  onChooseArea,
}: RestaurantLocationDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const handleChooseAll = useCallback(() => {
    onChooseAll();
    setOpen(false);
  }, [onChooseAll]);

  const handleChooseArea = useCallback(
    (area: RestaurantLocationArea) => {
      onChooseArea(area);
      setOpen(false);
    },
    [onChooseArea],
  );

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <MapPin className="w-4 h-4" />
        <span>{selectedLocation || "Choose location"}</span>
        {selectedLocation ? (
          <>
            <span className="text-gray-400">·</span>
            <span className="text-[#DC3545]">change</span>
          </>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20 w-full">
          {areasLoading ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              Loading locations…
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleChooseAll}
                className={`w-full text-left px-3 py-2.5 transition-colors border-b border-gray-200 text-sm font-semibold ${
                  !selectedLocation
                    ? "bg-[#DC3545]/5 text-[#DC3545]"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin
                    className={`h-3.5 w-3.5 ${
                      !selectedLocation ? "text-[#DC3545]" : "text-gray-400"
                    }`}
                  />
                  <span>All Locations</span>
                </div>
              </button>

              {areas.length > 0 ? (
                areas.map((area) => (
                  <button
                    type="button"
                    key={area.value}
                    onClick={() => handleChooseArea(area)}
                    className={`w-full text-left px-3 py-2.5 transition-colors border-b border-gray-100 last:border-b-0 text-sm ${
                      selectedLocationId === area.value
                        ? "bg-[#DC3545]/5 font-semibold"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">{area.label}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2.5 text-sm text-gray-500 text-center">
                  No locations found
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type Option = { value: string; label: string }

type RestaurantFiltersSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  areas: Option[]
  selectedAreaId: string
  onSelectArea: (area: Option | null) => void
  cuisines: Option[]
  selectedCuisineIds: string[]
  onToggleCuisine: (id: string, label: string) => void
  days: ReadonlyArray<Option>
  selectedDayValues: string[]
  onToggleDay: (value: string, label: string) => void
  selectedDining: string[]
  onToggleDining: (option: string) => void
  mealTimes: ReadonlyArray<string>
  selectedMealTimes: string[]
  onToggleMealTime: (mealTime: string) => void
  activeCount: number
  onClearAll: () => void
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${selected
        ? "border-[#DC3545] bg-[#DC3545] text-white"
        : "border-gray-200 bg-white text-gray-800 hover:border-[#DC3545]"
        }`}
    >
      {children}
    </button>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-bold text-gray-900">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

export function RestaurantFiltersSheet({
  open,
  onOpenChange,
  areas,
  selectedAreaId,
  onSelectArea,
  cuisines,
  selectedCuisineIds,
  onToggleCuisine,
  days,
  selectedDayValues,
  onToggleDay,
  selectedDining,
  onToggleDining,
  mealTimes,
  selectedMealTimes,
  onToggleMealTime,
  activeCount,
  onClearAll,
}: RestaurantFiltersSheetProps) {
  const isAllAreas = !selectedAreaId || selectedAreaId === "all"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85dvh] flex-col gap-0 rounded-t-3xl p-0 sm:mx-auto sm:max-w-lg"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
        <SheetHeader className="border-b border-gray-100 px-5 pb-3 pt-2 text-left">
          <SheetTitle className="text-lg font-extrabold text-gray-900">Filters</SheetTitle>
          <SheetDescription className="text-sm text-gray-600">
            Narrow down local restaurant deals.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {areas.length > 0 && (
            <FilterGroup title="Area">
              <FilterChip selected={isAllAreas} onClick={() => onSelectArea(null)}>
                All areas
              </FilterChip>
              {areas.map((area) => (
                <FilterChip
                  key={area.value}
                  selected={selectedAreaId === area.value}
                  onClick={() => onSelectArea(area)}
                >
                  {area.label}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          {cuisines.length > 0 && (
            <FilterGroup title="Cuisine">
              {cuisines.map((cuisine) => (
                <FilterChip
                  key={cuisine.value}
                  selected={selectedCuisineIds.includes(cuisine.value)}
                  onClick={() => onToggleCuisine(cuisine.value, cuisine.label)}
                >
                  {cuisine.label}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          <FilterGroup title="Dine in or takeaway">
            <FilterChip selected={selectedDining.includes("dine-in")} onClick={() => onToggleDining("dine-in")}>
              Dine in
            </FilterChip>
            <FilterChip selected={selectedDining.includes("takeaway")} onClick={() => onToggleDining("takeaway")}>
              Takeaway
            </FilterChip>
          </FilterGroup>

          <FilterGroup title="Days available">
            {days.map((day) => (
              <FilterChip
                key={day.value}
                selected={selectedDayValues.includes(day.value)}
                onClick={() => onToggleDay(day.value, day.label)}
              >
                {day.label}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup title="Meal time">
            {mealTimes.map((mealTime) => (
              <FilterChip
                key={mealTime}
                selected={selectedMealTimes.includes(mealTime)}
                onClick={() => onToggleMealTime(mealTime)}
              >
                {mealTime}
              </FilterChip>
            ))}
          </FilterGroup>
        </div>

        <SheetFooter className="flex-row gap-3 border-t border-gray-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="h-12 flex-1 rounded-full text-base font-semibold"
          >
            Clear all
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 flex-[1.4] rounded-full bg-[#DC3545] text-base font-semibold text-white hover:bg-[#c82333]"
          >
            Show results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

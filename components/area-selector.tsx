"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"

interface Area {
  value: string
  label: string
}

interface AreaSelectorProps {
  onChange?: (areaId: string) => void
  className?: string
  defaultArea?: string
}

export function AreaSelector({
  onChange,
  className,
  defaultArea = "All Areas",
}: AreaSelectorProps) {
  const [areas, setAreas] = useState<Area[]>([{ value: "all", label: "All Areas" }])
  const [selectedArea, setSelectedArea] = useState("all")
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/areas")

        if (!response.ok) {
          throw new Error("Failed to fetch areas")
        }

        const data = await response.json()

        if (data.success && data.areas) {
          const transformed = data.areas
            .filter((area: any) => !area.hideRestaurant) // <-- filter out hidden areas
            .map((area: any) => ({
              value: area._id,
              label: area.name,
            }))
          setAreas([{ value: "all", label: "All Areas" }, ...transformed])
        } else {
          throw new Error(data.message || "Failed to fetch areas")
        }
      } catch (err) {
        console.error("Error fetching areas:", err)
        // fallback to only "All Areas"
        setAreas([{ value: "all", label: "All Areas" }])
      } finally {
        setLoading(false)
      }
    }

    fetchAreas()
  }, [])

  const handleAreaChange = (value: string) => {
    setSelectedArea(value)
    if (onChange) {
      onChange(value)
    }
  }

  if (loading) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Button variant="outline" size="sm" className="rounded-full animate-pulse" disabled>
          Loading areas...
        </Button>
      </div>
    )
  }

  if (isMobile) {
    return (
      <Carousel className={cn(className, "w-full max-w-full")}>
        <CarouselContent className="px-2">
          {areas.map((area) => (
            <CarouselItem key={area.value} className="basis-auto grow-0 shrink-0 w-auto px-1">
              <Button
                variant={selectedArea === area.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleAreaChange(area.value)}
                className="rounded-full whitespace-nowrap"
              >
                {area.label}
              </Button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    )
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {areas.map((area) => (
        <Button
          key={area.value}
          variant={selectedArea === area.value ? "default" : "outline"}
          size="sm"
          onClick={() => handleAreaChange(area.value)}
          className="rounded-full"
        >
          {area.label}
        </Button>
      ))}
    </div>
  )
}

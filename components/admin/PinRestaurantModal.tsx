"use client"
import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Pin, Home, MapPin, X, Loader2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "react-toastify"

interface PinRestaurantModalProps {
  restaurant: {
    _id: string
    name: string
    areas: Array<{ id: string; name: string }> | null
    homePin?: {
      isPinned: boolean
      priority: number | null
      pinnedAt: Date | null
    }
    areaPins?: Array<{
      areaId: string
      isPinned: boolean
      priority: number | null
      areaPinnedAt: Date | null
    }>
  } | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PinRestaurantModal({ restaurant, isOpen, onClose, onSuccess }: PinRestaurantModalProps) {
  // ✅ Early return BEFORE any hooks to ensure consistent hook calls
  if (!restaurant || !isOpen) return null

  const [showAreaSelection, setShowAreaSelection] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // ✅ New states for home priority
  const [showPriorityInput, setShowPriorityInput] = useState(false)
  const [priorityValue, setPriorityValue] = useState<string>("")
  const [priorityError, setPriorityError] = useState<string>("")
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false)
  // ✅ New state for area management
  const [areaStates, setAreaStates] = useState<Record<string, { isPinned: boolean; priority: string }>>({})

  const homePin = restaurant.homePin || { isPinned: false, priority: null, pinnedAt: null }
  const isPinnedToHome = homePin.isPinned
  const currentPriority = homePin.priority || 0
  const hasAreas = restaurant.areas && restaurant.areas.length > 0
  const pinnedAreas = useMemo(() => (restaurant.areaPins || []).filter((p) => p.isPinned), [restaurant.areaPins])
  const pinnedAreaCount = pinnedAreas.length

  // ✅ Init area states callback
  const initAreaStates = useCallback(() => {
    const state: Record<string, { isPinned: boolean; priority: string }> = {}
    restaurant.areas?.forEach((area) => {
      const pin = restaurant.areaPins?.find((p) => p.areaId === area.id)
      state[area.id] = {
        isPinned: !!pin?.isPinned,
        priority: pin?.priority?.toString() || "",
      }
    })
    setAreaStates(state)
  }, [restaurant.areas, restaurant.areaPins])

  // ✅ Pure validation check for home priority
  const isPriorityValid = useMemo(() => {
    const num = parseInt(priorityValue, 10)
    return !isNaN(num) && num >= 1 && num <= 100
  }, [priorityValue])

  // ✅ Full validator with side effects for home
  const validatePriority = (value: string): boolean => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 1 || num > 100) {
      setPriorityError("Priority must be a number between 1 and 100")
      return false
    }
    setPriorityError("")
    return true
  }

  // ✅ Updated to handle both pin and update (independent of areas)
  const handlePinOrUpdateHome = async () => {
    if (!validatePriority(priorityValue)) return
    const newPriority = parseInt(priorityValue, 10)
    const pinType = "home"
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant._id}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinType,
          priority: newPriority
        })
      })
      const data = await response.json()
      if (data.success) {
        if (isUpdatingPriority) {
          toast.success(`Restaurant home priority updated to ${newPriority}!`)
        } else {
          toast.success(`Restaurant pinned to home with priority ${newPriority}!`)
        }
        onSuccess()
        onClose()
        resetPriorityInput()
      } else {
        toast.error(data.message || "Failed to update pin settings")
      }
    } catch (error) {
      console.error("Error updating home pin:", error)
      toast.error("An error occurred while updating home pin")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Unpin home only (independent of areas)
  const handleUnpinFromHomeOnly = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant._id}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinType: "unpinHome"
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Restaurant unpinned from home")
        onSuccess()
        onClose()
      } else {
        toast.error(data.message || "Failed to unpin from home")
      }
    } catch (error) {
      console.error("Error unpinning from home:", error)
      toast.error("An error occurred while unpinning from home")
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowPriorityInput = () => {
    if (isPinnedToHome) {
      setIsUpdatingPriority(true)
      setPriorityValue(currentPriority.toString())
      setShowPriorityInput(true)
    } else {
      setIsUpdatingPriority(false)
      setPriorityValue("")
      setShowPriorityInput(true)
    }
  }

  // ✅ Helper to reset input states
  const resetPriorityInput = () => {
    setShowPriorityInput(false)
    setPriorityValue("")
    setPriorityError("")
    setIsUpdatingPriority(false)
  }

  // ✅ Updated for granular area management
  const handlePinToArea = async () => {
    setIsLoading(true)
    try {
      // Collect and validate pinned areas
      const areaUpdates: { areaId: string; priority: number }[] = []
      let hasError = false
      for (const [areaId, st] of Object.entries(areaStates)) {
        if (st.isPinned) {
          const num = parseInt(st.priority, 10)
          const areaName = restaurant.areas?.find((a) => a.id === areaId)?.name || areaId
          if (st.priority === "" || isNaN(num) || num < 1 || num > 100) {
            toast.error(`Invalid or missing priority for ${areaName}. Must be 1-100.`)
            hasError = true
            break
          }
          areaUpdates.push({ areaId, priority: num })
        }
      }
      if (hasError) {
        setIsLoading(false)
        return
      }

      const willUnpinAll = areaUpdates.length === 0 && pinnedAreaCount > 0
      if (willUnpinAll) {
        if (!confirm(`Unpin from all ${pinnedAreaCount} area(s)?`)) {
          setIsLoading(false)
          return
        }
      }
      if (!willUnpinAll && areaUpdates.length === 0) {
        toast.info("No changes to area pins.")
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/admin/restaurants/${restaurant._id}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinType: "area", areaUpdates })
      })
      const data = await response.json()
      if (data.success) {
        if (willUnpinAll) {
          toast.success("Unpinned from all areas!")
        } else {
          toast.success(`Updated pins for ${areaUpdates.length} area(s)!`)
        }
        onSuccess()
        onClose()
        setShowAreaSelection(false)
        setAreaStates({})
      } else {
        toast.error(data.message || "Failed to update area pins")
      }
    } catch (error) {
      console.error("Error updating area pins:", error)
      toast.error("An error occurred while updating area pins")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Unpin all (both home and areas)
  const handleUnpinAll = async () => {
    if (!confirm("Are you sure you want to unpin from all locations?")) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant._id}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinType: "unpinAll" })
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Restaurant unpinned from all locations")
        onSuccess()
        onClose()
      } else {
        toast.error(data.message || "Failed to unpin restaurant")
      }
    } catch (error) {
      console.error("Error unpinning restaurant:", error)
      toast.error("An error occurred while unpinning restaurant")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5 text-primary" />
            Pin Restaurant: {restaurant.name}
          </DialogTitle>
          <DialogDescription>
            Choose where to pin this restaurant for better visibility
          </DialogDescription>
        </DialogHeader>
        {!showAreaSelection ? (
          <div className="space-y-3 py-4">
            {/* Current Pin Status */}
            {(isPinnedToHome || pinnedAreaCount > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-900 mb-2">Currently Pinned:</p>
                <div className="flex flex-wrap gap-2">
                  {isPinnedToHome && (
                    <Badge className="bg-blue-600 text-white flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      Home Page (Priority: {currentPriority})
                    </Badge>
                  )}
                  {pinnedAreas.map((pin) => {
                    const area = restaurant.areas?.find((a) => a.id === pin.areaId)
                    return (
                      <Badge key={pin.areaId} className="bg-green-600 text-white flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {area?.name} {pin.priority ? `(Priority: ${pin.priority})` : ""}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Pin to Home Button */}
            <Button
              onClick={handleShowPriorityInput}
              disabled={isLoading}
              className={`w-full justify-start h-auto py-4 px-4 ${isPinnedToHome ? "bg-blue-100 hover:bg-blue-200 text-blue-900 border-2 border-blue-400" : "bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200"}`}
              variant="outline"
            >
              <Home className="h-5 w-5 mr-3" />
              <div className="flex-1 text-left">
                <div className="font-semibold">
                  {isPinnedToHome ? "✏️ Update Home Priority" : "Pin to Home"}
                </div>
                {isPinnedToHome && <div className="text-xs text-muted-foreground">Current: {currentPriority}</div>}
                <div className="text-xs text-muted-foreground">
                  Show at the top of all restaurant listings
                </div>
              </div>
            </Button>
            {/* Priority Input Section (for new pin or update) */}
            {showPriorityInput && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  {isUpdatingPriority ? "Update Priority" : "Set Priority"} (1-100, higher = top position)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={priorityValue}
                    onChange={(e) => {
                      setPriorityValue(e.target.value)
                      validatePriority(e.target.value)
                    }}
                    className="w-full"
                    placeholder="Enter priority (e.g., 5)"
                  />
                  {priorityError && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {priorityError}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Same priority? Most recent pin wins.
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handlePinOrUpdateHome}
                    disabled={isLoading || !isPriorityValid}
                    className="flex-1"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Home className="h-4 w-4 mr-2" />}
                    {isUpdatingPriority ? `Update to ${priorityValue}` : `Pin with Priority ${priorityValue}`}
                  </Button>
                  {isUpdatingPriority && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleUnpinFromHomeOnly}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Unpin Home
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetPriorityInput}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
            {/* Manage Area Pins Button */}
            <Button
              onClick={() => {
                if (!hasAreas) {
                  toast.error("This restaurant has no areas assigned")
                  return
                }
                initAreaStates()
                setShowAreaSelection(true)
              }}
              disabled={isLoading || !hasAreas}
              className={`w-full justify-start h-auto py-4 px-4 ${pinnedAreaCount > 0 ? "bg-green-100 hover:bg-green-200 text-green-900 border-2 border-green-400" : "bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200"}`}
              variant="outline"
            >
              <MapPin className="h-5 w-5 mr-3" />
              <div className="flex-1 text-left">
                <div className="font-semibold">
                  {pinnedAreaCount > 0 ? `Manage Area Pins (${pinnedAreaCount})` : "Pin to Areas"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Show at the top when users filter by specific areas
                </div>
              </div>
            </Button>
            {/* Unpin All Button */}
            {(isPinnedToHome || pinnedAreaCount > 0) && (
              <Button
                onClick={handleUnpinAll}
                disabled={isLoading}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unpinning...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Unpin from All Locations
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Manage pins for areas:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAreaSelection(false)
                  setAreaStates({})
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-3 border rounded-lg p-3">
              {restaurant.areas?.map((area) => {
                const state = areaStates[area.id] || { isPinned: false, priority: "" }
                return (
                  <div key={area.id} className="space-y-2 p-3 border rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.isPinned}
                        onChange={(e) => {
                          const newPinned = e.target.checked
                          setAreaStates((prev) => ({
                            ...prev,
                            [area.id]: {
                              ...prev[area.id],
                              isPinned: newPinned,
                              ...(newPinned ? {} : { priority: "" })
                            }
                          }))
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">{area.name}</span>
                    </label>
                    {state.isPinned && (
                      <div className="pl-5 space-y-1">
                        <label className="text-xs font-medium text-gray-700">Priority (1-100)</label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={state.priority}
                          onChange={(e) => {
                            setAreaStates((prev) => ({
                              ...prev,
                              [area.id]: { ...prev[area.id], priority: e.target.value }
                            }))
                          }}
                          placeholder="e.g., 5"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <DialogFooter className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAreaSelection(false)
                  setAreaStates({})
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePinToArea}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
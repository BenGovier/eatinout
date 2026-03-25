"use client"

import { useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

interface OfferWizardStep3Props {
  isUnlimited: boolean
  redemptionLimit: string
  redemptionResetPeriod: "none" | "weekly" | "monthly"
  startDate: string
  endDate: string
  runUntilFurtherNotice: boolean
  isFirstOffer?: boolean
  onUnlimitedChange: (checked: boolean) => void
  onRedemptionLimitChange: (value: string) => void
  onResetPeriodChange: (value: "none" | "weekly" | "monthly") => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onRunUntilFurtherNoticeChange: (checked: boolean) => void
}

export function OfferWizardStep3({
  isUnlimited,
  redemptionLimit,
  redemptionResetPeriod,
  startDate,
  endDate,
  runUntilFurtherNotice,
  isFirstOffer = false,
  onUnlimitedChange,
  onRedemptionLimitChange,
  onResetPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onRunUntilFurtherNoticeChange,
}: OfferWizardStep3Props) {
  const TIME_INTERVAL_MINUTES = 30

  const roundUpToInterval = (date: Date, minutes: number) => {
    const intervalMs = minutes * 60 * 1000
    return new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs)
  }

  // Convert datetime-local string to Date object
  const startDateObj = useMemo(() => {
    if (!startDate) return null
    return new Date(startDate)
  }, [startDate])

  const endDateObj = useMemo(() => {
    if (!endDate || runUntilFurtherNotice) return null
    return new Date(endDate)
  }, [endDate, runUntilFurtherNotice])

  // Handle start date change - ensure 30-minute intervals and future time
  const handleStartDateChange = (date: Date | null) => {
    if (!date) {
      onStartDateChange("")
      return
    }

    const now = new Date()
    
    // Round up to next 30-minute interval
    const roundedDate = roundUpToInterval(date, TIME_INTERVAL_MINUTES)
    
    // If selected time is in the past, bump to next 30-minute interval
    if (roundedDate <= now) {
      const nextInterval = roundUpToInterval(now, TIME_INTERVAL_MINUTES)
      
      // Format as YYYY-MM-DDTHH:mm for datetime-local format
      const year = nextInterval.getFullYear()
      const month = String(nextInterval.getMonth() + 1).padStart(2, '0')
      const day = String(nextInterval.getDate()).padStart(2, '0')
      const hours = String(nextInterval.getHours()).padStart(2, '0')
      const minutes = String(nextInterval.getMinutes()).padStart(2, '0')
      onStartDateChange(`${year}-${month}-${day}T${hours}:${minutes}`)
      return
    }
    
    // Format as YYYY-MM-DDTHH:mm
    const year = roundedDate.getFullYear()
    const month = String(roundedDate.getMonth() + 1).padStart(2, '0')
    const day = String(roundedDate.getDate()).padStart(2, '0')
    const hours = String(roundedDate.getHours()).padStart(2, '0')
    const minutes = String(roundedDate.getMinutes()).padStart(2, '0')
    onStartDateChange(`${year}-${month}-${day}T${hours}:${minutes}`)
  }

  // Handle end date change - ensure 30-minute intervals and after start date
  const handleEndDateChange = (date: Date | null) => {
    if (!date) {
      onEndDateChange("")
      return
    }

    const now = new Date()
    const start = startDate ? new Date(startDate) : null
    
    // Round up to next 30-minute interval
    const roundedDate = roundUpToInterval(date, TIME_INTERVAL_MINUTES)
    
    // If selected time is before start date, use start date + 30 minutes
    if (start && roundedDate <= start) {
      const nextInterval = roundUpToInterval(
        new Date(start.getTime() + TIME_INTERVAL_MINUTES * 60 * 1000),
        TIME_INTERVAL_MINUTES
      )
      
      const year = nextInterval.getFullYear()
      const month = String(nextInterval.getMonth() + 1).padStart(2, '0')
      const day = String(nextInterval.getDate()).padStart(2, '0')
      const hours = String(nextInterval.getHours()).padStart(2, '0')
      const minutes = String(nextInterval.getMinutes()).padStart(2, '0')
      onEndDateChange(`${year}-${month}-${day}T${hours}:${minutes}`)
      return
    }
    
    // If selected time is in the past (and no start date), bump to next 30-minute interval
    if (!start && roundedDate <= now) {
      const nextInterval = roundUpToInterval(now, TIME_INTERVAL_MINUTES)
      
      const year = nextInterval.getFullYear()
      const month = String(nextInterval.getMonth() + 1).padStart(2, '0')
      const day = String(nextInterval.getDate()).padStart(2, '0')
      const hours = String(nextInterval.getHours()).padStart(2, '0')
      const minutes = String(nextInterval.getMinutes()).padStart(2, '0')
      onEndDateChange(`${year}-${month}-${day}T${hours}:${minutes}`)
      return
    }
    
    // Format as YYYY-MM-DDTHH:mm
    const year = roundedDate.getFullYear()
    const month = String(roundedDate.getMonth() + 1).padStart(2, '0')
    const day = String(roundedDate.getDate()).padStart(2, '0')
    const hours = String(roundedDate.getHours()).padStart(2, '0')
    const minutes = String(roundedDate.getMinutes()).padStart(2, '0')
    onEndDateChange(`${year}-${month}-${day}T${hours}:${minutes}`)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Redemption Limits & Duration</h3>

      {isFirstOffer && (
        <Alert className="border-[#E31E24] bg-red-50">
          <Info className="h-4 w-4 text-[#E31E24]" />
          <AlertDescription className="text-foreground">
            <strong>First Offer:</strong> This is your restaurant's first offer. It will run indefinitely without an expiry date. After this offer goes live, you can create additional offers with custom expiry dates.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="unlimited"
            checked={isUnlimited}
            onCheckedChange={(checked) => {
              onUnlimitedChange(checked as boolean)
            }}
          />
          <Label htmlFor="unlimited" className="text-sm font-normal cursor-pointer">
            Unlimited redemptions
          </Label>
        </div>

        {!isUnlimited && (
          <div className="space-y-4 pl-6 border-l-2 border-[#E31E24]/20">
            <div className="space-y-2">
              <Label htmlFor="redemption-limit">Number of Redemptions Available</Label>
              <Input
                id="redemption-limit"
                type="number"
                min="1"
                value={redemptionLimit}
                onChange={(e) => onRedemptionLimitChange(e.target.value)}
                placeholder="e.g., 10, 50, 100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-period">Reset Period</Label>
              <Select
                value={redemptionResetPeriod}
                onValueChange={(value: "none" | "weekly" | "monthly") => onResetPeriodChange(value)}
              >
                <SelectTrigger id="reset-period">
                  <SelectValue placeholder="Select when to reset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Never (Total for entire offer period)</SelectItem>
                  <SelectItem value="weekly">Reset Weekly (Every Monday)</SelectItem>
                  <SelectItem value="monthly">Reset Monthly (1st of each month)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {redemptionResetPeriod === "none" && "Total redemptions for the entire offer period"}
                {redemptionResetPeriod === "weekly" && `${redemptionLimit || "X"} redemptions available each week`}
                {redemptionResetPeriod === "monthly" && `${redemptionLimit || "X"} redemptions available each month`}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="start-date">Date Offer Appears On The App *</Label>
        <DatePicker
          id="start-date"
          selected={startDateObj}
          onChange={(date: Date | null) => handleStartDateChange(date)}
          showTimeSelect
          timeIntervals={TIME_INTERVAL_MINUTES}
          timeCaption="Time"
          dateFormat="dd MMMM yyyy h:mm aa"
          placeholderText="Select date and time"
          filterDate={(date) => {
            const today = new Date()
            today.setHours(0, 0, 0, 0) // strip time
            return date >= today
          }}
          filterTime={(time) => {
            const now = new Date()
            if (time.toDateString() === now.toDateString()) {
              const minTime = roundUpToInterval(now, TIME_INTERVAL_MINUTES)
              return time.getTime() >= minTime.getTime()
            }
            return true
          }}
          className="w-full border rounded px-3 py-2 border-gray-300 focus:border-[#E31E24] focus:ring-[#E31E24] focus:outline-none focus:ring-1"
          wrapperClassName="w-full"
        />
        <p className="text-xs text-muted-foreground">Select a date and time in the future (30-minute intervals: 1:00, 1:30, 2:00, etc.)</p>
      </div>

      {!isFirstOffer && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="end-date">Date Offer Is Removed From The App</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="runUntilFurtherNotice"
                checked={runUntilFurtherNotice}
                onCheckedChange={(checked) => onRunUntilFurtherNoticeChange(checked as boolean)}
              />
              <Label htmlFor="runUntilFurtherNotice" className="text-sm font-normal cursor-pointer">
                Run Until Further Notice
              </Label>
            </div>
          </div>
          {!runUntilFurtherNotice && (
            <>
              <DatePicker
                id="end-date"
                selected={endDateObj}
                onChange={(date: Date | null) => handleEndDateChange(date)}
                showTimeSelect
                timeIntervals={TIME_INTERVAL_MINUTES}
                timeCaption="Time"
                dateFormat="dd MMMM yyyy h:mm aa"
                placeholderText="Select expiry date and time"
                filterDate={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0) // strip time
                  const start = startDateObj
                  if (start) {
                    const startDateOnly = new Date(start)
                    startDateOnly.setHours(0, 0, 0, 0)
                    return date >= startDateOnly
                  }
                  return date >= today
                }}
                filterTime={(time) => {
                  const now = new Date()
                  const start = startDateObj
                  
                  // If same day as start date, ensure time is after start time
                  if (start && time.toDateString() === start.toDateString()) {
                    return time.getTime() > start.getTime()
                  }
                  
                  // If same day as today, ensure time is in the future
                  if (time.toDateString() === now.toDateString()) {
                    const minTime = roundUpToInterval(now, TIME_INTERVAL_MINUTES)
                    return time.getTime() >= minTime.getTime()
                  }
                  
                  return true
                }}
                className="w-full border rounded px-3 py-2 border-gray-300 focus:border-[#E31E24] focus:ring-[#E31E24] focus:outline-none focus:ring-1"
                wrapperClassName="w-full"
              />
              <p className="text-xs text-muted-foreground">Must be after start date (30-minute intervals: 1:00, 1:30, 2:00, etc.)</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

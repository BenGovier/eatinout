"use client"

import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, "0")
  const minute = (i % 2 === 0 ? 0 : 30).toString().padStart(2, "0")
  return { value: `${hour}:${minute}`, label: `${hour}:${minute}` }
})

interface ValidDays {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

interface OfferWizardStep4Props {
  validAllWeek: boolean
  validDays: ValidDays
  dineIn: boolean
  takeaway: boolean
  startTime: string
  endTime: string
  bookingType: "mandatory" | "recommended" | "not-needed"
  onValidAllWeekChange: (checked: boolean) => void
  onValidDayChange: (day: string, checked: boolean) => void
  onDineInChange: (checked: boolean) => void
  onTakeawayChange: (checked: boolean) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onBookingTypeChange: (value: "mandatory" | "recommended" | "not-needed") => void
}

export function OfferWizardStep4({
  validAllWeek,
  validDays,
  dineIn,
  takeaway,
  startTime,
  endTime,
  bookingType,
  onValidAllWeekChange,
  onValidDayChange,
  onDineInChange,
  onTakeawayChange,
  onStartTimeChange,
  onEndTimeChange,
  onBookingTypeChange,
}: OfferWizardStep4Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">When is this offer available?</h3>

      <div className="space-y-3">
        <Label>Valid Days *</Label>
        <label className="flex items-center gap-3">
          <Checkbox
            checked={validAllWeek}
            onCheckedChange={(checked) => onValidAllWeekChange(checked as boolean)}
          />
          <span className="font-medium">All Week</span>
        </label>

        <div className="grid grid-cols-2 gap-2 ml-6 border-l-2 border-border pl-4">
          {DAYS_OF_WEEK.map((day) => (
            <label key={day} className="flex items-center gap-2">
              <Checkbox
                checked={validDays[day.toLowerCase() as keyof ValidDays]}
                disabled={validAllWeek}
                onCheckedChange={(checked) => onValidDayChange(day.toLowerCase(), checked as boolean)}
              />
              <span className="text-sm">{day}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Dining Options *</Label>
        <label className="flex items-center gap-3">
          <Checkbox checked={dineIn} onCheckedChange={(checked) => onDineInChange(checked as boolean)} />
          <span>Dine In</span>
          <span className="text-xs text-muted-foreground">(valid for in-restaurant dining)</span>
        </label>
        <label className="flex items-center gap-3">
          <Checkbox checked={takeaway} onCheckedChange={(checked) => onTakeawayChange(checked as boolean)} />
          <span>Takeaway</span>
          <span className="text-xs text-muted-foreground">(valid for takeaway)</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-time">Start Time For Offer *</Label>
          <Select value={startTime} onValueChange={onStartTimeChange}>
            <SelectTrigger id="start-time" className="w-full">
              <SelectValue placeholder="Select start time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-time">End Time For Offer *</Label>
          <Select value={endTime} onValueChange={onEndTimeChange}>
            <SelectTrigger id="end-time" className="w-full">
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Booking Requirement *</Label>
        <RadioGroup value={bookingType} onValueChange={(value) => onBookingTypeChange(value as "mandatory" | "recommended" | "not-needed")}>
          <label className="flex items-center gap-3 cursor-pointer">
            <RadioGroupItem value="mandatory" id="mandatory" />
            <span>Mandatory booking</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <RadioGroupItem value="recommended" id="recommended" />
            <span>Booking recommended not essential</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <RadioGroupItem value="not-needed" id="not-needed" />
            <span>Booking not needed</span>
          </label>
        </RadioGroup>
      </div>

      {startTime && endTime && startTime >= endTime && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>End time must be after start time</AlertDescription>
        </Alert>
      )}
    </div>
  )
}


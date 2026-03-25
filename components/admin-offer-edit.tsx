"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, X, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import { cn } from "@/lib/utils";

const daysOfWeek = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

// ✅ FIX 2: Corrected AM/PM logic in timeOptions
const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
  const totalHour = Math.floor(i / 2)             // 0–23
  const minute = i % 2 === 0 ? "00" : "30"
  const hour24 = totalHour.toString().padStart(2, "0")
  const ampm = totalHour < 12 ? "AM" : "PM"
  const hour12 = totalHour % 12 === 0 ? 12 : totalHour % 12
  return {
    value: `${hour24}:${minute}`,
    label: `${hour24}:${minute} (${hour12}:${minute} ${ampm})`
  }
})

const bookingOptions = [
  { id: "mandatory", label: "Mandatory booking" },
  { id: "recommended", label: "Booking recommended not essential" },
  { id: "notNeeded", label: "Booking not needed" },
];

// Helper to convert ISO UTC string to local datetime-local string
function toDatetimeLocalString(dateString: string | null | undefined) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date.getTime() - tzOffset)
    .toISOString()
    .slice(0, 16);
  return localISO;
}

export default function AdminEditOfferPage({
  params,
  onSave,
  onCancel,
}: {
  params: { id: string; offerId?: string };
  onSave?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restaurants, setRestaurants] = useState([] as any[]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Array<{ _id: string; name: string; slug?: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);

  useEffect(() => {
    document.title = params.offerId ? "Edit Offer" : "Add Offer";
  }, [params.offerId]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    expiryDate: "",
    selectedDays: [] as string[],
    startTime: "",
    endTime: "",
    terms: "",
    dineIn: true,
    dineOut: false,
    restaurantId: params.id,
    runUntilFurtherNotice: false,
    offerType: "",
    bookingRequirement: "",
    maxRedemptionLimit: "",
    isUnlimited: false,
    recurringType: "never",
    discountPercentage: "",
    freeItemName: "",
    otherOfferDescription: "",
    tags: [] as string[],
  });

  useEffect(() => {
    if (!params.id) {
      setIsLoading(false);
      return;
    }
    const run = async () => {
      try {
        await fetchTags();
        await fetchRestaurantDetails();
        if (params.offerId) {
          await loadOfferData(params.offerId);
        }
        if (ownerId) {
          await fetchRestaurants();
        }
      } catch (error) {
        console.error("Error in useEffect:", error);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [params.id, params.offerId]);

  useEffect(() => {
    if (ownerId) {
      fetchRestaurants();
    }
  }, [ownerId]);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/admin/tags");
      if (response.ok) {
        const data = await response.json();
        if (data?.success && data?.tags) {
          setAllTags(data.tags);
        }
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchRestaurantDetails = async () => {
    try {
      const response = await fetch(`/api/admin/restaurants/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOwnerId(
            data.restaurant.userId || data.restaurant.associatedId || null
          );
          return;
        }
      }
      throw new Error("Failed to fetch restaurant details");
    } catch (err: any) {
      console.error("Error fetching restaurant:", err);
    }
  };

  const fetchRestaurants = async () => {
    if (!ownerId) return;
    console.log("Fetching restaurants for owner ID:", ownerId);
    try {
      const response = await fetch(
        `/api/admin/restaurants/restaurants-by-owner?id=${ownerId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch restaurants");
      }
      const data = await response.json();
      const fetchedRestaurants = data?.restaurants?.map((restaurant: any) => ({
        id: restaurant._id,
        name: restaurant.name,
      }));
      setRestaurants(fetchedRestaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast.error("Failed to fetch restaurants");
    }
  };

  const loadOfferData = async (id: string) => {
    try {
      const response = await fetch(`/api/restaurant/offers/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch offer data");
      }
      const data = await response.json();

      let startDate = toDatetimeLocalString(data.startDate);
      let expiryDate = toDatetimeLocalString(data.expiryDate);

      let selectedDays: string[];
      if (data.validDays.toLowerCase() === "all week") {
        selectedDays = daysOfWeek.map((day) => day.id);
      } else {
        selectedDays = data.validDays.toLowerCase().split(", ");
      }

      const [startTime, endTime] = data.validHours.split(" - ");

      let tagIds: string[] = [];
      if (data.tags) {
        const tags = Array.isArray(data.tags) ? data.tags : JSON.parse(data.tags || "[]");
        tagIds = tags.map((tag: any) => {
          if (typeof tag === "string") return tag;
          return tag?._id || tag?.id || "";
        }).filter(Boolean);
        setSelectedTags(tagIds);
      }

      setFormData({
        title: data.title,
        description: data.description,
        startDate: startDate,
        expiryDate: expiryDate,
        selectedDays: selectedDays,
        startTime: startTime,
        endTime: endTime,
        terms: data.terms,
        dineIn: data.dineIn,
        dineOut: data.dineOut,
        restaurantId: data.restaurantId,
        runUntilFurtherNotice: data.runUntilFurther,
        offerType: data.offerType || "",
        bookingRequirement: data.bookingRequirement || "",
        maxRedemptionLimit: data.maxRedemptionLimit != null ? data.maxRedemptionLimit.toString() : "",
        isUnlimited: data.isUnlimited,
        recurringType: data.recurringType || "never",
        discountPercentage: data.discountPercentage?.toString() || "",
        freeItemName: data.freeItemName || "",
        otherOfferDescription: data.otherOfferDescription || "",
        tags: tagIds,
      });
    } catch (error) {
      console.error("Error loading offer data:", error);
      toast.error("Failed to load offer data. Please try again.");
    }
  };

  useEffect(() => {
    console.log("asdfghjk", formData);
  }, [formData])

  const handleChange = (field: string, value: string | boolean) => {
    if (field === "runUntilFurtherNotice" && value === true) {
      setFormData((prev) => ({
        ...prev,
        runUntilFurtherNotice: true,
        expiryDate: "",
      }));
      if (errors.expiryDate) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.expiryDate;
          return newErrors;
        });
      }
      return;
    }
    if (field === "runUntilFurtherNotice" && value === false) {
      setFormData((prev) => ({
        ...prev,
        runUntilFurtherNotice: false,
      }));
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (field: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Offer title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.offerType) {
      newErrors.offerType = "Offer type is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.runUntilFurtherNotice && !formData.expiryDate) {
      newErrors.expiryDate = "Either select an expiry date or check 'Run Until Further Notice'";
    } else if (!formData.runUntilFurtherNotice && formData.expiryDate) {
      if (formData.startDate) {
        const startDate = new Date(formData.startDate);
        const expiryDate = new Date(formData.expiryDate);
        if (expiryDate <= startDate) {
          newErrors.expiryDate = "Expiry date must be after start date";
        }
      }
    }

    if (formData.selectedDays.length === 0) {
      newErrors.selectedDays = "Please select at least one valid day";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }

    if (!formData.bookingRequirement) {
      newErrors.bookingRequirement = "Booking requirement is required";
    }

    if (formData.offerType === "percentOff") {
      if (!formData.discountPercentage) {
        newErrors.discountPercentage = "Discount percentage is required";
      } else if (
        Number(formData.discountPercentage) < 1 ||
        Number(formData.discountPercentage) > 100
      ) {
        newErrors.discountPercentage = "Discount must be between 1 and 100";
      }
    }

    // if (formData.offerType === "freeItem") {
    //   if (!formData.freeItemName.trim()) {
    //     newErrors.freeItemName = "Free item name is required";
    //   }
    // }

    if (formData.offerType === "other") {
      if (!formData.otherOfferDescription.trim()) {
        newErrors.otherOfferDescription = "Custom offer description is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLimitChange = (value: string) => {
    setFormData(prev => ({ ...prev, maxRedemptionLimit: value }));
  };

  const handleUnlimitedChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isUnlimited: checked,
      maxRedemptionLimit: checked ? "" : prev.maxRedemptionLimit,
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const validDays =
        formData.selectedDays.length === 7
          ? "All week"
          : formData.selectedDays
            .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
            .join(", ");
      const validHours = `${formData.startTime} - ${formData.endTime}`;
      const terms = formData.terms.trim();
      const now = new Date();
      const startDateLocal = formData.startDate || null;
      const expiryDateLocal = formData.runUntilFurtherNotice
        ? null
        : formData.expiryDate || null;
      const offerStart = startDateLocal ? new Date(startDateLocal) : null;
      let status = "inactive";
      if (offerStart && offerStart <= now) {
        status = "active";
      }
      const isEdit = Boolean(params.offerId);
      const payload: any = {
        title: formData.title,
        description: formData.description,
        offerType: formData.offerType,
        validDays: validDays,
        validHours: validHours,
        startDate: startDateLocal,
        expiryDate: expiryDateLocal,
        terms: terms,
        dineIn: formData.dineIn,
        dineOut: formData.dineOut,
        restaurantId: formData.restaurantId,
        runUntilFurther: formData.runUntilFurtherNotice,
        bookingRequirement: formData.bookingRequirement,
        maxRedemptionLimit: formData.isUnlimited ? null : formData.maxRedemptionLimit,
        isUnlimited: formData.isUnlimited,
        recurringType: formData.isUnlimited ? null : (formData.maxRedemptionLimit ? formData.recurringType : null),
        recurringStartDate: formData.isUnlimited ? null : (formData.maxRedemptionLimit && formData.recurringType !== "never" ? new Date() : null),
        tags: selectedTags,
        discountPercentage: formData.offerType === "percentOff" ? parseInt(formData.discountPercentage) : null,
        freeItemName: formData.offerType === "freeItem" ? formData.freeItemName.trim() : null,
        otherOfferDescription: formData.offerType === "other" ? formData.otherOfferDescription.trim() : null,
      };

      let response: Response;
      if (isEdit) {
        response = await fetch("/api/restaurant/offers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: params.offerId, status }),
        });
      } else {
        response = await fetch("/api/restaurant/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (isEdit ? "Failed to update offer" : "Failed to create offer"));
      }
      toast.success(isEdit ? "Offer updated successfully" : "Offer created successfully");
      if (onSave) onSave();
    } catch (error: any) {
      toast.error(error.message || "Failed to save offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{params.offerId ? "Edit Offer" : "Add Offer"}</h1>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <p className="text-lg text-gray-600">Loading offer data...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Offer Details</CardTitle>
            <CardDescription>Edit offer for your restaurant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category">Restaurant</Label>
              <Select
                value={formData.restaurantId}
                onValueChange={(value) => handleChange("restaurantId", value)}
              >
                <SelectTrigger
                  id="restaurantId"
                  className={`${errors.restaurantId ? "border-red-500 focus:ring-red-500" : ""}`}
                >
                  <SelectValue placeholder="Select Restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.restaurantId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.restaurantId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="title"
                className={errors.title ? "text-red-500" : ""}
              >
                Offer Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., 2 for 1 on all pasta dishes"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={errors.title ? "border-red-500" : ""}
                maxLength={40}
              />
               <p className="text-xs text-muted-foreground">{formData.title.length}/40 characters</p>
              {errors.title && (
                <p className="text-sm text-red-500 flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className={errors.description ? "text-red-500" : ""}
              >
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your offer in detail"
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500 flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="offerType"
                className={errors.offerType ? "text-red-500" : ""}
              >
                Offer Type
              </Label>
              <Select
                value={formData.offerType}
                onValueChange={(value) => handleChange("offerType", value)}
              >
                <SelectTrigger
                  id="offerType"
                  className={errors.offerType ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select offer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2for1">2 for 1</SelectItem>
                  <SelectItem value="percentOff">Percentage Off</SelectItem>
                  <SelectItem value="freeItem">Free Item</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.offerType && (
                <p className="text-sm text-red-500 flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.offerType}
                </p>
              )}
            </div>

            {/* Conditional Fields Based on Offer Type */}
            {formData.offerType === "percentOff" && (
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount Percentage *</Label>
                <div className="relative">
                  <Input
                    id="discountPercentage"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g., 25, 30, 50"
                    value={formData.discountPercentage || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    className="pr-8"
                  />
                  {errors.discountPercentage && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.discountPercentage}
                    </p>
                  )}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-gray-500">Enter the discount percentage (1-100)</p>
              </div>
            )}

            {/* {formData.offerType === "freeItem" && (
              <div className="space-y-2">
                <Label htmlFor="freeItemName">Free Item Name *</Label>
                <Input
                  id="freeItemName"
                  type="text"
                  placeholder="e.g., Apple, Mango, Coffee"
                  value={formData.freeItemName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, freeItemName: e.target.value }))}
                />
                {errors.freeItemName && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.freeItemName}
                  </p>
                )}
                <p className="text-xs text-gray-500">Enter the name of the free item</p>
              </div>
            )} */}

            {formData.offerType === "other" && (
              <div className="space-y-2">
                <Label htmlFor="otherOfferDescription">Custom Offer Description *</Label>
                <Input
                  id="otherOfferDescription"
                  type="text"
                  placeholder="Describe your custom offer"
                  value={formData.otherOfferDescription || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, otherOfferDescription: e.target.value }))}
                />
                {errors.otherOfferDescription && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.otherOfferDescription}
                  </p>
                )}
                <p className="text-xs text-gray-500">Describe your custom offer details</p>
              </div>
            )}

            <div className="space-y-3">
              <Label>Tags</Label>
              <p className="text-sm text-gray-500">Click to select/deselect tags</p>

              <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border min-h-[60px]">
                {allTags.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading tags...</p>
                ) : (
                  allTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag._id);

                    return (
                      <Badge
                        key={tag._id}
                        variant={isSelected ? "default" : "secondary"}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags((prev) =>
                              prev.filter((id) => id !== tag._id)
                            );
                          } else {
                            setSelectedTags((prev) => [...prev, tag._id]);
                          }
                        }}
                        className={`cursor-pointer gap-1 px-3 py-1 transition-colors ${isSelected
                          ? "bg-primary hover:bg-primary/90 text-white"
                          : "hover:bg-primary/10"
                          }`}
                      >
                        {tag.name}

                        {isSelected && (
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTags((prev) =>
                                prev.filter((id) => id !== tag._id)
                              );
                            }}
                          />
                        )}
                      </Badge>
                    );
                  })
                )}
              </div>

              {selectedTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Selected Tags ({selectedTags.filter(tagId => allTags.some(t => t._id === tagId)).length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tagId) => {
                      const tag = allTags.find((t) => t._id === tagId);
                      if (!tag) return null;

                      return (
                        <Badge key={tagId} variant="secondary" className="gap-1">
                          {tag.name}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() =>
                              setSelectedTags((prev) =>
                                prev.filter((id) => id !== tagId)
                              )
                            }
                          />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Redemption Limit</Label>

              <Input
                type="number"
                placeholder="Max redemptions"
                value={formData.maxRedemptionLimit}
                onChange={e => handleLimitChange(e.target.value)}
                disabled={formData.isUnlimited}
                className="w-full"
                min={1}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.isUnlimited}
                  onCheckedChange={checked => handleUnlimitedChange(Boolean(checked))}
                  id="unlimitedCheckbox"
                />
                <Label htmlFor="unlimitedCheckbox" className="text-sm font-normal">
                  Unlimited
                </Label>
              </div>
              <p className="text-xs text-gray-500">
                Set how many times this offer can be redeemed. Tick "Unlimited" for no limit.
              </p>

              {!formData.isUnlimited && formData.maxRedemptionLimit && (
                <div className="space-y-2 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Label htmlFor="recurringType" className="text-sm font-semibold">
                    Limit Reset Period
                  </Label>
                  <Select
                    value={formData.recurringType}
                    onValueChange={(value) => handleChange("recurringType", value)}
                  >
                    <SelectTrigger id="recurringType">
                      <SelectValue placeholder="Select reset period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never (One-time limit)</SelectItem>
                      <SelectItem value="weekly">Weekly (Resets every week)</SelectItem>
                      <SelectItem value="monthly">Monthly (Resets every month)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    {formData.recurringType === "never" && "The limit will never reset. Once reached, no more redemptions allowed."}
                    {formData.recurringType === "weekly" && "The limit will reset every week, allowing users to redeem again."}
                    {formData.recurringType === "monthly" && "The limit will reset every month, allowing users to redeem again."}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex flex-col">
                  <Label
                    htmlFor="startDate"
                    className={errors.startDate ? "text-red-500 mb-3" : "mb-3"}
                  >
                    Date Offer Appears The On App
                  </Label>
                  {/* ✅ FIX 1a: Removed date.setMinutes(0,0,0) so 5:30 is no longer snapped to 5:00 */}
                  <DatePicker
                    id="startDate"
                    selected={
                      formData.startDate ? new Date(formData.startDate) : null
                    }
                    onChange={(date: any) => {
                      const now = new Date();

                      if (date.toDateString() === now.toDateString()) {
                        const selectedTime = new Date(date);
                        if (selectedTime.getTime() <= now.getTime()) {
                          // ✅ FIX 1b: Snap to next 30-min slot instead of next full hour
                          const next30 = new Date(now);
                          const minutes = now.getMinutes() < 30 ? 30 : 0;
                          const hoursAdd = now.getMinutes() < 30 ? 0 : 1;
                          next30.setHours(now.getHours() + hoursAdd, minutes, 0, 0);
                          handleChange("startDate", next30.toISOString());
                          return;
                        }
                      }

                      // ✅ Removed date.setMinutes(0, 0, 0) — preserves selected minutes (e.g. :30)
                      handleChange("startDate", date.toISOString());
                    }}
                    showTimeSelect
                    timeIntervals={30}
                    timeCaption="Time"
                    dateFormat="dd MMMM yyyy h:mm aa"
                    placeholderText="Select date and time"
                    filterDate={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date >= today;
                    }}
                    filterTime={(time) => {
                      const now = new Date();

                      // Always block selecting past time
                      return time.getTime() > now.getTime();
                    }}
                    className={`w-full border rounded px-3 py-2 
                    ${errors.startDate
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-red-500 focus:ring-red-500"
                      }
                    focus:outline-none focus:ring-1`}
                  />
                </div>

                {errors.startDate && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-col md:flex-col md:items-start md:space-x-4">
                  <Label
                    htmlFor="expiryDate"
                    className={errors.expiryDate ? "text-red-500" : ""}
                  >
                    Date Offer Is Removed From The App
                  </Label>
                </div>
                {/* ✅ FIX 1c: Removed date.setMinutes(0,0,0) from expiryDate too */}
                <DatePicker
                  id="expiryDate"
                  selected={
                    formData.expiryDate && !formData.runUntilFurtherNotice
                      ? new Date(formData.expiryDate)
                      : null
                  }
                  onChange={(date: any) => {
                    const now = new Date();
                    if (date.toDateString() === now.toDateString()) {
                      const selectedTime = new Date(date);
                      if (selectedTime.getTime() <= now.getTime()) {
                        // ✅ FIX 1d: Snap to next 30-min slot instead of next full hour
                        const next30 = new Date(now);
                        const minutes = now.getMinutes() < 30 ? 30 : 0;
                        const hoursAdd = now.getMinutes() < 30 ? 0 : 1;
                        next30.setHours(now.getHours() + hoursAdd, minutes, 0, 0);
                        handleChange("expiryDate", next30.toISOString());
                        return;
                      }
                    }
                    // ✅ Removed date.setMinutes(0, 0, 0) — preserves selected minutes (e.g. :30)
                    handleChange("expiryDate", date.toISOString());
                  }}
                  showTimeSelect
                  timeIntervals={30}
                  timeCaption="Time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  placeholderText="Select expiry date and time"
                  disabled={formData.runUntilFurtherNotice}
                  filterDate={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date >= today;
                  }}
                  filterTime={(time) => {
                    const now = new Date();

                    // Always block selecting past time
                    return time.getTime() > now.getTime();
                  }}
                  className={`!w-full border rounded px-3 py-2 
                     ${errors.expiryDate ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-red-500 focus:ring-red-500"}
                     focus:outline-none focus:ring-1`}
                  wrapperClassName="w-full"
                />

                {errors.expiryDate && !formData.runUntilFurtherNotice && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.expiryDate}
                  </p>
                )}

                <div className="flex items-start mt-1 md:mt-1">
                  <Checkbox
                    id="runUntilFurtherNotice"
                    checked={formData.runUntilFurtherNotice}
                    onCheckedChange={(checked) =>
                      handleChange("runUntilFurtherNotice", checked === true)
                    }
                    className="mr-2"
                  />
                  <Label
                    htmlFor="runUntilFurtherNotice"
                    className="text-sm font-medium"
                  >
                    Run Until Further Notice
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={errors.selectedDays ? "text-red-500" : ""}>
                Valid Days
              </Label>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="allDays"
                  checked={formData.selectedDays.length === 7}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData((prev) => ({
                        ...prev,
                        selectedDays: daysOfWeek.map((day) => day.id),
                      }));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        selectedDays: [],
                      }));
                    }
                  }}
                />
                <Label htmlFor="allDays" className="text-sm font-medium">
                  All Week
                </Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.id}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData((prev) => {
                            const newSelectedDays = [
                              ...prev.selectedDays,
                              day.id,
                            ];
                            return {
                              ...prev,
                              selectedDays: newSelectedDays,
                            };
                          });
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            selectedDays: prev.selectedDays.filter(
                              (d) => d !== day.id
                            ),
                          }));
                        }
                      }}
                      checked={formData.selectedDays.includes(day.id)}
                    />
                    <Label htmlFor={day.id} className="text-sm font-normal">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.selectedDays && (
                <p className="text-sm text-red-500 flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.selectedDays}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Dining Options</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dineIn"
                    checked={formData.dineIn}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("dineIn", checked === true)
                    }
                  />
                  <Label htmlFor="dineIn" className="text-sm font-normal">
                    Dine In (valid for in-restaurant dining)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dineOut"
                    checked={formData.dineOut}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("dineOut", checked === true)
                    }
                  />
                  <Label htmlFor="dineOut" className="text-sm font-normal">
                    Takeaway (valid for takeaway)
                  </Label>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Select at least one dining option for this offer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="startTime"
                  className={errors.startTime ? "text-red-500" : ""}
                >
                  Start Time For Offer
                </Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(value) => handleChange("startTime", value)}
                >
                  <SelectTrigger
                    id="startTime"
                    className={errors.startTime ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.startTime && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.startTime}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="endTime"
                  className={errors.endTime ? "text-red-500" : ""}
                >
                  End Time For Offer
                </Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(value) => handleChange("endTime", value)}
                >
                  <SelectTrigger
                    id="endTime"
                    className={errors.endTime ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.endTime && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.endTime}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={errors.bookingRequirement ? "text-red-500" : ""}>
                Booking Requirement
              </Label>
              <div className="space-y-2">
                {bookingOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={formData.bookingRequirement === option.id}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData((prev) => ({ ...prev, bookingRequirement: option.id }));
                        }
                      }}
                    />
                    <Label htmlFor={option.id} className="text-sm font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.bookingRequirement && (
                <p className="text-red-500 text-sm">{errors.bookingRequirement}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">
                Terms & Conditions
                <span className="text-sm text-gray-500 ml-2">
                  (One per line)
                </span>
              </Label>
              <Textarea
                id="terms"
                placeholder="Any restrictions or conditions for this offer"
                rows={4}
                value={formData.terms}
                onChange={(e) => handleChange("terms", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Example: Valid for dine-in only, Not valid with other offers,
                etc.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => onCancel && onCancel()}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                params.offerId ? "Save Changes" : "Create Offer"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
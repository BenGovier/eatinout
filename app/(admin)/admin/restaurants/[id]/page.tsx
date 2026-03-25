"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Maximize,
  SquarePen,
  Pin,
  PinOff,
} from "lucide-react";
import Select from "react-select";
import AdminEditOfferPage from "@/components/admin-offer-edit";

const weekOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export default function RestaurantDetailPage({ params }: any) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [error, setError] = useState(null);
  const [areas, setAreas] = useState<any>([]);
  const [selectedAreas, setSelectedAreas] = useState<any>([]);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const { id }: any = React.use(params);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [pinningOffer, setPinningOffer] = useState<string | null>(null);
  const [showPinWarning, setShowPinWarning] = useState(false);
  const [offerToPin, setOfferToPin] = useState<{ id: string; isPinned: boolean } | null>(null);

  useEffect(() => {
    document.title = "Restaurant";
  }, []);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/restaurants/${id}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRestaurant(data.restaurant);
          setOffers(data.offers || []);
          setSelectedAreas(data?.restaurant?.area || []);
          return;
        }
      }

      // If no fallback data, show error
      throw new Error("Failed to fetch restaurant details");
    } catch (err: any) {
      console.error("Error fetching restaurant:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRestaurantDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      // Set the appropriate loading state based on the new status
      if (newStatus === "approved") {
        setLoadingApprove(true);
      } else if (newStatus === "rejected") {
        setLoadingReject(true);
      } else if (newStatus === "pending") {
        setLoadingPending(true);
      }

      const response = await fetch(`/api/admin/restaurants/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update restaurant status");
      }

      // Update local state
      setRestaurant((prev: any) =>
        prev ? { ...prev, status: newStatus } : null
      );
      toast.success(`Restaurant status updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update restaurant status");
    } finally {
      // Reset all loading states
      setLoadingApprove(false);
      setLoadingReject(false);
      setLoadingPending(false);
    }
  };
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await fetch("/api/admin/areas");

        if (!response.ok) {
          throw new Error("Failed to fetch areas");
        }

        const data = await response.json();

        if (data.success && data.areas) {
          // Transform areas into { value, label } format
          const transformedAreas = data.areas.map((area: any) => ({
            value: area._id,
            label: area.name,
          }));
          setAreas(transformedAreas);
        } else {
          throw new Error(data.message || "Failed to fetch areas");
        }
      } catch (err) {
        console.error("Error fetching areas:", err);
        setAreas([]);
      } finally {
        console.log("Areas fetched successfully");
      }
    };

    fetchAreas();
  }, []);

  const handleOfferStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === "active") {
        setLoadingApprove(true); // Start loading for approval
      } else if (newStatus === "rejected") {
        setLoadingReject(true); // Start loading for rejection
      }

      // Check if areas are selected before approving
      if (newStatus === "active" && selectedAreas.length === 0) {
        toast.error(
          "Please select at least one area before approving the offer."
        );
        setLoadingApprove(false); // Stop loading for approval
        return;
      }

      // Call the status update API
      const response = await fetch(
        `/api/restaurant/offers/${selectedOffer._id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus, // Update the status field
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update offer status");
      }

      // If approving, assign areas
      if (newStatus === "active" && selectedAreas.length > 0) {
        await handleAssignAreas(); // Assign areas when approving
      }

      // Show success message
      if (newStatus === "rejected") {
        toast.success("Offer has been rejected.");
      } else {
        toast.success("Offer approved successfully.");
      }

      // Refresh the offers list
      const updatedOffersResponse = await fetch(`/api/admin/restaurants/${id}`);
      if (updatedOffersResponse.ok) {
        const updatedData = await updatedOffersResponse.json();
        setOffers(updatedData.offers || []);
      }

      // Close the detailed view
      setSelectedOffer(null);
    } catch (error) {
      console.error("Error updating offer status:", error);
      toast.error("Failed to update offer status");
    } finally {
      if (newStatus === "active") {
        setLoadingApprove(false); // Stop loading for approval
      } else if (newStatus === "rejected") {
        setLoadingReject(false); // Stop loading for rejection
      }
    }
  };

  const handleAssignAreas = async () => {
    try {
      const response = await fetch(
        `/api/restaurant/offers/${selectedOffer._id}/assignarea`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: selectedOffer._id,
            areas: selectedAreas,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to assign areas to the offer");
      }
    } catch (error) {
      console.error("Error assigning areas:", error);
    }
  };
  function getOrderedValidDays(validDays: string) {
    if (!validDays || validDays.trim() === "") return "N/A";
    if (validDays.trim().toLowerCase() === "all week") return "All week";
    const daysArray = validDays.split(",").map((day) => day.trim());
    const ordered = weekOrder.filter((day) => daysArray.includes(day));
    return ordered.join(", ");
  }
  const handleImageClick = (img: string) => {
    setModalImage(img);
    setShowImageModal(true);
  };

  const closeModal = () => {
    setShowImageModal(false);
    setModalImage(null);
  };

  //edit offer
  const handleSaveOffer = () => {
    setIsEditingOffer(false);
    setEditingOfferId(null);
    fetchRestaurantDetails();
    setActiveTab("offers");
  };

  const handleCancelEdit = () => {
    setIsEditingOffer(false);
    setEditingOfferId(null);
  };

  // Handle pin/unpin offer
  const handlePinToggle = async (offerId: string, currentIsPinned: boolean) => {
    // If unpinning, proceed directly
    if (currentIsPinned) {
      await performPinToggle(offerId, false);
      return;
    }

    // If pinning, check if there's already a pinned offer
    const hasPinnedOffer = offers.some((offer: any) => offer.isPinned === true && offer._id !== offerId);

    if (hasPinnedOffer) {
      // Show warning dialog
      setOfferToPin({ id: offerId, isPinned: currentIsPinned });
      setShowPinWarning(true);
    } else {
      // No pinned offer exists, proceed directly
      await performPinToggle(offerId, true);
    }
  };

  // Perform the actual pin/unpin operation
  const performPinToggle = async (offerId: string, isPinned: boolean) => {
    try {
      setPinningOffer(offerId);
      const response = await fetch(`/api/admin/offers/${offerId}/pin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPinned: isPinned,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to pin/unpin offer");
      }

      const data = await response.json();
      toast.success(data.message || `Offer ${isPinned ? "pinned" : "unpinned"} successfully`);
      fetchRestaurantDetails();
    } catch (error) {
      console.error("Error pinning offer:", error);
      toast.error("Failed to pin/unpin offer");
    } finally {
      setPinningOffer(null);
      setShowPinWarning(false);
      setOfferToPin(null);
    }
  };

  // Handle confirmation from warning dialog
  const handleConfirmPin = async () => {
    if (offerToPin) {
      await performPinToggle(offerToPin.id, true);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/admin/restaurants">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Restaurants
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Restaurant Details</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/admin/restaurants">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Restaurants
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Restaurant Details</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <h3 className="font-bold">Error</h3>
          <p>{error || "Restaurant not found"}</p>
          <Button
            onClick={() => router.push("/admin/restaurants")}
            className="mt-4"
            variant="outline"
          >
            Return to Restaurants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/admin/restaurants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Restaurants
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Restaurant Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{restaurant.name}</CardTitle>
                  <CardDescription>
                    {restaurant.category
                      ?.map((element: any) => element.name)
                      .join(", ")}

                    {" • "}

                    {restaurant.area
                      .map(
                        (areaId: string) =>
                          areas.find((area: any) => area.value === areaId)
                            ?.label
                      )
                      .filter((name: string | undefined): name is string =>
                        Boolean(name)
                      )
                      .join(", ")}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={
                    restaurant.status === "approved"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : restaurant.status === "pending"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-red-50 text-red-700 border-red-200"
                  }
                >
                  {restaurant.status.charAt(0).toUpperCase() +
                    restaurant.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="offers">
                    Offers ({offers.length})
                  </TabsTrigger>
                  <TabsTrigger value="photos">
                    Photos ({restaurant.images?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-gray-700">{restaurant.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-start">
                          <Phone className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                          <p>{restaurant.phone}</p>
                        </div>
                        <div className="flex items-start">
                          <Mail className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                          <p>{restaurant.email}</p>
                        </div>
                        {restaurant.website && (
                          <div className="flex items-start">
                            <Globe className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                            <a
                              href={
                                restaurant.website.startsWith("http")
                                  ? restaurant.website
                                  : `https://${restaurant.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {restaurant.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Location</h3>
                    <div className="flex items-start overflow-hidden">
                      <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p>{restaurant.address}</p>
                        <p>
                          {restaurant.city}, {restaurant.state}{" "}
                          {restaurant.zipCode.toUpperCase()}
                        </p>
                        <p>
                          {restaurant.category
                            ?.map((element: any) => element.name)
                            .join(", ")}{" "}
                          •{" "}
                          {restaurant.area
                            .map(
                              (areaId: string) =>
                                areas.find((area: any) => area.value === areaId)
                                  ?.label
                            )
                            .filter(
                              (name: string | undefined): name is string =>
                                Boolean(name)
                            )
                            .join(", ")}
                        </p>

                        {restaurant.addressLink && (
                          <div className="flex items-start">
                            <a
                              href={
                                restaurant.addressLink.startsWith("http")
                                  ? restaurant.addressLink
                                  : `https://${restaurant.addressLink}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {restaurant.addressLink}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Registration Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Registered: </span>
                        <span>
                          {new Date(restaurant.createdAt).toLocaleDateString(
                            "en-GB"
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Last Updated: </span>
                        <span>
                          {new Date(restaurant.updatedAt).toLocaleDateString(
                            "en-GB"
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">
                          Delivery Available:{" "}
                        </span>
                        <span>
                          {restaurant.deliveryAvailable ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {restaurant.menuPdfUrls &&
                    restaurant.menuPdfUrls.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Menu</h3>
                        <div className="flex gap-2">
                          {restaurant.menuPdfUrls.map(
                            (url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-red-600 text-sm text-white px-4 py-2 rounded hover:bg-red-700 transition-colors font-semibold"
                              >
                                View Menu {index + 1}
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* {restaurant.searchTags?.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Search Tags</h3>

                      <div className="flex flex-wrap gap-2">
                        {restaurant.searchTags.map((tag: any) => (
                          <span
                            key={tag._id}
                            className="px-3 py-1 text-sm rounded-full border bg-muted/40 text-foreground"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )} */}
                </TabsContent>

                <TabsContent value="offers">
                  {isEditingOffer ? (
                    <>
                      <AdminEditOfferPage
                        params={{ id: id, offerId: editingOfferId || undefined }}
                        onSave={handleSaveOffer}
                        onCancel={handleCancelEdit}
                      />
                    </>
                  ) : offers.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-start mb-2">
                        <Button
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            setIsEditingOffer(true);
                            setEditingOfferId(null);
                          }}
                        >
                          Add Offer
                        </Button>
                      </div>
                      {offers.map((offer: any) => (
                        <Card key={offer._id}>
                          {selectedOffer && selectedOffer._id === offer._id ? (
                            <CardContent className="p-4">
                              {/* Existing detailed offer view */}
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">
                                    {selectedOffer.title}
                                  </h3>
                                  <div className="space-y-2 text-sm text-gray-500">
                                    {selectedOffer.description
                                      .split("\n")
                                      .map((line: string, index: number) => (
                                        <p key={index}>{line.trim()}</p>
                                      ))}
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    selectedOffer.status === "active"
                                      ? "outline"
                                      : selectedOffer.status === "inactive"
                                        ? "secondary"
                                        : selectedOffer.status === "pending"
                                          ? "default"
                                          : selectedOffer.status === "rejected"
                                            ? "destructive"
                                            : "destructive"
                                  }
                                  className={
                                    selectedOffer.status === "active"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : selectedOffer.status === "inactive"
                                        ? "bg-gray-50 text-gray-700 border-gray-200"
                                        : selectedOffer.status === "pending"
                                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                          : selectedOffer.status === "rejected"
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                  }
                                >
                                  {selectedOffer.status === "active"
                                    ? "Active"
                                    : selectedOffer.status === "inactive"
                                      ? "Inactive"
                                      : selectedOffer.status === "pending"
                                        ? "Pending"
                                        : selectedOffer.status === "rejected"
                                          ? "Rejected"
                                          : "Expired"}
                                </Badge>
                              </div>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">
                                    Valid Days:{" "}
                                  </span>
                                  <span>
                                    {getOrderedValidDays(
                                      selectedOffer.validDays
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Valid Hours:{" "}
                                  </span>
                                  <span>{selectedOffer.validHours}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Expires: </span>
                                  <span>
                                    {new Date(
                                      selectedOffer.expiryDate
                                    ).toLocaleDateString("en-GB")}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-6">
                                <label className="block font-medium mb-2">
                                  Assign Areas
                                </label>
                                <Select
                                  isMulti
                                  name="areas"
                                  options={areas || []}
                                  className="basic-multi-select"
                                  classNamePrefix="select"
                                  onChange={(selectedOptions: any) => {
                                    const selectedIds = selectedOptions.map(
                                      (option: any) => option.value
                                    );
                                    setSelectedAreas(selectedIds);
                                  }}
                                />
                              </div>
                              <div className="mt-6">
                                <label className="block font-medium mb-2">
                                  Pin Offer
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`pin-${selectedOffer._id}`}
                                    checked={selectedOffer.isPinned || false}
                                    onChange={() =>
                                      handlePinToggle(
                                        selectedOffer._id,
                                        selectedOffer.isPinned || false
                                      )
                                    }
                                    disabled={pinningOffer === selectedOffer._id}
                                    className="w-4 h-4"
                                  />
                                  <label
                                    htmlFor={`pin-${selectedOffer._id}`}
                                    className="text-sm font-medium"
                                  >
                                    Pin this offer
                                  </label>
                                  {pinningOffer === selectedOffer._id && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 ml-2"></div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Pinned offers appear at the top of the list. Most recently pinned offers appear first.
                                </p>
                              </div>
                              <div className="mt-6 flex gap-4">
                                <Button
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() =>
                                    handleOfferStatusChange("active")
                                  }
                                  disabled={loadingApprove}
                                >
                                  {loadingApprove ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    "Approve Offer"
                                  )}
                                </Button>
                                <Button
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() =>
                                    handleOfferStatusChange("rejected")
                                  }
                                  disabled={loadingReject}
                                >
                                  {loadingReject ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    "Reject Offer"
                                  )}
                                </Button>
                              </div>
                              <div className="mt-6">
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setSelectedOffer(null)}
                                >
                                  Back to Offers
                                </Button>
                              </div>
                            </CardContent>
                          ) : (
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium">{offer.title}</h3>
                                    {offer.isPinned && (
                                      <Badge
                                        variant="outline"
                                        className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1"
                                      >
                                        <Pin className="h-3 w-3" />
                                        Pinned
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="space-y-2 text-sm text-gray-500">
                                    {offer.description
                                      .split("\n")
                                      .map((line: string, index: number) => (
                                        <p key={index}>{line.trim()}</p>
                                      ))}
                                  </div>
                                  {offer.terms && (
                                    <div className="mt-3">
                                      Terms & Conditions:
                                    </div>
                                  )}
                                  <div className="space-y-2 text-sm my-2 text-gray-500">
                                    {offer.terms
                                      .split("\n")
                                      .map((line: string, index: number) => (
                                        <p key={index}>{line.trim()}</p>
                                      ))}
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    offer.status === "active"
                                      ? "outline"
                                      : offer.status === "inactive"
                                        ? "secondary"
                                        : offer.status === "pending"
                                          ? "default"
                                          : offer.status === "rejected"
                                            ? "destructive"
                                            : "destructive"
                                  }
                                  className={
                                    offer.status === "active"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : offer.status === "inactive"
                                        ? "bg-gray-50 text-gray-700 border-gray-200"
                                        : offer.status === "pending"
                                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                          : offer.status === "rejected"
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                  }
                                >
                                  {offer.status === "active"
                                    ? "Active"
                                    : offer.status === "inactive"
                                      ? "Inactive"
                                      : offer.status === "pending"
                                        ? "Pending"
                                        : offer.status === "rejected"
                                          ? "Rejected"
                                          : "Expired"}
                                </Badge>
                              </div>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">
                                    Valid Days:{" "}
                                  </span>
                                  <span>
                                    {getOrderedValidDays(offer.validDays)}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Valid Hours:{" "}
                                  </span>
                                  <span>{offer.validHours}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Expires: </span>
                                  <span>
                                    {offer.expiryDate
                                      ? new Date(
                                        offer.expiryDate
                                      ).toLocaleString("en-GB", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      })
                                      : "Until further notice"}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-4 flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsEditingOffer(true);
                                    setEditingOfferId(offer._id);
                                  }}
                                >
                                  <SquarePen /> Edit
                                </Button>
                                <Button
                                  variant={offer.isPinned ? "default" : "outline"}
                                  onClick={() =>
                                    handlePinToggle(
                                      offer._id,
                                      offer.isPinned || false
                                    )
                                  }
                                  disabled={pinningOffer === offer._id}
                                  className={offer.isPinned ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                                >
                                  {pinningOffer === offer._id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      {offer.isPinned ? "Unpinning..." : "Pinning..."}
                                    </>
                                  ) : offer.isPinned ? (
                                    <>
                                      <PinOff className="h-4 w-4 mr-2" />
                                      Unpin
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="h-4 w-4 mr-2" />
                                      Pin
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No offers available for this restaurant.</p>
                      <div className="mt-4">
                        <Button
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            setIsEditingOffer(true);
                            setEditingOfferId(null);
                          }}
                        >
                          Add Offer
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="photos">
                  {restaurant.images && restaurant.images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {restaurant.images.map((image: any, index: any) => (
                        <div
                          key={index}
                          className="relative aspect-video rounded-md overflow-hidden group cursor-pointer"
                        >
                          <Image
                            src={
                              image || "/placeholder.svg?height=300&width=400"
                            }
                            alt={`${restaurant.name} - Image ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 z-10 
                        opacity-100 md:opacity-0 
                        md:group-hover:opacity-100 
                        transition-opacity bg-black/60 
                        rounded-full p-1"
                            onClick={() => handleImageClick(image)}
                            tabIndex={-1}
                            aria-label="View full size"
                          >
                            <Maximize className="text-white w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No photos available for this restaurant.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {restaurant.status === "pending" && (
                <>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange("approved")}
                    disabled={loadingApprove}
                  >
                    {loadingApprove ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Approving...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Restaurant
                      </>
                    )}
                  </Button>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => handleStatusChange("rejected")}
                    disabled={loadingReject}
                  >
                    {loadingReject ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Rejecting...
                      </div>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject Restaurant
                      </>
                    )}
                  </Button>
                </>
              )}

              {restaurant.status === "approved" && (
                <Button
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => handleStatusChange("pending")}
                  disabled={loadingPending}
                >
                  {loadingPending ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting to Pending...
                    </div>
                  ) : (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Set to Pending Review
                    </>
                  )}
                </Button>
              )}

              {restaurant.status === "rejected" && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusChange("approved")}
                  disabled={loadingApprove}
                >
                  {loadingApprove ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Approving...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Restaurant
                    </>
                  )}
                </Button>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/restaurants/edit/${restaurant._id}`}>
                  Edit Restaurant Details
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Assign Area</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block font-medium mb-2">Select Areas</label>
              <Select
                isMulti
                name="areas"
                options={areas || []}
                value={areas.filter((area: any) =>
                  selectedAreas.includes(area.value)
                )} // Match selected areas
                className="basic-multi-select"
                classNamePrefix="select"
                onChange={(selectedOptions: any) => {
                  const selectedIds = selectedOptions.map(
                    (option: any) => option.value
                  );
                  setSelectedAreas(selectedIds);
                }}
              />
              <Button
                className="w-full bg-red-500 hover:bg-red-500"
                onClick={async () => {
                  if (selectedAreas.length === 0) {
                    toast.error(
                      "Please select at least one area before saving."
                    );
                    return;
                  }

                  try {
                    const response = await fetch(
                      `/api/admin/restaurants/${id}`,
                      {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ area: selectedAreas }),
                      }
                    );

                    if (!response.ok) {
                      throw new Error("Failed to assign areas");
                    }
                    toast.success("Areas assigned successfully!");
                    fetchRestaurantDetails();
                  } catch (error) {
                    console.error("Error assigning areas:", error);
                    toast.error("Failed to assign areas");
                  }
                }}
              >
                Save
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Restaurant Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Active Offers:</span>
                <span className="font-bold">
                  {offers.filter((o: any) => o.status === "active").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Offers:</span>
                <span className="font-bold">{offers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Registered:</span>
                <span className="font-bold">
                  {new Date(restaurant.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {showImageModal && modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={closeModal}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-1 right-2 text-white text-2xl z-10"
              onClick={closeModal}
              aria-label="Close"
            >
              &times;
            </button>
            <img
              src={modalImage}
              alt="Full Size"
              className="w-full h-auto rounded-lg shadow-lg"
              style={{ maxHeight: "90vh ", objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      <AlertDialog open={showPinWarning} onOpenChange={setShowPinWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pin Offer Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Only one offer can be pinned at a time. Pinning this offer will automatically unpin the currently pinned offer. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowPinWarning(false);
              setOfferToPin(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPin} className="bg-yellow-600 hover:bg-yellow-700">
              Yes, Pin This Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

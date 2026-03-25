"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Phone, Mail, Globe, MapPin, Maximize, } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger, } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RestaurantPageViewPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState<any | null>({
    name: "",
    cuisine: "",
    area: [],
    category: "",
    status: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    openingHours: {},
    images: [],
    createdAt: "",
    updatedAt: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<{ value: string; label: string }[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [tags, setTags] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    document.title = "Restaurant Details"
  }, [])

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/admin/tags");
        if (!res.ok) throw new Error("Failed to fetch tags");
        const data = await res.json();

        if (data.success) {
          setTags(data.tags || []);
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    fetchTags();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/admin/categories?dropdown=true");
        if (!response.ok) throw new Error("Failed to fetch categories");
        const data = await response.json();

        const fetchedCategories = data.categories.map((category: any) => ({
          id: category._id,
          name: category.name,
        }));
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await fetch("/api/areas");
        if (!response.ok) throw new Error("Failed to fetch areas");

        const data = await response.json();

        if (data.success && data.areas) {
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
      }
    };

    fetchAreas();
  }, []);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/restaurant/${id}`);
        if (!res.ok) throw new Error("Failed to fetch restaurant data");
        const data = await res.json();
        setRestaurant(data?.data || {});
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurant();
    }
  }, [id]);

  const getTagNames = () => {
    if (!Array.isArray(restaurant.searchTags)) return [];

    return restaurant.searchTags
      .map((id: string) => tags.find((t) => t._id === id)?.name)
      .filter(Boolean);
  };

  const getAreaNames = () => {
    if (Array.isArray(restaurant.area)) {
      return restaurant.area
        .map((id: string) => areas.find(a => a.value === id)?.label || "")
        .join(", ");
    } else if (typeof restaurant.area === "string") {
      return areas.find(a => a.value === restaurant.area)?.label || "";
    }
    return "N/A";
  };
  const handleImageClick = (img: string) => {
    setShowImageModal(true);
    setModalImage(img);
  };
  const closeModal = () => {
    setShowImageModal(false);
    setModalImage(null);
  };

  if (loading) return <p className="p-4 text-center">Loading restaurant details...</p>;
  if (error) return <p className="p-4 text-center text-red-500">{error}</p>;
  if (!restaurant.name) return <p className="p-4 text-center">Restaurant not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/restaurant">
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
                <Badge
                  className={
                    restaurant.status === "approved"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : restaurant.status === "pending"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-red-50 text-red-700 border-red-200"
                  }
                >
                  {restaurant.status
                    ? restaurant.status.charAt(0).toUpperCase() + restaurant.status.slice(1)
                    : "N/A"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="details">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="photos">
                    Photos ({restaurant.images?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-gray-700">{restaurant.description || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Cuisine Type</h3>
                    <p className="text-gray-700">
                      {restaurant.category && Array.isArray(restaurant.category)
                        ? restaurant.category
                          .map((id: string) => categories.find((c) => c.id === id)?.name)
                          .filter((name: string): name is string => Boolean(name))
                          .join(", ")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Area</h3>
                    <p className="text-gray-700">{getAreaNames()}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-start">
                          <Phone className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                          <p>{restaurant.phone || "N/A"}</p>
                        </div>
                        <div className="flex items-start">
                          <Mail className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                          <p>{restaurant.email || "N/A"}</p>
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

                    <div>
                      <h3 className="font-medium mb-2">Location</h3>
                      <div className="flex items-start overflow-hidden">
                        <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                        <div>
                          <p>{restaurant.address || "N/A"}</p>
                          <p>
                            {restaurant.city || "N/A"},
                            {(restaurant.zipCode ?? "").toUpperCase() || "N/A"}
                          </p>

                          <p>{getAreaNames()}</p>
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
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Service Options</h3>
                    <div className="flex flex-wrap gap-2">
                      {restaurant.dineIn && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Dine In
                        </Badge>
                      )}
                      {restaurant.dineOut && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Takeaway
                        </Badge>
                      )}
                      {restaurant.deliveryAvailable && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Delivery Available
                        </Badge>
                      )}
                      {!restaurant.dineIn && !restaurant.dineOut && !restaurant.deliveryAvailable && (
                        <p className="text-gray-500">No service options specified</p>
                      )}
                    </div>
                  </div>

                  {/* {restaurant.menuPdfUrl && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Menu</h3>
                      <a
                        href={restaurant.menuPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors font-semibold"
                      >
                        View Menu
                      </a>
                    </div>
                  )} */}

                  {Array.isArray(restaurant.menuPdfUrls) && restaurant.menuPdfUrls.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Menu PDFs</h3>
                      <ul className="flex gap-1">
                        {restaurant.menuPdfUrls.map((url: string, index: number) => (
                          <li key={index}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors font-semibold text-sm"
                            >
                              View Menu {restaurant.menuPdfUrls.length > 1 ? index + 1 : ""}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(restaurant.searchTags) &&
                    restaurant.searchTags.length > 0 &&
                    getTagNames().length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Tags</h3>

                        <div className="flex flex-wrap gap-2">
                          {getTagNames().map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-slate-50 text-slate-700 border-slate-200"
                            >
                              {tag}
                            </Badge>
                          ))}
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
                            src={image || "/placeholder.svg?height=300&width=400"}
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
      </div>
      {showImageModal && modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={closeModal}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
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

    </div>
  );
}

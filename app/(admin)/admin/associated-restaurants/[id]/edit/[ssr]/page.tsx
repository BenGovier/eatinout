"use client"
import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight, Building2, MapPin, Phone, Mail, Globe, Check, X, Upload } from "lucide-react"
import { toast } from "react-toastify"
import { deleteFileFromAzure, uploadFileToAzure } from "@/lib/azure-upload"
import { useImageUpload } from "@/hooks/use-image-upload"
import ReactSelect from "react-select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function RestaurantEditPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("restaurant")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  // const [uploadingImage, setUploadingImage] = useState(false)
  const { ssr, id } = useParams()
  const [categories, setCategories] = useState<Array<{ id: string, name: string }>>([])
  const [areas, setAreas] = useState<any>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [useSameEmail, setUseSameEmail] = useState(false)
  const [accountEmail, setAccountEmail] = useState("")
  const [email, setEmail] = useState("")
  const [showAddCuisineModal, setShowAddCuisineModal] = useState(false)
  const [newCuisineName, setNewCuisineName] = useState("")
  const [isAddingCuisine, setIsAddingCuisine] = useState(false)
  const [formData, setFormData] = useState<any>({
    // User data
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,

    // Restaurant data
    name: "",
    description: "",
    address: "",
    city: "",
    zipCode: "",
    area: [],
    phone: "",
    website: "",
    images: [] as string[],
    dineIn: true,
    dineOut: false,
    deliveryAvailable: false,
    category: "",
    addressLink: "",
  })

  const [errors, setErrors] = useState({
    name: '',
    description: '',
    area: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: '',
    website: '',
    category: '',
    addressLink: '',
    diningOptions: '',
  });

  const [menuPdfUrls, setMenuPdfUrls] = useState<string[]>([]);
  const [uploadingMenuPdf, setUploadingMenuPdf] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    document.title = "Edit Restaurant"
  }, [])

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        const response = await fetch(`/api/admin/restaurants/${ssr}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch restaurant data");
        }

        const json = await response.json();
        const restaurant = json.restaurant;
        if (!restaurant) {
          throw new Error("Restaurant not found in response");
        }
        console.log("Parsed restaurant object:", restaurant);

        setFormData({
          name: restaurant.name || "",
          description: restaurant.description || "",
          address: restaurant.address || "",
          city: restaurant.city || "",
          //  Convert fetched zipCode to uppercase
          zipCode: restaurant.zipCode ? restaurant.zipCode.toUpperCase() : "",
          area: restaurant.area || [],
          phone: restaurant.phone || "",
          email: restaurant.email || "",
          website: restaurant.website || "",
          images: restaurant.images || [],
          dineIn: restaurant.dineIn ?? true,
          dineOut: restaurant.dineOut ?? false,
          deliveryAvailable: restaurant.deliveryAvailable ?? false,
          category: (restaurant.category || []).map((cat: any) => cat.id),
          addressLink: restaurant.addressLink || "",
        });

        setUploadedImages(restaurant.images || []);
        setSelectedAreas(restaurant.area || []);
        setMenuPdfUrls(restaurant.menuPdfUrls || "");
        setIsLoadingData(false);
        setSelectedCategories((restaurant.category || []).map((cat: any) => cat.id));
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
        toast.error("Failed to load restaurant data. Please try again.");
        setIsLoadingData(false);
      }
    };

    if (ssr) {
      fetchRestaurantData();
    }
  }, [ssr]);


  useEffect(() => {
    const fetchRestaurant = async () => {
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
      });
      try {
        const data = await response.json();
        setEmail(data.user.email);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
      }
    };
    fetchRestaurant();
  }, []);

  // Check email match when both accountEmail and formData.email are available
  useEffect(() => {
    if (accountEmail && formData.email && accountEmail === formData.email) {
      setUseSameEmail(true);
    }
  }, [accountEmail, formData.email]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/admin/categories?dropdown=true", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching categories:", errorData);
          throw new Error(errorData.message || "Failed to fetch categories");
        }

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

  useEffect(() => {
    const fetchAccountEmail = async () => {
      try {
        const response = await fetch("/api/auth/check-session", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.email) {
            setAccountEmail(data.user.email);
          }
        }
      } catch (error) {
        console.error("Error fetching account email:", error);
      }
    };

    fetchAccountEmail();
  }, []);

  const handleAddCuisine = async () => {
    if (!newCuisineName.trim()) {
      toast.error("Please enter a cuisine name");
      return;
    }

    setIsAddingCuisine(true);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCuisineName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add cuisine");
      }

      const data = await response.json();

      // Add the new category to the list
      const newCategory = {
        id: data.category._id,
        name: data.category.name,
      };

      setCategories((prev) => [...prev, newCategory]);
      setSelectedCategories((prev: string[]) => [...prev, newCategory.id]);
      setFormData((prev: any) => ({ ...prev, category: [...prev.category, newCategory.id] }));

      // Close modal and reset
      setShowAddCuisineModal(false);
      setNewCuisineName("");

      toast.success("Cuisine type added successfully!");
    } catch (error: any) {
      console.error("Error adding cuisine:", error);
      toast.error(error.message || "Failed to add cuisine type");
    } finally {
      setIsAddingCuisine(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: '' }));
  }

  const handleSelectChange = (id: string, value: string) => {
    if (id === "category" && value === "other") {
      // Open modal to add new cuisine
      setShowAddCuisineModal(true);
    } else {
      setFormData((prev: any) => ({ ...prev, [id]: value }));
      setErrors((prev) => ({ ...prev, [id]: '' })); // Clear error on change
    }
  }

  const handleEmailToggle = (checked: boolean) => {
    setUseSameEmail(checked);
    if (checked) {
      setFormData((prev: any) => ({ ...prev, email: email }));
    } else {
      setFormData((prev: any) => ({ ...prev, email: "" }));
    }
    setErrors((prev) => ({ ...prev, email: '' }));
  }

  // ADD karo:
  const restaurantImage = useImageUpload({
    preset: "restaurantHero",  // 1200×600 rectangle
    onSuccess: (url) => {
      setUploadedImages((prev) => [...prev, url])
      setFormData((prev: any) => ({
        ...prev,
        images: [...prev.images, url],
      }))
    }
  })

  // REMOVE karo pura purana handleImageUpload function aur REPLACE karo:
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (uploadedImages.length >= 6) {
      toast.error("You can upload a maximum of 6 images")
      return
    }

    await restaurantImage.upload(file)
  }

  // const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = e.target.files;
  //   if (!files || files.length === 0) return;

  //   // Check if we already have 6 images
  //   if (uploadedImages.length >= 6) {
  //     toast.error("You can upload a maximum of 6 images");
  //     return;
  //   }

  //   // Check file size (max 5MB)
  //   const file = files[0];
  //   if (file.size > 5 * 1024 * 1024) {
  //     toast.error("File size exceeds 5MB limit");
  //     return;
  //   }

  //   // Check file type
  //   if (!file.type.startsWith("image/")) {
  //     toast.error("Invalid file type. Please upload an image file.");
  //     return;
  //   }

  //   setUploadingImage(true);

  //   try {
  //     // Upload to Azure and get public URL
  //     const publicUrl = await uploadFileToAzure(file);
  //     console.log("Uploaded image URL:", publicUrl);
  //     setUploadedImages((prev) => [...prev, publicUrl]);
  //     setFormData((prev: any) => ({
  //       ...prev,
  //       images: [...prev.images, publicUrl],
  //     }));

  //     toast.success("Image uploaded successfully");
  //   } catch (error) {
  //     console.error("Upload error:", error);
  //     toast.error("Failed to upload image. Please try again.");
  //   } finally {
  //     setUploadingImage(false);
  //   }
  // };

  // Modify the removeImage function to delete from Azure


  const removeImage = async (index: number) => {
    try {
      if (index === 0) {
        toast.error("Default image cannot be removed.");
        return;
      }

      const imageUrl = uploadedImages[index];

      // Azure delete (temporary upload bhi ho sakta hai)
      if (!imageUrl.includes("raffilybusiness")) {
        await restaurantImage.remove(imageUrl);
      }

      // ⚠️ IMPORTANT FIX
      // Agar image DB me already exist karti hai tabhi API call karo
      const isExistingImage = formData.images.includes(imageUrl);

      if (isExistingImage) {
        await fetch("/api/delete-image", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId: ssr,
            imageIndex: index,
          }),
        });
      }

      // Local state update
      setUploadedImages((prev) => prev.filter((_, i) => i !== index));
      setFormData((prev: any) => ({
        ...prev,
        images: prev.images.filter((_: any, i: any) => i !== index),
      }));

      toast.success("Image removed successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove image");
    }
  };

  const setDefaultImage = (index: number) => {
    // Move the selected image to the first position
    const updatedImages = [...uploadedImages];
    const [selectedImage] = updatedImages.splice(index, 1);
    updatedImages.unshift(selectedImage);

    // Update state with the new image order
    setUploadedImages(updatedImages);

    // Update the formData to reflect the change in the default image
    setFormData((prev: any) => ({
      ...prev,
      images: updatedImages,
    }));

    toast.success("Default image set successfully");
  };


  const validateStep1 = () => {
    let valid = true;
    const newErrors = { ...errors };

    if (!formData.name.trim()) {
      newErrors.name = 'Restaurant name is required';
      valid = false;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
      valid = false;
    }

    if (!selectedCategories.length) {
      newErrors.category = 'At least one Cuisine Type is required';
      valid = false;
    }
    // Add image validation
    if (uploadedImages.length === 0) {
      toast.error("Please upload at least one image");
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const validateStep2 = () => {
    let valid = true;
    const newErrors = { ...errors };
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
      valid = false;
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
      valid = false;
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip/Postal Code is required';
      valid = false;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      valid = false;
    } else if (formData.phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
      valid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Business email is required';
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      valid = false;
    }


    // Add dining options validation
    if (!formData.dineIn && !formData.dineOut) {
      newErrors.diningOptions = 'Please select at least one dining option';
      valid = false;
    } else {
      newErrors.diningOptions = '';
    }

    setErrors(newErrors);
    return valid;
  };


  const switchTab = (tab: string) => {
    if (tab === "location" && !validateStep1()) return
    window.scrollTo(0, 0)
    setActiveTab(tab)
  }


  const handleMenuPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) => {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} is not a PDF`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingMenuPdf(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of validFiles) {
        const url = await uploadFileToAzure(file);
        uploadedUrls.push(url);
      }

      setMenuPdfUrls((prev) => [...prev, ...uploadedUrls]);
      toast.success("Menu PDF(s) uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload some PDFs. Please try again.");
    } finally {
      setUploadingMenuPdf(false);
    }
  };

  const removeMenuPdf = async (url: string) => {
    try {
      if (!url.includes("raffilybusiness")) {
        await deleteFileFromAzure(url);
      }
      setMenuPdfUrls(prev => prev.filter(pdf => pdf !== url));
      toast.success("Menu PDF removed successfully");
    } catch (error) {
      console.error("Failed to delete PDF from Azure:", error);
      toast.error("Failed to delete menu PDF. Please try again.");
    }
  };


  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return
    if (formData.images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }
    setIsLoading(true)

    try {
      // Submit update data to API
      const response = await fetch(`/api/admin/restaurants/${ssr}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, area: selectedAreas, ssr, menuPdfUrls }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Update error:", errorData)
        throw new Error(errorData.message || "Update failed")
      }

      toast.success("Restaurant updated successfully!")
      router.push(`/admin/associated-restaurants/${id}/${ssr}`)
    } catch (error: any) {
      console.log("Update error:", error)
      toast.error(error.message || "Update failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full w-8 h-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading restaurant data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="">
      <div className="mx-2">
        <div className="mb-8">
          <div className="flex space-x-2 border-b">
            <button
              onClick={() => switchTab("restaurant")}
              className={`px-4 py-2 font-medium ${activeTab === "restaurant"
                ? "text-red-600 border-b-2 border-red-600"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Restaurant Information
            </button>
            <button
              onClick={() => switchTab("location")}
              className={`px-4 py-2 font-medium ${activeTab === "location"
                ? "text-red-600 border-b-2 border-red-600"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Contact & Location
            </button>
          </div>
        </div>

        <Card className="border-gray-200">
          {activeTab === "restaurant" && (
            <>
              <CardHeader>
                <CardTitle>Edit Restaurant Information</CardTitle>
                <CardDescription>Update your restaurant details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <div className="relative">
                    <Building2 className={`absolute left-3 ${errors.name ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                    <Input
                      type="text"
                      maxLength={50}
                      id="name"
                      className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                      value={formData.name}
                      onChange={handleChange}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell customers about your restaurant"
                    rows={4}
                    maxLength={500}
                    className={` ${errors.description ? 'border-red-500' : ''}`}
                    value={formData.description}
                    onChange={handleChange}
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                  <p className="text-xs text-gray-500">
                    Describe your restaurant's atmosphere, cuisine style, and what makes it special.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Cuisine Type</Label>
                    <ReactSelect
                      isMulti
                      name="categories"
                      options={[
                        ...categories.map((category: any) => ({
                          value: category.id,
                          label: category.name,
                        })),
                        { value: "other", label: "+ Other" }
                      ]}
                      value={categories
                        .filter((category: any) => selectedCategories.includes(category.id))
                        .map((category: any) => ({
                          value: category.id,
                          label: category.name,
                        }))}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      onChange={(selectedOptions: any) => {
                        if (!selectedOptions) {
                          setSelectedCategories([]);
                          setFormData((prev: any) => ({ ...prev, category: [] }));
                          return;
                        }
                        const selectedIds = selectedOptions.map((option: any) => option.value);
                        if (selectedIds.includes("other")) {
                          setShowAddCuisineModal(true);
                          const filteredIds = selectedIds.filter((id: any) => id !== "other");
                          setSelectedCategories(filteredIds);
                          setFormData((prev: any) => ({ ...prev, category: filteredIds }));
                        } else {
                          setSelectedCategories(selectedIds);
                          setFormData((prev: any) => ({ ...prev, category: selectedIds }));
                        }
                        if (selectedIds.length > 0 && errors.category) {
                          setErrors((prev) => ({ ...prev, category: '' }));
                        }
                      }}
                      placeholder="Select Cuisine Types"
                      isClearable
                      styles={{
                        option: (provided, state) => ({
                          ...provided,
                          backgroundColor: state.data.value === "other" ? "#fff" : provided.backgroundColor,
                          color: state.data.value === "other" ? "#dc2626" : provided.color,
                          fontWeight: state.data.value === "other" ? "600" : provided.fontWeight,
                          borderTop: state.data.value === "other" ? "1px solid #e5e7eb" : provided.borderTop,
                          paddingTop: state.data.value === "other" ? "8px" : provided.paddingTop,
                          marginTop: state.data.value === "other" ? "4px" : provided.marginTop,
                          cursor: "pointer"
                        }),
                      }}
                    />
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label>Restaurant Photos (Max 6)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 h-fit gap-4">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden">
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`Restaurant image ${index + 1}`}
                          fill
                          className="object-cover"
                        />

                        <div className="absolute top-2 left-2 flex items-center space-x-2">
                          {/* Radio Button to Set Default Image */}
                          <input
                            type="radio"
                            id={`default-image-${index}`}
                            name="defaultImage"
                            checked={uploadedImages[0] === image}
                            onChange={() => setDefaultImage(index)}
                            className="h-5 w-5"
                          />
                          <label htmlFor={`default-image-${index}`} className="text-white text-sm">Set as Default</label>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}


                    {uploadedImages.length < 6 && (
                      <label className="aspect-square bg-gray-100 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={restaurantImage.uploading}
                        />
                        {restaurantImage.uploading ? (
                          <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-gray-600 rounded-full"></div>
                        ) : (
                          <>
                            <Upload className="w-16 h-10 text-gray-400" />
                            <span className="text-sm text-gray-500 mt-2">Add Photo</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Upload photos of your restaurant, food, and ambiance. High-quality images attract more
                    customers.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={() => switchTab("location")} className="bg-red-600 hover:bg-red-700">
                  <div className="flex items-center">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </Button>
              </CardFooter>
            </>
          )}

          {activeTab === "location" && (
            <>
              <CardHeader>
                <CardTitle>Contact & Location</CardTitle>
                <CardDescription>Update where customers can find you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  <ReactSelect
                    isMulti
                    name="area"
                    options={areas || []}
                    value={areas.filter((area: any) => selectedAreas.includes(area.value))} // Match selected areas
                    className="basic-multi-select"
                    classNamePrefix="select"
                    onChange={(selectedOptions: any) => {
                      const selectedIds = selectedOptions.map((option: any) => option.value);
                      setSelectedAreas(selectedIds);
                    }}
                  />
                  {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 ${errors.address ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                    <Input
                      id="address"
                      type="text"
                      maxLength={100}
                      placeholder="enter your address"
                      className={`pl-10 ${errors.address ? 'border-red-500' : ''}`}
                      value={formData.address}
                      onChange={handleChange}
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      maxLength={25}
                      placeholder="enter your city"
                      className={` ${errors.city ? 'border-red-500' : ''}`}
                      value={formData.city}
                      onChange={handleChange}
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip/Postal Code</Label>
                    <Input
                      id="zipCode"
                      maxLength={10}
                      placeholder="enter your zip code"
                      className={`${errors.zipCode ? 'border-red-500' : ''}`}
                      value={formData.zipCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setFormData((prev: any) => ({
                          ...prev,
                          zipCode: value,
                        }));

                        //  Clear error immediately when user types valid input
                        if (value.trim() !== '' && errors.zipCode) {
                          setErrors((prev) => ({
                            ...prev,
                            zipCode: '',
                          }));
                        }
                      }}
                    />
                    {errors.zipCode && (
                      <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>
                    )}
                  </div>

                </div>
                {/* <div className="space-y-2">
                  <Label htmlFor="addressLink">Address Location URL</Label>
                  <div className="relative">
                    <Globe className={`absolute left-3 ${errors.addressLink ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                    <Input
                      id="addressLink"
                      type="url"
                      maxLength={200}
                      className={`pl-10 ${errors.addressLink ? 'border-red-500' : ''}`}
                      value={formData.addressLink}
                      onChange={handleChange}
                    />
                    {errors.addressLink && <p className="text-red-500 text-xs mt-1">{errors.addressLink}</p>}
                  </div>
                </div> */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className={`absolute left-3 ${errors.phone ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter restaurant number."
                        maxLength={11}
                        pattern="[0-9]*"
                        className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                        value={formData.phone}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow only numeric values
                          if (/^\d*$/.test(value)) {
                            handleChange(e);
                          }
                        }}
                      />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <span className="text-xs text-gray-500 ">This number is for bookings and enquiries.</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="mb-0">Business Email</Label>

                    {/* Input Field */}
                    <div className="relative">
                      <Mail
                        className={`absolute left-3 ${errors.email ? "top-1/3" : "top-1/2"
                          } transform -translate-y-1/2 text-gray-400 h-5 w-5`}
                      />
                      <Input
                        id="email"
                        type="email"
                        placeholder="enter your email"
                        className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                        value={formData.email}
                        onChange={handleChange}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                      )}
                    </div>

                    {/* Checkbox and Label */}
                    {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                        <Checkbox
                          id="useSameEmail"
                          checked={useSameEmail}
                          onCheckedChange={handleEmailToggle}
                        />
                        <Label htmlFor="useSameEmail" className="text-sm font-normal break-words max-w-[250px]">
                          Use same email as account
                        </Label>
                      </div>
                    </div>*/ }
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <div className="relative">
                    <Globe className={`absolute left-3 ${errors.website ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                    <Input
                      id="website"
                      type="url"
                      maxLength={200}
                      className={`pl-10 ${errors.website ? 'border-red-500' : ''}`}
                      value={formData.website}
                      onChange={handleChange}
                    />
                    {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menuPdf">Upload Menu (PDF)</Label>
                  <div className="flex items-center gap-4 flex-wrap">
                    <input
                      id="menuPdf"
                      type="file"
                      accept="application/pdf"
                      className="block"
                      onChange={handleMenuPdfUpload}
                      multiple
                      disabled={uploadingMenuPdf}
                    />
                    {uploadingMenuPdf && (
                      <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-gray-600 rounded-full"></div>
                    )}
                  </div>

                  {menuPdfUrls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {menuPdfUrls.map((url, index) => (
                        <div key={index} className="flex items-center text-sm gap-2">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            View Menu {index + 1}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeMenuPdf(url)}
                            className="text-red-600 text-xs underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">Upload one or more menu PDFs (max 10MB each).</p>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Dining Options</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dineIn"
                        checked={formData.dineIn}
                        onCheckedChange={(checked) => {
                          setFormData((prev: any) => ({ ...prev, dineIn: checked === true }));
                          // Clear error when user makes a selection
                          if (checked || formData.dineOut) {
                            setErrors((prev) => ({ ...prev, diningOptions: '' }));
                          }
                        }}
                      />
                      <Label htmlFor="dineIn" className="text-sm font-normal">
                        Dine In (customers can eat at your restaurant)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dineOut"
                        checked={formData.dineOut}
                        onCheckedChange={(checked) => {
                          setFormData((prev: any) => ({ ...prev, dineOut: checked === true }));
                          // Clear error when user makes a selection
                          if (checked || formData.dineIn) {
                            setErrors((prev) => ({ ...prev, diningOptions: '' }));
                          }
                        }}
                      />
                      <Label htmlFor="dineOut" className="text-sm font-normal">
                        Takeaway (customers can take food away)
                      </Label>
                    </div>
                  </div>
                  {errors.diningOptions && (
                    <p className="text-red-500 text-xs mt-1">{errors.diningOptions}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Select at least one dining option that your restaurant offers
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <Label>Delivery Service</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="deliveryAvailable"
                      checked={formData.deliveryAvailable}
                      onCheckedChange={(checked) => {
                        setFormData((prev: any) => ({ ...prev, deliveryAvailable: checked === true }));
                      }}
                    />
                    <Label htmlFor="deliveryAvailable" className="text-sm font-normal">
                      Delivery Available (we offer delivery service to customers)
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Check this if your restaurant provides delivery service
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => switchTab("restaurant")}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      Save Changes <Check className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>

      {/* Add Cuisine Type Modal */}
      <Dialog open={showAddCuisineModal} onOpenChange={setShowAddCuisineModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Cuisine Type</DialogTitle>
            <DialogDescription>
              Enter the name of the new cuisine type you want to add.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-cuisine">Cuisine Name</Label>
              <Input
                id="new-cuisine"
                value={newCuisineName}
                onChange={(e) => setNewCuisineName(e.target.value)}
                placeholder="e.g., Mexican, Thai, Mediterranean"
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCuisineModal(false);
                setNewCuisineName("");
              }}
              disabled={isAddingCuisine}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCuisine}
              disabled={isAddingCuisine || !newCuisineName.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isAddingCuisine ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Adding...
                </div>
              ) : (
                "Add Cuisine"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
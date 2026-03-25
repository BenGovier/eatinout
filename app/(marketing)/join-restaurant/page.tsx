"use client"

import type React from "react"

import { useEffect, useState,useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight, Building2, MapPin, Phone, Mail, Globe, User, Lock, Check, X, Upload, Eye, EyeOff, Plus } from "lucide-react"
import { toast } from "react-toastify"
import { deleteFileFromAzure, uploadFileToAzure } from "@/lib/azure-upload"
import ReactSelect from "react-select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import { Badge } from "@/components/ui/badge"
import { useImageUpload } from "@/hooks/use-image-upload"
export default function RestaurantRegisterPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  // const [uploadingImage, setUploadingImage] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string, name: string }>>([]); // Define categories state
  const [areas, setAreas] = useState<any>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]) // ✅ Add selected categories state
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [showAddCuisineModal, setShowAddCuisineModal] = useState(false)
  const [newCuisineName, setNewCuisineName] = useState("")
  const [isAddingCuisine, setIsAddingCuisine] = useState(false)
  const [menuPdfUrls, setMenuPdfUrls] = useState<string[]>([]);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [pdfIndexToDelete, setPdfIndexToDelete] = useState<number | null>(null);
  const [uploadingMenuPdf, setUploadingMenuPdf] = useState(false);
  const menuPdfInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    // User data
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    // Restaurant data
    restaurantName: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    area: [] as string[],
    phone: "",
    website: "",
    images: [] as string[],
    dineIn: true,
    dineOut: false,
    deliveryAvailable: false,
    category: [] as string[], // ✅ Changed to array
    addressLink: "",
  })

  const [errors, setErrors] = useState({
    restaurantName: '',
    description: '',
    area: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: '',
    website: '',
    category: "",
    addressLink: "",
    diningOptions: "",
  });

  const [allTags, setAllTags] = useState<{ _id: string; name: string; slug?: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // array of tag _id strings
  const [customTag, setCustomTag] = useState("");

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/admin/tags");
        const data = await res.json();
        if (data.success) {
          setAllTags(data.tags || []);
        }
      } catch (err) {
        console.error("Failed to load tags", err);
        toast.error("Failed to load tags. Please try again later.");
      }
    };
    fetchTags();
  }, []);

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

      // Add the newly created category to selected categories only if under limit
      setSelectedCategories((prev) => {
        if (prev.length >= 2) {
          setErrors((prevErrors) => ({ ...prevErrors, category: 'You can select only up to 2 categories' }));
          return prev;
        }
        return [...prev, newCategory.id];
      });

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
    setFormData((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: '' }));
  }

  const handleSelectChange = (id: string, value: string) => {
    if (id === "category" && value === "other") {
      // Open modal to add new cuisine
      setShowAddCuisineModal(true);
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
      setErrors((prev) => ({ ...prev, [id]: '' })); // Clear error on change
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, agreeToTerms: checked }));
    setErrors((prev) => ({ ...prev, agreeToTerms: '' })); // Clear error on change
  }

const restaurantImageUpload = useImageUpload({
  preset: "restaurantThumb",
  onSuccess: (url) => {
    setUploadedImages((prev) => [...prev, url]);
    setFormData((prev) => ({
      ...prev, 
      images: [...prev.images, url],
    }));
  },
});
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
  //     setFormData((prev) => ({
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
const handleImageUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  if (uploadedImages.length >= 6) {
    toast.error("You can upload a maximum of 6 images");
    return;
  }

  const file = files[0];

  if (!file.type.startsWith("image/")) {
    toast.error("Invalid image file");
    return;
  }

  // if (file.size > 5 * 1024 * 1024) {
  //   toast.error("File size exceeds 5MB");
  //   return;
  // }
  // setUploadingImage(true);
  try {
    await restaurantImageUpload.upload(file);
  } catch {
    toast.error("Failed to upload image");
  }
};
  // Modify the removeImage function to delete from Azure
  const removeImage = async (index: number) => {
    try {
      const imageUrl = uploadedImages[index];
      if (!imageUrl.includes("raffilybusiness")) {
       await restaurantImageUpload.remove(imageUrl);
      }

      setUploadedImages((prev) => prev.filter((_, i) => i !== index));
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));

      toast.success("Image removed successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove image. Please try again.");
    }
  };

  // const handleMenuPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = e.target.files;
  //   if (!files || files.length === 0) return;

  //   const validFiles = Array.from(files).filter((file) => {
  //     if (file.type !== "application/pdf") {
  //       toast.error(`${file.name} is not a PDF`);
  //       return false;
  //     }
  //     if (file.size > 10 * 1024 * 1024) {
  //       toast.error(`${file.name} exceeds 10MB limit`);
  //       return false;
  //     }
  //     return true;
  //   });

  //   if (validFiles.length === 0) return;

  //   setUploadingMenuPdf(true);
  //   try {
  //     const uploadedUrls: string[] = [];

  //     for (const file of validFiles) {
  //       const url = await uploadFileToAzure(file);
  //       uploadedUrls.push(url);
  //     }

  //     setMenuPdfUrls((prev) => [...prev, ...uploadedUrls]);
  //     toast.success("Menu PDF(s) uploaded successfully");
  //   } catch (error) {
  //     toast.error("Failed to upload some PDFs. Please try again.");
  //   } finally {
  //     setUploadingMenuPdf(false);
  //   }
  // };


  // const handlePdfDelete = (url: string) => {
  //   setPdfToDelete(url);
  //   setIsConfirmDeleteModalOpen(true);
  // };

 const menuPdfUpload = useImageUpload({
    preset: "menuPdf",
    onSuccess: (url) => setMenuPdfUrls(prev => [...prev, url]),
  });
  
  const handleMenuPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    console.log("Selected files for PDF upload:", files);
    for (const file of files) {
      await menuPdfUpload.upload(file);
    }
  };
  const removeMenuPdf = async (index: number) => {
    try {
      const pdfUrl = menuPdfUrls[index];
      if (!pdfUrl.includes("raffilybusiness")) {
        await menuPdfUpload.remove(pdfUrl);
      }
      setMenuPdfUrls((prev) => prev.filter((_, i) => i !== index));
      if (menuPdfInputRef.current) {
        menuPdfInputRef.current.value = "";
      }
      toast.success("Menu PDF removed successfully");
    } catch (error) {
      console.error("PDF delete error:", error);
      toast.error("Failed to remove menu PDF. Please try again.");
    }
  };
  const validateStep1 = () => {
    let valid = true;
    const newErrors = { ...errors };

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = 'Restaurant name is required';
      valid = false;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
      valid = false;
    }

    if (selectedCategories.length === 0) { // ✅ Updated validation
      newErrors.category = "At least one Cuisine Type is required";
      valid = false;
    } else if (selectedCategories.length > 2) {
      newErrors.category = "You can select only up to 2 categories";
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

  const validateStep3 = () => {
    let valid = true;
    const newErrors = { ...errors };
    setShowValidationErrors(true); // Show validation errors when validation is triggered

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      valid = false;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      valid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
      valid = false;
    } else {
      // Check for at least one number
      const hasNumber = /\d/.test(formData.password);
      // Check for at least one special character
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);

      if (!hasNumber) {
        newErrors.password = 'Password must contain at least one number';
        valid = false;
      } else if (!hasSpecialChar) {
        newErrors.password = 'Password must contain at least one special character';
        valid = false;
      }
    }

    // Password confirmation validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return

    window.scrollTo(0, 0)
    setStep(step + 1)
    setProgress((step / 3) * 100)
  }

  const prevStep = () => {
    window.scrollTo(0, 0)
    setStep(step - 1)
    setProgress(((step - 2) / 3) * 100)
  }

  const handleSubmit = async () => {
    if (!validateStep3()) return
    if (formData.images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }
    setIsLoading(true);
    try {
      // Submit registration data to API
      const response = await fetch("/api/restaurants/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          area: selectedAreas,
          category: selectedCategories, // ✅ Send selected categories array
          menuPdfUrls: menuPdfUrls,
          searchTags: selectedTags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Registration error:", errorData)
        throw new Error(errorData.message || "Registration failed")
      }
      toast.success("Restaurant registered successfully!")

      // Move to success step
      console.log("Registration error:")

      setStep(4)
      setProgress(100)
    } catch (error: any) {
      console.log("Registration error:", error)
      toast.error(error.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }


  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      if (prev.length >= 6) {
        toast.warning("Maximum 6 tags allowed");
        return prev;
      }
      return [...prev, tagId];
    });
  };

  const removeTag = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((id) => id !== tagId));
  };

  const addCustomTag = async () => {
    if (!customTag.trim()) return;

    const trimmed = customTag.trim();

    // Check if already exists
    const existing = allTags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      // already exists → just select it
      if (!selectedTags.includes(existing._id)) {
        setSelectedTags((prev) => [...prev, existing._id]);
      }
      setCustomTag("");
      return;
    }

    // Create new tag
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          // slug: optional — backend khud bana lega
          isActive: true,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Unable to create tag. Please try again");
        return;
      }

      // Add to local list
      const newTag = {
        _id: data.tag._id,
        name: data.tag.name,
      };
      setAllTags((prev) => [...prev, newTag]);

      // Select it
      setSelectedTags((prev) => [...prev, newTag._id]);
      setCustomTag("");

      toast.success("Tag added successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Unable to create tag. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/restaurant-patio.webp" alt="Restaurant background" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo href="/welcome" />
            <span className="font-medium">Restaurant Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium hover:underline">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </header> */}

      <main className="flex-1 py-12 relative z-10">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-2xl">
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Registration Progress</span>
                {/* <span className="text-sm font-medium text-white">{progress}%</span> */}
                <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Step indicators */}
            {step < 4 && (
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 1 ? "bg-red-600 text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    1
                  </div>
                  <div className={`h-1 flex-1 ${step >= 2 ? "bg-red-600" : "bg-gray-200"}`}></div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 2 ? "bg-red-600 text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    2
                  </div>
                  <div className={`h-1 flex-1 ${step >= 3 ? "bg-red-600" : "bg-gray-200"}`}></div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 3 ? "bg-red-600 text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    3
                  </div>
                </div>
              </div>
            )}

            <Card className="border-0 shadow-xl">
              {step === 1 && (
                <>
                  <CardHeader>
                    <CardTitle>Restaurant Information</CardTitle>
                    <CardDescription>Tell us about your restaurant</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="restaurantName">Restaurant Name</Label>
                      <div className="relative">
                        <Building2 className={`absolute left-3 ${errors.restaurantName ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                        <Input
                          type="text"
                          maxLength={40}
                          id="restaurantName"
                          className={`pl-10 ${errors.restaurantName ? 'border-red-500' : ''}`}
                          value={formData.restaurantName}
                          onChange={handleChange}
                        />
                        {errors.restaurantName && <p className="text-red-500 text-xs mt-1">{errors.restaurantName}</p>}
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
                            // { value: "other", label: "+ Other " }
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
                              setFormData((prev) => ({ ...prev, category: [] }));
                              setErrors((prev) => ({ ...prev, category: '' }));
                              return;
                            }

                            const selectedIds = selectedOptions.map((option: any) => option.value);

                            // Check if trying to select more than 2 categories
                            if (selectedIds.length > 2) {
                              setErrors((prev) => ({ ...prev, category: 'You can select only up to 2 categories' }));
                              return; // Prevent the selection
                            }

                            if (selectedIds.includes("other")) {
                              setShowAddCuisineModal(true);
                              const filteredIds = selectedIds.filter((id: any) => id !== "other");

                              // Check again after filtering out "other"
                              if (filteredIds.length > 2) {
                                setErrors((prev) => ({ ...prev, category: 'You can select only up to 2 categories' }));
                                return;
                              }

                              setSelectedCategories(filteredIds);
                              setFormData((prev) => ({ ...prev, category: filteredIds }));
                            } else {
                              setSelectedCategories(selectedIds);
                              setFormData((prev) => ({ ...prev, category: selectedIds }));
                            }

                            // Clear errors if selection is valid
                            if (selectedIds.length > 0 && selectedIds.length <= 2) {
                              setErrors((prev) => ({ ...prev, category: '' }));
                            }
                          }}
                          placeholder="Select up to 2 Cuisine Types"
                          isClearable
                          styles={{
                            option: (provided, state) => ({
                              ...provided,
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

                    {/* <div className="space-y-3 mt-6">
                      <Label>Search Tags (optional)</Label>
                      <p className="text-sm text-muted-foreground">Add your own tag if necessary...</p>

                      <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
                        {allTags.map((tag) => (
                          <Badge
                            key={tag._id}
                            variant={selectedTags.includes(tag._id) ? "default" : "outline"}
                            className="cursor-pointer transition-colors hover:bg-[#E31E24] hover:text-white"
                            onClick={() => toggleTag(tag._id)}
                          >
                            {tag.name}
                            {selectedTags.includes(tag._id) && (
                              <X
                                className="ml-1 h-3 w-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTag(tag._id);
                                }}
                              />
                            )}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add your own tag (e.g., Live Music, Pet Friendly)"
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomTag();
                            }
                          }}
                          maxLength={25}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCustomTag}
                          disabled={!customTag.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {selectedTags.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Selected Tags ({selectedTags.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTags.map((tagId) => {
                              const tag = allTags.find((t) => t._id === tagId) || { name: "Unknown" };
                              return (
                                <Badge key={tagId} variant="secondary" className="gap-1">
                                  {tag.name}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                    onClick={() => removeTag(tagId)}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div> */}

                    <div className="space-y-2 pt-4">
                      <Label>Restaurant Photos (Max 6)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden">
                            <Image
                              src={image || "/placeholder.svg"}
                              alt={`Restaurant image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
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
                              disabled={restaurantImageUpload.uploading}
                            />
                            {restaurantImageUpload.uploading ? (
                              <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-gray-600 rounded-full"></div>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-gray-400" />
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
                    <Button onClick={nextStep} className="bg-red-600 hover:bg-red-700">
                      <div className="flex items-center">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </Button>
                  </CardFooter>
                </>
              )}

              {step === 2 && (
                <>
                  <CardHeader>
                    <CardTitle>Contact & Location</CardTitle>
                    <CardDescription>Where can customers find you?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="area">Area</Label>
                      <ReactSelect
                        isMulti
                        name="areas"
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
                          placeholder="Enter your address"
                          className={`pl-10 ${errors.address ? 'border-red-500' : ''}`}
                          value={formData.address}
                          onChange={handleChange}
                        />
                        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Town/Area</Label>
                        <Input
                          id="city"
                          maxLength={25}
                          placeholder="Enter your town or area"
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
                          placeholder="Enter your zip code"
                          className={`${errors.zipCode ? 'border-red-500' : ''}`}
                          value={formData.zipCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();

                            // Update form data
                            setFormData((prev) => ({
                              ...prev,
                              zipCode: value,
                            }));

                            // Clear error if input is now valid
                            if (value.trim() !== "" && errors.zipCode) {
                              setErrors((prev) => ({
                                ...prev,
                                zipCode: "",
                              }));
                            }
                          }}
                        />
                        {errors.zipCode && (
                          <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>
                        )}
                      </div>


                    </div>
                    {/*<div className="space-y-2">
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
                    </div>*/ }
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className={`absolute left-3 ${errors.phone ? "top-1/3" : "top-1/2"} transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                          <Input
                            id="phone"
                            placeholder="Enter restaurant number"
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
                        <span className="text-xs text-gray-500">This number is for bookings and enquiries.</span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Business Email</Label>
                        <div className="relative">
                          <Mail className={`absolute left-3 ${errors.email ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                            value={formData.email}
                            onChange={handleChange}
                          />
                          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
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

                    <div className="space-y-2 pt-4">
                      <Label>Dining Options</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="dineIn"
                            checked={formData.dineIn}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({ ...prev, dineIn: checked === true }));
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
                              setFormData((prev) => ({ ...prev, dineOut: checked === true }));
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
                            setFormData((prev) => ({ ...prev, deliveryAvailable: checked === true }));
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
                    <Button variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                    <Button onClick={nextStep} className="bg-red-600 hover:bg-red-700">
                      <div className="flex items-center">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </Button>
                  </CardFooter>
                </>
              )}

              {step === 3 && (
                <>
                  <CardHeader>
                    <CardTitle>Account Setup</CardTitle>
                    <CardDescription>Create your account to manage your restaurant</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className={`absolute left-3 ${errors.firstName ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                          <Input
                            id="firstName"
                            maxLength={50}
                            required
                            placeholder="Enter your first name"
                            className={`pl-10 ${errors.firstName ? 'border-red-500' : ''}`}
                            value={formData.firstName}
                            onChange={handleChange}
                          />
                          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <div className="relative">
                          <User className={`absolute left-3 ${errors.lastName ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                          <Input
                            id="lastName"
                            maxLength={50}
                            required
                            placeholder="Enter your last name"
                            className={`pl-10 ${errors.lastName ? 'border-red-500' : ''}`}
                            value={formData.lastName}
                            onChange={handleChange}
                          />
                          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountEmail">Email</Label>
                      <div className="relative">
                        <Mail className={`absolute left-3 ${errors.email ? "top-1/3" : "top-1/2"}  transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                        <Input
                          id="email"
                          type="email"
                          maxLength={50}
                          required
                          placeholder="Enter your email"
                          className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                          value={formData.email}
                          onChange={handleChange}
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>
                      <p className="text-xs text-gray-500">
                        This will be your login email and where we'll send important updates.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-3 ${errors.password ? "top-1/3" : "top-1/2"} transform -translate-y-1/2 text-gray-400 h-5 w-5`}
                        />
                        <Input
                          id="password"
                          type={isPasswordVisible ? "text" : "password"}
                          required
                          placeholder="Create your password"
                          className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
                          value={formData.password}
                          onChange={handleChange}
                          maxLength={20}
                        />
                        <button
                          type="button"
                          className={`absolute right-3 ${errors.password ? "top-1/3" : "top-1/2"} transform -translate-y-1/2 text-gray-400`}
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        >
                          {isPasswordVisible ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                        {errors.password && (
                          <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                        )}
                      </div>

                      <p className="text-xs text-gray-500">
                        Must be at least 8 characters with a number and special character.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-3 ${errors.confirmPassword ? "top-1/3" : "top-1/2"} transform -translate-y-1/2 text-gray-400 h-5 w-5`}
                        />
                        <Input
                          id="confirmPassword"
                          type={isConfirmPasswordVisible ? "text" : "password"}
                          required
                          className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          maxLength={20}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          className={`absolute right-3 ${errors.confirmPassword ? "top-1/3" : "top-1/2"} transform -translate-y-1/2 text-gray-400`}
                          onClick={() =>
                            setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                          }
                        >
                          {isConfirmPasswordVisible ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                        {errors.confirmPassword && (
                          <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="menuPdf">Upload Menu (PDF)</Label>
                      <div className="flex items-center gap-4 flex-wrap">
                        <input
                          ref={menuPdfInputRef}
                          id="menuPdf"
                          type="file"
                          accept="application/pdf"
                          multiple
                          className="block"
                          onChange={handleMenuPdfUpload}
                          disabled={menuPdfUpload.uploading}
                        />
                        {menuPdfUpload.uploading && (
                          <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-gray-600 rounded-full"></div>
                        )}
                      </div>

                      {menuPdfUrls.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {menuPdfUrls.map((url, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                              >
                                View Menu {index + 1}
                              </a>
                              {/* <button
                                type="button"
                                onClick={() => handlePdfDelete(url)}
                                className="text-red-600 text-xs underline"
                              >
                                Remove
                              </button> */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPdfIndexToDelete(index);
                                  setIsConfirmDeleteModalOpen(true);
                                }}
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

                    <div className="items-center space-x-2 pt-2 ">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms" checked={formData.agreeToTerms} onCheckedChange={handleCheckboxChange} />
                        <Label htmlFor="terms" className="text-sm">
                          I agree to the{" "}
                          <Link href="/terms" target="_blank" className="text-red-600 hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" target="_blank" className="text-red-600 hover:underline">
                            Privacy Policy
                          </Link>
                        </Label>
                      </div>
                      {errors.agreeToTerms && <p className="text-red-500 text-xs mt-1" style={{ marginLeft: '22px' }}>{errors.agreeToTerms}</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                    <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
                      {isLoading ? (
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
                          Creating Account...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          Complete Registration <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </CardFooter>
                </>
              )}

              {step === 4 && (
                <>
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 p-3">
                      <Check className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl">Registration Complete!</CardTitle>
                    <CardDescription>Your restaurant has been successfully registered.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-center">
                    <p>Thank you for joining Eatinout!</p>
                    <p>Your profile is being reviewed by our team, but you can immediately start adding offers — no need to wait!</p>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <h3 className="font-medium mb-2">What happens next?</h3>
                      <ol className="text-sm text-gray-600 space-y-2 text-left list-decimal pl-4">
                        <li>  You can now log in to your dashboard and start creating exclusive offers.</li>
                        <li>Our team will review your profile in the background (usually within 24 hours).</li>
                        <li> You'll get an email confirmation once your profile is approved.</li>
                      </ol>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-center gap-4">
                    {/* <Button asChild className="bg-red-600 hover:bg-red-700">
                      <Link href="/">Return to Home</Link>
                    </Button> */}
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                      <Link href="/dashboard">Create Offer</Link>
                    </Button>
                  </CardFooter>
                </>
              )}
            </Card>

            {/* Benefits sidebar - only show on steps 1-3 */}
            {step < 4 && (
              <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
                <h3 className="font-medium text-lg mb-4">Benefits of joining Eatinout</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-green-400 shrink-0 mt-0.5" />
                    <span>Attract new customers during slow periods</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-green-400 shrink-0 mt-0.5" />
                    <span>Free registration with no monthly fees</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-green-400 shrink-0 mt-0.5" />
                    <span>Full control over your offers and availability</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-green-400 shrink-0 mt-0.5" />
                    <span>Detailed analytics to track performance</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 mr-2 text-green-400 shrink-0 mt-0.5" />
                    <span>Dedicated support team to help you succeed</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* <footer className="border-t py-6 md:py-8 relative z-10 bg-white/5 backdrop-blur-sm">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Logo size="small" />
            <p className="text-sm text-white"> 2024 Eatinout. All rights reserved.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-white/80 hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-white/80 hover:text-white">
              Privacy
            </Link>
            <Link href="/contact" className="text-sm text-white/80 hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer> */}

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
      {/* <ConfirmDeleteModal
        open={isConfirmDeleteModalOpen}
        onClose={() => {
          setIsConfirmDeleteModalOpen(false);
          setPdfToDelete(null);
        }}
        fileUrl={pdfToDelete}
        deleteFromCloud={deleteFileFromAzure}
        onDeleted={() => {
          if (pdfToDelete) {
            setMenuPdfUrls((prev) => prev.filter((pdf) => pdf !== pdfToDelete));
          }
        }}
        title="Delete Menu PDF?"
        description="Are you sure you want to delete this menu PDF?"
      /> */}
      <ConfirmDeleteModal
        open={isConfirmDeleteModalOpen}
        onClose={() => {
          setIsConfirmDeleteModalOpen(false)
          setPdfIndexToDelete(null)
        }}
        title="Delete Menu PDF?"
        description="Are you sure you want to delete this menu PDF?"
        onConfirm={async () => {
          if (pdfIndexToDelete === null) return

          await removeMenuPdf(pdfIndexToDelete)

          setIsConfirmDeleteModalOpen(false)
          setPdfIndexToDelete(null)
        }}
      />
    </div>
  )
}


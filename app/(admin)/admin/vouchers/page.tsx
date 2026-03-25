"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-toastify"
import { Edit, Trash2, Check, X, Download, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function AdminVouchersPage() {
  const [errors, setErrors] = useState<any>({});
  const [vouchers, setVouchers] = useState<any>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [useExpiryDate, setUseExpiryDate] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<any | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [failedRecords, setFailedRecords] = useState<any[]>([])
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentVoucher, setCurrentVoucher] = useState({
    _id: "",
    code: "",
    discountType: "percentage",
    discountValue: 0,
    maxUses: 1,
    currentUses: 0,
    expiryDate: "",
    validityDays: 0,
    isActive: true,
    description: "",
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [totalVouchersCount, setTotalVouchersCount] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    expired: 0,
    used: 0,
    fullyUsed: 0
  })

  // Infinite scroll ref
  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchVouchers = async (newPage: number, loadMore: boolean, searchTerm?: string) => {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const searchParam = searchTerm !== undefined ? searchTerm : searchQuery;
      const url = `/api/admin/vouchers?page=${newPage}&limit=20${searchParam.trim() ? `&search=${encodeURIComponent(searchParam)}` : ''}`;
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (!resp.ok || !data.success) throw new Error(data.message || "Failed to fetch vouchers");
      
      if (loadMore) {
        setVouchers((prev: any) => [...prev, ...data.vouchers]);
      } else {
        setVouchers(data.vouchers || []);
      }
      
      // Store total count from pagination
      if (data.pagination) {
        setTotalVouchersCount(data.pagination.total);
      }
      
      setPage(newPage);
      setHasMore(data.pagination?.hasMore || false);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch vouchers");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchStats = async () => {
    try {
      const resp = await fetch('/api/admin/vouchers/stats');
      const data = await resp.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    document.title = 'Vouchers'
  }, [])

  useEffect(() => {
    fetchVouchers(1, false);
    fetchStats(); // Fetch stats separately
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Skip initial mount - let the other useEffect handle initial load
    const isInitialMount = page === 1 && vouchers.length === 0 && !searchQuery;
    if (isInitialMount) {
      return;
    }

    const timeoutId = setTimeout(() => {
      // Reset to page 1 when search changes
      fetchVouchers(1, false, searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading && !searchQuery.trim()) {
          fetchVouchers(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, page, searchQuery]);

  const handleExcelUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setShowUploadDialog(true);
    setUploadResults(null);
    setFailedRecords([]);
    setUploadProgress({ current: 0, total: 0 });
    
    try {
      // Parse Excel file on client side to enable chunking
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (!allRows.length) {
        toast.error("No data found in the Excel file");
        setShowUploadDialog(false);
        return;
      }
      
      // Split into chunks to prevent timeout (50 rows per chunk)
      const CHUNK_SIZE = 50;
      const chunks = [];
      for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
        chunks.push(allRows.slice(i, i + CHUNK_SIZE));
      }
      
      setUploadProgress({ current: 0, total: allRows.length });
      
      // Process chunks sequentially
      const allResults: any[] = [];
      const allCreatedVouchers: any[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        let retryCount = 0;
        const MAX_RETRIES = 2;
        
        while (retryCount <= MAX_RETRIES) {
          try {
            // Add timeout to fetch request (2 minutes per chunk)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);
            
            const resp = await fetch("/api/admin/vouchers/bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rows: chunks[i] }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            const data = await resp.json();
            
            if (!resp.ok || !data.success) {
              throw new Error(data.message || `Chunk ${i + 1} failed`);
            }
            
            // Aggregate results
            allResults.push(...(data.results || []));
            allCreatedVouchers.push(...(data.vouchers || []));
            
            // Update progress
            setUploadProgress({ 
              current: Math.min((i + 1) * CHUNK_SIZE, allRows.length), 
              total: allRows.length 
            });
            
            break; // Success, exit retry loop
            
          } catch (chunkError: any) {
            if (chunkError.name === 'AbortError') {
              console.error(`Chunk ${i + 1} timed out after 2 minutes`);
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                toast.warning(`Chunk ${i + 1} timed out, retrying... (${retryCount}/${MAX_RETRIES})`);
                continue;
              } else {
                toast.error(`Chunk ${i + 1} failed after ${MAX_RETRIES} retries (timeout)`);
                break;
              }
            } else {
              console.error(`Error processing chunk ${i + 1}:`, chunkError);
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                toast.warning(`Chunk ${i + 1} failed, retrying... (${retryCount}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                continue;
              } else {
                toast.error(`Chunk ${i + 1} failed: ${chunkError.message}`);
                break;
              }
            }
          }
        }
      }
      
      // Merge newly created vouchers into list
      if (allCreatedVouchers.length) {
        setVouchers((prev: any) => [...allCreatedVouchers, ...prev]);
      }
      
      // Prepare summary
      const summary = {
        total: allRows.length,
        created: allCreatedVouchers.length,
        failed: allResults.filter(r => !r.success).length,
      };
      
      setUploadResults(summary);
      
      // Extract failed records
      const failed = allResults.filter((r: any) => !r.success);
      setFailedRecords(failed);
      
      // Close upload dialog
      setShowUploadDialog(false);
      
      // Show success message
      if (summary.failed > 0) {
        toast.warning(`Bulk upload: ${summary.created}/${summary.total} created, ${summary.failed} failed`);
        setShowResultsDialog(true);
      } else {
        toast.success(`Bulk upload: ${summary.created}/${summary.total} created successfully`);
      }
      
      fetchStats(); // Refresh stats
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
      setShowUploadDialog(false);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      // reset the file input value so same file can be selected again
      e.target.value = "";
    }
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };

    if (name === "discountValue") {
      const numValue = parseFloat(value);
      if (currentVoucher.discountType === "fixed" && numValue > 4.99) {
        newErrors[name] = "Fixed discount cannot be more than $4.99";
      } else if (currentVoucher.discountType === "percentage" && numValue > 100) {
        newErrors[name] = "Percentage discount cannot be more than 100%";
      } else {
        delete newErrors[name];
      }
    }

    if (name === "validityDays") {
      const num = Number(value);
      if (num < 1 || num > 548) {
        newErrors[name] = "Validity days must be between 1 and 548";
      } else {
        delete newErrors[name];
      }
    }

    setErrors(newErrors);
    setCurrentVoucher({
      ...currentVoucher,
      [name]: value,
    });
  };

  const handleSelectChange = (name: any, value: any) => {
    if (name === 'discountType') {
      setCurrentVoucher({
        ...currentVoucher,
        [name]: value,
        discountValue: 0
      })
    } else {
      setCurrentVoucher({
        ...currentVoucher,
        [name]: value,
      })
    }
  }

  const handleEditVoucher = (voucher: any) => {
    setIsEditing(true);
    const resolvedExpiry: string | undefined = voucher.resolvedExpiry || voucher.expiryDate;
    const shouldUseExpiry = !Boolean(resolvedExpiry);
    setUseExpiryDate(shouldUseExpiry);
    setCurrentVoucher({
      ...voucher,
      expiryDate: resolvedExpiry ? resolvedExpiry.substring(0, 10) : "",
      validityDays: voucher.validityDays || 0,
    });
  }

  const resetForm = () => {
    setCurrentVoucher({
      _id: "",
      code: "",
      discountType: "percentage",
      discountValue: 0,
      maxUses: 1,
      currentUses: 0,
      expiryDate: "",
      validityDays: 0,
      isActive: true,
      description: "",
    })
    setIsEditing(false)
    setUseExpiryDate(false)
  }

  const validateVoucher = () => {
    const newErrors: any = {};

    if (currentVoucher.discountType === "fixed" && currentVoucher.discountValue > 4.99) {
      newErrors.discountValue = "Fixed discount cannot be more than $4.99";
    }
    if (currentVoucher.discountType === "percentage" && currentVoucher.discountValue > 100) {
      newErrors.discountValue = "Percentage discount cannot be more than 100%";
    }

    if (useExpiryDate) {
      if (!currentVoucher.expiryDate) {
        newErrors.expiryDate = "Please select an expiry date";
      }
    } else {
      const days = Number(currentVoucher.validityDays);
      if (!days || days < 1 || days > 548) {
        newErrors.validityDays = "Validity days must be between 1 and 548";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateVoucher()) return;

    setIsLoading(true);

    try {
      // Calculate expiryDate depending on mode
      const computedExpiryIso = useExpiryDate && currentVoucher.expiryDate
        ? new Date(currentVoucher.expiryDate).toISOString()
        : (!useExpiryDate && currentVoucher.validityDays
          ? new Date(Date.now() + currentVoucher.validityDays * 24 * 60 * 60 * 1000).toISOString()
          : "");

      const payload = {
        ...currentVoucher,
        expiryDate: computedExpiryIso || currentVoucher.expiryDate,
        validityDays: useExpiryDate ? 0 : currentVoucher.validityDays,
      };

      if (isEditing) {
        const response = await fetch(`/api/admin/vouchers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to update voucher");

        const updatedVoucher = await response.json();
        setVouchers((prev: any) =>
          prev.map((v: any) => v._id === updatedVoucher.voucher._id ? updatedVoucher.voucher : v)
        );
        toast.success("Voucher updated successfully.");
      } else {
        const { _id, ...postPayload } = payload;
        const response = await fetch("/api/admin/vouchers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          toast.error(errorData.message || "Failed to create voucher");
          return;
        };

        const newVoucher = await response.json();
        setVouchers((prev: any) => [...prev, newVoucher.voucher]);
        toast.success("Voucher created successfully.");
      }

      resetForm();
      fetchStats(); // Refresh stats
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this voucher?")) return;

    try {
      const response = await fetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete voucher");

      setVouchers((prev: any) => prev.filter((v: any) => v._id !== id));
      toast.success("Voucher deleted successfully.");
      fetchStats(); // Refresh stats
    } catch (error: any) {
      toast.error("Error deleting voucher");
    }
  };

  const handleToggleActive = async (id: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/vouchers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update voucher status");

      const updatedVoucher = await response.json();
      setVouchers((prev: any) =>
        prev.map((v: any) => v._id === updatedVoucher.voucher._id ? updatedVoucher.voucher : v)
      );
      toast.success("Voucher status updated successfully.");
      fetchStats(); // Refresh stats
    } catch (error: any) {
      toast.error("Error updating voucher status");
    }
  };

  const downloadFailedRecords = () => {
    if (!failedRecords.length) return;

    // Create CSV content with all columns
    const headers = ["Code", "DiscountType", "DiscountValue", "MaxUses", "ValidityDays", "Description"];
    const rows = failedRecords.map((record: any) => [
      record.data?.code || record.code || "N/A",
      record.data?.discountType || "",
      record.data?.discountValue || "",
      record.data?.maxUses || "",
      record.data?.validityDays || "",
      // record.data?.expiryDate || "",
      // record.data?.isActive !== undefined ? record.data.isActive : "",
      record.data?.description || "",
      // record.error || "Unknown error"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `failed_vouchers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // toast.success("Failed records downloaded successfully");
  };

  const downloadSampleTemplate = () => {
    // Create sample CSV content with proper format
    const headers = ["code", "discountType", "discountValue", "maxUses", "validityDays", "description"];
    const sampleRows = [
      ["WELCOME10", "%", "10", "100", "30", "Welcome discount for new users"],
      ["SAVE20", "%", "20", "500", "60", "Save 20% on subscription"],
      ["FIXED5OFF", "£", "2.50", "200", "90", "£2.50 off your subscription"],
      ["SUMMER25", "percentage", "25", "1000", "365", "Summer sale discount"],
      ["VIP50", "%", "50", "50", "180", "VIP members only"],
      ["GROUPON100", "%", "100", "100", "365", "Groupon deal - 100% off"],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "voucher_template_sample.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Vouchers</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Vouchers</CardTitle>
            <CardDescription>All vouchers in database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                Showing {vouchers.length} result(s)
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active / Inactive</CardTitle>
            <CardDescription>Current availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.active} <span className="text-sm font-normal text-gray-500">/ {stats.inactive}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expired / Used</CardTitle>
            <CardDescription>Status overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.expired} <span className="text-sm font-normal text-gray-500">/ {stats.fullyUsed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Section - Now Full Width on Top */}
      <Card className="w-full overflow-hidden mb-6">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Voucher" : "Create New Voucher"}</CardTitle>
          <CardDescription>
            {isEditing ? "Update the selected voucher details" : "Create a new voucher code for subscription discounts"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulkUpload">Bulk Upload (Excel .xlsx)</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={downloadSampleTemplate}
                    className="h-auto p-0 text-xs"
                  >
                    📥 Download Sample Template
                  </Button>
                </div>
                <Input
                  id="bulkUpload"
                  name="bulkUpload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  disabled={uploading}
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Required columns: code, discountType, discountValue, maxUses, validityDays (or expiryDate), description</p>
                  {/* <p className="text-green-600">⚡ Chunked processing: handles large uploads without timeouts</p> */}
                </div>
                {uploadResults && (
                  <p className="text-sm text-gray-600">
                    Uploaded: {uploadResults.created}/{uploadResults.total} created, {uploadResults.failed} failed
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Voucher Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={currentVoucher.code}
                  onChange={handleInputChange}
                  placeholder="e.g., SUMMER2024"
                  required
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select
                    value={currentVoucher.discountType}
                    onValueChange={(value) => handleSelectChange("discountType", value)}
                  >
                    <SelectTrigger id="discountType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    {currentVoucher.discountType === "percentage" ? "Percentage (max 100%)" : "Amount (max $4.99)"}
                  </Label>
                  <Input
                    id="discountValue"
                    name="discountValue"
                    type="number"
                    min="0"
                    max={currentVoucher.discountType === "percentage" ? "100" : "4.99"}
                    step={currentVoucher.discountType === "percentage" ? "1" : "0.01"}
                    value={currentVoucher.discountValue}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.discountValue && <p className="text-red-500 text-sm">{errors.discountValue}</p>}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Maximum Uses</Label>
                  <Input
                    id="maxUses"
                    name="maxUses"
                    type="number"
                    min="1"
                    value={currentVoucher.maxUses}
                    onChange={(e: any) => e.target.value <= 1000000000 ? handleInputChange(e) : null}
                    required
                    maxLength={10}
                  />
                  {errors.maxUses && <p className="text-red-500 text-sm">{errors.maxUses}</p>}
                </div>
                {useExpiryDate ? (
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      value={currentVoucher.expiryDate || ""}
                      onChange={(e: any) => setCurrentVoucher({ ...currentVoucher, expiryDate: e.target.value })}
                      required
                    />
                    {errors.expiryDate && <p className="text-red-500 text-sm">{errors.expiryDate}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="validityDays">Validity (days)</Label>
                    <Input
                      id="validityDays"
                      name="validityDays"
                      type="number"
                      min={1}
                      max={548}
                      value={currentVoucher.validityDays > 0 ? currentVoucher.validityDays : ""}
                      onChange={handleInputChange}
                      placeholder="Enter number of days"
                      required
                    />
                    {errors.validityDays && <p className="text-red-500 text-sm">{errors.validityDays}</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={currentVoucher.description}
                  onChange={handleInputChange}
                  placeholder="Optional description"
                  maxLength={500}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={currentVoucher.isActive}
                  onChange={() => handleSelectChange("isActive", !currentVoucher.isActive)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Active
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button type="button" variant="outline" onClick={resetForm}>
              {isEditing ? "Cancel" : "Reset"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                  Loading...
                </>
              ) : (
                <>{isEditing ? "Update Voucher" : "Create Voucher"}</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Vouchers Table - Now Full Width at Bottom */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Vouchers</CardTitle>
              <CardDescription>Manage your existing voucher codes</CardDescription>
            </div>
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Input
                type="text"
                placeholder="Search by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && page === 1 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      Loading vouchers...
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {vouchers.map((voucher: any) => (
                      <TableRow key={voucher._id}>
                        <TableCell className="font-medium">{voucher.code}</TableCell>
                        <TableCell>
                          {voucher.discountType === "percentage"
                            ? `${voucher.discountValue}%`
                            : `£${voucher.discountValue.toFixed(2)}`}
                        </TableCell>
                        <TableCell>
                          {voucher.currentUses} / {voucher.maxUses}
                        </TableCell>
                        <TableCell>
                          {voucher.validityDays
                            ? new Date(new Date(voucher.createdAt).getTime() + voucher.validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
                            : new Date(voucher.expiryDate).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={voucher.isActive ? "outline" : "secondary"}
                            className={voucher.isActive ? "bg-green-50 text-green-700 border-green-200" : ""}
                          >
                            {voucher.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(voucher._id, !voucher.isActive)}
                          >
                            {voucher.isActive ? <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <X className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">Deactivate</TooltipContent>
                              </Tooltip>
                            </TooltipProvider> : <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Check className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">Activate</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditVoucher(voucher)}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Edit className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(voucher._id)}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Trash2 className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {vouchers.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          {searchQuery ? `No vouchers found matching "${searchQuery}"` : "No vouchers found. Create your first voucher."}
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Infinite scroll trigger - only show when not searching */}
                    {hasMore && !searchQuery && (
                      <TableRow ref={observerTarget as React.Ref<HTMLTableRowElement>}>
                        <TableCell colSpan={6} className="text-center py-4">
                          {isLoadingMore ? (
                            <div className="flex items-center justify-center gap-2 text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Loading more...</span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">Scroll for more</div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Loading Dialog with Progress */}
      <Dialog open={showUploadDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Uploading Vouchers</DialogTitle>
            <DialogDescription>
              Processing in chunks to prevent timeouts...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            {uploadProgress.total > 0 && (
              <>
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% complete
                  </p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Processing 50 vouchers at a time to ensure reliability
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Failed Records Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Results</DialogTitle>
            <DialogDescription>
              {uploadResults && (
                <span>
                  Successfully created {uploadResults.created} out of {uploadResults.total} vouchers.
                  {uploadResults.failed > 0 && ` ${uploadResults.failed} records failed validation.`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {failedRecords.length > 0 && (
            <div className="flex-1 overflow-y-auto max-h-[400px] min-h-0">
              <h3 className="font-semibold mb-3 text-sm">Failed Records:</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Voucher Code</TableHead>
                      <TableHead className="w-[70%]">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedRecords.map((record: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium break-all">{record.code || "N/A"}</TableCell>
                        <TableCell className="text-red-600 text-sm break-words">{record.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2 mt-4">
            <Button
              onClick={() => setShowResultsDialog(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            {failedRecords.length > 0 && (
              <Button
                variant="outline"
                onClick={downloadFailedRecords}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Download Failed</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

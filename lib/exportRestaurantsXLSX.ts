import * as XLSX from "xlsx";

interface Category {
  name?: string;
}

interface Restaurant {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  category?: Category[];
  area?: { id: string; name: string }[];
  areas?: { id: string; name: string }[]; // Support both singular and plural
  dineIn?: boolean;
  dineOut?: boolean;
  deliveryAvailable?: boolean;
  totalOffersCount?: number;
  ownerName?: string;
}

export function exportRestaurantsToXLSX(
  restaurants: Restaurant[],
  hideOwnerName: boolean = false
) {
  if (!restaurants || restaurants.length === 0) return;

  const headers = [
    "Name",
    ...(hideOwnerName ? [] : ["Owner Name"]),
    "Email",
    "Phone",
    "Address",
    "Postcode",
    "Category",
    "Area",
    "Dine In",
    "Takeaway",
    "Delivery Available",
    "Total Offers",
  ];

  const data = restaurants.map((restaurant) => {
    const fullAddress = [restaurant.address, restaurant.city, restaurant.zipCode]
      .filter(Boolean)
      .join(", ");

    // Handle area names - support both 'area' and 'areas' properties
    // API returns 'areas' (plural) but we support both for compatibility
    const areaData = restaurant.areas || restaurant.area;
    let areaNames = "";
    if (areaData) {
      if (Array.isArray(areaData)) {
        areaNames = areaData
          .map((a) => {
            // Handle both { id: string, name: string } objects and string IDs
            if (typeof a === 'object' && a !== null && 'name' in a) {
              return a.name;
            }
            // If it's already a string (name), return it
            if (typeof a === 'string') {
              return a;
            }
            return null;
          })
          .filter(Boolean)
          .join(", ");
      } else if (typeof areaData === 'object' && areaData !== null && 'name' in areaData) {
        // Handle single area object
        areaNames = (areaData as any).name || "";
      }
    }

    const categoryNames = Array.isArray(restaurant.category)
      ? restaurant.category.map((c) => c?.name || "").filter(Boolean).join(", ")
      : "";

    return [
      restaurant.name || "",
      ...(hideOwnerName ? [] : [restaurant.ownerName || "N/A"]),
      restaurant.email || "",
      restaurant.phone || "",
      fullAddress || "",
      restaurant.zipCode || "",
      categoryNames || "",
      areaNames || "N/A",
      restaurant.dineIn ? "Yes" : "No",
      restaurant.dineOut ? "Yes" : "No",
      restaurant.deliveryAvailable ? "Yes" : "No",
      restaurant.totalOffersCount ?? 0,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  worksheet["!cols"] = [
    { wch: 25 }, // Name
    { wch: 20 }, // Owner Name
    { wch: 30 }, // Email
    { wch: 15 }, // Phone
    { wch: 40 }, // Full Address
    { wch: 10 }, // Postcode
    { wch: 35 }, // Category
    { wch: 25 }, // Area
    { wch: 10 }, // Dine In
    { wch: 10 }, // Takeaway
    { wch: 15 }, // Delivery Available
    { wch: 12 }, // Total Offers
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Restaurants");
  XLSX.writeFile(workbook, "restaurants.xlsx");
}

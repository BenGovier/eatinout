import * as XLSX from "xlsx";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  createdAt: string;
  restaurantName?: string;
   zipCode?: string; // ✅ Added
}

export function exportUsersToXLSX(users: User[]) {
  if (!users || users.length === 0) return;

  const headers = [
    "Name",
    "Email",
    "Role",
    "Subscription",
    "Restaurant Name",
    "Zip Code",  
    "Joined At",
  ];

  const data = users.map((user) => [
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.role.charAt(0).toUpperCase() + user.role.slice(1),
    user.role === "user"
      ? user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1)
      : "N/A",
      user.role === "restaurant" ? user.restaurantName || "N/A" : "N/A",
      user.zipCode || "N/A", 
    new Date(user.createdAt).toLocaleDateString("en-GB"),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  worksheet["!cols"] = [
    { wch: 25 }, // Name
    { wch: 30 }, // Email
    { wch: 15 }, // Role
    { wch: 18 }, // Subscription
    { wch: 30 }, // Restaurant Name
       { wch: 12 }, // Zip Code  ✅ NEW SIZE
    { wch: 15 }, // Joined At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
  XLSX.writeFile(workbook, "users.xlsx");
}
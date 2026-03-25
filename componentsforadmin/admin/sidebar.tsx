"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Restaurants", href: "/admin/restaurants" },
  { label: "Redeemed Offers", href: "/admin/redeemed-offers" },
  { label: "Vouchers", href: "/admin/vouchers" },
  { label: "Areas", href: "/admin/areas" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Carousels", href: "/admin/carousels" },
  { label: "Tags", href: "/admin/tags" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-48 min-h-screen border-r border-border bg-card py-6">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-6 py-2 text-sm transition-colors hover:text-foreground",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

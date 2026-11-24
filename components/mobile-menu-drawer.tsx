"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Briefcase,
  Building2,
  Grid3x3,
  Heart,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  Lock,
  LogOut,
  Map,
  Menu,
  Phone,
  Search,
  Tag,
  User,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
};

const GUEST_LINKS: NavLink[] = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/contact", label: "Contact", icon: Phone },
  { href: "/how-it-works", label: "How It Works", icon: Lightbulb },
  { href: "/pricing#faq", label: "FAQs", icon: HelpCircle },
];

const CUSTOMER_LINKS: NavLink[] = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/categories", label: "Categories", icon: Grid3x3 },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/favorites", label: "Favourites", icon: Heart },
  { href: "/account/contact", label: "Contact", icon: Phone },
];

const DASHBOARD_BY_ROLE: Record<string, NavLink> = {
  admin: { href: "/admin/dashboard", label: "Admin dashboard", icon: LayoutDashboard },
  restaurant: { href: "/dashboard", label: "Restaurant dashboard", icon: LayoutDashboard },
};

const BUSINESSES_LINK: NavLink = {
  href: "https://corporate.eatinout.co.uk/",
  label: "Businesses",
  icon: Briefcase,
  external: true,
};

type MobileMenuDrawerProps = {
  isCustomer: boolean;
  role?: string | null;
  isSigningOut: boolean;
  onSignOut: () => void;
};

export function MobileMenuDrawer({ isCustomer, role, isSigningOut, onSignOut }: MobileMenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  const dashboardLink = role ? DASHBOARD_BY_ROLE[role] : undefined;
  const isSignedIn = isCustomer || !!dashboardLink;
  const navLinks = isCustomer ? CUSTOMER_LINKS : GUEST_LINKS;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="md:hidden inline-flex size-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition-colors hover:border-red-600 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-200 data-[state=open]:duration-300 md:hidden" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-[60] flex h-dvh w-[85vw] max-w-[360px] flex-col bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200 md:hidden"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <span aria-hidden="true" />
            <Dialog.Close
              className="inline-flex size-10 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              aria-label="Close menu"
            >
              <X className="size-6" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            <Link
              href="/restaurants"
              onClick={close}
              className="flex h-12 items-center gap-3 rounded-xl bg-red-600 px-4 font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              <Search className="size-5 shrink-0" aria-hidden="true" />
              See Offers
            </Link>

            <ul className="mt-4 flex flex-col">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <MenuLink item={item} active={pathname === item.href} onSelect={close} />
                </li>
              ))}
            </ul>

            <div className="my-4 h-px bg-gray-100" role="separator" />

            <ul className="flex flex-col">
              {dashboardLink && (
                <li>
                  <MenuLink item={dashboardLink} active={pathname === dashboardLink.href} onSelect={close} />
                </li>
              )}
              {isCustomer && (
                <li>
                  <MenuLink
                    item={{ href: "/account", label: "My Account", icon: User }}
                    active={pathname === "/account"}
                    onSelect={close}
                  />
                </li>
              )}
              <li>
                {isSignedIn ? (
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={() => {
                      close();
                      onSignOut();
                    }}
                    className="flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogOut className="size-5 shrink-0" aria-hidden="true" />
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </button>
                ) : (
                  <Link
                    href="/join"
                    onClick={close}
                    className="flex h-12 items-center gap-3 rounded-lg px-2 font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    <Lock className="size-5 shrink-0" aria-hidden="true" />
                    Login / Sign Up
                  </Link>
                )}
              </li>
            </ul>

            {!isCustomer && (
              <div className="mt-4 flex flex-col gap-1">
                <Link
                  href="/partner-info"
                  onClick={close}
                  className="flex h-12 items-center gap-3 rounded-xl border-2 border-red-600 px-4 font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  <Building2 className="size-5 shrink-0" aria-hidden="true" />
                  List a Restaurant
                </Link>
                <MenuLink item={BUSINESSES_LINK} active={false} onSelect={close} />
              </div>
            )}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MenuLink({ item, active, onSelect }: { item: NavLink; active: boolean; onSelect: () => void }) {
  const Icon = item.icon;
  const className = cn(
    "flex h-12 items-center gap-3 rounded-lg px-2 font-medium transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600",
    active ? "text-red-600" : "text-slate-600",
  );

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onSelect} className={className}>
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {item.label}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={item.href} onClick={onSelect} aria-current={active ? "page" : undefined} className={className}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

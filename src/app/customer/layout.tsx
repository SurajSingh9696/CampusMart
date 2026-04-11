"use client";

import { UnifiedPortalLayout } from "@/components/layout/UnifiedPortalLayout";

const navItems = [
  { href: "/customer/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/customer/products", icon: "shopping_bag", label: "Products" },
  { href: "/customer/projects", icon: "terminal", label: "Projects" },
  { href: "/customer/notes", icon: "menu_book", label: "Notes" },
  { href: "/customer/events", icon: "local_activity", label: "Events" },
  { href: "/customer/wishlist", icon: "favorite", label: "Wishlist" },
  { href: "/customer/orders", icon: "inventory_2", label: "My Orders" },
];

const accountItems = [
  { href: "/customer/profile", icon: "account_circle", label: "Profile" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedPortalLayout
      portalLabel="Customer Portal"
      logoIcon="school"
      logoHref="/customer/dashboard"
      navItems={navItems}
      accountItems={accountItems}
      notificationHref="/customer/notifications"
      showCampusBadge
    >
      {children}
    </UnifiedPortalLayout>
  );
}

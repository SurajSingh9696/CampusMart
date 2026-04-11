"use client";

import { UnifiedPortalLayout } from "@/components/layout/UnifiedPortalLayout";

const navItems = [
  { href: "/seller/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/seller/marketplace", icon: "inventory_2", label: "My Listings" },
  { href: "/seller/upload", icon: "add_circle", label: "Add Listing" },
  { href: "/seller/orders", icon: "receipt_long", label: "Orders" },
  { href: "/seller/analytics", icon: "analytics", label: "Analytics" },
];

const accountItems = [
  { href: "/seller/profile", icon: "store", label: "My Store" },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedPortalLayout
      portalLabel="Seller Portal"
      logoIcon="storefront"
      logoHref="/seller/dashboard"
      navItems={navItems}
      accountItems={accountItems}
      quickAction={{ href: "/seller/upload", icon: "add", label: "Add Listing" }}
      showCampusBadge
    >
      {children}
    </UnifiedPortalLayout>
  );
}

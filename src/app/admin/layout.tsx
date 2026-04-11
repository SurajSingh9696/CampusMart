"use client";

import { UnifiedPortalLayout } from "@/components/layout/UnifiedPortalLayout";

const navItems = [
  { href: "/admin/dashboard", icon: "dashboard", label: "Overview" },
  { href: "/admin/sellers", icon: "storefront", label: "Seller Approvals" },
  { href: "/admin/listings", icon: "inventory_2", label: "Listings" },
  { href: "/admin/users", icon: "group", label: "Users" },
  { href: "/admin/colleges", icon: "school", label: "Colleges" },
  { href: "/admin/orders", icon: "receipt_long", label: "All Orders" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedPortalLayout
      portalLabel="Admin Portal"
      logoIcon="admin_panel_settings"
      logoHref="/admin/dashboard"
      navItems={navItems}
      quickAction={{ href: "/admin/sellers", icon: "pending_actions", label: "Pending Reviews" }}
    >
      {children}
    </UnifiedPortalLayout>
  );
}

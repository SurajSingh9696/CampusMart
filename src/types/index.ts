export type Role = "customer" | "seller" | "admin";

export type SellerApprovalStatus = "pending" | "approved" | "rejected";

export type ListingType = "product" | "project" | "notes" | "event";

export type ListingStatus = "draft" | "pending_approval" | "live" | "sold" | "deactivated" | "rejected";

export type PaymentProvider = "razorpay" | "fallback";

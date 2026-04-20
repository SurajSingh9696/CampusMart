import { z } from "zod";

/**
 * Listing Creation/Update Schema
 */
export const listingSchema = z.object({
  type: z.enum(["product", "project", "notes", "event"]),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(4000),
  tags: z.array(z.string()).optional().default([]),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  previewUrls: z.array(z.string().url()).optional().default([]),
  resourceUrl: z.string().url().optional().or(z.literal("")),
  price: z.number().min(0).optional().default(0),
  isFree: z.boolean().optional().default(false),
  isAuction: z.boolean().optional().default(false),
  auctionStartPrice: z.number().min(0).optional(),
  auctionEndAt: z.string().datetime().optional(),
  quantity: z.number().int().min(0).optional().default(1),
  
  // Event-specific config
  eventConfig: z.object({
    branch: z.array(z.string()).optional(),
    course: z.array(z.string()).optional(),
    years: z.array(z.string()).optional(),
    eventDate: z.string().datetime().optional(),
    eventStartAt: z.string().datetime().optional(),
    eventEndAt: z.string().datetime().optional(),
    venue: z.string().max(200).optional(),
    eventQuestions: z.array(z.string()).optional(),
    ticketLimit: z.number().int().min(0).optional(),
  }).optional(),
  
  // Project-specific config
  projectConfig: z.object({
    targetYear: z.string().optional(),
    branch: z.string().optional(),
    semester: z.string().optional(),
    zipUrl: z.string().url().optional().or(z.literal("")),
    deployedPreviewUrl: z.string().url().optional().or(z.literal("")),
    oneBuyerOnly: z.boolean().optional(),
  }).optional(),
  
  // Notes-specific config
  notesConfig: z.object({
    subject: z.string().optional(),
    year: z.string().optional(),
    semester: z.string().optional(),
    notesPdfUrl: z.string().url().optional().or(z.literal("")),
    previewPages: z.number().int().min(0).max(10).optional(),
  }).optional(),
});

export type ListingInput = z.infer<typeof listingSchema>;

/**
 * User Registration Schemas
 */
export const customerRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  campus: z.string().min(1),
  idCardNumber: z.string().min(1),
  idCardImageId: z.string().optional(),
  profileImageId: z.string().optional(),
});

export const sellerRegisterSchema = customerRegisterSchema.extend({
  shopName: z.string().min(2).max(100),
  shopDescription: z.string().min(10).max(500).optional(),
  shopLogo: z.string().optional(),
  shopBanner: z.string().optional(),
});

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type SellerRegisterInput = z.infer<typeof sellerRegisterSchema>;

/**
 * Login Schema
 */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Order Creation Schema
 */
export const createOrderSchema = z.object({
  listingId: z.string().min(1),
  amount: z.number().min(0),
  paymentProvider: z.enum(["razorpay", "fallback"]).optional().default("razorpay"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Profile Update Schema
 */
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  idCardNumber: z.string().optional(),
  idCardImageId: z.string().optional(),
  profileImageId: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Seller Profile Update Schema
 */
export const updateSellerProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  shopName: z.string().min(2).max(100).optional(),
  shopDescription: z.string().min(10).max(500).optional(),
  shopLogo: z.string().optional(),
  shopBanner: z.string().optional(),
  payoutUpi: z.string().optional(),
  payoutBankAccount: z.string().optional(),
  payoutIfsc: z.string().optional(),
});

export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>;

/**
 * Admin Actions
 */
export const approveListingSchema = z.object({
  status: z.enum(["live", "rejected"]),
  approvalComment: z.string().max(500).optional(),
});

export const approveSellerSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  comment: z.string().max(500).optional(),
});

export const blockUserSchema = z.object({
  isBlocked: z.boolean(),
  blockedReason: z.string().max(500).optional(),
});

export type ApproveListingInput = z.infer<typeof approveListingSchema>;
export type ApproveSellerInput = z.infer<typeof approveSellerSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;

/**
 * Wishlist Schema
 */
export const addToWishlistSchema = z.object({
  listingId: z.string().min(1),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;

/**
 * Event Registration Schema
 */
export const eventRegistrationSchema = z.object({
  listingId: z.string().min(1),
  answers: z.array(z.string()).optional(),
});

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;

/**
 * Support Message Schema
 */
export const supportMessageSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(2000),
  category: z.enum(["bug", "feature", "support", "other"]).optional(),
});

export type SupportMessageInput = z.infer<typeof supportMessageSchema>;

/**
 * Password Change Schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Query/Filter Schemas
 */
export const listingQuerySchema = z.object({
  type: z.enum(["product", "project", "notes", "event"]).optional(),
  status: z.string().optional(),
  campus: z.string().optional(),
  global: z.enum(["true", "false"]).optional(),
  sellerId: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum([
    "newest",
    "oldest",
    "price_asc",
    "price_desc",
    "title_asc",
    "title_desc",
    "popular",
    "event_soonest",
    "event_latest",
  ]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type ListingQuery = z.infer<typeof listingQuerySchema>;

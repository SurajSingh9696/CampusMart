import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const wishlistItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    itemType: { type: String, enum: ["product", "project", "notes", "event"], required: true, index: true },
    campus: { type: String, default: "" },
  },
  { timestamps: true }
);

// One wishlist entry per user per listing
wishlistItemSchema.index({ userId: 1, listingId: 1 }, { unique: true });

type WishlistItemDoc = InferSchemaType<typeof wishlistItemSchema>;

export const WishlistItem: Model<WishlistItemDoc> =
  (mongoose.models.WishlistItem as Model<WishlistItemDoc>) ||
  mongoose.model<WishlistItemDoc>("WishlistItem", wishlistItemSchema);


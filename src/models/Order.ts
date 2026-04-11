import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const orderSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    amount: { type: Number, required: true, min: 0 }, // stored in rupees (not paise)
    currency: { type: String, default: "INR" },
    paymentProvider: { type: String, enum: ["razorpay", "fallback"], required: true },
    paymentReference: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "fulfilled", "cancelled"],
      default: "pending",
      index: true,
    },
    purchaseCampus: { type: String, required: true },
    sellerPayoutWeek: { type: String, default: "" },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

type OrderDoc = InferSchemaType<typeof orderSchema>;

export const Order: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) || mongoose.model<OrderDoc>("Order", orderSchema);

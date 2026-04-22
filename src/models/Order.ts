import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const orderSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    amount: { type: Number, required: true, min: 0 }, // buyer-paid amount in rupees
    sellerAmount: { type: Number, required: true, min: 0, default: 0 },
    platformFeeAmount: { type: Number, required: true, min: 0, default: 0 },
    priceMarkupPercent: { type: Number, min: 0, max: 100, default: 0 },
    currency: { type: String, default: "INR" },
    paymentProvider: { type: String, enum: ["razorpay", "fallback"], required: true },
    paymentReference: { type: String, default: "" }, // Razorpay order id or fallback reference
    paymentCaptureReference: { type: String, default: "" }, // Razorpay payment id
    paymentStatus: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },
    paidAt: { type: Date },
    status: {
      type: String,
      // Includes legacy statuses for backward compatibility with existing records.
      enum: [
        "created",
        "paid",
        "pending",
        "confirmed",
        "fulfilled",
        "pending_seller_action",
        "ready_to_fulfill",
        "fulfilled_by_seller",
        "ready_for_payment",
        "payout_completed",
        "cancelled",
      ],
      default: "pending_seller_action",
      index: true,
    },
    cancelledBy: { type: String, enum: ["", "customer", "seller", "admin", "system"], default: "" },
    cancelReason: { type: String, default: "" },
    sellerCancelReason: { type: String, default: "" },
    customerCancelReason: { type: String, default: "" },
    sellerAcceptedAt: { type: Date },
    sellerFulfilledAt: { type: Date },
    customerFulfilledAt: { type: Date },
    payoutReadyAt: { type: Date },
    payoutCompletedAt: { type: Date },
    payoutReference: { type: String, default: "" },
    purchaseCampus: { type: String, required: true },
    sellerPayoutUpi: { type: String, default: "" },
    buyerAccountNumberSnapshot: { type: String, default: "" },
    buyerIdCardNumberSnapshot: { type: String, default: "" },
    buyerIdCardImageIdSnapshot: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
    sellerPayoutWeek: { type: String, default: "" },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, payoutReadyAt: -1 });

type OrderDoc = InferSchemaType<typeof orderSchema>;

export const Order: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) || mongoose.model<OrderDoc>("Order", orderSchema);

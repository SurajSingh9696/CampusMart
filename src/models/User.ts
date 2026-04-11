import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { Role, SellerApprovalStatus } from "@/types";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "seller", "admin"], required: true, index: true },
    accountNumber: { type: String, unique: true, required: true, index: true },
    campus: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    idCardNumber: { type: String, default: "" },
    idCardImageId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
    profileImageId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
    isBlocked: { type: Boolean, default: false, index: true },
    blockedReason: { type: String, default: "" },
    notificationEmailOptIn: { type: Boolean, default: true },
    sellerApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
    sellerApprovalComment: { type: String, default: "" },
    sellerApprovalDeadline: { type: Date },
    sellerRejectedDeleteAt: { type: Date },
    shop: {
      shopName: { type: String, default: "" },
      shopDescription: { type: String, default: "" },
      shopLogoImageId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
      shopBannerImageId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
      payoutUpi: { type: String, default: "" },
      payoutBankAccount: { type: String, default: "" },
      payoutIfsc: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, campus: 1 });

type UserDoc = InferSchemaType<typeof userSchema> & {
  role: Role;
  sellerApprovalStatus: SellerApprovalStatus;
};

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", userSchema);

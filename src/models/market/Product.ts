import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const productSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    campus: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 4000 },
    category: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    imageIds: { type: [Schema.Types.ObjectId], ref: "MediaAsset", default: [] },
    price: { type: Number, min: 0, required: true },
    quantity: { type: Number, min: 0, default: 1 },
    condition: { type: String, enum: ["new", "like_new", "good", "used"], default: "good" },
    status: {
      type: String,
      enum: ["pending_approval", "live", "sold", "deactivated", "rejected"],
      default: "pending_approval",
      index: true,
    },
    approvalComment: { type: String, default: "" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    soldToCustomerId: { type: Schema.Types.ObjectId, ref: "User" },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

productSchema.index({ campus: 1, category: 1, status: 1 });

type ProductDoc = InferSchemaType<typeof productSchema>;

export const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) || mongoose.model<ProductDoc>("Product", productSchema);

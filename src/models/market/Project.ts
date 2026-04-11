import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const projectSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    campus: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 4000 },
    techStack: { type: [String], default: [] },
    targetYear: { type: String, required: true },
    branch: { type: String, required: true },
    semester: { type: String, required: true },
    imageIds: { type: [Schema.Types.ObjectId], ref: "MediaAsset", default: [] },
    zipMediaId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
    deployedPreviewUrl: { type: String, default: "" },
    isFree: { type: Boolean, default: false },
    price: { type: Number, min: 0, default: 0 },
    oneBuyerOnly: { type: Boolean, default: true },
    isAuction: { type: Boolean, default: false },
    auctionStartPrice: { type: Number, min: 0, default: 0 },
    auctionEndAt: { type: Date },
    status: {
      type: String,
      enum: ["pending_approval", "live", "sold", "deactivated", "rejected"],
      default: "pending_approval",
      index: true,
    },
    approvalComment: { type: String, default: "" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    soldToCustomerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

projectSchema.index({ campus: 1, status: 1, targetYear: 1 });

type ProjectDoc = InferSchemaType<typeof projectSchema>;

export const Project: Model<ProjectDoc> =
  (mongoose.models.Project as Model<ProjectDoc>) || mongoose.model<ProjectDoc>("Project", projectSchema);

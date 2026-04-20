import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const mediaAssetSchema = new Schema(
  {
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, max: 10 * 1024 * 1024 },
    data: { type: Buffer, required: true },
    purpose: { type: String, default: "general" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ createdAt: -1 });

type MediaAssetDoc = InferSchemaType<typeof mediaAssetSchema>;

export const MediaAsset: Model<MediaAssetDoc> =
  (mongoose.models.MediaAsset as Model<MediaAssetDoc>) ||
  mongoose.model<MediaAssetDoc>("MediaAsset", mediaAssetSchema);

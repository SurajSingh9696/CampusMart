import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const supportMessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accountNumber: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    adminComment: { type: String, default: "" },
    status: { type: String, enum: ["open", "reviewed", "closed"], default: "open", index: true },
  },
  { timestamps: true }
);

supportMessageSchema.index({ createdAt: -1 });

type SupportMessageDoc = InferSchemaType<typeof supportMessageSchema>;

export const SupportMessage: Model<SupportMessageDoc> =
  (mongoose.models.SupportMessage as Model<SupportMessageDoc>) ||
  mongoose.model<SupportMessageDoc>("SupportMessage", supportMessageSchema);

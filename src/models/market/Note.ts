import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const noteSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    campus: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 4000 },
    subject: { type: String, required: true },
    branch: { type: String, required: true },
    year: { type: String, required: true },
    semester: { type: String, required: true },
    isFree: { type: Boolean, default: false },
    price: { type: Number, min: 0, default: 0 },
    previewImageIds: { type: [Schema.Types.ObjectId], ref: "MediaAsset", default: [] },
    pdfMediaId: { type: Schema.Types.ObjectId, ref: "MediaAsset", required: true },
    previewPages: { type: Number, min: 1, max: 10, default: 2 },
    status: {
      type: String,
      enum: ["pending_approval", "live", "sold", "deactivated", "rejected"],
      default: "pending_approval",
      index: true,
    },
    approvalComment: { type: String, default: "" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

noteSchema.index({ campus: 1, subject: 1, status: 1 });

type NoteDoc = InferSchemaType<typeof noteSchema>;

export const Note: Model<NoteDoc> =
  (mongoose.models.Note as Model<NoteDoc>) || mongoose.model<NoteDoc>("Note", noteSchema);

import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const eventSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    campus: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 4000 },
    bannerImageId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
    galleryImageIds: { type: [Schema.Types.ObjectId], ref: "MediaAsset", default: [] },
    eventDate: { type: Date, required: true, index: true },
    eventTime: { type: String, required: true },
    branch: { type: [String], default: [] },
    course: { type: [String], default: [] },
    years: { type: [String], default: [] },
    isFree: { type: Boolean, default: false },
    ticketPrice: { type: Number, min: 0, default: 0 },
    ticketLimit: { type: Number, min: 0, default: 0 },
    registrationQuestions: { type: [String], default: ["Name", "Branch", "Year", "Roll Number"] },
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

eventSchema.index({ campus: 1, eventDate: 1, status: 1 });

type EventDoc = InferSchemaType<typeof eventSchema>;

export const Event: Model<EventDoc> =
  (mongoose.models.Event as Model<EventDoc>) || mongoose.model<EventDoc>("Event", eventSchema);

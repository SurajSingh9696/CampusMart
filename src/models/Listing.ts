import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const listingSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    campus: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["product", "project", "notes", "event"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    tags: { type: [String], default: [] },
    mediaUrls: { type: [String], default: [] },
    previewUrls: { type: [String], default: [] },
    resourceUrl: { type: String, default: "" },
    price: { type: Number, min: 0, default: 0 },
    isFree: { type: Boolean, default: false },
    isAuction: { type: Boolean, default: false },
    auctionStartPrice: { type: Number, min: 0, default: 0 },
    auctionEndAt: { type: Date },
    quantity: { type: Number, min: 0, default: 1 },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "live", "sold", "deactivated", "rejected"],
      default: "pending_approval",
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvalComment: { type: String, default: "" },
    deactivatedAt: { type: Date },
    soldToCustomerId: { type: Schema.Types.ObjectId, ref: "User" },
    eventConfig: {
      branch: { type: [String], default: [] },
      course: { type: [String], default: [] },
      years: { type: [String], default: [] },
      // Legacy field kept for backward compatibility with existing data.
      eventDate: { type: Date },
      eventStartAt: { type: Date },
      eventEndAt: { type: Date },
      venue: { type: String, default: "" },
      eventQuestions: { type: [String], default: [] },
      ticketLimit: { type: Number, default: 0 },
    },
    projectConfig: {
      targetYear: { type: String, default: "" },
      branch: { type: String, default: "" },
      semester: { type: String, default: "" },
      zipUrl: { type: String, default: "" },
      deployedPreviewUrl: { type: String, default: "" },
      oneBuyerOnly: { type: Boolean, default: true },
    },
    notesConfig: {
      subject: { type: String, default: "" },
      year: { type: String, default: "" },
      semester: { type: String, default: "" },
      notesPdfUrl: { type: String, default: "" },
      previewPages: { type: Number, default: 2 },
    },
  },
  { timestamps: true }
);

listingSchema.index({ type: 1, campus: 1, status: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ "eventConfig.eventStartAt": 1 });
listingSchema.index({ title: "text", description: "text", tags: "text" });

type ListingDoc = InferSchemaType<typeof listingSchema>;

export const Listing: Model<ListingDoc> =
  (mongoose.models.Listing as Model<ListingDoc>) || mongoose.model<ListingDoc>("Listing", listingSchema);

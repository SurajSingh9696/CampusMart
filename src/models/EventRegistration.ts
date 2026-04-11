import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const eventRegistrationSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    answers: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

eventRegistrationSchema.index({ listingId: 1, customerId: 1 }, { unique: true });

type EventRegistrationDoc = InferSchemaType<typeof eventRegistrationSchema>;

export const EventRegistration: Model<EventRegistrationDoc> =
  (mongoose.models.EventRegistration as Model<EventRegistrationDoc>) ||
  mongoose.model<EventRegistrationDoc>("EventRegistration", eventRegistrationSchema);

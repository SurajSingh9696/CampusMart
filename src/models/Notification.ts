import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, default: "general" },
    isRead: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

type NotificationDoc = InferSchemaType<typeof notificationSchema>;

export const Notification: Model<NotificationDoc> =
  (mongoose.models.Notification as Model<NotificationDoc>) ||
  mongoose.model<NotificationDoc>("Notification", notificationSchema);

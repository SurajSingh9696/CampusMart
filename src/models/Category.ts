import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: ["product", "notes", "event", "project", "global"],
      default: "global",
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

type CategoryDoc = InferSchemaType<typeof categorySchema>;

export const Category: Model<CategoryDoc> =
  (mongoose.models.Category as Model<CategoryDoc>) ||
  mongoose.model<CategoryDoc>("Category", categorySchema);

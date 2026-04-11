import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const selectionSchema = new Schema(
  {
    key: {
      type: String,
      enum: ["campus", "branch", "course", "year", "category"],
      required: true,
      unique: true,
    },
    values: { type: [String], default: [] },
  },
  { timestamps: true }
);

type SelectionDoc = InferSchemaType<typeof selectionSchema>;

export const Selection: Model<SelectionDoc> =
  (mongoose.models.Selection as Model<SelectionDoc>) || mongoose.model<SelectionDoc>("Selection", selectionSchema);

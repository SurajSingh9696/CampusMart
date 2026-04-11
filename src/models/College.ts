import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const collegeSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    shortCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    logo: { type: String, default: "" },
    location: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

type CollegeDoc = InferSchemaType<typeof collegeSchema>;

export const College: Model<CollegeDoc> =
  (mongoose.models.College as Model<CollegeDoc>) ||
  mongoose.model<CollegeDoc>("College", collegeSchema);

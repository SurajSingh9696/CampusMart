import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const pageContentSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    blocks: { type: Schema.Types.Mixed, default: {} },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

type PageContentDoc = InferSchemaType<typeof pageContentSchema>;

export const PageContent: Model<PageContentDoc> =
  (mongoose.models.PageContent as Model<PageContentDoc>) ||
  mongoose.model<PageContentDoc>("PageContent", pageContentSchema);

import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const auctionBidSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    bidderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

auctionBidSchema.index({ listingId: 1, amount: -1 });

type AuctionBidDoc = InferSchemaType<typeof auctionBidSchema>;

export const AuctionBid: Model<AuctionBidDoc> =
  (mongoose.models.AuctionBid as Model<AuctionBidDoc>) ||
  mongoose.model<AuctionBidDoc>("AuctionBid", auctionBidSchema);

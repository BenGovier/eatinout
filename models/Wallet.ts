import mongoose, { Schema, Document } from "mongoose";
import { number } from "zod";

const WalletSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
    },
    offerStatus: {
      type: String,
      required: true,
    },
    redeemCode: {
      type: String,
    },
    offerRestaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    redeemStatus: {
      type: Boolean,
      default: false,
    },
    redeemCodeExpiry: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Add a unique composite index on `userId` and `offerId`

export const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

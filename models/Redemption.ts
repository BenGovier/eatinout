import mongoose, { Schema, type Document } from "mongoose"

export interface IRedemption extends Document {
  userId: mongoose.Types.ObjectId
  offerId: mongoose.Types.ObjectId
  restaurantId: mongoose.Types.ObjectId
  code: string
  redeemed: boolean
  redeemedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const RedemptionSchema: Schema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    code: { type: String, required: true, unique: true },
    redeemed: { type: Boolean, default: false },
    redeemedAt: { type: Date },
  },
  { timestamps: true },
)

export default mongoose.models.Redemption || mongoose.model<IRedemption>("Redemption", RedemptionSchema)


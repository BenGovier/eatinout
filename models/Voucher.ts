import mongoose, { Schema, type Document } from "mongoose";

export interface IVoucher extends Document {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number;
  currentUses: number;
  expiryDate?: Date | null;      // Legacy expiry date
  validityDays?: number | null;  // New validity (in days)
  isActive: boolean;
  description: string;
  stripeCouponId: string;
  stripePromotionCodeId: string;
  /** Stripe Coupon `name` (Checkout label); empty/null means same as `code` */
  stripeCouponName?: string | null;
  /** Stripe coupon duration: once | repeating | forever */
  duration?: "once" | "repeating" | "forever";
  /** Required when duration is repeating (Stripe duration_in_months) */
  durationInMonths?: number | null;
  calculatedPercentOff: number;
  createdAt: Date;
  updatedAt: Date;

  resolvedExpiry?: Date | null;  // <-- Virtual field
}

const VoucherSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxUses: {
      type: Number,
      required: true,
      default: 1,
    },
    currentUses: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    validityDays: {
      type: Number,
      default: null,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: "",
    },
    stripeCouponId: {
      type: String,
      default: null,
    },
    stripePromotionCodeId: {
      type: String,
      default: null,
    },
    stripeCouponName: {
      type: String,
      default: null,
      trim: true,
    },
    duration: {
      type: String,
      enum: ["once", "repeating", "forever"],
      default: "once",
    },
    durationInMonths: {
      type: Number,
      default: null,
    },
    calculatedPercentOff: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Virtual field: resolvedExpiry
VoucherSchema.virtual("resolvedExpiry").get(function (this: IVoucher) {
  if (this.expiryDate) return this.expiryDate; // legacy
  if (this.validityDays && this.createdAt) {
    return new Date(this.createdAt.getTime() + this.validityDays * 24 * 60 * 60 * 1000);
  }
  return null;
});

// Ensure virtuals are included when converting to JSON / Object
VoucherSchema.set("toJSON", { virtuals: true });
VoucherSchema.set("toObject", { virtuals: true });

export default mongoose.models.Voucher ||
  mongoose.model<IVoucher>("Voucher", VoucherSchema);

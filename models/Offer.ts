import mongoose, { Schema, type Document } from "mongoose";

export interface IOffer extends Document {
  restaurantId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  validDays: string;
  validHours: string;
  startDate: Date;
  expiryDate?: Date;
  terms: string;
  status: "active" | "inactive" | "expired" | "pending" | "rejected";
  dineIn: boolean;
  dineOut: boolean;
  areas: string[];
  tags?: string[];
  discountPercentage?: number | null;
  createdAt: Date;
  updatedAt: Date;
  offerType: string;
  freeItemName?: string | null;
  otherOfferDescription?: string | null;
  offerLimit: "flash" | "scheduled" | "scheduled_no_limit";
  associatedId: string;
  deactivated: boolean;
  redeemCount: number;
  maxRedemptionLimit?: number;
  isUnlimited?: boolean;
  runUntilFurther: boolean;
  bookingRequirement: "mandatory" | "recommended" | "notNeeded";
  usageLimit?: number;
  isPinned: boolean;
  pinnedAt: Date | null;
  recurringType?: "weekly" | "monthly" | "never" | null;
  recurringStartDate?: Date | null;
  currentPeriodCount?: number;
  lastResetDate?: Date | null;
}

const OfferSchema: Schema = new Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    validDays: { type: String, required: true },
    validHours: { type: String, required: true },
    startDate: { type: Date, required: true },

    expiryDate: { type: Date },

    terms: { type: String },

    status: {
      type: String,
      enum: ["active", "inactive", "expired", "pending", "rejected"],
      default: "pending",
    },

    dineIn: { type: Boolean, default: true },
    dineOut: { type: Boolean, default: false },

    areas: { type: [String], default: [] },
    tags: { type: [String], default: [] },

    discountPercentage: { type: Number, default: null },
    freeItemName: { type: String, default: null },
    otherOfferDescription: { type: String, default: null },

    offerType: { type: String, required: true },
    offerLimit: {
      type: String,
      enum: ["flash", "scheduled", "scheduled_no_limit"],
    },

    associatedId: { type: String },

    redeemCount: { type: Number, default: 0 },
    maxRedemptionLimit: { type: Number, default: null },
    isUnlimited: { type: Boolean, default: false },

    deactivated: { type: Boolean, default: false },
    runUntilFurther: { type: Boolean, default: false },

    bookingRequirement: {
      type: String,
      enum: ["mandatory", "recommended", "notNeeded"],
      default: "mandatory",
    },

    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },

    recurringType: {
      type: String,
      enum: ["weekly", "monthly", "never", null],
      default: null,
    },
    recurringStartDate: { type: Date, default: null },
    currentPeriodCount: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: null },
  },
  { timestamps: true }
);

OfferSchema.index({ restaurantId: 1 });
OfferSchema.index({ tags: 1 });
OfferSchema.index({ status: 1 });
OfferSchema.index({ startDate: 1 });
OfferSchema.index({ status: 1, startDate: 1 });
OfferSchema.index({ tags: 1, restaurantId: 1 });

export default mongoose.models.Offer ||
  mongoose.model<IOffer>("Offer", OfferSchema);
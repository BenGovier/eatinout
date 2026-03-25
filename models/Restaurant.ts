import mongoose, { Schema, type Document } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  description: string;
  address: string;
  city: string;
  zipCode: string;
  lat?: number;
  lng?: number;
  area: string[];
  phone: string;
  email: string;
  website?: string;
  userId: mongoose.Types.ObjectId;
  images: string[];
  status: "pending" | "approved" | "rejected";
  dineIn: boolean;
  dineOut: boolean;
  deliveryAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: mongoose.Types.ObjectId[];
  associatedId: string;
  addressLink?: string;
  menuPdfUrls: [{ type: String }];
  hidden: boolean;

  subscriptionStatus?: "active" | "inactive" | "cancelled";
  subscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;

  homePin?: {
    isPinned: boolean;
    priority: number | null;
    pinnedAt: Date | null;
  };

  areaPins?: Array<{
    areaId: string;
    isPinned: boolean;
    priority: number | null;
    areaPinnedAt: Date | null;
  }>;

  searchTags: mongoose.Types.ObjectId[];
}

const RestaurantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },

    lat: { type: Number },
    lng: { type: Number },

    area: { type: mongoose.Schema.Types.Array, ref: "Area" },

    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    images: [{ type: String }],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    dineIn: { type: Boolean, default: true },
    dineOut: { type: Boolean, default: false },
    deliveryAvailable: { type: Boolean, default: false },

    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categories",
      },
    ],

    associatedId: { type: String, default: "" },
    addressLink: { type: String },

    menuPdfUrls: [{ type: String }],

    hidden: { type: Boolean, default: false },

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "cancelled"],
      default: "inactive",
    },

    subscriptionId: { type: String },
    stripeCustomerId: { type: String },
    stripePriceId: { type: String },

    homePin: {
      isPinned: { type: Boolean, default: false },
      priority: { type: Number, default: null },
      pinnedAt: { type: Date, default: null },
    },

    areaPins: [
      {
        areaId: { type: String, required: true },
        isPinned: { type: Boolean, default: true },
        priority: { type: Number, default: null },
        areaPinnedAt: { type: Date, default: null },
      },
    ],

    searchTags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
  },
  { timestamps: true }
);

RestaurantSchema.index({ userId: 1 });
RestaurantSchema.index({ status: 1 });
RestaurantSchema.index({ hidden: 1 });
RestaurantSchema.index({ _id: 1, hidden: 1 });
RestaurantSchema.index({ name: 1 });
RestaurantSchema.index({ city: 1 });
RestaurantSchema.index({ searchTags: 1 });

export default mongoose.models.Restaurant ||
  mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);
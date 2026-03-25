import mongoose, { Schema, type Document } from "mongoose";

export interface ICarousel extends Document {
  name: string;
  isGlobal: boolean;
  areaIds: string[];
  areaOrders: Array<{
    areaId: string;
    order: number;
  }>;
  globalOrder: number;
  restaurants: Array<{
    restaurantId: string;
    order: number;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CarouselSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isGlobal: {
      type: Boolean,
      default: true,
    },
    areaIds: [
      {
        type: String,
        ref: "Area",
      },
    ],
    areaOrders: [
      {
        areaId: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          required: true,
          default: 1,
        },
      },
    ],
    globalOrder: {
      type: Number,
      default: 1,
    },
    restaurants: [
      {
        restaurantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Restaurant",
          required: true,
        },
        order: {
          type: Number,
          required: true,
          default: 1,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

CarouselSchema.index({ isGlobal: 1, isActive: 1 });
CarouselSchema.index({ areaIds: 1, isActive: 1 });
CarouselSchema.index({ globalOrder: 1 });
CarouselSchema.index({ "restaurants.restaurantId": 1 });
CarouselSchema.index({ "areaOrders.areaId": 1 });

export default mongoose.models.Carousel ||
  mongoose.model<ICarousel>("Carousel", CarouselSchema);
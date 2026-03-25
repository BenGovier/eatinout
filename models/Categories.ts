import mongoose, { Schema, type Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  isActive: boolean;
  image?: string;
  priority?: number; // Lower value = higher position (displayed first)
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      required: false,
    },
    priority: {
      type: Number,
      required: false,
      default: 999, // Default to high number (low priority) so new categories appear last
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Category =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);

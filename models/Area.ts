import mongoose, { Schema, type Document } from "mongoose"

export interface IArea extends Document {
  name: string
  isActive: boolean
  hideRestaurant: boolean
  createdAt: Date
  updatedAt: Date
}

const AreaSchema: Schema = new Schema(
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
    hideRestaurant: {
      type: Boolean,
      default: false,
    }

  },
  { timestamps: true },
)

export default mongoose.models.Area || mongoose.model<IArea>("Area", AreaSchema)


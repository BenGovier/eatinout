import mongoose, { Schema } from "mongoose";

const TagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
TagSchema.index({ name: 1 });
TagSchema.index({ name: "text" }); 
TagSchema.index({ createdAt: -1 });
TagSchema.index({ isActive: 1 });
TagSchema.index({ isActive: 1, name: 1 });

export default mongoose.models.Tag || mongoose.model("Tag", TagSchema);
import mongoose, { Schema, type Document } from "mongoose";

export interface ILead extends Document {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  converted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    mobile: { type: String, default: null },
    converted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1 });
LeadSchema.index({ converted: 1 });

export default mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

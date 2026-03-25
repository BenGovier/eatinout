// /models/otp.ts (Mongoose schema example)
import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
  // phone: { type: String, required: true, unique: true },
    phone: { type: String, sparse: true }, 
  email: { type: String, sparse: true },
  otp: { type: String, required: true },
  expiry: { type: Number, required: true },
}, {
  timestamps: true,
});

export const Otp = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);

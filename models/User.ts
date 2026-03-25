import mongoose, { Schema, type Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "user" | "restaurant" | "admin";
  subscriptionStatus?: "active" | "inactive" | "cancelled" | "cancelled_with_access";
  subscriptionId?: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  mobile?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasSubscribedBefore: boolean;
  selectedPriceId?: string;
  stripePriceId?: string;
  rewardfulReferral?: string;
  zipCode: string;
  deleted: boolean;
  deletedAt?: Date;
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    stripeCustomerId: { type: String },

    role: {
      type: String,
      enum: ["user", "restaurant", "admin"],
      default: "user",
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "cancelled", "cancelled_with_access"],
      default: "inactive",
    },

    subscriptionId: { type: String },

    resetToken: { type: String },
    resetTokenExpires: { type: Date },

    mobile: { type: String, default: null },
    hasSubscribedBefore: { type: Boolean, default: false },
    selectedPriceId: { type: String },
    stripePriceId: { type: String },

    rewardfulReferral: { type: String },

    zipCode: { type: String, required: true },

    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
      },
    ],
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ subscriptionStatus: 1 });
UserSchema.index({ deleted: 1 });
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: false },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  location: { type: String, default: "" },
  bio: { type: String, default: "" },
  bloodType: { type: String, default: "" },
  donations: { type: Number, default: 0 },
  profileImage: { type: String, default: "" },
  isAvailable: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  verificationCode: { type: String, default: "" },
  verificationCodeExpires: { type: Date, default: null },
  isBlocked: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

UserSchema.index({ location: 1 });
UserSchema.index({ bloodType: 1 });

export const User = mongoose.model("User", UserSchema);

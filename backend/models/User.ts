import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: { type: String, default: "" },
  phone: { type: String, default: "" },
  bio: { type: String, default: "" },
  bloodType: { type: String, default: "" },
  donations: { type: Number, default: 0 },
  profileImage: { type: String, default: "" },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

UserSchema.index({ location: 1 });
UserSchema.index({ bloodType: 1 });

export const User = mongoose.model("User", UserSchema);

import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema({
  donorEmail: { type: String, required: true },
  bloodType: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

InventorySchema.index({ status: 1 });
InventorySchema.index({ bloodType: 1 });

export const Inventory = mongoose.model("Inventory", InventorySchema);

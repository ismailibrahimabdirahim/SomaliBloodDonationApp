import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  description: { type: String, required: true },
  adminEmail: { type: String, required: true },
  targetType: { type: String, enum: ['request', 'user', 'donor'], required: true },
  targetId: { type: String, required: true },
  targetName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

ActivityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);

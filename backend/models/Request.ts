import mongoose from "mongoose";

const RequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  urgency: { type: String, required: true },
  description: { type: String, default: '' },
  creatorEmail: { type: String, required: true },
  contactEmail: { type: String, required: true },
  proofImage: { type: String, required: true },
  patientName: { type: String, required: true },
  hospitalName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  donors: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

RequestSchema.index({ createdAt: -1 });
RequestSchema.index({ location: 1 });
RequestSchema.index({ type: 1 });
RequestSchema.index({ status: 1 });
RequestSchema.index({ creatorEmail: 1 });

export const Request = mongoose.model("Request", RequestSchema);

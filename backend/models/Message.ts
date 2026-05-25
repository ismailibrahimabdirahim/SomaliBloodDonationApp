import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  text: { type: String, default: "" },
  sender: { type: String, required: true },
  recipient: { type: String, required: true },
  time: { type: Date, default: Date.now },
  status: { type: String, default: "sent" },
  isEdited: { type: Boolean, default: false },
  type: { type: String, default: "text" },
  attachment: { type: String, default: "" },
  duration: { type: Number, default: 0 },
  deletedFor: { type: [String], default: [] }
});

MessageSchema.index({ sender: 1 });
MessageSchema.index({ recipient: 1 });
MessageSchema.index({ time: -1 });

export const Message = mongoose.model("Message", MessageSchema);

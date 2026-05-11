import mongoose from "mongoose";

const linkSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clicks: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Index for fast query
linkSchema.index({ createdAt: -1 });
linkSchema.index({ userId: 1, createdAt: -1 });
linkSchema.index({ shortCode: 1 });

export default mongoose.model("Link", linkSchema);

const mongoose = require("mongoose");

const emailVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EmailVerification", emailVerificationSchema);

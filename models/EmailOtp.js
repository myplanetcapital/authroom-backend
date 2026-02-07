const mongoose = require("mongoose");

const EmailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    otpHash: {
      type: String,
      required: true
    },

    attempts: {
      type: Number,
      default: 0
    },

    expiresAt: {
      type: Date,
      required: true
    },

    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// 🔥 TTL index (auto-delete after expiry)
EmailOtpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// 🚫 Only one active OTP per email
EmailOtpSchema.index(
  { email: 1 },
  { unique: true }
);

module.exports = mongoose.model("EmailOtp", EmailOtpSchema,"EmailOtp");

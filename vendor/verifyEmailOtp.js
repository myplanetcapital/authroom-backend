const bcrypt = require("bcrypt");
const EmailOtp = require("../models/EmailOtp");

async function verifyEmailOtp(email, otp) {
  email = email.toLowerCase().trim();

  // 1️⃣ Find OTP record
  const record = await EmailOtp.findOne({ email });

  if (!record) {
    throw new Error("OTP expired or not found");
  }

  // 2️⃣ Check expiry (extra safety)
  if (record.expiresAt < new Date()) {
    await EmailOtp.deleteOne({ _id: record._id });
    throw new Error("OTP expired");
  }

  // 3️⃣ Max attempts check
  if (record.attempts >= 5) {
    await EmailOtp.deleteOne({ _id: record._id });
    throw new Error("Too many invalid attempts. Please resend OTP.");
  }

  // 4️⃣ Verify OTP
  const isValid = await bcrypt.compare(otp, record.otpHash);

  if (!isValid) {
    record.attempts += 1;
    await record.save();
    throw new Error("Invalid OTP");
  }

  // 5️⃣ Success → clean up
  await EmailOtp.deleteOne({ _id: record._id });

  return true;
}

module.exports = verifyEmailOtp;

const bcrypt = require("bcrypt");
const EmailOtp = require("../models/EmailOtp");
const nodemailer = require("nodemailer");

async function sendEmailOtp(email) {
  email = email.toLowerCase().trim();

  // 🔢 Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 🔐 Hash OTP
  const otpHash = await bcrypt.hash(otp, 10);

  // ⏰ Expiry (5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 💾 Save / Replace OTP
  await EmailOtp.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      attempts: 0,
      expiresAt,
      verified: false
    },
    { upsert: true, new: true }
  );

  // ✉️ Nodemailer transport
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true", // true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // 📧 Email template
  const mailOptions = {
    from: `"AUTH ROOM" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Verify Your Email – AUTH ROOM",
    html: `
     <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background:#111827; padding:20px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:22px;">AUTH ROOM</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#333333;">
              <p style="font-size:15px; margin:0 0 16px;">
                Hello <strong>User</strong>,
              </p>

              <p style="font-size:15px; margin:0 0 16px;">
                Thank you for registering with <strong>AUTH ROOM</strong>.
              </p>

              <p style="font-size:15px; margin:0 0 24px;">
                To complete your registration, please verify your email address using the One-Time Password (OTP) below:
              </p>

              <!-- OTP Box -->
              <div style="text-align:center; margin:30px 0;">
                <div style="display:inline-block; padding:14px 28px; background:#f1f5f9; border-radius:6px; letter-spacing:6px; font-size:26px; font-weight:bold; color:#111827;">
                  ${otp}
                </div>
              </div>

              <p style="font-size:14px; margin:0 0 16px;">
                This OTP is valid for <strong>5</strong> minutes.
              </p>

              <p style="font-size:14px; margin:0 0 16px; color:#b91c1c;">
                Please do not share this code with anyone for security reasons.
              </p>

              <p style="font-size:14px; margin:24px 0 0;">
                If you did not create an account with AUTH ROOM, please ignore this email.
              </p>

              <p style="font-size:14px; margin:24px 0 0;">
                Best regards,<br/>
                <strong>AUTH ROOM Security Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#6b7280;">
              <p style="margin:0;">
                Need help? Contact us at
                <a href="mailto:support@authroom.com" style="color:#2563eb; text-decoration:none;">
                  support@authroom.com
                </a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Container -->

      </td>
    </tr>
  </table>

</body>
</html>

    `
  };

  // 🚀 Send email
  await transporter.sendMail(mailOptions);

  return true;
}

module.exports = sendEmailOtp;

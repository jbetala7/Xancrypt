// server/utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:    process.env.SMTP_HOST,
  port:    +process.env.SMTP_PORT,
  secure:  true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationEmail(user, token) {
  const verifyUrl = `${process.env.SERVER_URL}/api/auth/verify-email?token=${token}`;

  // 👇 We log it so you can copy the real JWT‐bearing link
  console.log('🔗 [mailer] verify-url:', verifyUrl);

  const html = `
    <p>Hello ${user.email},</p>
    <p>Please verify your email by clicking below:</p>
    <p><a href="${verifyUrl}">Verify my email</a></p>
    <pre>${verifyUrl}</pre>
  `;

  try {
    const info = await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      user.email,
      subject: "Verify your Xancrypt account",
      html,
    });
    console.log('✉️  Verification email sent:', info.messageId);
  } catch (err) {
    console.error('❌ Error sending verification email:', err);
    throw err;
  }
}

module.exports = { sendVerificationEmail };

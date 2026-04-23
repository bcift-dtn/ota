const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    }
  }
)

const sendVerificationEmail = async (toEmail, token) => {
  const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"OTA Support" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'Verify your account',
    html: `
      <h2>Welcome to OTA!</h2>
      <p>Click the link below to verify your email:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `
  });
};

module.exports = { sendVerificationEmail };
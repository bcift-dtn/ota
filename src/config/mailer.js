const nodemailer = require('nodemailer');

// creating transporter to send email
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

// Oauth2 transporter
const createOAuthTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    },
  });
};

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

// Send message from contact us form 
const sendContactEmail = async ({ name, email, phone, subject, message }) => {
  const useOAuth = !!process.env.GMAIL_USER;
  const mailTransporter = useOAuth ? createOAuthTransporter() : transporter;
  const systemEmailAddress = process.env.GMAIL_USER || process.env.MAIL_USER;

  await mailTransporter.sendMail({
    from: `"${name}" <${systemEmailAddress}>`,
    to: systemEmailAddress,
    replyTo: email,
    subject: `New Inquiry: ${subject} from ${name}`,
    text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\nMessage:\n${message}`
  });
};

module.exports = { 
  sendVerificationEmail,
  sendContactEmail
};
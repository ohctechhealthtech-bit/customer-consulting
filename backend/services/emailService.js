const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

/**
 * Initializes and returns the nodemailer transporter
 */
function getTransporter() {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = env.email;
  
  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    // Required for some SMTP servers
    tls: {
      rejectUnauthorized: env.nodeEnv === 'production',
    },
  });

  return transporter;
}

/**
 * Verifies the SMTP connection
 */
async function verifySMTP() {
  const transport = getTransporter();
  if (!transport) {
    console.error('❌ SMTP configuration is missing or incomplete.');
    return false;
  }

  try {
    await transport.verify();
    console.log('✅ SMTP connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}

/**
 * Generic email sending function
 */
async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();

  if (!transport) {
    const error = new Error('Email service is not configured correctly on the server.');
    console.error(`[Email Error] ${error.message} (Recipient: ${to})`);
    throw error;
  }

  try {
    const info = await transport.sendMail({
      from: env.email.from,
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (error) {
    console.error(`[Email Delivery Failure] To: ${to}, Subject: ${subject}, Error: ${error.message}`);
    throw new Error(`Failed to send email to ${to}. Please try again later.`);
  }
}

/**
 * Sends OTP email
 */
async function sendOtpEmail(to, otpCode) {
  const subject = 'Your WellnessHub verification code';
  const text = `Your verification code is ${otpCode}. It expires in 5 minutes. Do not share this code with anyone.`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">WellnessHub Portal</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #475569;">Hello,</p>
        <p style="font-size: 16px; color: #475569;">Your one-time verification code is:</p>
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a8a;">${otpCode}</span>
        </div>
        <p style="font-size: 14px; color: #64748b;">This code expires in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 WellnessHub. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * Sends Consent Confirmation email
 */
async function sendConsentConfirmationEmail(to, details) {
  const subject = 'Consent Confirmation - WellnessHub';
  const text = `Dear customer, your consent for "${details.consentType}" has been successfully recorded. Reference: ${details.referenceNumber}`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #059669; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Consent Confirmed</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #475569;">Hello,</p>
        <p style="font-size: 16px; color: #475569;">This email confirms that your consent has been successfully recorded:</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #059669;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #065f46;">${details.consentType}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #065f46;">Reference: ${details.referenceNumber}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #065f46;">Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">Thank you for contributing to your wellness journey.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 WellnessHub. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  verifySMTP,
  sendEmail,
  sendOtpEmail,
  sendConsentConfirmationEmail
};

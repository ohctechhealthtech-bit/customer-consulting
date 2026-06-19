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
async function sendOtpEmail(to, otpCode, patientName = null) {
  const greeting = patientName ? `Hello ${patientName},` : 'Hello,';
  const subject = 'Your OHCTECH Verification Code';
  const text = `${greeting} Your verification code is ${otpCode}. It expires in 5 minutes. Do not share this code with anyone.`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">OHCTECH Portal</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #475569;">${greeting}</p>
        <p style="font-size: 16px; color: #475569;">Your one-time verification code is:</p>
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a8a;">${otpCode}</span>
        </div>
        <p style="font-size: 14px; color: #64748b;">This code expires in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 OHCTECH. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * Sends Consent Confirmation email
 */
async function sendConsentConfirmationEmail(to, details) {
  const { customerName, referenceNumber, consentStatus } = details;
  const greeting = customerName ? `Hello ${customerName},` : 'Hello,';
  const subject = `Confirmation: Your Response (${referenceNumber})`;
  
  const statusLabel = consentStatus === 'allow' ? 'Allowed' : 'Declined';
  const statusColor = consentStatus === 'allow' ? '#10b981' : '#f59e0b';

  const text = `${greeting}\n\nThank you for submitting your response. Your preferences have been recorded.\n\nReference Number: ${referenceNumber}\nConsent Status: ${statusLabel}\n\nRegards,\nOHCTECH`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Response Confirmation</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #475569; margin: 0;">${greeting}</p>
        <p style="font-size: 16px; color: #475569; margin: 20px 0;">Thank you for submitting your response. We have successfully recorded your preferences.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Reference Number</span>
            <div style="font-size: 16px; font-weight: bold; color: #1e3a8a; font-family: monospace; margin-top: 4px;">${referenceNumber}</div>
          </div>
          <div>
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Consent Status</span>
            <div style="margin-top: 4px;">
              <span style="display: inline-block; background-color: ${statusColor}15; color: ${statusColor}; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 600;">
                ${statusLabel}
              </span>
            </div>
          </div>
        </div>
        
        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">Regards,<br /><strong>OHCTECH Support</strong></p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 OHCTECH. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * Sends Account Creation email
 */
async function sendAccountCreationEmail(to, details) {
  const { customerName, temporaryPassword } = details;
  const greeting = customerName ? `Hello ${customerName},` : 'Hello,';
  const subject = 'Welcome to OHCTECH — Your Account Details';
  const loginUrl = env.portalUrl;

  const text = `${greeting}\n\nYour account has been successfully created. You can now log in using your email and the temporary password provided below.\n\nEmail: ${to}\nTemporary Password: ${temporaryPassword}\n\nLogin here: ${loginUrl}\n\nRegards,\nOHCTECH Support`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Welcome to OHCTECH</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #475569; margin: 0;">${greeting}</p>
        <p style="font-size: 16px; color: #475569; margin: 20px 0;">Your account has been successfully created. Use the credentials below to log in and access your portal.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Email Address</span>
            <div style="font-size: 16px; font-weight: bold; color: #1e3a8a; margin-top: 4px;">${to}</div>
          </div>
          <div>
            <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Temporary Password</span>
            <div style="font-size: 18px; font-weight: bold; color: #b91c1c; font-family: monospace; margin-top: 4px; letter-spacing: 1px;">${temporaryPassword}</div>
          </div>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Log In to Portal</a>
        </div>
        
        <p style="font-size: 14px; color: #64748b; margin: 0;">For security reasons, you will be asked to change this password upon your first login.</p>
        
        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">Regards,<br /><strong>OHCTECH Support</strong></p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 OHCTECH. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  verifySMTP,
  sendEmail,
  sendOtpEmail,
  sendConsentConfirmationEmail,
  sendAccountCreationEmail
};

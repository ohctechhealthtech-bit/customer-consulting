require('dotenv').config({ override: true });

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set in environment variables.`);
  }
}

module.exports = {
  port: parseInt(process.env.API_PORT || process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:8080,http://localhost:5173,http://localhost:8081').split(',').map((s) => s.trim()),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'consentify_hub',
  },
  portalUrl: process.env.FRONTEND_URL || process.env.PORTAL_URL || 'http://localhost:8081',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  email: {
    host: process.env.SMTP_HOST || 'mail.ohctech.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },
  adminApiKey: process.env.ADMIN_API_KEY || '',
  otp: {
    length: 6,
    expiryMinutes: 5,
    maxAttempts: 3,
  },
};

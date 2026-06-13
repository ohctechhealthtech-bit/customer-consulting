require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const pool = require('./config/database');
const { globalLimiter } = require('./middleware/rateLimiter');
const { attachClientContext } = require('./middleware/auditContext');
const { error } = require('./utils/apiResponse');

const authRoutes = require('./routes/authRoutes');
const questionnaireRoutes = require('./routes/questionnaireRoutes');
const consentRoutes = require('./routes/consentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);
app.use(attachClientContext);
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: env.nodeEnv === 'development' ? err.message : undefined,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', questionnaireRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  error(res, 'Route not found', 404);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  error(res, env.nodeEnv === 'development' ? err.message : 'Internal server error', 500);
});

const { verifySMTP } = require('./services/emailService');

const PORT = env.port;

app.listen(PORT, async () => {
  console.log(`Consentify Hub API running on port ${PORT} (${env.nodeEnv})`);
  // Verify SMTP connection on startup
  await verifySMTP();
});

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./models/schema');
const { initScheduler } = require('./services/scheduler');
const { initFirebase } = require('./config/firebase');

// Routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const groupRoutes = require('./routes/groups');
const templateRoutes = require('./routes/templates');
const sendRoutes = require('./routes/send');
const historyRoutes = require('./routes/history');
const scheduleRoutes = require('./routes/schedule');
const trackRoutes = require('./routes/track');
const draftRoutes = require('./routes/drafts');
const uploadRoutes = require('./routes/upload');
const trackingController = require('./controllers/trackingController');

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Disable Express fingerprinting header
app.disable('x-powered-by');

// Security: Standard HTTP protection headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Enable CORS (supports comma-separated origins, wildcards, and local dev)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BulkMailer API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/firebase-status', (req, res) => {
  const firebaseStatus = initFirebase();
  res.json({
    success: true,
    isFirebaseConfigured: firebaseStatus.isConfigured,
    message: firebaseStatus.isConfigured
      ? 'Firebase Admin SDK is connected and active.'
      : 'Firebase credentials not yet detected. Add serviceAccountKey.json to backend/ or configure FIREBASE_* environment variables.'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/send', sendRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/upload', uploadRoutes);

// Public unsubscribe routes (accessible from email links)
app.get('/unsubscribe/:token', trackingController.handleUnsubscribe);
app.get('/api/unsubscribe/:token', trackingController.handleUnsubscribe);

// Serve frontend static build if present (enables single-service full-stack deployment)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/unsubscribe')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Error handler middleware (sanitizes error output in responses)
app.use((err, req, res, next) => {
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  if (status >= 500) {
    console.error('Unhandled Server Error:', err);
  }
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    success: false,
    error: (isProd && status >= 500) ? 'An unexpected server error occurred.' : (err.message || 'Internal server error')
  });
});

const startServer = async () => {
  try {
    await initSchema();
    initScheduler();
    initFirebase();

    const server = app.listen(PORT, () => {
      console.log(` BulkMailer backend server running on http://localhost:${PORT}`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

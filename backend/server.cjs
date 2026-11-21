const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map((value) => value.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));
app.use(express.json({ limit: '16kb', strict: true }));

const authWindows = new Map();
function authRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = authWindows.get(key);
  if (!current || current.resetAt <= now) {
    authWindows.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return next();
  }
  if (current.count >= 10) {
    res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ message: 'Too many authentication attempts. Try again later.' });
  }
  current.count += 1;
  return next();
}
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of authWindows) if (value.resetAt <= now) authWindows.delete(key);
}, 60 * 1000);
cleanup.unref();

app.get('/', (_req, res) => res.json({ name: 'Trello Clone API', status: 'ok' }));
app.get('/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({ status: ready ? 'healthy' : 'unavailable', database: ready ? 'connected' : 'disconnected' });
});

app.use('/api/auth', authRateLimit, require('./routes/auth'));
app.use('/api/kanban', require('./routes/kanban'));

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  if (error.message === 'Origin is not allowed by CORS.') return res.status(403).json({ message: 'Origin is not allowed.' });
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ message: 'Invalid JSON request body.' });
  if (error.status === 413) return res.status(413).json({ message: 'Request body is too large.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid request data.' });
  if (error.code === 11000) return res.status(409).json({ message: 'A record with those details already exists.' });
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error('API error:', error.message);
  return res.status(status).json({ message: status === 500 ? 'An unexpected server error occurred.' : error.message });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required; the API will not start without persistent storage.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  if (!process.env.OTP_SECRET || process.env.OTP_SECRET.length < 32) throw new Error('OTP_SECRET must contain at least 32 characters.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const httpServer = app.listen(port, '0.0.0.0', () => console.log('Trello API listening on port ' + port));
  const shutdown = async () => {
    httpServer.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((error) => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});

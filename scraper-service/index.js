const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.SCRAPER_PORT || 3001;

// Base path for subpath deployment (e.g. /gov-tender-editor)
// Empty string = serve at root (local dev)
const BASE = (process.env.APP_BASE_PATH || '').replace(/\/$/, '');

app.use(cors());
app.use(express.json());

// Rate limiting — max 20 requests per 15 min per IP
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי בקשות — נסה שוב בעוד מספר דקות' },
});

// API Routes
app.use(`${BASE}/search`, searchLimiter, require('./routes/search'));
app.use(`${BASE}/analyze`, require('./routes/analyze'));
app.use(`${BASE}/insights`, require('./routes/insights'));

// Health check
app.get(`${BASE}/health`, (req, res) => {
  res.json({ status: 'ok', service: 'gov-scraper', port: PORT, base: BASE || '/' });
});

// Serve React frontend (production build)
const distPath = path.join(__dirname, '../dist');

if (BASE) {
  // Subpath mode: serve static at /gov-tender-editor/
  app.use(BASE, express.static(distPath));

  // SPA fallback for all subpath routes
  app.get(`${BASE}/*`, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Exact match without trailing slash → redirect to /gov-tender-editor/
  app.get(BASE, (req, res) => {
    res.redirect(301, `${BASE}/`);
  });

  // Redirect root to app
  app.get('/', (req, res) => {
    res.redirect(301, `${BASE}/`);
  });
} else {
  // Root mode: serve static at /
  app.use(express.static(distPath));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[scraper-service] Running on http://localhost:${PORT}${BASE || '/'}`);
});

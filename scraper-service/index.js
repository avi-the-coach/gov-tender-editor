const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.SCRAPER_PORT || 3001;

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
app.use('/search', searchLimiter, require('./routes/search'));
app.use('/analyze', require('./routes/analyze'));
app.use('/insights', require('./routes/insights'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gov-scraper', port: PORT });
});

// Serve React frontend (production build)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback — any unmatched route serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[scraper-service] Running on http://localhost:${PORT}`);
});

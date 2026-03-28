const express = require('express');
const router = express.Router();
const { searchTenders, getTenderDetails } = require('../lib/gov-scraper');
const { extractMultiplePdfs } = require('../lib/pdf-parser');
const { analyzeInsights } = require('../lib/ai-analyzer');

router.post('/', async (req, res) => {
  const { topic, sample_size = 5 } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  try {
    // 1. Search for tenders
    const tenders = await searchTenders(topic, Math.min(sample_size * 2, 20));
    if (tenders.length === 0) {
      return res.json({ topic, tenders_analyzed: 0, common_requirements: [], recommendations: [], red_flags: [] });
    }

    // 2. Get PDF texts from top results
    const allTexts = [];
    for (const tender of tenders.slice(0, sample_size)) {
      try {
        const details = await getTenderDetails(tender.id);
        const texts = await extractMultiplePdfs(details.pdfUrls, 2);
        allTexts.push(...texts);
      } catch {
        // Skip failed tenders
      }
    }

    // 3. Analyze with Gemini
    if (allTexts.length === 0) {
      return res.json({ topic, tenders_analyzed: 0, common_requirements: [], recommendations: ['לא נמצאו מסמכים לניתוח'], red_flags: [] });
    }

    const insights = await analyzeInsights(topic, allTexts);
    res.json({ topic, tenders_analyzed: allTexts.length, ...insights });
  } catch (err) {
    console.error('[insights]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

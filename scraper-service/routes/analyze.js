const express = require('express');
const router = express.Router();
const { getTenderDetails } = require('../lib/gov-scraper');
const { extractMultiplePdfs } = require('../lib/pdf-parser');
const { analyzeInsights } = require('../lib/ai-analyzer');

router.post('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const details = await getTenderDetails(id);
    const texts = await extractMultiplePdfs(details.pdfUrls, 3);
    let analysis = {};
    if (texts.length > 0) {
      analysis = await analyzeInsights(details.title, texts);
    }
    res.json({ ...details, ...analysis, texts_extracted: texts.length });
  } catch (err) {
    console.error('[analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

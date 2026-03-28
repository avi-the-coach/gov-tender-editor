const express = require('express');
const router = express.Router();
const { searchTenders, getTenderDetails } = require('../lib/gov-scraper');
const { analyzeRelevance } = require('../lib/ai-analyzer');

// Minimum relevance score to include a tender in results (1-5)
const RELEVANCE_THRESHOLD = 3;

router.post('/', async (req, res) => {
  const { topic, limit = 10 } = req.body;
  // API key can be passed in body or as Authorization header
  const apiKey = req.body.apiKey || (req.headers.authorization || '').replace('Bearer ', '');

  if (!topic) return res.status(400).json({ error: 'topic is required' });

  // Validate apiKey format if provided (Google API keys start with "AIza")
  if (apiKey && (!/^AIza[\w-]{35,}$/.test(apiKey))) {
    return res.status(400).json({ error: 'apiKey לא תקין' });
  }

  try {
    // Fetch more candidates than needed so we have enough after filtering
    const fetchLimit = apiKey ? Math.min(limit * 2, 30) : Math.min(limit, 30);
    const results = await searchTenders(topic, fetchLimit);

    // Enrich each result with subjects + docInfos by fetching detail pages in parallel.
    const enriched = await Promise.allSettled(
      results.map(async (tender) => {
        try {
          const details = await getTenderDetails(tender.id);
          return {
            ...tender,
            publisher: details.publisher || tender.ministry,
            // Clean up subjects: trim whitespace/newlines
            subjects: (details.subjects || []).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
            docInfos: details.docInfos || [],
          };
        } catch {
          // Detail fetch failed — return tender as-is
          return { ...tender, publisher: tender.ministry, subjects: [], docInfos: [] };
        }
      })
    );

    let final = enriched.map(r => r.status === 'fulfilled' ? r.value : r.reason);

    // If an API key was provided, run Gemini relevance analysis
    if (apiKey && final.length > 0) {
      try {
        console.log(`[search] Running relevance analysis for "${topic}" on ${final.length} tenders...`);
        const relevanceResults = await analyzeRelevance(topic, final, apiKey);

        // Build a lookup map: id → { relevanceScore, reasoning }
        const relevanceMap = new Map(
          relevanceResults.map(r => [String(r.id), r])
        );

        // Merge relevance data into tenders, filter by threshold, sort by score
        final = final
          .map(tender => {
            const rel = relevanceMap.get(String(tender.id));
            return {
              ...tender,
              relevanceScore: rel?.relevanceScore ?? 3,
              reasoning: rel?.reasoning ?? null,
            };
          })
          .filter(t => t.relevanceScore >= RELEVANCE_THRESHOLD)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, limit);

        console.log(`[search] After filtering: ${final.length} relevant tenders (threshold=${RELEVANCE_THRESHOLD})`);
      } catch (err) {
        // Relevance analysis failed — return unfiltered results gracefully
        const isQuotaError = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));
        console.warn(`[search] Relevance analysis failed (${isQuotaError ? 'quota/rate-limit' : 'other'}), returning unfiltered:`, err.message?.substring(0, 200));
        // Mark tenders as unscored so the UI can show an appropriate indicator
        final = final.map(t => ({ ...t, _analysisSkipped: isQuotaError ? 'quota' : 'error' }));
      }
    }

    res.json(final);
  } catch (err) {
    console.error('[search]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

import { TenderResult, InsightsResult, ResearchCard } from '../types';

const SCRAPER_BASE = ''; // Same origin — Express serves both API and frontend

export async function searchTenders(
  topic: string,
  limit = 10,
  onCard?: (card: ResearchCard) => void
): Promise<TenderResult[]> {
  const apiKey = localStorage.getItem('gemini-api-key') || '';

  const res = await fetch(`${SCRAPER_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, limit, apiKey }),
  });

  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const results: TenderResult[] = await res.json();

  // Stream each tender as a ResearchCard
  for (const t of results) {
    // Build a meaningful snippet: subjects first, then publisher
    let snippet = '';
    if (t.subjects && t.subjects.length > 0) {
      snippet = `נושאים: ${t.subjects.join(', ')}`;
    }
    if (t.publisher && t.publisher.length > 3) {
      snippet = snippet ? `${snippet} | ${t.publisher}` : t.publisher;
    } else if (t.ministry && t.ministry !== 'לא צוין') {
      snippet = snippet ? `${snippet} | ${t.ministry}` : t.ministry;
    }

    onCard?.({
      id: `tender-${t.id}`,
      type: 'tender',
      title: t.title,
      url: t.url,
      snippet: snippet || t.title,
      ministry: t.publisher || t.ministry,
      date: t.date,
      subjects: t.subjects,
      docInfos: t.docInfos,
      reasoning: (t as any).reasoning ?? undefined,
      relevanceScore: (t as any).relevanceScore ?? undefined,
      analysisSkipped: (t as any)._analysisSkipped ?? undefined,
    });
    // Small delay for streaming effect
    await new Promise((r) => setTimeout(r, 120));
  }

  return results;
}

export async function getInsights(
  topic: string,
  sampleSize = 5,
): Promise<InsightsResult> {
  const res = await fetch(`${SCRAPER_BASE}/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, sample_size: sampleSize }),
  });

  if (!res.ok) throw new Error(`Insights failed: ${res.status}`);
  return res.json();
}

export async function isScraperAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${SCRAPER_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * ai-analyzer.js
 * -----------------------------------------------
 * Gemini-powered analysis of tender PDF texts.
 * Reads GEMINI_API_KEY from Windows environment.
 * -----------------------------------------------
 */

const { GoogleGenAI } = require('@google/genai');

let client = null;

/**
 * Repair JSON that contains unescaped double-quotes inside string values.
 * Common with Hebrew gershayim: ש"ח, מ"ר, מע"מ, etc.
 * Also strips markdown code fences (```json ... ```) that Gemini sometimes adds.
 */
function repairJson(text) {
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

  // State-machine: walk char-by-char and escape embedded quotes
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (escaped) { result += c; escaped = false; continue; }
    if (c === '\\' && inString) { result += c; escaped = true; continue; }

    if (c === '"') {
      if (!inString) {
        inString = true;
        result += c;
      } else {
        // Peek at next non-whitespace character
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
        const next = j < text.length ? text[j] : '';
        // If followed by a JSON structural char → closing quote
        if (next === ',' || next === '}' || next === ']' || next === ':' || next === '') {
          inString = false;
          result += c;
        } else {
          result += '\\"'; // embedded/unescaped quote — escape it
        }
      }
      continue;
    }

    if (inString && c === '\n') { result += '\\n'; continue; }
    if (inString && c === '\r') continue;
    result += c;
  }

  return result;
}

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Analyze a batch of tender texts and extract insights.
 * @param {string} topic - The procurement topic
 * @param {string[]} texts - Array of PDF text content
 * @returns {Promise<object>} Structured insights
 */
async function analyzeInsights(topic, texts) {
  const ai = getClient();
  const combined = texts.map((t, i) => `--- מכרז ${i + 1} ---\n${t.substring(0, 2000)}`).join('\n\n');

  const prompt = `אתה יועץ רכש ממשלתי מומחה.
להלן תוכן מ-${texts.length} מכרזים בנושא: "${topic}".

${combined}

נתח את המכרזים והחזר JSON בלבד (ללא טקסט לפני או אחרי):
{
  "common_requirements": ["דרישה נפוצה 1", "דרישה נפוצה 2", ...],
  "recommendations": ["המלצה לכתיבת מכרז חדש 1", ...],
  "red_flags": ["נושא שדורש תשומת לב 1", ...]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  const raw = response.text || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini returned non-JSON response');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return JSON.parse(repairJson(jsonMatch[0]));
  }
}

/**
 * Analyze a list of tenders for relevance to a given topic.
 * Uses the API key provided per-request (passed from the frontend).
 *
 * @param {string} topic - The procurement topic the user is writing about
 * @param {Array<{id: string, title: string, subjects: string[]}>} tenders
 * @param {string} apiKey - Gemini API key from the frontend request
 * @returns {Promise<Array<{id: string, relevanceScore: number, reasoning: string}>>}
 */
async function analyzeRelevance(topic, tenders, apiKey) {
  const ai = new GoogleGenAI({ apiKey });

  // Truncate title/subjects to keep token count low (free-tier friendly)
  const tenderList = tenders
    .map((t, i) => {
      const title = (t.title || '').substring(0, 60);
      const subjects = (t.subjects || []).slice(0, 4).join(', ') || 'לא צוין';
      return `${i + 1}. id="${t.id}" | כותרת: "${title}" | נושאים: ${subjects}`;
    })
    .join('\n');

  const prompt = `רכש ממשלתי. נושא: "${topic}". דרג רלוונטיות של כל מכרז (1-5) והסבר קצר בעברית.

${tenderList}

החזר JSON בלבד:
[{"id":"...","relevanceScore":1-5,"reasoning":"הסבר קצר"}]

5=ישירות קשור, 4=קשור חלקית, 3=קשור בעקיפין, 2=לא רלוונטי, 1=אין קשר. JSON בלבד.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const raw = response.text || '';
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Gemini returned non-JSON for relevance analysis');

  // First attempt: direct parse. Second: repair Hebrew gershayim / unescaped quotes.
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return JSON.parse(repairJson(jsonMatch[0]));
  }
}

module.exports = { analyzeInsights, analyzeRelevance };

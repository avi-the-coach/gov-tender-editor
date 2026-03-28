import { GoogleGenAI, Tool } from '@google/genai';
import { DocItem, NumberedDocItem, Source } from '../types';

export interface EnrichedSource extends Source {
  snippet: string;
}

const SYSTEM_INSTRUCTION = `You are an expert Procurement and Tender Consultant for the Israeli Government (similar to 'Hashcal').
Your goal is to help the user write a comprehensive "Scope of Work" (SOW) or "Technical Specifications" document for a public tender.

**Workflow:**
1. **Interview:** If the user gives a vague request, ask 3-5 clarifying questions.
2. **Signal:** When you have enough info from the user, signal readiness (see RESEARCH SIGNAL below) — do NOT create the document yet.
3. **Draft:** When the user message starts with "[הקשר ממחקר מקדים]", use that context + googleSearch to create the full document.
4. **Edit:** If a document already exists and the user asks to change something, do it immediately.

**RESEARCH SIGNAL:**
When you have collected enough information (after the user has answered your questions), include in your JSON:
- "readyForResearch": true
- "researchTopic": "נושא קצר בעברית עד 50 תווים"
Do NOT include updatedDocument when signaling — only reply + signal.
Set this flag ONCE only. If the message already contains "[הקשר ממחקר מקדים]", skip the signal and create the document.

**CRITICAL RULES FOR DOCUMENT UPDATES:**
- **FULL STATE:** When you return 'updatedDocument', you must return the **COMPLETE** array of all items, including those that did not change.
- **STRUCTURE:** The document must be hierarchical. Use 'level' (0=Chapter, 1=Section, 2=Subsection).
- **IDs:** For NEW items, generate unique string IDs (e.g., "section_5_1"). For EXISTING items, **PRESERVE** the ID exactly.
- **ACTION:** If the user asks to change something, **DO IT** in the 'updatedDocument' immediately.

**CRITICAL OUTPUT RULES:**
- **JSON ONLY:** Output **ONLY** a valid JSON object. Do NOT write "Here is the draft" or any other text before or after the JSON.
- **SYNTAX:** Ensure ALL keys and string values are wrapped in double quotes. **Ensure there is a COMMA after every property pair and every array item.**
- **NO UNESCAPED QUOTES:** Inside the 'content' string, you MUST escape double quotes (e.g., \\").
- **PLAIN TEXT ONLY:** The 'content' field must use **plain text only** — NO HTML tags (no <ul>, <li>, <br>, etc.). Use "\\n" for line breaks and "- " (dash + space) for bullet points.
- **HEBREW:** The 'reply' field and document content should be in Hebrew.

JSON Structure (interview phase):
{ "reply": "...", "updatedDocument": [], "readyForResearch": true, "researchTopic": "נושא" }

**DOCUMENT TITLE:**
When creating a new full document (updatedDocument is non-empty for the first time), include:
- "docTitle": "כותרת קצרה בעברית" — 5–8 words describing the specific procurement.
- Example: "מפרט טכני — רכישת מקרר משרדי דו-דלתי"
- Only include docTitle when creating a NEW document, not when editing existing sections.

JSON Structure (document phase):
{ "reply": "...", "updatedDocument": [{ "id": "string", "title": "string", "content": "string", "level": number }], "docTitle": "מפרט טכני — תיאור קצר" }`;

/**
 * Repair JSON that contains unescaped double-quotes inside string values.
 * Common with Hebrew gershayim: ש"ח, מ"ר, etc.
 * Uses a state-machine to walk char-by-char and escape embedded quotes.
 */
function repairJson(text: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (escaped) {
      result += c;
      escaped = false;
      continue;
    }

    if (c === '\\' && inString) {
      result += c;
      escaped = true;
      continue;
    }

    if (c === '"') {
      if (!inString) {
        inString = true;
        result += c;
      } else {
        // Peek at next non-whitespace character
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
        const next = j < text.length ? text[j] : '';
        // If followed by a JSON structural char, this is the closing quote
        if (next === ',' || next === '}' || next === ']' || next === ':' || next === '') {
          inString = false;
          result += c;
        } else {
          // Embedded/unescaped quote — escape it
          result += '\\"';
        }
      }
      continue;
    }

    // Escape raw newlines inside strings
    if (inString && c === '\n') { result += '\\n'; continue; }
    if (inString && c === '\r') continue;

    result += c;
  }

  return result;
}

/** Extract the reply text from a partial/complete JSON string (for streaming display) */
function extractPartialReply(text: string): string {
  // Try complete match first
  const full = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (full) {
    return full[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  // Try partial (reply field not yet closed)
  const partial = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (partial) {
    return partial[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return '';
}

function extractSources(response: any): EnrichedSource[] {
  const snippetMap = new Map<number, string[]>();
  const groundingSupports = response?.candidates?.[0]?.groundingMetadata?.groundingSupports || [];
  for (const support of groundingSupports) {
    const text = support?.segment?.text || '';
    for (const idx of support?.groundingChunkIndices || []) {
      if (!snippetMap.has(idx)) snippetMap.set(idx, []);
      snippetMap.get(idx)!.push(text);
    }
  }
  const sources: EnrichedSource[] = [];
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  (chunks as any[]).forEach((chunk: any, i: number) => {
    if (chunk.web?.uri && chunk.web?.title) {
      const snippets = snippetMap.get(i) || [];
      sources.push({
        title: chunk.web.title,
        uri: chunk.web.uri,
        snippet: snippets.slice(0, 2).join(' ').trim(),
      });
    }
  });
  return sources;
}

export interface WebSource {
  title: string;
  uri: string;
  snippet: string;
  reasoning: string;
}

export class GeminiService {
  private modelId = 'gemini-2.5-flash';

  private getApiKey(): string {
    return localStorage.getItem('gemini-api-key') || '';
  }

  isConfigured(): boolean {
    return !!(this.getApiKey());
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = new GoogleGenAI({ apiKey: this.getApiKey() });
      await (client.models as any).generateContent({
        model: this.modelId,
        contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: yes' }] }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async processRequest(
    history: Array<{ role: 'user' | 'model'; text: string }>,
    currentDocument: NumberedDocItem[],
    userMessage: string,
    onStreamChunk?: (replyText: string) => void,
    tenderContext?: string
  ): Promise<{ reply: string; updatedDocument: DocItem[]; sources: EnrichedSource[]; readyForResearch?: boolean; researchTopic?: string; docTitle?: string }> {
    const docContext = currentDocument
      .map(
        (item) =>
          `{ "id": "${item.id}", "level": ${item.level}, "title": "${item.title}", "content": "${item.content.substring(0, 150).replace(/"/g, '\\"').replace(/\n/g, '\\n')}" }`
      )
      .join(',\n');

    // Build proper multi-turn contents array
    // IMPORTANT: Model turns must be wrapped in JSON format so Gemini
    // continues to output JSON (with reply + updatedDocument).
    // If we send plain text for model turns, Gemini mimics that and
    // stops returning structured JSON — breaking document parsing.
    const firstUserIdx = history.findIndex((m) => m.role === 'user');
    const relevantHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : [];

    // Build the final user part — inject tender context when provided (research phase)
    const baseUserPart = currentDocument.length > 0 && !tenderContext
      ? `Current document state (${currentDocument.length} items):\n[${docContext}]\n\nUser message: ${userMessage}`
      : userMessage;
    const lastUserPart = tenderContext
      ? `[הקשר ממחקר מקדים — מכרזים דומים שנמצאו]\n${tenderContext}\n\n---\n${baseUserPart}`
      : baseUserPart;

    const contents = [
      ...relevantHistory.map((m) => {
        if (m.role === 'model') {
          // Wrap model replies in the JSON format Gemini expects to see
          const escaped = m.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
          return {
            role: 'model' as const,
            parts: [{ text: `{"reply": "${escaped}", "updatedDocument": []}` }],
          };
        }
        return { role: m.role, parts: [{ text: m.text }] };
      }),
      { role: 'user' as const, parts: [{ text: lastUserPart }] },
    ];

    const tools: Tool[] = [{ googleSearch: {} }];
    const config = { systemInstruction: SYSTEM_INSTRUCTION, tools };

    let fullText = '';
    let finalResponse: any = null;

    // Create client fresh (reads key from localStorage each time)
    const client = new GoogleGenAI({ apiKey: this.getApiKey() });

    // Use streaming
    const stream = await (client.models as any).generateContentStream({
      model: this.modelId,
      config,
      contents,
    });

    for await (const chunk of stream) {
      const chunkText = chunk.text || '';
      fullText += chunkText;
      finalResponse = chunk;

      if (onStreamChunk) {
        const partialReply = extractPartialReply(fullText);
        if (partialReply) onStreamChunk(partialReply);
      }
    }

    // Try to get aggregated response with full grounding metadata
    const aggregated = (stream as any).response || finalResponse;
    const sources = extractSources(aggregated);

    // Always extract reply text first — used as fallback if JSON.parse fails
    const extractedReply = extractPartialReply(fullText);

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { reply: extractedReply || fullText, updatedDocument: currentDocument, sources };
    }

    // Helper to extract structured result from a parsed object
    const extractResult = (parsed: any) => ({
      reply: parsed.reply || extractedReply || '',
      updatedDocument: Array.isArray(parsed.updatedDocument) && parsed.updatedDocument.length > 0
        ? parsed.updatedDocument
        : currentDocument,
      sources,
      readyForResearch: parsed.readyForResearch === true ? true : undefined,
      researchTopic: typeof parsed.researchTopic === 'string' ? parsed.researchTopic : undefined,
      docTitle: typeof parsed.docTitle === 'string' && parsed.docTitle.trim() ? parsed.docTitle.trim() : undefined,
    });

    // First attempt: direct parse
    try {
      return extractResult(JSON.parse(jsonMatch[0]));
    } catch {
      // Second attempt: repair unescaped quotes (Hebrew gershayim etc.) then re-parse
      try {
        return extractResult(JSON.parse(repairJson(jsonMatch[0])));
      } catch {
        // Both attempts failed — return reply text only, keep existing document
        return { reply: extractedReply || 'שגיאה בקריאת תשובת המודל', updatedDocument: currentDocument, sources };
      }
    }
  }

  /**
   * Dedicated internet research call — searches for standards, regulations,
   * legal language, and technical requirements relevant to a procurement topic.
   * Returns grounding sources with reasoning + full analysis summary text.
   */
  async researchWebContext(
    topic: string,
    onSource?: (src: WebSource) => void
  ): Promise<{ summary: string; sources: WebSource[] }> {
    const client = new GoogleGenAI({ apiKey: this.getApiKey() });

    // Prompt in English — Gemini grounds better with English queries
    const prompt = `Search the web for Israeli government procurement requirements for: "${topic}"

You MUST search for and find:
1. Relevant Israeli standards (SI / תקן ישראלי) and international standards (ISO/IEC) that apply
2. Israeli procurement regulations and laws (חוק חובת מכרזים, תקנות רכש)
3. Standard legal clauses used in Israeli government tenders for this category
4. Typical technical specifications and service level requirements
5. Standard warranty, insurance, and liability terms in Israeli government contracts

Provide a comprehensive analysis in Hebrew including specific formulations that can be imported directly into a procurement specification document.`;

    let fullText = '';
    let finalResponse: any = null;

    const stream = await (client.models as any).generateContentStream({
      model: this.modelId,
      config: {
        // Force Gemini to use Google Search — without this instruction it may answer from memory
        systemInstruction: 'You MUST use the googleSearch tool to research this topic. Do NOT answer from your training data or memory. Always perform web searches and base your answer on search results.',
        tools: [{ googleSearch: {} }],
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    for await (const chunk of stream) {
      fullText += chunk.text || '';
      finalResponse = chunk;
    }

    const aggregated = (stream as any).response || finalResponse;
    const groundingSources = extractSources(aggregated);

    const result: WebSource[] = groundingSources.map((src) => ({
      title: src.title,
      uri: src.uri,
      snippet: src.snippet,
      reasoning: src.snippet || `מקור רלוונטי לנושא: ${topic}`,
    }));

    result.forEach((src) => { if (onSource) onSource(src); });

    return { summary: fullText.trim(), sources: result };
  }
}

export interface DocItem {
  id: string;
  title: string;
  content: string;
  level: number; // 0=Chapter, 1=Section, 2=Subsection
}

export interface NumberedDocItem extends DocItem {
  numberString: string; // e.g. "1.2.1."
}

export interface Source {
  title: string;
  uri: string;
}

export interface ThinkingStep {
  id: string;
  text: string;
  status: 'pending' | 'active' | 'done' | 'error';
  subItems?: string[];
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sources?: Source[];
  steps?: ThinkingStep[];       // agentic progress steps (shown during research phase)
  isThinkingDone?: boolean;     // steps complete — show final reply text
}

export interface AIResponse {
  reply: string;
  updatedDocument?: DocItem[];
  sources?: Source[];
}

// Research Panel types
export interface DocInfo {
  name: string;
  url: string;
}

export interface ResearchCard {
  id: string;
  type: 'web' | 'tender';
  title: string;
  url: string;
  snippet: string;
  ministry?: string;
  date?: string;
  subjects?: string[];      // topic tags from the tender page (e.g. "כיבוד, מזון")
  docInfos?: DocInfo[];     // direct download links to tender documents
  reasoning?: string;       // AI explanation of why this tender is relevant
  relevanceScore?: number;  // 1-5 relevance score from Gemini
  analysisSkipped?: string; // 'quota' | 'error' — why analysis wasn't done
}

// Legacy (kept for backward compat if needed)
export interface ResearchStep {
  type: 'search' | 'found' | 'analyzing' | 'tender' | 'insights' | 'error';
  text: string;
  url?: string;
  timestamp: number;
}

export interface TenderResult {
  id: string;
  title: string;
  ministry: string;
  publisher?: string;
  date: string;
  url: string;
  subjects?: string[];
  docInfos?: DocInfo[];
}

export interface InsightsResult {
  topic: string;
  tenders_analyzed: number;
  common_requirements: string[];
  recommendations: string[];
  red_flags: string[];
}

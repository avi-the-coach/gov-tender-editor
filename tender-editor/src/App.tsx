import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { DocItem, Message, ResearchCard, InsightsResult, ThinkingStep } from './types';
import { calculateNumbering, generateId, isValidLevel, getBlockRange, docToMarkdown, docToHtml } from './utils';
import { GeminiService, WebSource } from './services/geminiService';
import { searchTenders } from './services/scraperService';
import { ChatMessage } from './components/ChatMessage';
import { DocItemEditor } from './components/DocItemEditor';
import { ResearchPanel } from './components/ResearchPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { WalkMe } from './components/WalkMe';
import { Icons } from './constants';

const geminiService = new GeminiService();

const WELCOME_MESSAGE = `שלום. אני יועץ הרכש הדיגיטלי שלך.
אני כאן כדי לעזור לך לכתוב את המפרט הטכני (SOW) למכרז הבא שלך.

מה המוצר או השירות שאתם מבקשים לרכוש?
(לדוגמה: אספקת ריהוט משרדי, שירותי קייטרינג, פיתוח מערכת מידע...)`;

type ChatTab = 'chat' | 'research';

function ApiKeyInput({ onSave }: { onSave: () => void }) {
  const [key, setKey] = React.useState('');
  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    localStorage.setItem('gemini-api-key', trimmed);
    onSave();
  };
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-sm text-center shadow-sm w-full">
        <div className="flex justify-center mb-4 text-amber-500">
          <Icons.Warning />
        </div>
        <h3 className="font-bold text-gray-800 text-base mb-2">הכנס Gemini API Key</h3>
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          ה-Key נשמר רק בדפדפן שלך (localStorage).
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          placeholder="AIza..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-3 text-left outline-none focus:border-indigo-400"
          dir="ltr"
        />
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          שמור והתחל
        </button>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs text-indigo-600 hover:underline"
        >
          קבל API Key חינמי ב-Google AI Studio ↗
        </a>
      </div>
    </div>
  );
}

function App() {
  const [docItems, setDocItems] = useState<DocItem[]>(() => {
    try { const s = localStorage.getItem('gov-tender-doc-items'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [docTitle, setDocTitle] = useState<string>(() =>
    localStorage.getItem('gov-tender-doc-title') || ''
  );
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('gov-tender-messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [{ role: 'model' as const, text: WELCOME_MESSAGE, timestamp: Date.now() }];
  });
  const [input, setInput] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchBadge, setResearchBadge] = useState(false);
  const [researchCards, setResearchCards] = useState<ResearchCard[]>(() => {
    try { const s = localStorage.getItem('gov-tender-research'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const hasAutoSearchedRef = useRef(false); // prevent repeated auto-searches
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Drag and Drop
  const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; level: number } | null>(null);

  // Chat panel resize — persisted independently (survives conversation reset)
  const [chatWidth, setChatWidth] = useState(() =>
    parseInt(localStorage.getItem('gov-tender-chat-width') || '384', 10)
  );
  const resizeDragging = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(384);

  // Voice input
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const webSpeechBaseText = useRef('');
  const webSpeechFinalText = useRef('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const numberedItems = useMemo(() => calculateNumbering(docItems), [docItems]);
  const [isApiConfigured, setIsApiConfigured] = useState(() => geminiService.isConfigured());
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => !geminiService.isConfigured());
  const [isWalkMeOpen, setIsWalkMeOpen] = useState(false);

  // Auto-open settings if no API key
  useEffect(() => {
    if (!isApiConfigured) setIsSettingsOpen(true);
  }, [isApiConfigured]);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Persist all state to localStorage
  useEffect(() => {
    try { localStorage.setItem('gov-tender-messages', JSON.stringify(messages.slice(-60))); } catch {}
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem('gov-tender-doc-items', JSON.stringify(docItems)); } catch {}
  }, [docItems]);

  useEffect(() => {
    if (docTitle) localStorage.setItem('gov-tender-doc-title', docTitle);
    else localStorage.removeItem('gov-tender-doc-title');
  }, [docTitle]);

  useEffect(() => {
    try { localStorage.setItem('gov-tender-research', JSON.stringify(researchCards.slice(-40))); } catch {}
  }, [researchCards]);

  // chatWidth persists independently — NOT cleared on conversation reset
  useEffect(() => {
    localStorage.setItem('gov-tender-chat-width', String(chatWidth));
  }, [chatWidth]);

  // Reset conversation — clears everything EXCEPT chatWidth
  const handleReset = () => {
    const fresh: Message[] = [{ role: 'model', text: WELCOME_MESSAGE, timestamp: Date.now() }];
    setMessages(fresh);
    setDocItems([]);
    setDocTitle('');
    setResearchCards([]);
    setInsights(null);
    hasAutoSearchedRef.current = false;
    try {
      localStorage.removeItem('gov-tender-messages');
      localStorage.removeItem('gov-tender-doc-items');
      localStorage.removeItem('gov-tender-doc-title');
      localStorage.removeItem('gov-tender-research');
      // gov-tender-chat-width intentionally NOT removed
    } catch {}
  };

  const addResearchCard = useCallback((card: ResearchCard) => {
    setResearchCards((prev) => [...prev, card]);
    if (activeTab !== 'research') setResearchBadge(true);
  }, [activeTab]);

  // Phase 2+3: Research → Document
  // Triggered when Gemini signals readyForResearch:true after the interview phase.
  const triggerResearchFlow = useCallback(async (topic: string) => {
    setIsResearching(true);
    if (activeTab !== 'research') setResearchBadge(true);

    const thinkingTs = Date.now();
    const initialSteps: ThinkingStep[] = [
      { id: 's1', text: `מחפש מכרזים דומים ל-"${topic.substring(0, 40)}"...`, status: 'active', subItems: [] },
      { id: 's2', text: 'מחפש תקנים ומידע רלוונטי באינטרנט...', status: 'pending', subItems: [] },
      { id: 's3', text: 'מסכם ממצאים...', status: 'pending' },
      { id: 's4', text: 'מכין מסמך מקצועי...', status: 'pending' },
    ];

    setMessages((prev) => [...prev, {
      role: 'model', text: '', timestamp: thinkingTs, steps: initialSteps,
    }]);

    const updateStep = (id: string, patch: Partial<ThinkingStep>) =>
      setMessages((prev) => prev.map((m) =>
        m.timestamp === thinkingTs
          ? { ...m, steps: m.steps!.map((s) => s.id === id ? { ...s, ...patch } : s) }
          : m
      ));

    // ── Step 1: Tender scraper ────────────────────────────────────────
    const foundTenders: ResearchCard[] = [];
    try {
      await searchTenders(topic, 10, (card) => {
        setResearchCards((prev) => [...prev, card]);
        setResearchBadge(true);
        if (card.type === 'tender') {
          foundTenders.push(card);
          const stars = card.relevanceScore ? '★'.repeat(card.relevanceScore) : '';
          updateStep('s1', {
            subItems: foundTenders.map((t) => `${t.title.substring(0, 45)} ${stars}`),
          });
        }
      });
    } catch (err) {
      console.warn('[ResearchFlow] Scraper error:', err);
    }
    updateStep('s1', {
      status: 'done',
      text: foundTenders.length > 0
        ? `נמצאו ${foundTenders.length} מכרזים רלוונטיים`
        : 'לא נמצאו מכרזים דומים',
    });

    // ── Step 2: Internet research ─────────────────────────────────────
    updateStep('s2', { status: 'active' });
    let webSummary = '';
    let webSourceCount = 0;
    try {
      const webResult = await geminiService.researchWebContext(topic, (src: WebSource) => {
        webSourceCount++;
        addResearchCard({
          id: `web-${Date.now()}-${webSourceCount}`,
          type: 'web',
          title: src.title,
          url: src.uri,
          snippet: src.snippet,
          reasoning: src.reasoning,
        });
        updateStep('s2', {
          subItems: Array.from({ length: webSourceCount }, (_, i) => `מקור ${i + 1}`),
        });
      });
      webSummary = webResult.summary;
      webSourceCount = webResult.sources.length;
    } catch (err) {
      console.warn('[ResearchFlow] Web research error:', err);
    }
    updateStep('s2', {
      status: 'done',
      text: webSourceCount > 0
        ? `נמצאו ${webSourceCount} מקורות אינטרנט`
        : 'חיפוש אינטרנט הושלם',
    });

    // ── Step 3: Build combined context ───────────────────────────────
    updateStep('s3', { status: 'active' });
    const tenderContext = foundTenders.slice(0, 5).map((t, i) =>
      [
        `${i + 1}. ${t.title}`,
        `   נושאים: ${(t.subjects || []).join(', ') || 'לא צוין'}`,
        t.reasoning ? `   רלוונטיות: ${t.reasoning}` : '',
        t.docInfos?.length
          ? `   מסמכים: ${t.docInfos.slice(0, 3).map((d) => d.name).join(', ')}`
          : '',
      ].filter(Boolean).join('\n')
    ).join('\n\n');

    const fullContext = [
      tenderContext ? `=== מכרזים דומים שנמצאו ===\n${tenderContext}` : '',
      webSummary ? `=== ממצאי מחקר אינטרנט ===\n${webSummary}` : '',
    ].filter(Boolean).join('\n\n---\n\n');

    await new Promise((r) => setTimeout(r, 200));
    updateStep('s3', {
      status: 'done',
      text: `הקשר מוכן — ${foundTenders.length} מכרזים, ${webSourceCount} מקורות אינטרנט`,
    });

    // ── Step 4: Gemini document creation with full context ────────────
    updateStep('s4', { status: 'active' });
    setIsLoading(true);

    const phase4Message = `בהתבסס על המחקר המקיף שבוצע, צור עכשיו מסמך מפרט טכני מלא ומקצועי.

הוראות חשובות ליצירת המסמך:
1. ייבא ניסוחים משפטיים מדויקים — השתמש בשפה הפורמלית של מכרזי ממשלה ישראליים
2. השתמש ב-Google Search כדי למצוא ניסוחים סטנדרטיים ותקנים נוספים
3. כלול דרישות טכניות ספציפיות ומדידות עם מפרטים מספריים
4. כלול סעיפי אחריות, ביטוח, ערבות וסיום התקשרות בניסוח פורמלי
5. התאם כל דרישה למקרה הספציפי שתואר בשיחה`;

    try {
      const result = await geminiService.processRequest(
        messagesRef.current,
        numberedItems,
        phase4Message,
        (replyText) => {
          setMessages((prev) => prev.map((m) =>
            m.timestamp === thinkingTs ? { ...m, text: replyText } : m
          ));
          scrollToBottom();
        },
        fullContext || undefined,
      );

      updateStep('s4', { status: 'done', text: 'מסמך מוכן!' });
      setMessages((prev) => prev.map((m) =>
        m.timestamp === thinkingTs
          ? { ...m, text: result.reply, isThinkingDone: true }
          : m
      ));

      if (result.updatedDocument && result.updatedDocument.length > 0) {
        setDocItems(result.updatedDocument);
      }
      if (result.docTitle) {
        setDocTitle(result.docTitle);
      }

      // Gemini grounding sources from doc creation → research panel
      if (result.sources.length > 0) {
        for (let i = 0; i < result.sources.length; i++) {
          await new Promise((r) => setTimeout(r, 120));
          const src = result.sources[i];
          addResearchCard({
            id: `web-doc-${Date.now()}-${i}`,
            type: 'web',
            title: src.title,
            url: src.uri,
            snippet: (src as any).snippet || '',
            reasoning: (src as any).snippet || '',
          });
        }
      }
    } catch (err) {
      updateStep('s4', { status: 'error', text: `שגיאה: ${String(err).substring(0, 60)}` });
      setMessages((prev) => prev.map((m) =>
        m.timestamp === thinkingTs ? { ...m, isThinkingDone: true } : m
      ));
    } finally {
      setIsLoading(false);
      setIsResearching(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, addResearchCard, scrollToBottom]);

  // Resize handle
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    resizeDragging.current = true;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = chatWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeDragging.current) return;
      // RTL: chat is on the right, moving left = wider
      const delta = resizeStartX.current - e.clientX;
      setChatWidth(Math.max(280, Math.min(720, resizeStartWidth.current + delta)));
    };
    const onUp = () => {
      resizeDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Voice input
  const stopVoice = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Web Speech API לא נתמך בדפדפן זה. נסה Chrome.');
      return;
    }
    const rec = new SR();
    rec.lang = 'he-IL';
    rec.interimResults = true;
    rec.continuous = true;
    webSpeechBaseText.current = input.trim();
    webSpeechFinalText.current = '';

    rec.onresult = (event: any) => {
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      let currentTranscript = '';
      if (isMobile) {
        const last = event.results[event.results.length - 1];
        currentTranscript = last[0].transcript;
      } else {
        let final = '';
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += (final ? ' ' : '') + t;
          else interim += t;
        }
        currentTranscript = [final, interim].filter(Boolean).join(' ');
      }
      webSpeechFinalText.current = currentTranscript;
      const parts = [webSpeechBaseText.current, currentTranscript].filter(Boolean);
      setInput(parts.join(' '));
    };

    rec.onerror = (event: any) => {
      if (event.error !== 'no-speech') console.error('[Voice] Error:', event.error);
      stopVoice();
    };

    rec.onend = () => { stopVoice(); };

    rec.start();
    speechRecognitionRef.current = rec;
    setIsListening(true);
  }, [input, stopVoice]);

  const toggleVoice = useCallback(() => {
    if (isListening) stopVoice();
    else startVoice();
  }, [isListening, startVoice, stopVoice]);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isApiConfigured) return;
    stopVoice();
    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    const userTs = Date.now();
    const userMsg: Message = { role: 'user', text: userText, timestamp: userTs };
    setMessages((prev) => [...prev, userMsg]);

    // Phase 4: detect explicit research commands only
    const wantsExplicitTenderSearch = /חפש במכרזים|מכרזים בנושא/.test(userText);

    // Send to Gemini with streaming
    // Use userTs + 1 to guarantee a unique timestamp for the streaming placeholder
    const streamTs = userTs + 1;
    // Add placeholder message for streaming
    setMessages((prev) => [...prev, { role: 'model', text: '', timestamp: streamTs }]);

    try {
      const result = await geminiService.processRequest(
        messages,
        numberedItems,
        userText,
        (replyText) => {
          // Update streaming message in place
          setMessages((prev) =>
            prev.map((m) => m.timestamp === streamTs ? { ...m, text: replyText } : m)
          );
          scrollToBottom();
        }
      );

      // Phase transition: Gemini finished interview, signals ready to research
      if (result.readyForResearch && result.researchTopic) {
        // Show the interview reply, then kick off the research flow
        setMessages((prev) =>
          prev.map((m) => m.timestamp === streamTs ? { ...m, text: result.reply } : m)
        );
        triggerResearchFlow(result.researchTopic);
        return; // finally will setIsLoading(false)
      }

      // Normal flow: finalize reply (Phase 1 interview question or Phase 4 edit)
      setMessages((prev) =>
        prev.map((m) => m.timestamp === streamTs ? { ...m, text: result.reply } : m)
      );

      if (result.updatedDocument && result.updatedDocument.length > 0) {
        setDocItems(result.updatedDocument);
      }

      // Stream Gemini's web sources as research cards
      if (result.sources.length > 0) {
        if (activeTab !== 'research') setResearchBadge(true);
        for (let i = 0; i < result.sources.length; i++) {
          await new Promise((r) => setTimeout(r, 150));
          const src = result.sources[i];
          addResearchCard({
            id: `web-${Date.now()}-${i}`,
            type: 'web',
            title: src.title,
            url: src.uri,
            snippet: (src as any).snippet || '',
          });
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.timestamp === streamTs ? { ...m, text: `שגיאה: ${err}` } : m)
      );
    } finally {
      setIsLoading(false);
    }

    // Phase 4: explicit tender search command (e.g. "חפש במכרזים שירותי ניקיון")
    if (wantsExplicitTenderSearch) {
      setIsResearching(true);
      const topicMatch = userText.match(/חפש במכרזים\s+(.+)/);
      const topic = topicMatch?.[1]?.trim() || userText;
      try {
        await searchTenders(topic, 10, addResearchCard);
      } catch (err) {
        console.error('Scraper error:', err);
      } finally {
        setIsResearching(false);
      }
    }
  };

  // Document handlers
  const handleDocUpdate = (id: string, field: 'title' | 'content', value: string) => {
    setDocItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleLevelChange = (id: string, delta: number) => {
    setDocItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const newLevel = prev[idx].level + delta;
      if (!isValidLevel(prev, idx, newLevel)) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], level: newLevel };
      return next;
    });
  };

  const handleDelete = (id: string) => {
    setDocItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const { start, end } = getBlockRange(prev, idx);
      return prev.filter((_, i) => i < start || i > end);
    });
  };

  const handleAddItem = () => {
    const lastLevel = docItems.length > 0 ? docItems[docItems.length - 1].level : 0;
    setDocItems((prev) => [...prev, { id: generateId(), title: 'פרק חדש', content: '', level: lastLevel }]);
  };

  // Drag & Drop
  const handleDragStart = (idx: number) => () => setDragItemIndex(idx);
  const handleDragEnter = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragItemIndex === null || dragItemIndex === idx) return;
    setDropTarget({ index: idx, level: docItems[dragItemIndex].level });
  };
  const handleDragEnd = () => {
    if (dragItemIndex === null || dropTarget === null) { setDragItemIndex(null); setDropTarget(null); return; }
    const { start: blockStart, end: blockEnd } = getBlockRange(docItems, dragItemIndex);
    const block = docItems.slice(blockStart, blockEnd + 1);
    const rest = docItems.filter((_, i) => i < blockStart || i > blockEnd);
    let insertAt = dropTarget.index > blockEnd ? dropTarget.index - (blockEnd - blockStart) : dropTarget.index;
    rest.splice(insertAt, 0, ...block);
    setDocItems(rest);
    setDragItemIndex(null);
    setDropTarget(null);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // Export
  const handleExport = (format: 'markdown' | 'html' | 'json') => {
    let content = '';
    let filename = 'מפרט-טכני';
    let mime = 'text/plain';
    if (format === 'markdown') { content = docToMarkdown(numberedItems); filename += '.md'; }
    else if (format === 'html') { content = docToHtml(numberedItems); filename += '.html'; mime = 'text/html'; }
    else { content = JSON.stringify(docItems, null, 2); filename += '.json'; mime = 'application/json'; }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* ========== MAIN ROW ========== */}
      <div className="flex flex-1 overflow-hidden">

      {/* ========== LEFT PANEL — Chat ========== */}
      <div className="flex flex-col border-l border-gray-200 bg-white shadow-sm shrink-0" style={{ width: chatWidth }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-indigo-600 text-white">
          <Icons.Robot />
          <h1 className="font-bold text-sm flex-1">עוזר רכש ומכרזים</h1>
          {/* API status dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${isApiConfigured ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}
            title={isApiConfigured ? 'API Key מוגדר' : 'API Key חסר'}
          />
          {/* Walk Me tour */}
          <button
            onClick={() => setIsWalkMeOpen(true)}
            title="סיור מודרך — Walk Me"
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-indigo-500 hover:bg-indigo-400 transition-colors text-xs"
          >
            🗺 סיור מודרך
          </button>
          <button
            id="walkme-settings"
            onClick={() => setIsSettingsOpen((v) => !v)}
            title="הגדרות"
            className={`p-1.5 rounded transition-colors ${isSettingsOpen ? 'bg-indigo-400' : 'bg-indigo-500 hover:bg-indigo-400'}`}
          >
            <Icons.Gear />
          </button>
          <button
            onClick={handleReset}
            title="התחל שיחה חדשה"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-500 hover:bg-indigo-400 transition-colors font-medium"
          >
            🔄 שיחה חדשה
          </button>
        </div>

        {/* Settings Panel (curtain) */}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isApiConfigured={isApiConfigured}
          onApiChange={(configured) => setIsApiConfigured(configured)}
        />

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setActiveTab('chat'); }}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💬 שיחה
          </button>
          <button
            id="walkme-research-tab"
            onClick={() => { setActiveTab('research'); setResearchBadge(false); }}
            className={`flex-1 py-2 text-xs font-medium transition-colors relative ${
              activeTab === 'research'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 מחקר
            {researchBadge && (
              <span className="absolute top-1 right-3 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' ? (
            <>
              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Icons.Robot />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg rounded-tr-none px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input or API Key Notice */}
              {isApiConfigured ? (
                <div id="walkme-chat-input" className="p-3 border-t border-gray-100 bg-white">
                  <div className="flex gap-2 items-end bg-gray-50 rounded-xl border border-gray-200 p-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="תאר את המוצר שברצונך לרכוש..."
                      rows={2}
                      className="flex-1 bg-transparent outline-none text-sm text-gray-800 resize-none"
                      disabled={isLoading}
                    />
                    <button
                      onClick={toggleVoice}
                      disabled={isLoading}
                      title={isListening ? 'עצור הקלטה' : 'הקלטה קולית'}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        isListening
                          ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isListening ? '🔴' : '🎤'}
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !input.trim()}
                      className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Icons.Send />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Enter לשליחה · Shift+Enter לשורה חדשה
                  </p>
                </div>
              ) : (
                <div className="p-4 border-t border-gray-100 bg-amber-50 text-center">
                  <p className="text-xs text-amber-700">
                    הגדר API Key בלחיצה על <Icons.Gear /> בכותרת
                  </p>
                </div>
              )}
            </>
          ) : (
            <ResearchPanel
              cards={researchCards}
              insights={insights}
              isLoading={isResearching}
            />
          )}
        </div>
      </div>

      {/* ========== Resize Handle ========== */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="w-1.5 shrink-0 bg-gray-200 hover:bg-indigo-400 active:bg-indigo-500 cursor-col-resize transition-colors"
        title="גרור לשינוי רוחב"
      />

      {/* ========== RIGHT PANEL — Document Editor ========== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div id="walkme-doc-panel" className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col leading-tight">
            <h2 className="font-bold text-gray-800 text-sm">
              {docTitle || 'מסמך אפיון / מפרט טכני'}
            </h2>
            {docTitle && (
              <span className="text-[10px] text-gray-400 font-normal">מפרט טכני</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isEditMode
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isEditMode ? <Icons.Eye /> : <Icons.Edit />}
              {isEditMode ? 'תצוגה' : 'עריכה'}
            </button>

            <button
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Icons.Plus />
              הוסף פרק
            </button>

            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Icons.Download />
                ייצוא
                <Icons.ChevronDown />
              </button>
              {showExportMenu && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  <button onClick={() => handleExport('markdown')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                    <Icons.FileText /> Markdown
                  </button>
                  <button onClick={() => handleExport('html')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                    <Icons.FileCode /> HTML
                  </button>
                  <button onClick={() => handleExport('json')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                    <Icons.FileJson /> JSON
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => { if (window.confirm('לנקות את המסמך?')) setDocItems([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Icons.Trash />
              נקה
            </button>
          </div>
        </div>

        {/* Document Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {numberedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-sm font-medium">המסמך ריק כרגע</p>
              <p className="text-xs mt-2">
                התחל שיחה עם העוזר בצד ימין, הוא ישאל מה אתם מבקשים<br />
                לרכוש, יבצע מחקר ויבנה את המפרט הטכני עבורך.
              </p>
            </div>
          ) : (
            numberedItems.map((item, idx) => (
              <DocItemEditor
                key={item.id}
                item={item}
                isValidIndent={isValidLevel(docItems, idx, item.level + 1)}
                onUpdate={handleDocUpdate}
                onLevelChange={handleLevelChange}
                onDelete={handleDelete}
                onDragStart={handleDragStart(idx)}
                onDragEnter={handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
              />
            ))
          )}
        </div>
      </div>

      </div>{/* end MAIN ROW */}

      {/* ========== WALK ME TOUR ========== */}
      <WalkMe isOpen={isWalkMeOpen} onClose={() => setIsWalkMeOpen(false)} />

      {/* ========== FOOTER — always visible ========== */}
      <div className="shrink-0 flex items-center justify-center gap-4 px-4 py-1 bg-gray-100 border-t border-gray-200 text-[10px] text-gray-400">
        <span>🔒 מידע מקומי בלבד — לא נשמר בשרת</span>
        <span className="text-gray-300">|</span>
        <span>⚠️ POC בלבד — ללא אחריות מסחרית</span>
        <span className="text-gray-300">|</span>
        <a
          href="https://github.com/avi-the-coach/gov-tender-editor"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-500 hover:underline transition-colors"
        >
          💻 קוד פתוח ב-GitHub ↗
        </a>
      </div>
    </div>
  );
}

export default App;

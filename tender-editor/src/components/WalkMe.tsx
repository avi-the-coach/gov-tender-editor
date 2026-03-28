import React, { useEffect, useRef, useCallback } from 'react';

// ─── Tour step data ─────────────────────────────────────────────────────────

interface TourStep {
  title: string;
  icon: string;
  written: React.ReactNode; // formatted card content
  spoken: string;           // conversational TTS text
  targetId?: string;        // DOM element ID to point at
  preferredSide?: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: TourStep[] = [
  {
    title: 'ברוכים הבאים',
    icon: '👋',
    targetId: 'walkme-settings',
    preferredSide: 'bottom',
    written: (
      <div className="space-y-2 text-sm leading-relaxed" dir="rtl">
        <p className="font-bold text-indigo-700 text-base">עוזר הרכש הממשלתי — AI</p>
        <p>הכלי מסייע לכתוב <strong>מפרט טכני (SOW)</strong> למכרז ממשלתי, תוך מחקר אוטומטי של מכרזים קיימים ותקנים.</p>
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
          <p className="font-semibold text-amber-800 mb-1">🔑 נדרש Gemini API Key</p>
          <p className="text-amber-700">לחץ <strong>⚙️</strong> בכותרת → הכנס מפתח → שמור</p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1 text-indigo-600 hover:underline font-medium"
          >
            🆓 קבל מפתח חינמי ב-Google AI Studio ↗
          </a>
        </div>
      </div>
    ),
    spoken:
      'שלום וברוכים הבאים לעוזר הרכש הממשלתי. הכלי הזה עוזר לכתוב מפרטים טכניים למכרזים ממשלתיים, תוך שימוש בבינה מלאכותית ומחקר אוטומטי. כדי להתחיל, תצטרך מפתח API של Gemini מגוגל. זה לגמרי חינמי לשימוש בסיסי. לחץ על כפתור ההגדרות בפינה העליונה ושם תוכל להכניס את המפתח.',
  },
  {
    title: 'שלב 1 — ריאיון',
    icon: '💬',
    targetId: 'walkme-chat-input',
    preferredSide: 'top',
    written: (
      <div className="space-y-2 text-sm leading-relaxed" dir="rtl">
        <p className="font-bold text-gray-800">תאר מה ברצונך לרכוש</p>
        <ul className="space-y-1.5 text-gray-700">
          <li>✏️ כתוב <strong>במילים חופשיות</strong> — אין צורך בניסוח מדויק</li>
          <li>❓ העוזר ישאל <strong>3–5 שאלות הבהרה</strong> על הצרכים</li>
          <li>🎤 אפשר גם לדבר בקול — לחץ על כפתור <strong>🎤</strong> בתיבת הקלט</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          לדוגמה: <em>"אני רוצה לרכוש מקרר משרדי גדול עם שירות תחזוקה"</em>
        </p>
      </div>
    ),
    spoken:
      'השלב הראשון הוא ריאיון קצר. פשוט תגיד לעוזר מה אתה רוצה לרכוש, בכל שפה שנוח לך. הוא לא מצפה לניסוח מדויק. אחרי זה הוא ישאל אותך כמה שאלות כדי להבין טוב יותר את הצרכים שלך, כמו מידות, כמות, רמת שירות, ועוד. אפשר גם לדבר בקול אם קל יותר — יש כפתור מיקרופון בתיבת הקלט.',
  },
  {
    title: 'שלב 2 — מחקר אוטומטי',
    icon: '🔍',
    targetId: 'walkme-research-tab',
    preferredSide: 'bottom',
    written: (
      <div className="space-y-2 text-sm leading-relaxed" dir="rtl">
        <p className="font-bold text-gray-800">מחקר מקיף לפני יצירת המסמך</p>
        <p className="text-gray-600 text-xs">אחרי ריאיון, העוזר מחפש אוטומטית — הכל גלוי בטאב <strong>🔍 מחקר</strong>:</p>
        <ul className="space-y-1.5 text-gray-700">
          <li>
            <strong>📋 מכרזים ממשלתיים</strong> — מחפש ב-mr.gov.il מכרזים דומים,
            מנתח כל אחד ומדרג רלוונטיות
          </li>
          <li>
            <strong>🌐 מידע מהאינטרנט</strong> — תקנים ישראליים, חקיקה,
            ניסוחים משפטיים מקובלים
          </li>
          <li>💡 כל ממצא מגיע עם הסבר למה הוא רלוונטי</li>
        </ul>
        <p className="text-xs text-gray-500">⏱ תהליך זה אורך כ-20–30 שניות</p>
      </div>
    ),
    spoken:
      'אחרי שתענה על השאלות, העוזר ייצא לחפש מידע — ותוכל לראות בדיוק מה הוא עושה. הוא יחפש מכרזים ממשלתיים דומים שפורסמו בעבר, וגם יחפש ברשת תקנים ישראליים, חקיקה רלוונטית, וניסוחים משפטיים מקובלים. כל זה כדי שהמסמך שייצור לבסוף יהיה מבוסס ומקצועי, ולא רק ניסוח כללי. כל הממצאים יופיעו בטאב המחקר.',
  },
  {
    title: 'שלב 3 — המסמך',
    icon: '📄',
    targetId: 'walkme-doc-panel',
    preferredSide: 'bottom',
    written: (
      <div className="space-y-2 text-sm leading-relaxed" dir="rtl">
        <p className="font-bold text-gray-800">מפרט טכני מלא ומקצועי</p>
        <p className="text-gray-600 text-xs">על בסיס המחקר, Gemini יוצר:</p>
        <ul className="space-y-1.5 text-gray-700">
          <li>✅ <strong>מפרט מלא</strong> עם פרקים ספציפיים לנושא</li>
          <li>⚖️ <strong>ניסוחים משפטיים</strong> מתוך מכרזים ממשלתיים אמיתיים</li>
          <li>📊 <strong>דרישות מדידות</strong> — מספרים, תקנים, מפרטים</li>
          <li>🔒 סעיפי ביטוח, ערבות ואחריות בניסוח פורמלי</li>
        </ul>
        <div className="mt-2 flex gap-1.5 text-xs text-gray-500">
          <span>ייצוא:</span>
          <code className="bg-gray-100 px-1 rounded">Markdown</code>
          <code className="bg-gray-100 px-1 rounded">HTML</code>
          <code className="bg-gray-100 px-1 rounded">JSON</code>
        </div>
      </div>
    ),
    spoken:
      'בסוף תהליך המחקר, הבינה המלאכותית תיצור עבורך מסמך מפרט טכני מלא. המסמך יכלול ניסוחים משפטיים שנשאבו ממכרזים ממשלתיים אמיתיים, דרישות טכניות ספציפיות עם מספרים, וסעיפי ביטוח ואחריות. תוכל לראות את המסמך בצד ימין של המסך ולהוריד אותו בפורמטים שונים.',
  },
  {
    title: 'שלב 4 — עריכה וחיפוש',
    icon: '✏️',
    targetId: 'walkme-chat-input',
    preferredSide: 'top',
    written: (
      <div className="space-y-2 text-sm leading-relaxed" dir="rtl">
        <p className="font-bold text-gray-800">מסמך מוכן — מה עכשיו?</p>
        <ul className="space-y-1.5 text-gray-700">
          <li>💬 <strong>שינוי חופשי:</strong> "הוסף סעיף על ביטוח", "שנה את הזמן להצעות"</li>
          <li>📋 <strong>חיפוש מכרזים נקודתי:</strong><br />
            <code className="bg-gray-100 px-1 rounded text-xs">חפש במכרזים [נושא]</code>
          </li>
          <li>🔄 <strong>שיחה חדשה</strong> — מאפסת הכל ומתחילה מחדש</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
          💾 המסמך והשיחה נשמרים אוטומטית — גם לאחר רענון הדף
        </p>
      </div>
    ),
    spoken:
      'אחרי שהמסמך מוכן, תוכל לבקש שינויים בשפה חופשית לגמרי — פשוט תגיד מה לשנות. אם תרצה לחפש מכרזים נוספים בנושא מסוים, תגיד חפש במכרזים ואחרי זה את הנושא. כדי להתחיל נושא חדש לגמרי, לחץ על שיחה חדשה וכל המסמך, הצ\'אט והמחקר יתאפסו. אל דאגה — הגודל של חלונית הצ\'אט נשמר גם אחרי איפוס.',
  },
];

// ─── Positioning constants ────────────────────────────────────────────────────

const CARD_W = 420;
const CARD_H = 320;
const GAP = 16;

interface CardPos {
  top: number;
  left: number;
  arrowSide: 'top' | 'bottom' | 'left' | 'right';
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── TTS helper ──────────────────────────────────────────────────────────────

function speak(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'he-IL';
  utt.rate = 0.95;
  utt.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const heVoice = voices.find((v) => v.lang.startsWith('he')) || null;
  if (heVoice) utt.voice = heVoice;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ─── WalkMe component ─────────────────────────────────────────────────────────

interface WalkMeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalkMe({ isOpen, onClose }: WalkMeProps) {
  const [step, setStep] = React.useState(0);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [pos, setPos] = React.useState<CardPos | null>(null);
  const [highlightRect, setHighlightRect] = React.useState<HighlightRect | null>(null);
  const hasSpoken = useRef(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Compute card position + highlight rect relative to target element
  useEffect(() => {
    if (!isOpen) { setPos(null); setHighlightRect(null); return; }

    const timer = setTimeout(() => {
      const el = current.targetId ? document.getElementById(current.targetId) : null;
      if (!el) { setPos(null); setHighlightRect(null); return; }

      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const side = current.preferredSide ?? 'bottom';
      let top = 0, left = 0;

      if (side === 'bottom') {
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2 - CARD_W / 2;
      } else if (side === 'top') {
        top = rect.top - CARD_H - GAP;
        left = rect.left + rect.width / 2 - CARD_W / 2;
      } else if (side === 'left') {
        left = rect.left - CARD_W - GAP;
        top = rect.top + rect.height / 2 - CARD_H / 2;
      } else {
        left = rect.right + GAP;
        top = rect.top + rect.height / 2 - CARD_H / 2;
      }

      // Clamp to viewport edges
      left = Math.max(8, Math.min(left, vw - CARD_W - 8));
      top  = Math.max(8, Math.min(top,  vh - CARD_H - 8));

      const arrowSide: CardPos['arrowSide'] =
        side === 'bottom' ? 'top' :
        side === 'top'    ? 'bottom' :
        side === 'left'   ? 'right'  : 'left';

      setPos({ top, left, arrowSide });

      // Store target rect for highlight overlay (with padding)
      const PAD = 6;
      setHighlightRect({
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      });
    }, 50);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isOpen]);

  // Speak current step whenever step changes (while open)
  useEffect(() => {
    if (!isOpen) return;
    setIsSpeaking(true);
    hasSpoken.current = true;
    speak(current.spoken, () => setIsSpeaking(false));
    return () => { stopSpeech(); setIsSpeaking(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isOpen]);

  // Reset to step 0 when opened
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      hasSpoken.current = false;
    } else {
      stopSpeech();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (isLast) onClose();
    else setStep((s) => s + 1);
  }, [isLast, onClose]);

  const handleStop = useCallback(() => {
    stopSpeech();
    onClose();
  }, [onClose]);

  const toggleSpeech = useCallback(() => {
    if (isSpeaking) { stopSpeech(); setIsSpeaking(false); }
    else { setIsSpeaking(true); speak(current.spoken, () => setIsSpeaking(false)); }
  }, [isSpeaking, current.spoken]);

  if (!isOpen) return null;

  const cardStyle: React.CSSProperties = pos
    ? { top: pos.top, left: pos.left }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/25 z-40" onClick={handleStop} />

      {/* ── Target highlight ring (between backdrop and card) ── */}
      {highlightRect && (
        <div
          className="fixed pointer-events-none z-[45] rounded-lg"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            border: '2.5px solid #6366f1',
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.35), 0 0 18px rgba(99, 102, 241, 0.5)',
            animation: 'walkme-pulse 1.8s ease-in-out infinite',
          }}
        />
      )}

      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes walkme-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.35), 0 0 18px rgba(99,102,241,0.5); }
          50%       { box-shadow: 0 0 0 7px rgba(99,102,241,0.15), 0 0 28px rgba(99,102,241,0.7); }
        }
      `}</style>

      {/* ── Tour card ── */}
      <div
        className="fixed z-50 w-[420px] max-w-[calc(100vw-2rem)]"
        style={cardStyle}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow — rotated square for better visibility */}
        {pos?.arrowSide === 'top' && (
          <div
            className="absolute -top-3 right-7"
            style={{
              width: 16, height: 16,
              background: '#4f46e5',
              transform: 'rotate(45deg)',
              boxShadow: '-2px -2px 4px rgba(0,0,0,0.15)',
              zIndex: -1,
            }}
          />
        )}
        {pos?.arrowSide === 'bottom' && (
          <div
            className="absolute -bottom-3 right-7"
            style={{
              width: 16, height: 16,
              background: 'white',
              border: '1px solid #e5e7eb',
              transform: 'rotate(45deg)',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.08)',
              zIndex: -1,
            }}
          />
        )}
        {pos?.arrowSide === 'right' && (
          <div
            className="absolute -right-3 top-7"
            style={{
              width: 16, height: 16,
              background: '#4f46e5',
              transform: 'rotate(45deg)',
              boxShadow: '2px -2px 4px rgba(0,0,0,0.15)',
              zIndex: -1,
            }}
          />
        )}
        {pos?.arrowSide === 'left' && (
          <div
            className="absolute -left-3 top-7"
            style={{
              width: 16, height: 16,
              background: '#4f46e5',
              transform: 'rotate(45deg)',
              boxShadow: '-2px 2px 4px rgba(0,0,0,0.15)',
              zIndex: -1,
            }}
          />
        )}

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="bg-indigo-600 px-5 py-3 flex items-center gap-3">
            <span className="text-2xl">{current.icon}</span>
            <div className="flex-1">
              <p className="text-[10px] text-indigo-300 font-medium">
                סיור מודרך · שלב {step + 1} מתוך {STEPS.length}
              </p>
              <h3 className="text-white font-bold text-sm">{current.title}</h3>
            </div>
            {/* Step dots */}
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step ? 'bg-white' : 'bg-indigo-400 hover:bg-indigo-200'
                  }`}
                  title={STEPS[i].title}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-indigo-100">
            <div
              className="h-full bg-indigo-400 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {current.written}
          </div>

          {/* Footer */}
          <div className="px-5 pb-4 flex items-center gap-3">
            <button
              onClick={toggleSpeech}
              title={isSpeaking ? 'עצור קריינות' : 'הפעל קריינות'}
              className={`p-2 rounded-lg text-sm transition-colors border ${
                isSpeaking
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700 animate-pulse'
                  : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {isSpeaking ? '🔊' : '🔈'}
            </button>

            <div className="flex-1" />

            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              סגור
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              {isLast ? '✓ סיים' : 'המשך →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

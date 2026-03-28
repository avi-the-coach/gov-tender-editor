import React, { useState } from 'react';
import { Icons } from '../constants';
import { GeminiService } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isApiConfigured: boolean;
  onApiChange: (configured: boolean) => void;
}

const GITHUB_URL = 'https://github.com/avi-the-coach/gov-tender-editor';

export function SettingsPanel({ isOpen, onClose, isApiConfigured, onApiChange }: Props) {
  const [key, setKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    localStorage.setItem('gemini-api-key', trimmed);
    setKey('');
    onApiChange(true);
  };

  const handleDelete = () => {
    localStorage.removeItem('gemini-api-key');
    onApiChange(false);
    setTestStatus('idle');
  };

  const handleTest = async () => {
    setTestStatus('testing');
    const service = new GeminiService();
    const ok = await service.testConnection();
    setTestStatus(ok ? 'ok' : 'fail');
    setTimeout(() => setTestStatus('idle'), 4000);
  };

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">הגדרות</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
            title="סגור"
          >
            <Icons.X />
          </button>
        </div>

        {/* When NO key: prominent setup section */}
        {!isApiConfigured && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm font-semibold text-indigo-800 mb-1">
              🤖 להפעלת האפליקציה נדרש Gemini API Key
            </p>
            <p className="text-xs text-indigo-700 leading-relaxed mb-2">
              האפליקציה משתמשת ב-Google Gemini AI ליצירת מסמכי מכרז. עליך לספק
              מפתח API אישי — הוא חינמי לשימוש בסיסי.
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              🆓 קבל API Key חינמי ב-Google AI Studio ↗
            </a>
          </div>
        )}

        {/* API Key Status row */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isApiConfigured ? 'bg-green-500' : 'bg-red-500 animate-pulse'
            }`}
          />
          <span className="text-xs text-gray-700">
            {isApiConfigured ? 'Gemini API Key פעיל' : 'API Key לא מוגדר'}
          </span>

          {isApiConfigured && (
            <div className="flex items-center gap-1.5 mr-auto">
              {/* Test button */}
              <button
                onClick={handleTest}
                disabled={testStatus === 'testing'}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
              >
                {testStatus === 'testing' ? (
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : 'בדוק חיבור'}
              </button>

              {testStatus === 'ok' && (
                <span className="text-xs text-green-600 font-medium">✓ תקין</span>
              )}
              {testStatus === 'fail' && (
                <span className="text-xs text-red-600 font-medium">✗ שגיאה</span>
              )}

              <button
                onClick={handleDelete}
                title="מחק API Key"
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Icons.Trash />
              </button>
            </div>
          )}
        </div>

        {/* API Key input */}
        <div className="flex gap-2 mb-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            placeholder={isApiConfigured ? 'החלף API Key — הכנס Key חדש...' : 'AIza...'}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono text-left outline-none focus:border-indigo-400 bg-white"
            dir="ltr"
          />
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            שמור
          </button>
        </div>

        {!isApiConfigured && (
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-3 text-xs text-indigo-500 hover:underline"
          >
            קבל API Key חינמי ב-Google AI Studio ↗
          </a>
        )}

        {/* Privacy + Disclaimer — always shown inside settings */}
        <div className="border-t border-gray-200 pt-3 space-y-2">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            🔒 <strong>פרטיות:</strong> כל המידע (כולל ה-API Key) נשמר בלוקל סטורג׳ של הדפדפן בלבד.
            שום נתון לא נשלח לשרת לשמירה או עיבוד נוסף.
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            ⚠️ <strong>הצהרת אחריות:</strong> אפליקציה זו מהווה הדגמה טכנית (POC) בלבד.
            אין ליוצריה כל אחריות לתוצאות הנובעות מכל שימוש, לרבות שימוש מסחרי.
          </p>
          <p className="text-[11px] text-gray-500">
            💻 <strong>קוד פתוח:</strong>{' '}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:underline"
            >
              github.com/avi-the-coach/gov-tender-editor ↗
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

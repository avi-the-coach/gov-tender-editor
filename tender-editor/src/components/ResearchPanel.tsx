import React, { useState } from 'react';
import { ResearchCard, InsightsResult } from '../types';

interface ResearchPanelProps {
  cards: ResearchCard[];
  insights: InsightsResult | null;
  isLoading: boolean;
}

function CardItem({ card }: { card: ResearchCard }) {
  const [isOpen, setIsOpen] = useState(true);
  const isTender = card.type === 'tender';

  return (
    <div
      className={`rounded-lg overflow-hidden border transition-all ${
        isTender
          ? 'border-indigo-300 shadow-sm shadow-indigo-100'
          : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none ${
          isTender
            ? 'bg-indigo-50 hover:bg-indigo-100'
            : 'bg-gray-50 hover:bg-gray-100'
        }`}
        onClick={() => setIsOpen((o) => !o)}
      >
        {/* Icon + badge */}
        <span className="text-sm shrink-0">{isTender ? '📋' : '🌐'}</span>
        {isTender && (
          <span className="text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded shrink-0">
            מכרז
          </span>
        )}
        {/* Relevance score badge */}
        {isTender && card.relevanceScore !== undefined && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
              card.relevanceScore >= 5 ? 'bg-green-100 text-green-700' :
              card.relevanceScore >= 4 ? 'bg-emerald-100 text-emerald-700' :
              'bg-yellow-100 text-yellow-700'
            }`}
            title={`ציון רלוונטיות: ${card.relevanceScore}/5`}
          >
            {'★'.repeat(card.relevanceScore)}{'☆'.repeat(5 - card.relevanceScore)}
          </span>
        )}

        {/* Title */}
        <span
          className={`flex-1 text-xs font-medium truncate ${
            isTender ? 'text-indigo-800' : 'text-gray-700'
          }`}
          title={card.title}
        >
          {card.title}
        </span>

        {/* Link — stops propagation so click doesn't toggle */}
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`text-xs shrink-0 hover:underline ${
            isTender ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-500'
          }`}
          title="פתח מקור"
        >
          ↗
        </a>

        {/* Toggle arrow */}
        <span className={`text-xs shrink-0 transition-transform ${isOpen ? '' : 'rotate-180'} ${isTender ? 'text-indigo-400' : 'text-gray-400'}`}>
          ▲
        </span>
      </div>

      {/* Body */}
      {isOpen && (
        <div
          className={`px-3 py-2 text-xs leading-relaxed border-t ${
            isTender
              ? 'bg-white text-indigo-700 border-indigo-100'
              : 'bg-white text-gray-600 border-gray-100'
          }`}
        >
          {/* AI Reasoning — shown for all card types when available */}
          {card.reasoning && (
            <div className={`mb-2 flex gap-1.5 rounded px-2 py-1.5 border ${
              isTender
                ? 'bg-indigo-50 border-indigo-100'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <span className="shrink-0 text-indigo-400">💡</span>
              <p className={`leading-snug ${isTender ? 'text-indigo-700' : 'text-gray-600'}`}>
                {card.reasoning}
              </p>
            </div>
          )}


          {/* Context snippet (subjects + publisher) */}
          {card.snippet ? (
            <p className="mb-1.5 text-gray-500">{card.snippet}</p>
          ) : (
            <p className="text-gray-400 italic mb-1.5">אין תקציר זמין</p>
          )}

          {/* Date */}
          {isTender && card.date && (
            <p className="text-indigo-400 text-[10px] mb-1.5">{card.date}</p>
          )}

          {/* Document download links */}
          {isTender && card.docInfos && card.docInfos.length > 0 && (
            <div className="mt-2 pt-2 border-t border-indigo-100 flex flex-wrap gap-1.5">
              {card.docInfos.map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={`הורד: ${doc.name}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium border border-indigo-200 transition-colors"
                >
                  ⬇ {doc.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({ cards, insights, isLoading }) => {
  if (cards.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-sm font-medium">מחקר אינטרנטי</p>
        <p className="text-xs mt-2 leading-relaxed">
          כאשר העוזר מחפש מידע ברשת,
          <br />
          התוצאות יופיעו כאן בזמן אמת.
        </p>
      </div>
    );
  }

  const webCards = cards.filter((c) => c.type === 'web');
  const tenderCards = cards.filter((c) => c.type === 'tender');

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-2 text-sm" dir="rtl">

      {/* Loading spinner */}
      {isLoading && (
        <div className="flex items-center gap-2 text-indigo-400 text-xs py-1">
          <span className="animate-spin inline-block">⏳</span>
          <span>מחפש מכרזים...</span>
        </div>
      )}

      {/* Tender cards section */}
      {tenderCards.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">
              📋 מכרזים ({tenderCards.length})
            </span>
            {tenderCards.some(c => c.analysisSkipped) && (
              <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5" title="ניתוח AI לא הצליח — מכסת Gemini API הגיעה לגבולה. המכרזים מוצגים ללא ניתוח רלוונטיות.">
                ⏸ ללא ניתוח AI
              </span>
            )}
          </div>
          {tenderCards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* Web cards section */}
      {webCards.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1">
            🌐 מקורות אינטרנט ({webCards.length})
          </div>
          {webCards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* Insights summary */}
      {insights && (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="font-semibold text-amber-700 mb-2 text-xs">
            💡 תובנות ({insights.tenders_analyzed} מכרזים נותחו):
          </div>
          {insights.common_requirements?.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 font-medium mb-1">דרישות נפוצות:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {insights.common_requirements.map((req, i) => (
                  <li key={i} className="text-xs text-gray-700">{req}</li>
                ))}
              </ul>
            </div>
          )}
          {insights.recommendations?.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 font-medium mb-1">המלצות:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {insights.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>
          )}
          {insights.red_flags?.length > 0 && (
            <div>
              <div className="text-xs text-red-500 font-medium mb-1">⚠️ נקודות לתשומת לב:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {insights.red_flags.map((flag, i) => (
                  <li key={i} className="text-xs text-red-600">{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

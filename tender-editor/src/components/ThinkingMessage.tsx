import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ThinkingStep } from '../types';

interface ThinkingMessageProps {
  steps: ThinkingStep[];
  text: string;
  isDone: boolean;
}

export const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ steps, text, isDone }) => {
  return (
    <div className="flex flex-col gap-2 text-sm w-full">
      {/* Progress steps block */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 flex flex-col gap-2">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col gap-0.5">
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-xs leading-4 mt-0.5">
                {step.status === 'done'
                  ? '✅'
                  : step.status === 'active'
                  ? <span className="inline-block animate-spin">⏳</span>
                  : step.status === 'error'
                  ? '❌'
                  : <span className="text-gray-300">○</span>}
              </span>
              <span
                className={`text-xs leading-snug ${
                  step.status === 'active'
                    ? 'text-indigo-700 font-medium'
                    : step.status === 'done'
                    ? 'text-gray-500'
                    : step.status === 'error'
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}
              >
                {step.text}
              </span>
            </div>
            {/* Sub-items: individual tender titles */}
            {step.subItems && step.subItems.length > 0 && (
              <div className="mr-6 flex flex-col gap-0.5 mt-0.5">
                {step.subItems.slice(-5).map((item, i) => (
                  <div key={i} className="text-[10px] text-indigo-500 leading-tight">
                    → {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply text — streaming during step 3, full markdown when done */}
      {text && (
        isDone ? (
          <div className="leading-relaxed prose prose-sm max-w-none
            prose-headings:font-bold prose-headings:text-gray-800
            prose-h2:text-sm prose-h3:text-sm
            prose-p:my-1 prose-p:leading-relaxed
            prose-ul:my-1 prose-ul:pr-4 prose-ul:list-disc
            prose-li:my-0.5
            prose-strong:font-semibold prose-strong:text-gray-900
          ">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic leading-relaxed">{text}</p>
        )
      )}
    </div>
  );
};

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Icons } from '../constants';
import { ThinkingMessage } from './ThinkingMessage';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex w-full mb-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'} gap-2`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isModel ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isModel ? <Icons.Robot /> : <Icons.User />}
        </div>
        <div
          className={`flex flex-col gap-2 p-3 rounded-lg shadow-sm ${
            isModel
              ? 'bg-white border border-gray-200 text-gray-800 rounded-tr-none'
              : 'bg-indigo-600 text-white rounded-tl-none'
          }`}
        >
          {isModel ? (
            message.steps ? (
              /* Agentic thinking/progress message */
              <ThinkingMessage
                steps={message.steps}
                text={message.text}
                isDone={message.isThinkingDone ?? false}
              />
            ) : (
            <div className="text-sm leading-relaxed prose prose-sm max-w-none
              prose-headings:font-bold prose-headings:text-gray-800
              prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
              prose-p:my-1 prose-p:leading-relaxed
              prose-ul:my-1 prose-ul:pr-4 prose-ul:list-disc
              prose-ol:my-1 prose-ol:pr-4 prose-ol:list-decimal
              prose-li:my-0.5
              prose-strong:font-semibold prose-strong:text-gray-900
              prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
              prose-pre:bg-gray-100 prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:text-xs
              prose-blockquote:border-r-4 prose-blockquote:border-indigo-300 prose-blockquote:pr-3 prose-blockquote:text-gray-600
              prose-a:text-indigo-600 prose-a:underline
            ">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
            )
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</div>
          )}

          {isModel && message.sources && message.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-400 mb-1">מקורות מידע:</div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs bg-gray-50 text-indigo-600 px-2 py-1 rounded border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors truncate max-w-[200px]"
                    title={source.title}
                  >
                    <span className="truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

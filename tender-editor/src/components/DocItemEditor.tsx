import React from 'react';
import { NumberedDocItem } from '../types';
import { Icons } from '../constants';

interface DocItemEditorProps {
  item: NumberedDocItem;
  isValidIndent: boolean;
  onUpdate: (id: string, field: 'title' | 'content', value: string) => void;
  onLevelChange: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export const DocItemEditor: React.FC<DocItemEditorProps> = ({
  item,
  isValidIndent,
  onUpdate,
  onLevelChange,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
}) => {
  const paddingRight = item.level * 24;

  return (
    <div
      className="group relative flex items-start gap-3 mb-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 hover:border-indigo-200 transition-all shadow-sm"
      style={{ marginRight: `${paddingRight}px` }}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      {/* Drag Handle */}
      <div className="shrink-0 mt-3 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500">
        <Icons.GripVertical />
      </div>

      {/* Numbering Badge */}
      <div className="shrink-0 mt-2 font-mono text-sm font-bold text-gray-500 w-12 text-right select-none">
        {item.numberString}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2">
        <input
          type="text"
          value={item.title}
          onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
          placeholder="כותרת..."
          className="w-full text-sm font-semibold bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-gray-800 py-1"
        />
        <textarea
          value={item.content}
          onChange={(e) => onUpdate(item.id, 'content', e.target.value)}
          placeholder="תוכן (אופציונלי)..."
          rows={2}
          className="w-full text-sm bg-transparent border border-transparent focus:border-indigo-200 focus:bg-white rounded outline-none text-gray-600 resize-none p-1"
        />
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onLevelChange(item.id, -1)}
          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
          title="הזח ימינה (רמה נמוכה יותר)"
        >
          <Icons.IndentRight />
        </button>
        <button
          onClick={() => onLevelChange(item.id, 1)}
          disabled={!isValidIndent}
          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30"
          title="הזח שמאלה (רמה גבוהה יותר)"
        >
          <Icons.IndentLeft />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="מחק"
        >
          <Icons.Trash />
        </button>
      </div>
    </div>
  );
};

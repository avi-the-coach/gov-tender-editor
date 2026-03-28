import { DocItem, NumberedDocItem } from './types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const calculateNumbering = (items: DocItem[]): NumberedDocItem[] => {
  const counters: number[] = [];
  return items.map((item) => {
    while (counters.length <= item.level) {
      counters.push(0);
    }
    counters[item.level]++;
    for (let i = item.level + 1; i < counters.length; i++) {
      counters[i] = 0;
    }
    const numberString = counters.slice(0, item.level + 1).join('.') + '.';
    return { ...item, numberString };
  });
};

export const isValidLevel = (items: DocItem[], index: number, newLevel: number): boolean => {
  if (newLevel < 0) return false;
  if (index === 0) return newLevel === 0;
  const prevLevel = items[index - 1].level;
  return newLevel <= prevLevel + 1;
};

export const getBlockRange = (
  items: DocItem[],
  startIndex: number
): { start: number; end: number } => {
  if (startIndex < 0 || startIndex >= items.length) {
    return { start: startIndex, end: startIndex };
  }
  const parentLevel = items[startIndex].level;
  let endIndex = startIndex;
  for (let i = startIndex + 1; i < items.length; i++) {
    if (items[i].level > parentLevel) {
      endIndex = i;
    } else {
      break;
    }
  }
  return { start: startIndex, end: endIndex };
};

export const docToMarkdown = (items: NumberedDocItem[]): string => {
  return items
    .map((item) => {
      const hashes = '#'.repeat(item.level + 1);
      const title = `${hashes} ${item.numberString} ${item.title}`;
      return item.content ? `${title}\n\n${item.content}` : title;
    })
    .join('\n\n');
};

export const docToHtml = (items: NumberedDocItem[]): string => {
  const body = items
    .map((item) => {
      const tag = `h${item.level + 1}`;
      const title = `<${tag}>${item.numberString} ${item.title}</${tag}>`;
      const content = item.content ? `<p>${item.content.replace(/\n/g, '<br/>')}</p>` : '';
      return `${title}${content}`;
    })
    .join('\n');
  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>מפרט טכני</title></head><body>${body}</body></html>`;
};

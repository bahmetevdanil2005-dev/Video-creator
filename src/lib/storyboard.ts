import type { Scene, VideoSettings } from '../types';

const accents = ['#f3b45b', '#71d8c4', '#a995ff', '#f27d91', '#75a9ef', '#e5c66d', '#c28ce8'];
const visuals = ['photo-pan', 'photo-zoom', 'photo-split', 'photo-focus', 'photo-slide', 'photo-detail', 'photo-wide'];
const stopWords = /^(создай|сделай|покажи|расскажи|видео|ролик|про|для|это|который|которая|затем|потом|очень|самый|также|чтобы|можно|будет|этого|этой|этот|когда|почему|какой|какая|сейчас|здесь|там|его|ее|их|они|мы|вы|как)$/i;

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[-–—:;,\s]+|[-–—:;,\s]+$/g, '').trim();
}

function makeSegments(prompt: string): string[] {
  const sentences = prompt.split(/(?<=[.!?])\s+|\n+|\s+[;—]\s+/).map(cleanText).filter(part => part.length > 9);
  if (sentences.length >= 3) return sentences.slice(0, 7);

  const clauses = prompt.split(/,|:|\s+и\s+|\s+но\s+|\s+затем\s+|\s+после этого\s+|\s+потому что\s+/i)
    .map(cleanText).filter(part => part.length > 9);
  if (clauses.length >= 3) return clauses.slice(0, 7);

  const words = cleanText(prompt).split(/\s+/);
  if (words.length < 9) return [cleanText(prompt), 'Ключевая идея и её значение', 'Финальный результат и главный вывод'];
  const count = Math.min(5, Math.max(3, Math.ceil(words.length / 8)));
  const chunkSize = Math.ceil(words.length / count);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) chunks.push(words.slice(i, i + chunkSize).join(' '));
  return chunks;
}

function visualQuery(text: string): string {
  return cleanText(text).replace(/[.!?()[\]{}]/g, ' ').split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.test(word))
    .slice(0, 7).join(' ');
}

function makeTitle(text: string, index: number, total: number): string {
  const labels = ['Главный тезис', 'Погружение в тему', 'Ключевая деталь', 'Как это работает', 'Что меняется', 'Новый взгляд', 'Финальный вывод'];
  // A short topic phrase makes each title specific instead of repeating generic scene names.
  const topic = cleanText(text).replace(/[.!?].*$/, '').split(/\s+/).filter(word => word.length > 2).slice(0, 4).join(' ');
  const title = topic.length >= 5 ? topic.charAt(0).toLocaleUpperCase('ru-RU') + topic.slice(1) : labels[index] || 'Важная деталь';
  if (index === 0 && total > 2) return title;
  if (index === total - 1) return title.length > 27 ? 'Главный вывод' : title;
  return title.length > 32 ? labels[index] || 'Важная деталь' : title;
}

export function createStoryboard(settings: VideoSettings): Scene[] {
  const prompt = cleanText(settings.prompt) || 'Новая идея для видео';
  const segments = makeSegments(prompt);
  const content = segments.length >= 3 ? segments : [prompt, 'Главная идея и важная деталь', 'Результат и вывод'];
  const count = Math.min(7, Math.max(3, content.length));
  const selected = Array.from({ length: count }, (_, i) => content[i] || content[content.length - 1]);

  // Allocate exact total duration while giving the hook and closing beat more breathing room.
  const weights = selected.map((_, i) => i === 0 ? 1.25 : i === selected.length - 1 ? 1.15 : 1);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map(weight => settings.duration * weight / weightSum);
  const durations = raw.map(Math.floor);
  let remainder = settings.duration - durations.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remainder; i++) durations[order[i % order.length].index] += 1;

  return selected.map((description, index) => ({
    id: index + 1,
    title: makeTitle(description, index, selected.length),
    description,
    duration: durations[index],
    visual: visuals[index % visuals.length],
    accent: accents[index % accents.length],
    imageQuery: visualQuery(description) || visualQuery(prompt),
  }));
}

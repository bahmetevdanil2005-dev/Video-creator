import type { Scene, VideoSettings } from '../types';

const accents = ['#f3b45b', '#71d8c4', '#a995ff', '#f27d91', '#75a9ef', '#e5c66d', '#c28ce8'];
const visuals = ['photo-pan', 'photo-zoom', 'photo-split', 'photo-focus', 'photo-slide', 'photo-detail', 'photo-wide'];

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[-–—:;,\s]+|[-–—:;,\s]+$/g, '').trim();
}
function makeSegments(prompt: string): string[] {
  const sentences = prompt.split(/(?<=[.!?])\s+|\n+|\s+[;—]\s+/).map(cleanText).filter(part => part.length > 12);
  if (sentences.length >= 3) return sentences.slice(0, 7);
  const clauses = prompt.split(/,|:|\s+и\s+|\s+но\s+|\s+затем\s+|\s+потому что\s+/i).map(cleanText).filter(part => part.length > 10);
  if (clauses.length >= 3) return clauses.slice(0, 7);
  const words = cleanText(prompt).split(/\s+/);
  const chunks: string[] = [];
  const size = Math.max(4, Math.ceil(words.length / 4));
  for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).join(' '));
  return chunks.filter(Boolean);
}
function visualQuery(text: string): string {
  return cleanText(text).replace(/[.!?()[\]{}]/g, ' ').split(/\s+/)
    .filter(word => word.length > 3 && !/^(создай|сделай|покажи|расскажи|видео|ролик|про|для|это|который|которая|затем|потом|очень|самый)$/i.test(word))
    .slice(0, 7).join(' ');
}
export function createStoryboard(settings: VideoSettings): Scene[] {
  const prompt = cleanText(settings.prompt) || 'Новая идея для видео';
  const segments = makeSegments(prompt);
  const fallback = [prompt, 'Почему это важно сейчас', 'Как это работает на практике', 'Что изменится дальше'];
  const content = segments.length >= 2 ? segments : fallback;
  const titles = ['Зацепка', 'Контекст', 'Главная деталь', 'Как это работает', 'Последствия', 'Что дальше', 'Вывод'];
  const count = Math.min(7, Math.max(3, content.length));
  const selected = Array.from({ length: count }, (_, i) => content[i] || fallback[i % fallback.length]);
  const weights = selected.map((_, i) => i === 0 ? 0.16 : i === selected.length - 1 ? 0.14 : 0.7 / Math.max(1, selected.length - 2));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = settings.duration;
  return selected.map((description, index) => {
    const duration = index === selected.length - 1 ? remaining : Math.max(2, Math.round(settings.duration * weights[index] / totalWeight));
    remaining -= duration;
    return {
      id: index + 1,
      title: index === 0 ? 'Почему это важно' : index === selected.length - 1 ? 'Главный вывод' : titles[index] || 'Деталь истории',
      description, duration, visual: visuals[index % visuals.length], accent: accents[index % accents.length],
      imageQuery: visualQuery(description) || visualQuery(prompt),
    };
  });
}

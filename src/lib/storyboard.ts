import type { Scene, VideoSettings } from '../types';

const presets = [
  { title: 'Сильное открытие', description: 'Крупный заголовок и выразительный визуальный акцент', visual: 'title', accent: '#a78bfa' },
  { title: 'Главная идея', description: 'Ключевая мысль раскрывается через графику и движение', visual: 'orbit', accent: '#5eead4' },
  { title: 'Детали и факты', description: 'Инфографика, цифры и динамичная композиция', visual: 'bars', accent: '#fbbf24' },
  { title: 'Финальный акцент', description: 'Запоминающееся завершение и короткий вывод', visual: 'finish', accent: '#fb7185' },
];

export function createStoryboard(settings: VideoSettings): Scene[] {
  const words = settings.prompt.trim().split(/\s+/).filter(Boolean);
  const subject = words.length > 0 ? settings.prompt.trim().replace(/[.!?]+$/, '') : 'Новая идея';
  const titles = ['Завязка', 'Раскрытие идеи', 'Визуальное объяснение', 'Финал'];
  const total = settings.duration;
  const weights = [0.18, 0.32, 0.30, 0.20];
  return presets.map((preset, index) => ({
    id: index + 1,
    title: titles[index],
    description: index === 0 ? subject : preset.description,
    duration: Math.max(2, Math.round(total * weights[index])),
    visual: preset.visual,
    accent: preset.accent,
  }));
}
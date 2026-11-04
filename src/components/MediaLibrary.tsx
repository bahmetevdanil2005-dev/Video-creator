import { useState } from 'react';
import { Image, LoaderCircle, RefreshCw, Search, ExternalLink } from 'lucide-react';
import type { Scene } from '../types';

type Media = Pick<Scene, 'imageUrl' | 'imageTitle' | 'imagePage' | 'imageCredit'>;
interface Props { scenes: Scene[]; onUpdate: (id: number, media: Media) => void; }
interface SearchPage { pageid: number; title: string; }
interface ImagePage {
  title: string;
  imageinfo?: Array<{ thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }>;
}

async function findCommonsImage(scene: Scene): Promise<Media> {
  const query = (scene.imageQuery || scene.description || scene.title)
    .replace(/[|{}[\]<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (!query) throw new Error('Нет поискового запроса для сцены');
  const search = new URLSearchParams({
    action: 'query', list: 'search', srsearch: query, srnamespace: '6',
    srlimit: '12', srprop: 'titlesnippet', origin: '*', format: 'json',
  });
  const searchResponse = await fetch('https://commons.wikimedia.org/w/api.php?' + search);
  if (!searchResponse.ok) throw new Error('Ошибка поиска Wikimedia');
  const searchData = await searchResponse.json();
  const matches = (searchData.query?.search ?? []) as SearchPage[];
  if (!matches.length) throw new Error('Ничего не найдено');
  const ids = matches.map(item => item.pageid).join('|');
  const details = new URLSearchParams({
    action: 'query', pageids: ids, prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '1400', origin: '*', format: 'json',
  });
  const detailResponse = await fetch('https://commons.wikimedia.org/w/api.php?' + details);
  if (!detailResponse.ok) throw new Error('Не удалось получить файл');
  const detailData = await detailResponse.json();
  const pages = Object.values((detailData.query?.pages ?? {}) as Record<string, ImagePage>);
  const usable = pages.find(page => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url);
  const info = usable?.imageinfo?.[0];
  if (!usable || !info) throw new Error('Нет доступного изображения');
  const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '').slice(0, 160) ?? 'Wikimedia Commons';
  return {
    imageUrl: info.thumburl || info.url,
    imageTitle: usable.title.replace(/^File:/, ''),
    imagePage: info.descriptionurl,
    imageCredit: artist,
  };
}

export default function MediaLibrary({ scenes, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState<number[]>([]);

  async function searchAll() {
    if (loading) return;
    setLoading(true);
    setFailed([]);
    setStatus('Ищем изображения по отдельному запросу для каждой сцены…');
    const missing = scenes.filter(scene => !scene.imageUrl);
    let found = 0;
    const failures: number[] = [];
    for (const scene of missing) {
      try {
        const media = await findCommonsImage(scene);
        onUpdate(scene.id, media);
        found += 1;
      } catch {
        failures.push(scene.id);
      }
    }
    setFailed(failures);
    setStatus(found
      ? `Найдено изображений: ${found} из ${missing.length}. Проверь соответствие теме.`
      : 'По этим формулировкам Wikimedia Commons ничего не нашла. Попробуй добавить конкретные названия объектов или места.');
    setLoading(false);
  }

  function resetImages() {
    scenes.forEach(scene => onUpdate(scene.id, { imageUrl: undefined, imageTitle: undefined, imagePage: undefined, imageCredit: undefined }));
    setStatus('Фотографии сброшены. Можно выполнить новый поиск.');
    setFailed([]);
  }

  const ready = scenes.filter(scene => scene.imageUrl).length;
  return (
    <section className="media-library">
      <div className="media-library-heading">
        <div><span className="eyebrow">ВИЗУАЛЬНЫЕ МАТЕРИАЛЫ</span><h2>Фотографии сцен <span className="muted">({ready}/{scenes.length})</span></h2><p>Каждая сцена ищет отдельное изображение по своему содержанию.</p></div>
        <button className="media-refresh" onClick={resetImages} disabled={loading} aria-label="Сбросить фотографии"><RefreshCw size={15} /></button>
      </div>
      <div className="media-grid">
        {scenes.map(scene => <article className="media-card" key={scene.id}>
          {scene.imageUrl ? <img src={scene.imageUrl} alt={scene.imageTitle || scene.title} loading="lazy" /> : <div className="media-placeholder">{loading ? <LoaderCircle className="spin" size={20} /> : <Image size={20} />}</div>}
          <div className="media-card-info"><strong>{scene.title}</strong><small>{scene.imageTitle || (failed.includes(scene.id) ? 'Не найдено — уточни тему сцены' : scene.imageQuery || 'Ожидает поиска')}</small>
          {scene.imagePage && <a href={scene.imagePage} target="_blank" rel="noreferrer">Источник и лицензия <ExternalLink size={11} /></a>}</div>
        </article>)}
      </div>
      <div className="media-library-footer">
        <span>{status || 'Изображения не подставляются автоматически без проверки. Нажми поиск.'}</span>
        <button onClick={searchAll} disabled={loading || ready === scenes.length}><Search size={14} /> {loading ? 'Ищем…' : 'Найти фотографии'}</button>
      </div>
    </section>
  );
}

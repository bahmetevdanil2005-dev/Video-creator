import { useState } from 'react';
import { Image, LoaderCircle, RefreshCw, Search, ExternalLink } from 'lucide-react';
import type { Scene } from '../types';

type Media = Pick<Scene, 'imageUrl' | 'imageTitle' | 'imagePage' | 'imageCredit'>;
interface Props {
  scenes: Scene[];
  onUpdate: (id: number, media: Media) => void;
}

interface CommonsPage {
  title: string;
  imageinfo?: Array<{ thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }>;
}

async function findCommonsImage(scene: Scene): Promise<Media> {
  const query = [scene.description, scene.title]
    .join(' ')
    .replace(/[|{}[\]<>]/g, ' ')
    .slice(0, 150);
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: 'filetype:bitmap ' + query,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1200',
    origin: '*',
    format: 'json',
  });
  const response = await fetch('https://commons.wikimedia.org/w/api.php?' + params.toString());
  if (!response.ok) throw new Error('Источник изображений временно недоступен.');
  const data = await response.json();
  const pages = Object.values((data.query?.pages ?? {}) as Record<string, CommonsPage>);
  const usable = pages.find(page => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url);
  if (!usable?.imageinfo?.[0]) throw new Error('По этой сцене пока не нашлись подходящие фотографии.');
  const info = usable.imageinfo[0];
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
    setStatus('Ищем фотографии для каждой сцены в Wikimedia Commons…');
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
      ? `Найдено фотографий: ${found} из ${missing.length}. Проверь, подходят ли они к сценам.`
      : 'Подходящие изображения не найдены. Попробуй уточнить описание сцен.');
    setLoading(false);
  }



  const ready = scenes.filter(scene => scene.imageUrl).length;
  return (
    <section className="media-library">
      <div className="media-library-heading">
        <div><span className="eyebrow">ШАГ 03</span><h2>Фотографии для сцен <span className="muted">({ready}/{scenes.length})</span></h2><p>Поиск изображений в открытой медиатеке Wikimedia Commons.</p></div>
        <button className="media-refresh" onClick={() => { scenes.forEach(scene => onUpdate(scene.id, { imageUrl: undefined, imageTitle: undefined, imagePage: undefined, imageCredit: undefined })); }} disabled={loading} aria-label="Сбросить фотографии"><RefreshCw size={15} /></button>
      </div>
      <div className="media-grid">
        {scenes.map(scene => <article className="media-card" key={scene.id}>
          {scene.imageUrl ? <img src={scene.imageUrl} alt={scene.imageTitle || scene.title} loading="lazy" /> : <div className="media-placeholder">{loading ? <LoaderCircle className="spin" size={20} /> : <Image size={20} />}</div>}
          <div className="media-card-info"><strong>{scene.title}</strong><small>{scene.imageTitle || (failed.includes(scene.id) ? 'Фото не найдено' : 'Подбираем изображение…')}</small>
          {scene.imagePage && <a href={scene.imagePage} target="_blank" rel="noreferrer">Источник и лицензия <ExternalLink size={11} /></a>}</div>
        </article>)}
      </div>
      <div className="media-library-footer">
        <span>{status || 'Нажми «Найти фотографии», чтобы подобрать реальные изображения.'}</span>
        <button onClick={searchAll} disabled={loading || ready === scenes.length}><Search size={14} /> {loading ? 'Ищем…' : 'Найти фотографии'}</button>
      </div>
    </section>
  );
}

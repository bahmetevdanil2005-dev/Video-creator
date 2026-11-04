import { useMemo, useState } from 'react';
import { Aperture, ArrowDownToLine, Check, ChevronDown, Clapperboard, Clock3, Film, Layers3, Plus, Ratio, Settings2, Sparkles, WandSparkles } from 'lucide-react';
import Preview from './components/Preview';
import { createStoryboard } from './lib/storyboard';
import type { AspectRatio, Scene, VideoSettings, VisualStyle } from './types';

const initialSettings: VideoSettings = { prompt: '', aspectRatio: '9:16', duration: 20, style: 'cinematic' };

export default function App() {
  const [settings, setSettings] = useState<VideoSettings>(initialSettings);
  const [scenes, setScenes] = useState<Scene[]>(() => createStoryboard({ ...initialSettings, prompt: 'Технологии меняют наше будущее' }));
  const [activeScene, setActiveScene] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [notice, setNotice] = useState('');
  const totalDuration = useMemo(() => scenes.reduce((sum, scene) => sum + scene.duration, 0), [scenes]);

  const update = <K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) => setSettings(current => ({ ...current, [key]: value }));

  function generate() {
    if (!settings.prompt.trim()) {
      setNotice('Сначала опиши видео — хотя бы в нескольких предложениях.');
      return;
    }
    setScenes(createStoryboard(settings));
    setActiveScene(0);
    setGenerated(true);
    setNotice('Раскадровка создана. Сейчас это демонстрационный режим без подключения AI.');
  }

  function exportConcept() {
    const content = JSON.stringify({ settings, scenes }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video-creator-storyboard.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Файл раскадровки сохранён.');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark"><Aperture size={19} /></span><span>VIDEO<span className="brand-light">CREATOR</span><small>MOTION STUDIO</small></span></a>
        <div className="topbar-center"><span className="online-dot" /> Локальный проект <span className="topbar-divider">/</span> Без платных API</div>
        <button className="avatar-button" aria-label="Настройки"><Settings2 size={18} /></button>
      </header>

      <div className="workspace" id="top">
        <aside className="sidebar">
          <div className="side-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
          <button className="side-link selected"><Clapperboard size={17} /> Создать видео</button>
          <button className="side-link" onClick={() => setNotice('История проектов появится на следующем этапе.')}><Film size={17} /> Мои проекты</button>
          <button className="side-link" onClick={() => setNotice('Библиотеку стилей добавим следующим этапом.')}><Layers3 size={17} /> Библиотека</button>
          <div className="sidebar-bottom"><div className="free-card"><Sparkles size={16} /><strong>Бесплатная основа</strong><p>Без подписок и платных API на этом этапе.</p></div><span className="version">VERSION 0.1.0</span></div>
        </aside>

        <section className="main-content">
          <div className="page-intro"><div><div className="eyebrow">AI MOTION WORKFLOW</div><h1>Создай своё видео</h1><p>Опиши идею. Подготовим структуру сцен и визуальную концепцию.</p></div><span className="draft-chip"><span /> Черновик проекта</span></div>

          <div className="editor-grid">
            <section className="prompt-panel">
              <div className="panel-heading"><div><span className="eyebrow">ШАГ 01</span><h2>Опиши своё видео</h2></div><WandSparkles size={20} className="heading-icon" /></div>
              <label className="field-label" htmlFor="video-prompt">ТВОЯ ИДЕЯ</label>
              <textarea id="video-prompt" value={settings.prompt} onChange={event => update('prompt', event.target.value)} placeholder="Например: создай динамичное видео о будущем искусственного интеллекта. Начни с крупного плана микросхемы, затем покажи цифровой город, потоки данных и яркий финальный заголовок..." rows={7} />
              <div className="textarea-footer"><span>Чем точнее описание, тем лучше сценарий</span><span>{settings.prompt.length} / 2000</span></div>

              <button className="settings-toggle" onClick={() => setShowSettings(value => !value)}><Settings2 size={16} /> Параметры видео <ChevronDown size={16} className={showSettings ? 'chevron-open' : ''} /></button>
              {showSettings && <div className="settings-content">
                <div className="setting-block"><label className="field-label">ФОРМАТ</label><div className="choice-row">{(['9:16', '16:9', '1:1'] as AspectRatio[]).map(ratio => <button key={ratio} className={settings.aspectRatio === ratio ? 'choice active' : 'choice'} onClick={() => update('aspectRatio', ratio)}><Ratio size={15} /> {ratio}</button>)}</div></div>
                <div className="setting-split">
                  <div className="setting-block"><label className="field-label" htmlFor="duration">ДЛИТЕЛЬНОСТЬ</label><div className="select-wrap"><Clock3 size={15} /><select id="duration" value={settings.duration} onChange={event => update('duration', Number(event.target.value))}><option value={15}>15 секунд</option><option value={20}>20 секунд</option><option value={30}>30 секунд</option><option value={45}>45 секунд</option><option value={60}>60 секунд</option></select></div></div>
                  <div className="setting-block"><label className="field-label" htmlFor="style">СТИЛЬ</label><div className="select-wrap"><Aperture size={15} /><select id="style" value={settings.style} onChange={event => update('style', event.target.value as VisualStyle)}><option value="cinematic">Кинематографичный</option><option value="minimal">Минимализм</option><option value="tech">Технологичный</option><option value="editorial">Редакционный</option></select></div></div>
                </div>
              </div>}

              <button className="generate-button" onClick={generate}><Sparkles size={17} /> Создать раскадровку <span>→</span></button>
              {notice && <div className="notice" role="status"><Check size={14} /> {notice}</div>}
            </section>

            <Preview scenes={scenes} ratio={settings.aspectRatio} activeScene={activeScene} onSelectScene={setActiveScene} />
          </div>

          <section className="scenes-section">
            <div className="scenes-heading"><div><span className="eyebrow">ШАГ 02</span><h2>Сцены проекта <span className="muted">({scenes.length})</span></h2></div><button className="subtle-button" onClick={exportConcept}><ArrowDownToLine size={15} /> Экспорт структуры</button></div>
            <div className="scene-list">{scenes.map((scene, index) => <button className={activeScene === index ? 'scene-row scene-selected' : 'scene-row'} key={scene.id} onClick={() => setActiveScene(index)}><span className="scene-index">0{scene.id}</span><span className="scene-info"><strong>{scene.title}</strong><small>{scene.description}</small></span><span className="scene-time"><Clock3 size={13} /> {scene.duration} сек.</span><span className="scene-check">{activeScene === index ? <Check size={15} /> : <Plus size={15} />}</span></button>)}</div>
            <div className="next-step"><div className="next-icon"><Film size={18} /></div><div><strong>Следующий этап — анимация и рендеринг</strong><p>Подключим движок, чтобы превращать сцены в настоящее видео MP4.</p></div><span className="coming-soon">СКОРО</span></div>
          </section>
          <footer className="footer"><span>VIDEO-CREATOR <span className="muted">·</span> 0.1.0</span><span>Создаём по шагам. Без платных API.</span></footer>
        </section>
      </div>
    </main>
  );
}
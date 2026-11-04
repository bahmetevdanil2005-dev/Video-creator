import { Play, Sparkles } from 'lucide-react';
import type { AspectRatio, Scene } from '../types';

interface PreviewProps {
  scenes: Scene[];
  ratio: AspectRatio;
  activeScene: number;
  onSelectScene: (index: number) => void;
}

export default function Preview({ scenes, ratio, activeScene, onSelectScene }: PreviewProps) {
  const scene = scenes[activeScene];
  return (
    <section className="preview-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">ПРЕДПРОСМОТР</span><h2>Сцена {activeScene + 1}<span className="muted"> / {scenes.length}</span></h2></div>
        <span className="preview-status"><span /> Черновик</span>
      </div>
      <div className={`preview-stage ratio-${ratio.replace(':', '-')}`}>
        <div className="stage-grid" />
        <div className={`artwork artwork-${scene.visual}`}>
          <div className="art-orb orb-one" /><div className="art-orb orb-two" />
          <div className="art-ring ring-one" /><div className="art-ring ring-two" />
          <div className="art-copy"><span className="art-kicker">VIDEO CREATOR / 01</span><strong>{scene.title}</strong><small>{scene.description}</small></div>
          <div className="art-number">0{scene.id}</div>
          <div className="art-bars"><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
        <div className="stage-play"><Play size={17} fill="currentColor" /></div>
        <div className="stage-label"><Sparkles size={12} /> ВИЗУАЛЬНАЯ КОНЦЕПЦИЯ</div>
      </div>
      <div className="timeline-head"><span>РАСКАДРОВКА</span><span>{scenes.reduce((sum, item) => sum + item.duration, 0)} сек.</span></div>
      <div className="scene-timeline">
        {scenes.map((item, index) => <button key={item.id} className={index === activeScene ? 'timeline-segment active' : 'timeline-segment'} style={{ flex: item.duration }} onClick={() => onSelectScene(index)} aria-label={item.title}><span /></button>)}
      </div>
      <div className="timeline-captions">{scenes.map((item, index) => <button key={item.id} className={index === activeScene ? 'caption-active' : ''} onClick={() => onSelectScene(index)}>{item.title}</button>)}</div>
    </section>
  );
}
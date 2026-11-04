import { useEffect, useRef, useState } from 'react';
import { Download, Film, LoaderCircle, Video } from 'lucide-react';
import type { AspectRatio, Scene, VisualStyle } from '../types';

interface VideoExportProps {
  scenes: Scene[];
  ratio: AspectRatio;
  style: VisualStyle;
}

const PALETTES: Record<VisualStyle, [string, string, string]> = {
  cinematic: ['#090b18', '#282044', '#b7a2ff'],
  minimal: ['#10131b', '#252a38', '#d6e0f0'],
  tech: ['#061821', '#10404b', '#55e6d0'],
  editorial: ['#211714', '#54382f', '#f0b98a'],
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    let last = visible[visible.length - 1];
    while (last.length > 3 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
    visible[visible.length - 1] = last + '…';
  }
  visible.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight, maxWidth));
  return visible.length;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: Scene,
  index: number,
  progress: number,
  style: VisualStyle,
  photo: HTMLImageElement,
  elapsed: number,
  sceneCount: number,
) {
  const [base, middle, paletteAccent] = PALETTES[style];
  const accent = scene.accent || paletteAccent;
  const p = clamp(progress);
  const enter = easeOut(p / 0.22);
  const drift = elapsed * 0.00022;
  const bg = ctx.createLinearGradient(width * 0.08, height * 0.05, width * (0.9 + Math.sin(drift) * 0.1), height);
  bg.addColorStop(0, base);
  bg.addColorStop(0.58, middle);
  bg.addColorStop(1, '#070a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Slow moving light fields add depth without requiring external assets.
  const glow = ctx.createRadialGradient(
    width * (0.76 + Math.sin(drift) * 0.035), height * (0.27 + Math.cos(drift * 0.8) * 0.025), 0,
    width * 0.76, height * 0.27, Math.min(width, height) * 0.62,
  );
  glow.addColorStop(0, accent + '55');
  glow.addColorStop(1, accent + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  if (photo.complete && photo.naturalWidth > 0) {
    const zoom = 1.035 + p * 0.12;
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight) * zoom;
    const sw = width / scale;
    const sh = height / scale;
    const pan = Math.sin(p * Math.PI * 0.8) * photo.naturalWidth * 0.025 * (index % 2 ? -1 : 1);
    const sx = clamp((photo.naturalWidth - sw) / 2 + pan, 0, photo.naturalWidth - sw);
    const sy = (photo.naturalHeight - sh) / 2;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, width, height);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, '#060812aa');
    shade.addColorStop(0.36, '#06081235');
    shade.addColorStop(0.68, '#06081277');
    shade.addColorStop(1, '#060812f2');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  }

  // Fine grid and animated graphic lines.
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, width * 0.0008);
  const grid = Math.max(44, Math.round(width / 18));
  for (let x = 0; x < width; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, width * 0.002);
  ctx.beginPath();
  ctx.moveTo(width * 0.72, height * (0.12 + Math.sin(drift * 2) * 0.025));
  ctx.bezierCurveTo(width * 0.95, height * 0.28, width * 0.56, height * 0.38, width * 0.88, height * 0.54);
  ctx.stroke();
  ctx.restore();

  // A large outlined graphic anchors the composition.
  const visual = scene.visual || 'photo-pan';
  const graphicLeft = visual === 'photo-split' || visual === 'photo-detail';
  const cx = width * (graphicLeft ? 0.22 : 0.77 + Math.sin(drift) * 0.012);
  const cy = height * (visual === 'photo-wide' ? 0.22 : visual === 'photo-detail' ? 0.34 : 0.29);
  const radius = Math.min(width, height) * (visual === 'photo-detail' ? 0.17 : 0.12 + 0.012 * Math.sin(drift * 1.7));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(drift * 0.4);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(2, width * 0.0025);
  for (let ring = 0; ring < 3; ring++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * (1 + ring * 0.2), radius * (1 + ring * 0.2) * 0.72, ring * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Each scene role changes the composition, not just its copy.
  if (visual === 'photo-split') {
    ctx.save();
    ctx.fillStyle = accent + '22';
    ctx.fillRect(width * 0.53, 0, width * 0.47, height);
    ctx.strokeStyle = accent + 'aa';
    ctx.lineWidth = Math.max(2, width * 0.003);
    ctx.beginPath(); ctx.moveTo(width * 0.53, height * 0.12); ctx.lineTo(width * 0.53, height * 0.88); ctx.stroke();
    ctx.restore();
  } else if (visual === 'photo-detail') {
    ctx.save();
    ctx.strokeStyle = accent + 'bb';
    ctx.lineWidth = Math.max(2, width * 0.003);
    const bx = width * 0.59, by = height * 0.11, bw = width * 0.3, bh = height * 0.37, corner = width * 0.045;
    for (const [x, y, sx, sy] of [[bx,by,1,1],[bx+bw,by,-1,1],[bx,by+bh,1,-1],[bx+bw,by+bh,-1,-1]] as const) {
      ctx.beginPath(); ctx.moveTo(x + sx * corner, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * corner); ctx.stroke();
    }
    ctx.restore();
  } else if (visual === 'photo-wide') {
    ctx.save();
    ctx.fillStyle = accent + '20';
    ctx.fillRect(0, height * 0.12, width, height * 0.08);
    ctx.fillRect(0, height * 0.8, width, height * 0.08);
    ctx.restore();
  }

  const pad = width * 0.085;
  const titleSize = Math.max(44, width * (visual === 'photo-focus' ? 0.09 : 0.078));
  const titleX = visual === 'photo-slide' ? pad + Math.sin(p * Math.PI / 2) * width * 0.035 : pad;
  const titleY = (visual === 'photo-zoom' ? height * 0.59 : visual === 'photo-focus' ? height * 0.64 : height * 0.68) + (1 - enter) * height * 0.045;
  ctx.save();
  ctx.globalAlpha = enter;
  ctx.fillStyle = accent;
  ctx.font = `700 ${Math.max(17, width * 0.019)}px Arial, sans-serif`;
  ctx.fillText(`VIDEO CREATOR   /   0${index + 1}`, pad, height * 0.58);
  ctx.shadowColor = '#00000099';
  ctx.shadowBlur = width * 0.025;
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${titleSize}px Arial, sans-serif`;
  const titleBlockWidth = width * 0.82;
  const titleLineHeight = titleSize * 1.08;
  // Kinetic reveal: the title is wiped on with a moving accent edge.
  ctx.save();
  ctx.beginPath();
  ctx.rect(titleX, titleY - titleSize, titleBlockWidth * easeOut(p / 0.42), titleLineHeight * 2.2);
  ctx.clip();
  const measuredLines = drawWrappedText(ctx, scene.title, titleX, titleY, titleBlockWidth, titleLineHeight, 2);
  ctx.restore();
  ctx.save();
  const wipeX = titleX + titleBlockWidth * easeOut(p / 0.42);
  ctx.globalAlpha = 0.9 * (1 - clamp(p / 0.42));
  ctx.fillStyle = accent;
  ctx.fillRect(wipeX - width * 0.003, titleY - titleSize * 0.82, width * 0.004, titleLineHeight * 1.9);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e4e0ee';
  ctx.font = `400 ${Math.max(20, width * 0.027)}px Arial, sans-serif`;
  const descriptionY = titleY + measuredLines * titleLineHeight + height * 0.025;
  ctx.save();
  ctx.globalAlpha *= easeOut((p - 0.12) / 0.38);
  drawWrappedText(ctx, scene.description, titleX, descriptionY + (1 - easeOut((p - 0.12) / 0.38)) * height * 0.018, width * 0.78, Math.max(27, width * 0.034), 3);
  ctx.restore();
  ctx.restore();

  // Progress marker and scene counter.
  ctx.fillStyle = '#ffffff55';
  ctx.fillRect(pad, height * 0.94, width * 0.83, Math.max(2, height * 0.002));
  ctx.fillStyle = accent;
  ctx.fillRect(pad, height * 0.94, width * 0.83 * p, Math.max(2, height * 0.002));
  ctx.fillStyle = '#ffffffaa';
  ctx.font = `600 ${Math.max(15, width * 0.016)}px Arial, sans-serif`;
  ctx.fillText(`SCENE 0${index + 1}   /   0${sceneCount}`, pad, height * 0.975);

  // A short accent flash marks the cut without dipping every scene to black.
  if (index > 0 && p < 0.035) {
    ctx.fillStyle = accent + `${Math.round((1 - p / 0.035) * 20).toString(16).padStart(2, '0')}`;
    ctx.fillRect(0, 0, width, height);
  }
}

export default function VideoExport({ scenes, ratio, style }: VideoExportProps) {
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const urlRef = useRef('');

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function renderVideo() {
    if (!scenes.length || rendering) return;
    setRendering(true);
    setProgress(0);
    setMessage('Проверяем материалы и возможности браузера…');
    setVideoUrl('');
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';

    let stream: MediaStream | undefined;
    let recorder: MediaRecorder | undefined;
    let audioContext: AudioContext | undefined;
    try {
      if (scenes.some(scene => !scene.imageUrl)) {
        throw new Error('Сначала найди фотографии для всех сцен — для каждой сцены нужен отдельный визуальный материал.');
      }
      if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
        throw new Error('Этот браузер не поддерживает запись Canvas-видео. Попробуй обновить Safari или открыть проект в актуальном Chrome.');
      }

      setMessage('Загружаем фотографии сцен…');
      const loadedPhotos = await Promise.all(scenes.map(scene => new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Не удалось загрузить изображение для сцены «${scene.title}». Обнови фотографию и попробуй снова.`));
        image.src = scene.imageUrl!;
      })));

      const dimensions = ratio === '9:16' ? [720, 1280] : ratio === '16:9' ? [1280, 720] : [960, 960];
      const canvas = document.createElement('canvas');
      canvas.width = dimensions[0];
      canvas.height = dimensions[1];
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Не удалось подготовить холст для видео.');

      const supported = typeof MediaRecorder.isTypeSupported === 'function'
        ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].filter(type => MediaRecorder.isTypeSupported(type))
        : [];
      const mimeType = supported[0];
      if (!mimeType) {
        throw new Error('Safari не сообщил о поддерживаемом формате записи. Обнови iOS/Safari; приложение не будет выдавать WebM или JSON за MP4.');
      }

      stream = canvas.captureStream(30);

      // Generate an original ambient synth bed locally; no external music API or asset required.
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioContext = new AudioContextClass();
          await audioContext.resume();
          const destination = audioContext.createMediaStreamDestination();
          const master = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          const compressor = audioContext.createDynamicsCompressor();
          master.gain.value = 0.12;
          filter.type = 'lowpass';
          filter.frequency.value = 780;
          compressor.threshold.value = -22;
          compressor.ratio.value = 3;
          master.connect(filter);
          filter.connect(compressor);
          compressor.connect(destination);
          const frequencies = [55, 82.41, 110.0, 164.81];
          frequencies.forEach((frequency, index) => {
            const oscillator = audioContext!.createOscillator();
            const voiceGain = audioContext!.createGain();
            oscillator.type = index === 0 ? 'sine' : 'triangle';
            oscillator.frequency.value = frequency;
            oscillator.detune.value = index % 2 ? 5 : -4;
            voiceGain.gain.value = index === 0 ? 0.42 : 0.12;
            oscillator.connect(voiceGain);
            voiceGain.connect(master);
            oscillator.start();
          });
          // Slow amplitude breathing keeps the generated bed from sounding static.
          const lfo = audioContext.createOscillator();
          const lfoGain = audioContext.createGain();
          lfo.frequency.value = 0.16;
          lfoGain.gain.value = 0.025;
          lfo.connect(lfoGain);
          lfoGain.connect(master.gain);
          lfo.start();
          const audioTrack = destination.stream.getAudioTracks()[0];
          if (audioTrack) stream.addTrack(audioTrack);
        } catch {
          audioContext?.close().catch(() => undefined);
          audioContext = undefined;
        }
      }

      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder!.onerror = () => reject(new Error('Запись остановилась из-за ошибки MediaRecorder.'));
        recorder!.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          if (!blob.size) reject(new Error('Браузер создал пустой видеофайл. Попробуй повторить экспорт.'));
          else resolve(blob);
        };
      });

      recorder.start(1000);
      setMessage('Рендерим движение, графику и типографику. Не закрывай и не сворачивай Safari.');
      const started = performance.now();
      let sceneIndex = 0;
      let sceneStart = 0;
      let lastProgress = -1;

      await new Promise<void>((resolve, reject) => {
        const frame = (now: number) => {
          try {
            const elapsed = Math.min((now - started) / 1000, totalDuration);
            while (sceneIndex < scenes.length - 1 && elapsed >= sceneStart + scenes[sceneIndex].duration) {
              sceneStart += scenes[sceneIndex].duration;
              sceneIndex += 1;
            }
            const scene = scenes[sceneIndex];
            const local = clamp((elapsed - sceneStart) / Math.max(1, scene.duration));
            drawScene(ctx, canvas.width, canvas.height, scene, sceneIndex, local, style, loadedPhotos[sceneIndex], now - started, scenes.length);
            const percent = Math.floor(elapsed / totalDuration * 100);
            if (percent !== lastProgress && percent % 2 === 0) {
              lastProgress = percent;
              setProgress(percent);
            }
            if (elapsed >= totalDuration) resolve();
            else requestAnimationFrame(frame);
          } catch (error) { reject(error); }
        };
        requestAnimationFrame(frame);
      });

      recorder.stop();
      const blob = await finished;
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setVideoUrl(url);
      setFileName(`video-creator-${Date.now()}.${extension}`);
      setProgress(100);
      setMessage(extension === 'mp4'
        ? 'Готово: создан настоящий MP4-файл.'
        : 'Готово: браузер создал WebM. Это видеофайл, но не MP4.');
    } catch (error) {
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* recorder may already have stopped */ }
      }
      setMessage(error instanceof Error ? error.message : 'Не удалось создать видео.');
    } finally {
      stream?.getTracks().forEach(track => track.stop());
      if (audioContext && audioContext.state !== 'closed') await audioContext.close().catch(() => undefined);
      setRendering(false);
    }
  }

  return (
    <section className="export-panel">
      <div className="export-copy">
        <div className="export-icon"><Film size={19} /></div>
        <div><strong>Сборка видео</strong><p>Анимированный motion-дизайн · {ratio} · 30 FPS</p></div>
      </div>
      {rendering ? (
        <div className="render-progress">
          <div className="progress-label"><span><LoaderCircle size={14} className="spin" /> Создание видео</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <small>{message}</small>
        </div>
      ) : (
        <button className="export-button" onClick={renderVideo}><Video size={16} /> Создать видео</button>
      )}
      {message && !rendering && <p className="export-message" role="status">{message}</p>}
      {videoUrl && !rendering && <a className="download-video" href={videoUrl} download={fileName}><Download size={16} /> Скачать {fileName.endsWith('.mp4') ? 'MP4' : 'WEBM'}</a>}
      <p className="export-hint">Экспорт: 720×1280 для 9:16, 1280×720 для 16:9 или 960×960 для 1:1. В видео добавляется оригинальный синтезированный ambient-фон (если браузер поддерживает Web Audio). Фотографии должны разрешать загрузку с Wikimedia Commons. Во время рендеринга не сворачивай Safari. Если файл не скачался автоматически, открой его и выбери «Поделиться» → «Сохранить в Файлы».</p>
    </section>
  );
}

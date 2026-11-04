import { useEffect, useRef, useState } from 'react';
import { Download, Film, LoaderCircle, Video } from 'lucide-react';
import type { AspectRatio, Scene, VisualStyle } from '../types';

interface VideoExportProps {
  scenes: Scene[];
  ratio: AspectRatio;
  style: VisualStyle;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: Scene,
  index: number,
  progress: number,
  style: VisualStyle,
) {
  const palettes: Record<VisualStyle, [string, string, string]> = {
    cinematic: ['#100e20', '#30254e', '#b7a2ff'],
    minimal: ['#10131b', '#252a38', '#a8b4c8'],
    tech: ['#071b24', '#123b49', '#55e6d0'],
    editorial: ['#241b19', '#594039', '#f0b98a'],
  };
  const [base, middle, accent] = palettes[style];
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, base);
  bg.addColorStop(0.58, middle);
  bg.addColorStop(1, '#090d16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#d8d1ff';
  ctx.lineWidth = 1;
  const grid = Math.max(32, Math.round(width / 24));
  for (let x = 0; x < width; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.restore();

  const cx = width * 0.73;
  const cy = height * (0.34 + Math.sin(progress * Math.PI * 2) * 0.025);
  const radius = Math.min(width, height) * 0.13;
  const glow = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, 2, cx, cy, radius);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.25, accent);
  glow.addColorStop(1, '#30234f');
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = radius * 0.55;
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(progress * 0.45);
  ctx.strokeStyle = accent + '99';
  ctx.lineWidth = Math.max(2, width * 0.002);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.7, radius * 0.52, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (scene.visual === 'bars') {
    [0.12, 0.22, 0.16, 0.29, 0.2, 0.34, 0.25].forEach((value, bar) => {
      const barWidth = width * 0.025;
      const barHeight = height * value * (0.82 + 0.18 * Math.sin(progress * 5 + bar));
      const x = width * 0.5 + bar * barWidth * 1.5;
      const y = height * 0.65 - barHeight;
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(1, '#ffffff22');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  const pad = width * 0.085;
  ctx.fillStyle = accent;
  ctx.font = `600 ${Math.max(15, width * 0.018)}px Arial, sans-serif`;
  ctx.fillText(`VIDEO CREATOR  /  0${index + 1}`, pad, height * 0.66);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.max(34, width * 0.064)}px Arial, sans-serif`;
  const title = scene.title.length > 32 ? scene.title.slice(0, 30) + '…' : scene.title;
  ctx.fillText(title, pad, height * 0.75, width * 0.82);

  ctx.fillStyle = '#d0cddd';
  ctx.font = `400 ${Math.max(17, width * 0.023)}px Arial, sans-serif`;
  const description = scene.description.length > 100 ? scene.description.slice(0, 97) + '…' : scene.description;
  ctx.fillText(description, pad, height * 0.81, width * 0.8);

  ctx.fillStyle = '#ffffff88';
  ctx.font = `600 ${Math.max(13, width * 0.016)}px Arial, sans-serif`;
  ctx.fillText(`SCENE 0${index + 1}`, pad, height * 0.94);

  const fade = Math.min(1, progress * 5 + 0.08, (1 - progress) * 5 + 0.08);
  ctx.fillStyle = `rgba(7, 8, 14, ${Math.max(0, 1 - fade)})`;
  ctx.fillRect(0, 0, width, height);
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
    setMessage('Подготавливаем видео…');
    setVideoUrl('');
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);

    try {
      if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) {
        throw new Error('Запись видео не поддерживается этим браузером. Обнови Safari и попробуй ещё раз.');
      }
      const dimensions = ratio === '9:16' ? [720, 1280] : ratio === '16:9' ? [1280, 720] : [960, 960];
      const canvas = document.createElement('canvas');
      canvas.width = dimensions[0];
      canvas.height = dimensions[1];
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Не удалось подготовить холст для видео.');

      const formats = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      const mimeType = formats.find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Браузер не поддерживает доступные форматы записи видео.');

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };
      const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Ошибка во время записи видео.'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start(1000);
      setMessage('Создаём анимированные сцены. Не закрывай и не сворачивай Safari.');
      const started = performance.now();
      let sceneStart = 0;
      let sceneIndex = 0;

      await new Promise<void>((resolve, reject) => {
        const frame = (now: number) => {
          try {
            const elapsed = Math.min((now - started) / 1000, totalDuration);
            while (sceneIndex < scenes.length - 1 && elapsed >= sceneStart + scenes[sceneIndex].duration) {
              sceneStart += scenes[sceneIndex].duration;
              sceneIndex += 1;
            }
            const current = scenes[sceneIndex];
            const local = Math.min(1, Math.max(0, (elapsed - sceneStart) / Math.max(1, current.duration)));
            drawScene(ctx, canvas.width, canvas.height, current, sceneIndex, local, style);
            setProgress(Math.round(elapsed / totalDuration * 100));
            if (elapsed >= totalDuration) resolve();
            else requestAnimationFrame(frame);
          } catch (error) {
            reject(error);
          }
        };
        requestAnimationFrame(frame);
      });

      recorder.stop();
      stream.getTracks().forEach(track => track.stop());
      const blob = await finished;
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setVideoUrl(url);
      setFileName(`video-creator-${Date.now()}.${extension}`);
      setProgress(100);
      setMessage(extension === 'mp4'
        ? 'Готово: видео MP4 можно сохранить на устройство.'
        : 'Готово: браузер записал WebM, а не MP4.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось создать видео.');
    } finally {
      setRendering(false);
    }
  }

  return (
    <section className="export-panel">
      <div className="export-copy">
        <div className="export-icon"><Film size={19} /></div>
        <div><strong>Сборка видео</strong><p>Анимированные сцены · {ratio} · рендеринг в браузере</p></div>
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
      <p className="export-hint">Пока экспортируется видео без озвучки. Во время рендеринга не сворачивай Safari. Если загрузка не начнётся, открой видео и выбери «Поделиться» → «Сохранить в Файлы».</p>
    </section>
  );
}

export type AspectRatio = '9:16' | '16:9' | '1:1';
export type VisualStyle = 'cinematic' | 'minimal' | 'tech' | 'editorial';

export interface VideoSettings {
  prompt: string;
  aspectRatio: AspectRatio;
  duration: number;
  style: VisualStyle;
}

export interface Scene {
  id: number;
  title: string;
  description: string;
  duration: number;
  visual: string;
  accent: string;
  imageUrl?: string;
  imageTitle?: string;
  imagePage?: string;
  imageCredit?: string;
  imageQuery?: string;
}
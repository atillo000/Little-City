import { MUSIC_VIDEOS, RECORDINGS } from '../models/musicLibrary.js';

export function musicFileUrl(file, base = import.meta.env?.BASE_URL ?? '/') {
  if (file !== 'CREDITS.txt' && !RECORDINGS.some(track => track.file === file)) throw new Error('Unknown music file');
  return `${base}music/${encodeURIComponent(file)}`;
}
export function officialVideoUrl(videoId, embed = false) {
  if (!MUSIC_VIDEOS.some(track => track.videoId === videoId)) throw new Error('Unknown music video');
  return embed ? `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0` : `https://www.youtube.com/watch?v=${videoId}`;
}
export function audioFileError(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) return 'Choose a non-empty audio file.';
  if (file.size > 50 * 1024 * 1024) return 'Choose an audio file smaller than 50 MB.';
  if (!/\.(mp3|wav|ogg|m4a|aac|flac|webm|opus)$/i.test(file.name) || (file.type && !file.type.startsWith('audio/'))) return 'Choose an MP3, WAV, OGG, M4A, AAC, FLAC, WebM, or Opus audio file.';
  return '';
}

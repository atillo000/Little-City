import { useCallback, useEffect, useRef, useState } from 'react';
import { createMusicEngine, TRACKS } from './music';
import { RECORDINGS, musicFileUrl } from './musicLibrary';

export function useMusic(inLounge) {
  const [trackId, setTrackId] = useState(RECORDINGS[0].id);
  const [playing, setPlaying] = useState(false), [volume, setVolume] = useState(0.25);
  const [localName, setLocalName] = useState(''), [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false), engine = useRef(null), media = useRef(null);
  const url = useRef(null), request = useRef(0);
  const pause = useCallback(() => {
    request.current++; pending.current = false; setLoading(false);
    engine.current?.pause(); media.current?.pause(); setPlaying(false);
  }, []);
  function releaseMedia() {
    if (!media.current) return;
    media.current.onerror = null; media.current.pause();
    media.current.removeAttribute('src'); media.current.load(); media.current = null;
  }
  useEffect(() => { if (!inLounge) pause(); }, [inLounge, pause]);
  useEffect(() => {
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [pause]);
  useEffect(() => () => {
    request.current++; engine.current?.dispose(); releaseMedia();
    if (url.current) URL.revokeObjectURL(url.current);
    engine.current = null;
  }, []);
  async function toggle() {
    if (playing) { pause(); return; }
    if (!inLounge || pending.current) return;
    const token = ++request.current;
    setError(''); pending.current = true; setLoading(true);
    try {
      const recording = RECORDINGS.find(track => track.id === trackId);
      if (recording || trackId === 'local') {
        if (!media.current) {
          const source = recording ? musicFileUrl(recording.file) : url.current;
          if (!source) throw new Error('No audio selected');
          const audio = new Audio(source);
          audio.loop = true; media.current = audio;
          audio.onerror = () => {
            if (media.current !== audio) return;
            pause(); setError('This audio could not be loaded. Try another song or a file from your device.');
          };
        }
        media.current.volume = volume;
        await media.current.play();
      } else {
        engine.current ||= createMusicEngine(); engine.current.volume(volume);
        await engine.current.play(TRACKS.find(track => track.id === trackId));
      }
      // A newer selection owns playback; an old promise must not stop it.
      if (token === request.current) setPlaying(true);
    } catch {
      if (token === request.current) {
        setPlaying(false); setError('This audio could not be played. Try another track or an MP3/WAV file.');
      }
    } finally {
      if (token === request.current) { pending.current = false; setLoading(false); }
    }
  }
  function choose(id) { pause(); releaseMedia(); setError(''); setTrackId(id); }
  function changeVolume(value) {
    setVolume(value); engine.current?.volume(value);
    if (media.current) media.current.volume = value;
  }
  function loadFile(file) {
    if (!file) return;
    pause(); releaseMedia();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(file);
    setLocalName(file.name); setTrackId('local'); setError('');
  }
  const track = [...RECORDINGS, ...TRACKS].find(track => track.id === trackId);
  return { trackId, title: trackId === 'local' ? localName : track?.name, playing, loading, volume, localName, error, toggle, choose, changeVolume, loadFile, pause };
}

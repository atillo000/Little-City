import { useEffect, useState } from 'react';
import { ExperienceDialog } from './GuestExperience';
import { TRACKS } from './music';
import { MUSIC_VIDEOS, RECORDINGS, musicFileUrl } from './musicLibrary';

export default function LoungeDialog({ inside, available, music, onEnter, onClose }) {
  const [category, setCategory] = useState(TRACKS.some(track => track.id === music.trackId) ? 'Originals' : 'Downloads');
  const [video, setVideo] = useState(null);
  useEffect(() => {
    const hide = () => { if (document.hidden) setVideo(null); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => { if (!inside) setVideo(null); }, [inside]);
  const recording = RECORDINGS.find(track => track.id === music.trackId);
  function choose(id) { setVideo(null); music.choose(id); }
  return <ExperienceDialog title="Studio Lounge" onClose={onClose} className="lounge-dialog">
    <div className={`record-art ${music.playing ? 'is-playing' : ''}`} aria-hidden="true"><div><span>LC<br />SIDE A</span></div></div>
    {!inside ? <><p>A listening room just north of the community hub. Sofas, warm lights, and a little space between errands.</p><p>Come in from anywhere, choose some music, and take a break. No mission required.</p><button className="experience-primary" disabled={!available} onClick={onEnter}>{available ? 'Enter the lounge →' : 'The room needs the 3D city to be ready'}</button></> : <>
      <p>A song for your city break. Pick acoustic, jazz, pop, rock, worship, or a mellow original.</p>
      <div className="music-categories" role="group" aria-label="Music categories">{['Downloads', 'Popular', 'Worship', 'Originals'].map(name => <button key={name} aria-pressed={category === name} onClick={() => { setCategory(name); setVideo(null); }}>{name}</button>)}</div>
      <p className="music-category-note">{category === 'Downloads' ? 'Included MP3s · ready to play from this site' : category === 'Originals' ? 'Original Little City loops · made for a slow afternoon' : 'Official YouTube videos · internet required'}</p>
      <div className="lounge-tracks" aria-label="Lounge tracks">
        {category === 'Downloads' && RECORDINGS.map(track => <button key={track.id} aria-pressed={!video && music.trackId === track.id} onClick={() => choose(track.id)}><strong>{track.name}</strong><small>{track.artist} · {track.genre}</small></button>)}
        {category === 'Originals' && TRACKS.map(track => <button key={track.id} aria-pressed={!video && music.trackId === track.id} onClick={() => choose(track.id)}><strong>{track.name}</strong><small>{track.mood} · {track.bpm} BPM</small></button>)}
        {MUSIC_VIDEOS.filter(track => track.category === category).map(track => <button key={track.id} aria-pressed={video?.id === track.id} onClick={() => { music.pause(); setVideo(track); }}><strong>{track.name}</strong><small>{track.artist} · {track.genre} · Open player</small></button>)}
        {music.localName && <button aria-pressed={!video && music.trackId === 'local'} onClick={() => choose('local')}><strong>{music.localName}</strong><small>From your device</small></button>}
      </div>
      {video ? <div className="online-music">
        <div className="now-playing"><small>OFFICIAL VIDEO</small><strong>{video.name} · {video.artist}</strong></div>
        <iframe key={video.id} title={`${video.name} by ${video.artist} — official YouTube player`} src={`https://www.youtube-nocookie.com/embed/${video.videoId}?playsinline=1&rel=0`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        <p>Press Play in the video. If it is unavailable here, <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noreferrer">open on YouTube ↗</a>.</p>
        <small className="guest-note">Videos stop when you close the console, change categories, leave the lounge, or hide this tab. Use the video’s own volume controls.</small>
      </div> : <>
        <div className="now-playing" role="status"><small>{music.playing ? 'NOW PLAYING' : 'READY WHEN YOU ARE'}</small><strong>{music.title}</strong></div>
        <button className="experience-primary" disabled={music.loading} onClick={music.toggle}>{music.loading ? 'Starting audio…' : music.playing ? 'Pause music' : 'Play music'} <span>{music.playing ? 'Ⅱ' : '▶'}</span></button>
        <label className="volume-control">Volume <span>{Math.round(music.volume * 100)}%</span><input aria-label="Music volume" type="range" min="0" max="1" step="0.01" value={music.volume} onChange={event => music.changeVolume(Number(event.target.value))} /></label>
        {recording && <div className="music-credit">“{recording.name}” by <a href={recording.source} target="_blank" rel="noreferrer">{recording.artist} (incompetech.com)</a> · <a href={recording.licenseUrl} target="_blank" rel="noreferrer">{recording.license}</a>. Unmodified recording. <a href={musicFileUrl(recording.file)} download>Download MP3</a></div>}
        <small className="guest-note">Audio continues when you close the console. Leaving the lounge or hiding this tab pauses it.</small>
      </>}
      <label className="local-music">Choose a song from your device<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a" onChange={event => { if (event.target.files?.[0]) { setVideo(null); music.loadFile(event.target.files[0]); } event.target.value = ''; }} /></label>
      <small className="guest-note">Your file stays on your device. Nothing plays automatically. <a href={musicFileUrl('CREDITS.txt')} target="_blank" rel="noreferrer">Music credits</a></small>
      {music.error && !video && <p role="alert">{music.error}</p>}
    </>}
  </ExperienceDialog>;
}

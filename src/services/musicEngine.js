// Original synthesized loops. Audio is created only after the visitor presses Play.
export function createMusicEngine() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error('This browser does not support synthesized audio. Try a local audio file.');
  const context = new Context(), master = context.createGain(); master.gain.value = 0.25; master.connect(context.destination);
  const compressor = context.createDynamicsCompressor(); compressor.connect(master);
  const voices = new Set(); let timer = null, nextTime = 0, step = 0, generation = 0;
  function tone(frequency, time, duration, volume, type = 'sine', endFrequency) {
    const oscillator = context.createOscillator(), gain = context.createGain(); oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time); if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + 0.012); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain); gain.connect(compressor); voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(oscillator); };
    oscillator.start(time); oscillator.stop(time + duration + 0.02);
  }
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  function stop() { generation++; clearInterval(timer); timer = null; for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } } }
  return {
    async play(track) {
      stop(); const token = generation; await context.resume();
      if (token !== generation) return;
      step = 0; nextTime = context.currentTime + 0.04;
      const tick = () => {
        while (nextTime < context.currentTime + 0.12) {
          const part = Math.floor(step / 16) % 2, chord = track.notes.slice(part * 4, part * 4 + 4), beat = 60 / track.bpm;
          if (step % 8 === 0) chord.forEach(note => tone(hz(note), nextTime, beat * 3.5, 0.055, 'triangle'));
          if (step % 4 === 0) { tone(115, nextTime, 0.16, 0.4, 'sine', 38); tone(hz(chord[0] - 24), nextTime, beat * 1.65, 0.16); }
          if (step % 4 === 2) tone(170, nextTime, 0.09, 0.08, 'triangle', 90);
          tone(6500, nextTime, 0.035, step % 2 ? 0.014 : 0.025, 'triangle');
          const note = track.melody[step % track.melody.length]; if (note) tone(hz(note), nextTime, beat * 0.9, 0.075);
          step++; nextTime += beat / 2;
        }
      };
      tick(); timer = setInterval(tick, 30);
    },
    pause() { stop(); void context.suspend(); },
    volume(value) { master.gain.setTargetAtTime(value, context.currentTime, 0.025); },
    dispose() { stop(); void context.close(); },
  };
}

/**
 * Synthesizes a pleasant dual-tone reception chime using Web Audio API
 * Zero external audio files required. Works across all modern browsers.
 */
let audioCtx: AudioContext | null = null;

export function playCheckInChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // First bell tone: A5 (880 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Second bell tone: E6 (1318.5 Hz) for a bright, cheerful front-desk ding
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.28, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.1);
  } catch (error) {
    console.warn('Audio chime playback omitted (user gesture policy or unsupported):', error);
  }
}

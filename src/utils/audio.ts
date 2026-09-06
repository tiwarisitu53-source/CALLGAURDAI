/**
 * Audio Engine for CallGuard AI.
 * Provides:
 * 1. Human-like voice synthesis using Gemini neural TTS (with natural inflection and prosody)
 * 2. High-fidelity browser speech fallback with realistic human cadence
 * 3. Authentic Web Audio telephony sound effects (telephone ring, answer click, disconnect tones)
 * 4. Awaiting speech completion promises to enable automated video demo runs
 */

let currentActiveAudio: HTMLAudioElement | null = null;
let currentActiveAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!currentActiveAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    currentActiveAudioContext = new AudioContextClass();
  }
  if (currentActiveAudioContext.state === 'suspended') {
    currentActiveAudioContext.resume().catch(() => {});
  }
  return currentActiveAudioContext;
}

export interface SpeakOptions {
  role?: 'assistant' | 'caller';
  voiceName?: 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
  playbackRate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speaks text using Gemini Neural TTS or natural browser fallback.
 * Returns a Promise that resolves WHEN THE AUDIO HAS FINISHED PLAYING.
 */
export function speakVoice(text: string, options: SpeakOptions = {}): Promise<void> {
  const {
    role = 'assistant',
    voiceName = role === 'assistant' ? 'Zephyr' : 'Puck',
    playbackRate = 1.0,
    onStart,
    onEnd,
  } = options;

  if (!text || text.trim() === '') {
    return Promise.resolve();
  }

  stopAudioPlayback();

  return new Promise<void>(async (resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        if (onEnd) onEnd();
        resolve();
      }
    };

    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName,
          role,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          currentActiveAudio = audio;
          audio.playbackRate = playbackRate;

          audio.onplay = () => {
            if (onStart) onStart();
          };

          audio.onended = () => {
            currentActiveAudio = null;
            finish();
          };

          audio.onerror = (e) => {
            console.warn('Audio playback error, falling back to Web Speech:', e);
            fallbackSpeechSynthesis(text, role, playbackRate, onStart, finish);
          };

          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn('Server TTS unavailable, falling back to browser speech synthesis:', err);
    }

    // Fallback to browser SpeechSynthesis
    fallbackSpeechSynthesis(text, role, playbackRate, onStart, finish);
  });
}

function fallbackSpeechSynthesis(
  text: string,
  role: 'assistant' | 'caller',
  playbackRate: number,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Set natural human cadence
    utterance.rate = role === 'caller' ? Math.min(1.15, playbackRate * 1.02) : Math.max(0.9, playbackRate * 0.96);
    utterance.pitch = role === 'caller' ? 1.05 : 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => {
        if (!v.lang.startsWith('en')) return false;
        const name = v.name.toLowerCase();
        if (role === 'assistant') {
          return (
            name.includes('natural') ||
            name.includes('google us') ||
            name.includes('samantha') ||
            name.includes('karen') ||
            name.includes('victoria') ||
            name.includes('female')
          );
        } else {
          return (
            name.includes('natural') ||
            name.includes('google uk') ||
            name.includes('daniel') ||
            name.includes('alex') ||
            name.includes('male') ||
            name.includes('david')
          );
        }
      }) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    let completed = false;
    // Estimated max duration based on text length with safety buffer
    const maxDurationMs = Math.max(1800, Math.min(12000, (text.length / 14) * 1000 / playbackRate + 800));
    const safetyTimer = setTimeout(() => {
      if (!completed) {
        completed = true;
        if (onEnd) onEnd();
      }
    }, maxDurationMs);

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (!completed) {
        completed = true;
        clearTimeout(safetyTimer);
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = () => {
      if (!completed) {
        completed = true;
        clearTimeout(safetyTimer);
        if (onEnd) onEnd();
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    if (onEnd) onEnd();
  }
}

/**
 * Backward compatibility wrapper
 */
export async function playTTS(text: string): Promise<void> {
  return speakVoice(text, { role: 'assistant', voiceName: 'Zephyr' });
}

/**
 * Stops all active audio playback and speech
 */
export function stopAudioPlayback(): void {
  if (currentActiveAudio) {
    currentActiveAudio.pause();
    currentActiveAudio.currentTime = 0;
    currentActiveAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Synthesizes realistic US/International phone ringing sound effect
 * (Dual-tone frequency 440 Hz + 480 Hz)
 */
export function playRingTone(durationSeconds = 2.4): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // Authentic telephone ring frequencies
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      // Ring cadence: 0.8s ring, 0.4s pause, 0.8s ring
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.setValueAtTime(0.18, now + 0.85);
      gain.gain.linearRampToValueAtTime(0, now + 0.9);

      gain.gain.setValueAtTime(0, now + 1.25);
      gain.gain.linearRampToValueAtTime(0.18, now + 1.3);
      gain.gain.setValueAtTime(0.18, now + 2.15);
      gain.gain.linearRampToValueAtTime(0, now + 2.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationSeconds);
      osc2.stop(now + durationSeconds);

      setTimeout(() => {
        resolve();
      }, durationSeconds * 1000);
    } catch {
      setTimeout(resolve, 800);
    }
  });
}

/**
 * Authentic telephony answer pickup click
 */
export function playPickupClick(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch {}
}

/**
 * Authentic telecom disconnect tone (SIT / busy hangup click)
 */
export function playHangupTone(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Disconnect frequencies 480 Hz + 620 Hz
    osc1.frequency.setValueAtTime(480, now);
    osc2.frequency.setValueAtTime(620, now);

    // Three short busy beeps
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.28;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.setValueAtTime(0.14, t + 0.15);
      gain.gain.setValueAtTime(0.001, t + 0.16);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);
  } catch {}
}

/**
 * Threat detection alert ping
 */
export function playThreatAlertPing(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch {}
}

/**
 * Safe caller connection success chime (e.g. pleasant ascending major chord)
 */
export function playConnectChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);

      gain.gain.setValueAtTime(0, now + index * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + index * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.35);
    });
  } catch {}
}

/**
 * Safe demo phrase pre-warmer (no-op by default to preserve API quota)
 */
export function preloadDemoPhrases(_phrases: string[], _voiceName: string, _role: 'assistant' | 'caller'): void {
  // Deliberately no-op to prevent burning the Gemini free tier 3 RPM quota
}

import { ApiService } from './api';

export interface VoicePersona {
  id: string;
  name: string;
  gender: string;
  role: string;
  description: string;
}

export const DEFAULT_VOICES: VoicePersona[] = [
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (Natural Warm)',
    gender: 'Female',
    role: 'Executive Recruiter & Coach',
    description: 'Warm, conversational tone with realistic human inflection and clarity.'
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (Natural Authoritative)',
    gender: 'Male',
    role: 'Senior Engineering Architect',
    description: 'Measured, confident, and professional pacing ideal for technical deep dives.'
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (Natural Clear)',
    gender: 'Female',
    role: 'Assessment Director',
    description: 'Crisp articulation, high clarity, and engaging interview pacing.'
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (Natural British)',
    gender: 'Female',
    role: 'Consultative Mentor',
    description: 'Refined British cadence with measured emphasis on strategic concepts.'
  },
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher (Conversational)',
    gender: 'Male',
    role: 'Hiring Manager & Career Coach',
    description: 'Approachable, empathetic delivery ideal for constructive speech feedback.'
  }
];

export interface VisemeFrame {
  amplitude: number; // 0.0 to 1.0 (jaw opening & audio energy)
  viseme: 'rest' | 'aa' | 'ee' | 'oh' | 'oo' | 'th';
  isSpeaking: boolean;
  timestamp: number;
}

type VisemeListener = (frame: VisemeFrame) => void;
type VoiceStateListener = (isSpeaking: boolean) => void;

class VoiceEngine {
  private static instance: VoiceEngine | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking: boolean = false;
  private listeners: Set<VoiceStateListener> = new Set();
  private visemeListeners: Set<VisemeListener> = new Set();
  private visemeAnimId: number | null = null;
  private currentAmplitude: number = 0;
  private currentViseme: 'rest' | 'aa' | 'ee' | 'oh' | 'oo' | 'th' = 'rest';
  private selectedVoiceId: string = 'en-US-JennyNeural';

  private constructor() {
    // Stop speaking when user navigates or closes
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.stop());
    }
  }

  static getInstance(): VoiceEngine {
    if (!this.instance) {
      this.instance = new VoiceEngine();
    }
    return this.instance;
  }

  getSelectedVoice(): string {
    return this.selectedVoiceId;
  }

  setSelectedVoice(voiceId: string) {
    this.selectedVoiceId = voiceId;
  }

  subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this._isSpeaking);
    return () => this.listeners.delete(listener);
  }

  subscribeViseme(listener: VisemeListener): () => void {
    this.visemeListeners.add(listener);
    listener({
      amplitude: this.currentAmplitude,
      viseme: this.currentViseme,
      isSpeaking: this._isSpeaking,
      timestamp: Date.now()
    });
    return () => this.visemeListeners.delete(listener);
  }

  private broadcastViseme(frame: VisemeFrame) {
    this.currentAmplitude = frame.amplitude;
    this.currentViseme = frame.viseme;
    this.visemeListeners.forEach((fn) => fn(frame));
  }

  private setSpeaking(state: boolean) {
    this._isSpeaking = state;
    this.listeners.forEach((fn) => fn(state));
    if (!state) {
      this.stopVisemeTracking();
    }
  }

  private startVisemeTracking(audio: HTMLAudioElement) {
    this.stopVisemeTracking();
    const startTime = performance.now();

    const loop = () => {
      if (!this._isSpeaking || this.currentAudio !== audio || audio.paused || audio.ended) {
        this.broadcastViseme({ amplitude: 0, viseme: 'rest', isSpeaking: false, timestamp: Date.now() });
        return;
      }

      const elapsed = (performance.now() - startTime) / 1000;
      // Synthesize realistic speech syllabic cadence (human speech syllables ~3.5 to 5.5 Hz)
      const syllable =
        Math.sin(elapsed * 18.0) * 0.4 +
        Math.sin(elapsed * 9.5) * 0.35 +
        Math.sin(elapsed * 27.0) * 0.15;
      const pauseMod = Math.max(0, Math.sin(elapsed * 2.2)); // Natural micro-pauses between sentence clauses
      const rawAmp = Math.max(0, Math.min(1.0, (syllable + 0.35) * (pauseMod > 0.12 ? 1.0 : 0.04)));

      // Phonetic viseme phase cycle synchronized with speech rhythm
      const phase = (elapsed * 4.6) % 5.0;
      let viseme: 'rest' | 'aa' | 'ee' | 'oh' | 'oo' | 'th' = 'rest';
      if (rawAmp < 0.1) {
        viseme = 'rest';
      } else if (phase < 1.2) {
        viseme = 'aa'; // Wide open jaw
      } else if (phase < 2.3) {
        viseme = 'ee'; // Wide smile, teeth visible
      } else if (phase < 3.4) {
        viseme = 'oh'; // Rounded mouth
      } else if (phase < 4.3) {
        viseme = 'th'; // Teeth visible, tongue touch
      } else {
        viseme = 'oo'; // Puckered small lips
      }

      this.broadcastViseme({
        amplitude: rawAmp,
        viseme,
        isSpeaking: true,
        timestamp: Date.now()
      });

      this.visemeAnimId = requestAnimationFrame(loop);
    };

    this.visemeAnimId = requestAnimationFrame(loop);
  }

  private stopVisemeTracking() {
    if (this.visemeAnimId) {
      cancelAnimationFrame(this.visemeAnimId);
      this.visemeAnimId = null;
    }
    this.broadcastViseme({ amplitude: 0, viseme: 'rest', isSpeaking: false, timestamp: Date.now() });
  }

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Main speech function.
   * Plays realistic studio-grade neural voice from backend edge-tts.
   * Seamlessly falls back to browser neural voices if network/backend is unavailable.
   */
  async speak(
    text: string,
    options?: {
      voice?: string;
      rate?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    this.stop();

    const cleanText = text.trim();
    if (!cleanText) return;

    const chosenVoice = options?.voice || this.selectedVoiceId;

    // Strategy 1: High-Definition Realistic Human Neural Voice via Backend edge-tts
    try {
      const audioUrl = ApiService.getVoiceAudioUrl(cleanText, chosenVoice, options?.rate || '+0%');
      const audio = new Audio();
      this.currentAudio = audio;

      audio.onplay = () => {
        if (this.currentAudio !== audio) return;
        this.setSpeaking(true);
        this.startVisemeTracking(audio);
        options?.onStart?.();
      };

      audio.onended = () => {
        if (this.currentAudio !== audio) return;
        this.stopVisemeTracking();
        this.setSpeaking(false);
        this.currentAudio = null;
        options?.onEnd?.();
      };

      audio.onerror = (e) => {
        // If audio was stopped or superseded, DO NOT trigger fallback!
        if (this.currentAudio !== audio) return;
        console.warn('Backend neural audio stream failed, falling back to browser SpeechSynthesis:', e);
        this.currentAudio = null;
        this.speakBrowserFallback(cleanText, options);
      };

      audio.src = audioUrl;
      await audio.play();
    } catch (e: any) {
      if (!this.currentAudio) return; // Already stopped
      console.warn('Backend neural audio play error:', e);
      this.currentAudio = null;
      this.speakBrowserFallback(cleanText, options);
    }
  }

  /**
   * Browser SpeechSynthesis Fallback with Natural Voice Selection and Prosody
   */
  private speakBrowserFallback(
    text: string,
    options?: {
      voice?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      options?.onError?.(new Error('Speech synthesis not supported in this browser.'));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Pick best natural voice available in client browser
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => v.name.includes('Natural') || v.name.includes('Neural')) ||
      voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find((v) => v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen')) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.02; // Warm conversational pitch

    utterance.onstart = () => {
      this.setSpeaking(true);
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.setSpeaking(false);
      this.currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (err) => {
      this.setSpeaking(false);
      this.currentUtterance = null;
      options?.onError?.(err);
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Barge-in or stop speech immediately
   */
  stop() {
    this.stopVisemeTracking();
    if (this.currentAudio) {
      const a = this.currentAudio;
      this.currentAudio = null;
      a.onplay = null;
      a.onended = null;
      a.onerror = null;
      try {
        a.pause();
        a.currentTime = 0;
        a.src = '';
      } catch {}
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentUtterance = null;

    if (this._isSpeaking) {
      this.setSpeaking(false);
    }
  }
}

export const voiceEngine = VoiceEngine.getInstance();

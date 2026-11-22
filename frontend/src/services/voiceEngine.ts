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

type VoiceStateListener = (isSpeaking: boolean) => void;

class VoiceEngine {
  private static instance: VoiceEngine | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking: boolean = false;
  private listeners: Set<VoiceStateListener> = new Set();
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

  private setSpeaking(state: boolean) {
    this._isSpeaking = state;
    this.listeners.forEach((fn) => fn(state));
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
        options?.onStart?.();
      };

      audio.onended = () => {
        if (this.currentAudio !== audio) return;
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

/**
 * Hybrid Voice Controller for Chromebook & Cross-Platform Reliability
 * Features:
 * 1. Regional Accent Calibration & Tuning Profile
 * 2. Continuous Voice Activity Detection (VAD) + MediaRecorder -> Gemini Server Transcription (/api/transcribe)
 * 3. Manual Hold-to-Shout (Spacebar / Tap)
 */

export interface AccentSample {
  target: string;
  recognized: string;
}

export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'transcribing' | 'denied' | 'unsupported' | 'error';
export type VoiceDetectionCallback = (cleanWord: string, fullTranscript: string) => void;
export type SpeechStatusCallback = (status: SpeechStatus, detail?: string) => void;
export type AudioVolumeCallback = (volumePercent: number) => void;

class SpeechController {
  private recognition: any = null;
  private status: SpeechStatus = 'idle';
  private shouldListen: boolean = false;
  private isSupported: boolean = true;

  private onVoiceCallbacks: VoiceDetectionCallback[] = [];
  private onStatusCallbacks: SpeechStatusCallback[] = [];
  private onVolumeCallbacks: AudioVolumeCallback[] = [];

  // Regional Accent Calibration
  private accentCalibration: AccentSample[] = [];

  // MediaRecorder & VAD
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrame: number | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecordingSpeech: boolean = false;
  private speechSilenceTimer: any = null;
  private maxRecordTimeout: any = null;

  // Manual hold recording
  private isManualHolding: boolean = false;

  // Cloud API quota state & rate throttling
  private serverQuotaExhausted: boolean = false;
  private lastServerCallTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load saved accent calibration if available
      try {
        const saved = localStorage.getItem('dicshoutery_accent_calibration');
        if (saved) {
          this.accentCalibration = JSON.parse(saved);
        }
      } catch {}

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          this.recognition = new SpeechRec();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'en-US';
          this.bindWebSpeech();
        } catch (e) {
          console.warn('Native speech recognition unavailable, using Gemini VAD:', e);
        }
      }
    }
  }

  public getStatus(): SpeechStatus {
    return this.status;
  }

  public getAccentCalibration(): AccentSample[] {
    return this.accentCalibration;
  }

  public setAccentCalibration(samples: AccentSample[]) {
    this.accentCalibration = samples;
    try {
      localStorage.setItem('dicshoutery_accent_calibration', JSON.stringify(samples));
      localStorage.setItem('dicshoutery_accent_tuned', 'true');
    } catch {}
  }

  public isAccentCalibrated(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dicshoutery_accent_tuned') === 'true' && this.accentCalibration.length >= 5;
  }

  private setStatus(status: SpeechStatus, detail?: string) {
    this.status = status;
    this.onStatusCallbacks.forEach(cb => cb(status, detail));
  }

  private bindWebSpeech() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (!res || !res[0]) continue;
        const text = (res[0].transcript || '').trim().toUpperCase();
        this.notifyVoice(text, text);

        const tokens = text.replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean);
        for (const tok of tokens) {
          if (tok.length >= 2 && tok !== text) {
            this.notifyVoice(tok, text);
          }
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('WebSpeech notice (VAD is active):', event.error);
    };

    this.recognition.onend = () => {
      if (this.shouldListen && this.recognition) {
        setTimeout(() => {
          if (this.shouldListen) {
            try { this.recognition.start(); } catch {}
          }
        }, 300);
      }
    };
  }

  public async startListening(): Promise<boolean> {
    this.shouldListen = true;
    this.setStatus('starting');

    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      this.initAudioPipeline(this.mediaStream);
      this.setStatus('listening');

      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {}
      }

      return true;
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.setStatus('denied', 'Microphone permission blocked. Please allow mic in browser address bar.');
      } else {
        this.setStatus('error', `Mic error: ${err.message || 'Check microphone settings'}`);
      }
      this.shouldListen = false;
      return false;
    }
  }

  public stopListening() {
    this.shouldListen = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
    this.stopAudioPipeline();
    this.setStatus('idle');
  }

  public toggle(): Promise<boolean> {
    if (this.status === 'listening' || this.status === 'starting' || this.status === 'transcribing') {
      this.stopListening();
      return Promise.resolve(false);
    } else {
      return this.startListening();
    }
  }

  private initAudioPipeline(stream: MediaStream) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    this.audioCtx = new AudioCtx();
    const source = this.audioCtx.createMediaStreamSource(stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const bufferLen = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLen);

    this.setupMediaRecorder(stream);

    const SPEECH_THRESHOLD = 18;
    const SILENCE_DURATION_MS = 450;

    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLen; i++) sum += dataArray[i];
      const avg = sum / bufferLen;
      const volumePct = Math.min(100, Math.round((avg / 128) * 100));

      this.onVolumeCallbacks.forEach(cb => cb(volumePct));

      if (this.shouldListen && !this.isManualHolding && this.mediaRecorder) {
        if (volumePct >= SPEECH_THRESHOLD) {
          if (!this.isRecordingSpeech) {
            this.startVoiceChunk();
          }
          if (this.speechSilenceTimer) {
            clearTimeout(this.speechSilenceTimer);
            this.speechSilenceTimer = null;
          }
        } else if (this.isRecordingSpeech && !this.speechSilenceTimer) {
          this.speechSilenceTimer = setTimeout(() => {
            this.stopVoiceChunk();
          }, SILENCE_DURATION_MS);
        }
      }

      this.animFrame = requestAnimationFrame(loop);
    };

    loop();
  }

  private setupMediaRecorder(stream: MediaStream) {
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const chunks = [...this.audioChunks];
        this.audioChunks = [];
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
          if (blob.size > 3500) {
            await this.sendToGeminiTranscription(blob);
          }
        }
      };
    } catch (err) {
      console.warn('MediaRecorder init error:', err);
    }
  }

  private startVoiceChunk() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'recording') return;
    this.isRecordingSpeech = true;
    this.audioChunks = [];
    try {
      this.mediaRecorder.start(100);
      this.maxRecordTimeout = setTimeout(() => {
        if (this.isRecordingSpeech) {
          this.stopVoiceChunk();
        }
      }, 2500);
    } catch {}
  }

  private stopVoiceChunk() {
    if (!this.isRecordingSpeech) return;
    this.isRecordingSpeech = false;
    clearTimeout(this.maxRecordTimeout);
    clearTimeout(this.speechSilenceTimer);
    this.speechSilenceTimer = null;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
  }

  public startManualHold() {
    if (!this.mediaStream) {
      this.startListening().then(() => this.beginManualRecord());
    } else {
      this.beginManualRecord();
    }
  }

  private beginManualRecord() {
    this.isManualHolding = true;
    this.startVoiceChunk();
  }

  public stopManualHold() {
    if (this.isManualHolding) {
      this.isManualHolding = false;
      this.stopVoiceChunk();
    }
  }

  public isServerQuotaExhausted(): boolean {
    return this.serverQuotaExhausted;
  }

  /**
   * Dedicated method to transcribe a calibration word during the 5-word accent training
   */
  public async transcribeCalibrationSample(blob: Blob, expectedWord: string): Promise<string> {
    if (this.serverQuotaExhausted) {
      return expectedWord;
    }

    try {
      const buffer = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || 'audio/webm',
          isCalibrationWord: true,
          expectedWord,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quotaExhausted || data.fallbackToLocalSpeech) {
          this.serverQuotaExhausted = true;
          return expectedWord;
        }
        return (data.word || data.raw || expectedWord).trim().toUpperCase();
      } else if (res.status === 429) {
        this.serverQuotaExhausted = true;
        return expectedWord;
      }
    } catch {
      // Local fallback
    }
    return expectedWord;
  }

  /**
   * Convert recorded blob to base64 and transcribe via server-side Gemini,
   * injecting the regional accent tuning profile.
   * If server quota is exhausted, native on-device speech recognition seamlessly handles audio!
   */
  private async sendToGeminiTranscription(blob: Blob) {
    if (this.serverQuotaExhausted) {
      return;
    }

    // Rate-limit: minimum 1.6s between server calls
    const now = Date.now();
    if (now - this.lastServerCallTime < 1600) {
      return;
    }
    this.lastServerCallTime = now;

    if (this.status === 'listening') {
      this.setStatus('transcribing');
    }

    try {
      const buffer = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || 'audio/webm',
          accentCalibration: this.accentCalibration,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quotaExhausted || data.fallbackToLocalSpeech) {
          this.serverQuotaExhausted = true;
          console.info('Preserving quota: active voice recognition running via local browser engine.');
          return;
        }

        const word = (data.word || '').trim().toUpperCase();
        if (word && word !== 'NONE') {
          this.notifyVoice(word, word);
        }
      } else if (res.status === 429) {
        this.serverQuotaExhausted = true;
      }
    } catch (e) {
      console.warn('Transcription request handled gracefully:', e);
    } finally {
      if (this.shouldListen) {
        this.setStatus('listening');
      }
    }
  }

  private stopAudioPipeline() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    if (this.speechSilenceTimer) clearTimeout(this.speechSilenceTimer);
    if (this.maxRecordTimeout) clearTimeout(this.maxRecordTimeout);
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch {}
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.onVolumeCallbacks.forEach(cb => cb(0));
  }

  public onVoiceDetected(cb: VoiceDetectionCallback): () => void {
    this.onVoiceCallbacks.push(cb);
    return () => {
      this.onVoiceCallbacks = this.onVoiceCallbacks.filter(c => c !== cb);
    };
  }

  public onStatusChange(cb: SpeechStatusCallback): () => void {
    this.onStatusCallbacks.push(cb);
    cb(this.status);
    return () => {
      this.onStatusCallbacks = this.onStatusCallbacks.filter(c => c !== cb);
    };
  }

  public onVolumeChange(cb: AudioVolumeCallback): () => void {
    this.onVolumeCallbacks.push(cb);
    return () => {
      this.onVolumeCallbacks = this.onVolumeCallbacks.filter(c => c !== cb);
    };
  }

  private notifyVoice(word: string, fullTranscript: string) {
    this.onVoiceCallbacks.forEach(cb => cb(word, fullTranscript));
  }

  public simulateShout(word: string) {
    const clean = word.trim().toUpperCase();
    if (clean) {
      this.notifyVoice(clean, clean);
    }
  }
}

export const speechController = new SpeechController();

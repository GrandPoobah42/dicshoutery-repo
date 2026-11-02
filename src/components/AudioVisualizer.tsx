import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, Send, Check, Loader2, Radio, Sparkles } from 'lucide-react';
import { speechController, SpeechStatus } from '../services/speechRecognition';

interface AudioVisualizerProps {
  onShoutWord: (word: string) => void;
  lastTranscript: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  onShoutWord,
  lastTranscript,
}) => {
  const [status, setStatus] = useState<SpeechStatus>(speechController.getStatus());
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const [typedShout, setTypedShout] = useState<string>('');
  const [justShouted, setJustShouted] = useState<boolean>(false);
  const [isHoldingSpace, setIsHoldingSpace] = useState<boolean>(false);

  useEffect(() => {
    const unsubStatus = speechController.onStatusChange((newStatus, detail) => {
      setStatus(newStatus);
      if (detail) {
        setErrorMessage(detail);
      } else {
        setErrorMessage('');
      }
    });

    const unsubVol = speechController.onVolumeChange((vol) => {
      setVolume(vol);
    });

    return () => {
      unsubStatus();
      unsubVol();
    };
  }, []);

  // Spacebar push-to-shout shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' && !e.repeat && !isHoldingSpace) {
        e.preventDefault();
        setIsHoldingSpace(true);
        speechController.startManualHold();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isHoldingSpace) {
        e.preventDefault();
        setIsHoldingSpace(false);
        speechController.stopManualHold();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isHoldingSpace]);

  const handleToggle = () => {
    speechController.toggle();
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = typedShout.trim().toUpperCase();
    if (clean) {
      onShoutWord(clean);
      setTypedShout('');
      setJustShouted(true);
      setTimeout(() => setJustShouted(false), 800);
    }
  };

  const isListening = status === 'listening';
  const isTranscribing = status === 'transcribing';
  const isStarting = status === 'starting';

  return (
    <div className="flex flex-col gap-2.5 bg-gradient-to-r from-white via-amber-50/30 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-500/60 rounded-3xl p-4 shadow-xl">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Left: Continuous Mic Status & Audio Equalizer */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={handleToggle}
            type="button"
            className={`relative p-3.5 rounded-2xl font-black transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md ${
              isTranscribing
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 ring-4 ring-amber-400/40 animate-pulse'
                : isListening
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 hover:from-emerald-300 hover:to-teal-400 ring-4 ring-emerald-400/30 shadow-lg shadow-emerald-500/20'
                : isStarting
                ? 'bg-amber-400 text-slate-950 animate-pulse'
                : status === 'denied'
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-300 dark:border-slate-700'
            }`}
            title={isListening ? 'Click to pause mic' : 'Click to activate mic'}
            aria-label={isListening ? 'Mute Microphone' : 'Activate Microphone'}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isListening ? (
              <>
                <Mic className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              </>
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {isTranscribing
                  ? 'Transcribing Shout...'
                  : isListening
                  ? 'Live Mic Active'
                  : isStarting
                  ? 'Connecting Mic...'
                  : status === 'denied'
                  ? 'Mic Permission Blocked'
                  : 'Mic Paused'}
              </span>

              {isListening && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                  <span>Hands-free Live Voice</span>
                </span>
              )}
            </div>

            {/* Live Volume Waveform */}
            <div className="flex items-center gap-1 h-3.5 mt-1">
              {[15, 35, 60, 95, 75, 90, 45, 30, 20].map((baseH, idx) => {
                const dynamicH = isListening || isTranscribing
                  ? Math.max(3, Math.min(14, (baseH * (volume + 15)) / 85))
                  : 3;
                return (
                  <span
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isListening
                        ? volume > 15
                          ? 'bg-gradient-to-t from-emerald-500 to-amber-400 scale-y-110'
                          : 'bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    style={{ height: `${dynamicH}px` }}
                  />
                );
              })}
              {volume > 15 && isListening && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-black ml-1.5 animate-pulse">
                  Voice Detected!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Push-to-Shout Button (For spacebar / Chromebook touch) */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-center">
          <button
            type="button"
            onPointerDown={() => speechController.startManualHold()}
            onPointerUp={() => speechController.stopManualHold()}
            onPointerLeave={() => speechController.stopManualHold()}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 select-none cursor-pointer shadow-md ${
              isHoldingSpace
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white scale-95 ring-4 ring-rose-500/40 shadow-xl'
                : 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 border border-amber-300 shadow-amber-500/20'
            }`}
            title="Press and hold Spacebar or hold this button while shouting"
          >
            <Mic className={`w-4 h-4 ${isHoldingSpace ? 'animate-bounce text-white' : 'text-slate-950'}`} />
            <span>{isHoldingSpace ? 'Recording Shout...' : 'Hold Spacebar to Shout'}</span>
          </button>
        </div>

        {/* Right: Quick Shout / Type Input */}
        <form
          onSubmit={handleTypedSubmit}
          className="flex items-center gap-2 w-full lg:w-auto flex-1 max-w-sm justify-end"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={typedShout}
              onChange={e => setTypedShout(e.target.value.toUpperCase())}
              placeholder="Or type word to shout..."
              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black tracking-wider uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={!typedShout.trim()}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
              justShouted
                ? 'bg-emerald-500 text-white shadow-md'
                : typedShout.trim()
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            {justShouted ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            <span>Shout!</span>
          </button>
        </form>
      </div>

      {/* Transcript or Status Message */}
      {(lastTranscript || errorMessage) && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
          {errorMessage ? (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
              <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-slate-400 font-medium">Heard:</span>
              <strong className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 font-black uppercase text-sm">
                {lastTranscript}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

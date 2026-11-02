import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle2, Sparkles, Volume2, ArrowRight, X, Radio, Loader2 } from 'lucide-react';
import { speechController, AccentSample } from '../services/speechRecognition';
import { sound } from '../services/soundEffects';
import confetti from 'canvas-confetti';

interface VoiceTuningModalProps {
  onComplete: () => void;
  onClose: () => void;
}

const CALIBRATION_WORDS = [
  { word: 'SWIFT', hint: 'Tests quick front vowels & sibilance' },
  { word: 'CALM', hint: 'Tests broad vowels & soft consonants' },
  { word: 'FROST', hint: 'Tests rounded vowels & consonant blend' },
  { word: 'BRAVE', hint: 'Tests long diphthongs' },
  { word: 'SHARP', hint: 'Tests fricatives & rhotic accents' },
];

export const VoiceTuningModal: React.FC<VoiceTuningModalProps> = ({
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<number>(0);
  const [samples, setSamples] = useState<AccentSample[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastHeard, setLastHeard] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  
  const processingRef = useRef<boolean>(false);

  const currentItem = CALIBRATION_WORDS[step] || CALIBRATION_WORDS[0];

  useEffect(() => {
    // Start listening on modal mount
    speechController.startListening().then(ok => setIsListening(ok));

    const unsubVol = speechController.onVolumeChange(vol => setVolume(vol));

    // Listen to voice triggers
    const unsubVoice = speechController.onVoiceDetected((cleanWord, fullTranscript) => {
      if (isFinished || isProcessing || processingRef.current) return;

      const upper = cleanWord.trim().toUpperCase();
      const target = CALIBRATION_WORDS[step]?.word;
      if (!target) return;

      // When the user speaks, record the calibration sample
      handleCalibrationWordSpoken(target, upper || fullTranscript);
    });

    return () => {
      unsubVol();
      unsubVoice();
    };
  }, [step, isFinished, isProcessing]);

  const handleCalibrationWordSpoken = (target: string, recognized: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setLastHeard(recognized);
    sound.playWordFound(true);

    const newSample: AccentSample = {
      target,
      recognized: recognized || target,
    };

    setSamples(prev => {
      const deduped = prev.filter(s => s.target !== target);
      return [...deduped, newSample];
    });

    setTimeout(() => {
      processingRef.current = false;
      setIsProcessing(false);
      setLastHeard('');

      if (step + 1 < CALIBRATION_WORDS.length) {
        setStep(prev => prev + 1);
      } else {
        // Complete!
        setSamples(curr => {
          speechController.setAccentCalibration(curr);
          return curr;
        });
        setIsFinished(true);
        sound.playLevelVictory();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
        });
      }
    }, 900);
  };

  const handleManualPass = () => {
    handleCalibrationWordSpoken(currentItem.word, currentItem.word);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-white relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2 text-left">
            <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
            <div>
              <h3 className="text-lg font-black tracking-tight">Regional Accent Voice Tuning</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Calibrate once so Dicshoutery recognizes your regional pronunciation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Progress Indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {CALIBRATION_WORDS.map((w, idx) => {
            const isDone = idx < step || isFinished;
            const isCurrent = idx === step && !isFinished;
            return (
              <div
                key={`${w.word}-${idx}`}
                className={`flex-1 py-1.5 px-2 rounded-xl text-center font-black text-xs transition-all border ${
                  isDone
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : isCurrent
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{idx + 1}. {w.word}</span>
              </div>
            );
          })}
        </div>

        {/* Main Content Area */}
        {!isFinished ? (
          <div className="flex flex-col items-center text-center py-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-1">
              Say this word in your natural accent:
            </span>

            {/* Target Word Hero Box */}
            <div className="my-3 py-6 px-10 rounded-3xl bg-gradient-to-b from-amber-50 to-white dark:from-slate-800 dark:to-slate-800/60 border-2 border-amber-400 dark:border-amber-500/60 shadow-xl w-full max-w-sm">
              <h2 className="text-4xl sm:text-5xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
                {currentItem.word}
              </h2>
              <span className="inline-block mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 italic">
                {currentItem.hint}
              </span>
            </div>

            {/* Mic Pulse & Voice Activity Feedback */}
            <div className="flex items-center gap-3 my-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                ) : (
                  <Mic className="w-6 h-6 animate-pulse" />
                )}
              </div>

              {/* Volume equalizer */}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>
                    {isProcessing
                      ? 'Tuning accent profile...'
                      : volume > 15
                      ? 'Listening to your voice...'
                      : 'Speak now or hold Spacebar'}
                  </span>
                </div>

                <div className="flex items-center gap-1 h-3 mt-1">
                  {[10, 25, 45, 80, 60, 75, 40, 20].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-emerald-500 transition-all duration-75"
                      style={{
                        height: `${Math.max(3, Math.min(12, (h * (volume + 15)) / 85))}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Result feedback */}
            {lastHeard && (
              <div className="mb-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-full flex items-center gap-1.5 animate-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Heard: "{lastHeard}" · Accent tuned!</span>
              </div>
            )}

            {/* Manual tap backup if mic is noisy */}
            <button
              onClick={handleManualPass}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline mt-2 cursor-pointer"
            >
              Having trouble? Tap here to confirm "{currentItem.word}"
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/30 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Voice Successfully Calibrated!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mt-1.5 mb-6">
              Dicshoutery is now tuned to your regional accent and pronunciation. This is saved to
              your browser so you don't have to repeat it.
            </p>

            {/* Calibrated Words pill list */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {samples.map((s, idx) => (
                <span
                  key={`${s.target}-${idx}`}
                  className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs font-mono-numbers"
                >
                  ✓ {s.target}
                </span>
              ))}
            </div>

            <button
              onClick={onComplete}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base tracking-wide transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Playing Dicshoutery</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Footer skip */}
        {!isFinished && (
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Tuning takes under 30 seconds</span>
            <button
              onClick={onClose}
              className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

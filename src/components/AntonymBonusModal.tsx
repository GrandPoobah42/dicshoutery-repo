import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Clock, Mic, CheckCircle2, XCircle } from 'lucide-react';
import { sound } from '../services/soundEffects';
import confetti from 'canvas-confetti';

interface AntonymBonusModalProps {
  targetWord: string;
  definition: string;
  antonyms: string[];
  primaryAntonym: string;
  onSuccess: (antonym: string) => void;
  onExpire: () => void;
  lastTranscript: string;
}

const DISTRACTOR_POOL = [
  'ANCIENT', 'MODERN', 'SILENT', 'HEAVY', 'GENTLE',
  'SWIFT', 'ROUGH', 'BRIGHT', 'EMPTY', 'NARROW',
  'COMPLEX', 'SHARP', 'TENDER', 'VACANT', 'DISTANT',
  'BITTER', 'HOLLOW', 'STEADY', 'RANDOM', 'FRAGILE',
];

export const AntonymBonusModal: React.FC<AntonymBonusModalProps> = ({
  targetWord,
  definition,
  antonyms,
  primaryAntonym,
  onSuccess,
  onExpire,
  lastTranscript,
}) => {
  const TOTAL_TIME = 6.0; // 6 seconds for comfortable decision making
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_TIME);
  const [solved, setSolved] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [matchedAntonym, setMatchedAntonym] = useState<string>('');
  
  const handledRef = useRef<boolean>(false);
  // Track initial transcript when modal opened so previous words don't accidentally auto-solve
  const initialTranscriptRef = useRef<string>(lastTranscript || '');

  // Guaranteed valid correct antonym
  const correctAntonym = (primaryAntonym || antonyms[0] || '').toUpperCase();

  // STABLE CHOICES: Generated strictly ONCE on mount so buttons NEVER flicker or re-shuffle!
  const [choices] = useState<string[]>(() => {
    const upperAntonyms = new Set(antonyms.map(a => a.toUpperCase()));
    const validTarget = targetWord.toUpperCase();
    const cleanCorrect = correctAntonym || 'DIRECT';

    const uniqueSet = new Set<string>();
    uniqueSet.add(cleanCorrect);

    // Filter distractors so none match the target or antonyms
    const pool = DISTRACTOR_POOL.filter(
      d => d !== validTarget && d !== cleanCorrect && !upperAntonyms.has(d)
    ).sort(() => Math.random() - 0.5);

    for (const d of pool) {
      if (uniqueSet.size >= 3) break;
      uniqueSet.add(d);
    }

    // Secondary fallback pool if needed
    const emergencyPool = ['SWIFT', 'ANCIENT', 'MODERN', 'SILENT', 'HEAVY', 'BRIGHT'];
    for (const ep of emergencyPool) {
      if (uniqueSet.size >= 3) break;
      if (ep !== validTarget && ep !== cleanCorrect && !upperAntonyms.has(ep)) {
        uniqueSet.add(ep);
      }
    }

    return Array.from(uniqueSet).sort(() => Math.random() - 0.5);
  });

  // Countdown timer: 1 second interval to avoid constant 100ms re-renders
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (handledRef.current) return prev;
        const next = Math.max(0, prev - 1);
        if (next <= 0 && !handledRef.current) {
          handledRef.current = true;
          setFailed(true);
          sound.playInvalid();
          setTimeout(() => onExpire(), 1500);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpire]);

  // Voice transcript matching: only matches new spoken input after modal opened
  useEffect(() => {
    if (!lastTranscript || solved || failed || handledRef.current) return;
    if (lastTranscript === initialTranscriptRef.current) return;

    const cleanSpeech = lastTranscript.toUpperCase();
    const upperAntonyms = antonyms.map(a => a.toUpperCase());

    const isMatch =
      (correctAntonym && cleanSpeech.includes(correctAntonym)) ||
      upperAntonyms.some(a => {
        const regex = new RegExp(`\\b${a}\\b`, 'i');
        return regex.test(cleanSpeech) || cleanSpeech.includes(a);
      });

    if (isMatch) {
      handledRef.current = true;
      setSolved(true);
      setMatchedAntonym(correctAntonym);
      sound.playAntonymBonus();

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        onSuccess(correctAntonym);
      }, 1200);
    }
  }, [lastTranscript, solved, failed, antonyms, correctAntonym, onSuccess]);

  // Handle Choice Selection: ONE ATTEMPT ONLY. Choosing wrong fails the round!
  const handleSelectChoice = (choice: string) => {
    if (handledRef.current || solved || failed) return;
    handledRef.current = true;
    setSelectedChoice(choice);

    const upperChoice = choice.toUpperCase();
    const upperAntonyms = antonyms.map(a => a.toUpperCase());

    const isCorrect =
      upperChoice === correctAntonym ||
      upperAntonyms.includes(upperChoice);

    if (isCorrect) {
      setSolved(true);
      setMatchedAntonym(choice);
      sound.playAntonymBonus();

      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        onSuccess(choice);
      }, 1300);
    } else {
      // WRONG SELECTION: Immediately mark wrong, play buzz, reveal answer, and close
      setFailed(true);
      sound.playInvalid();

      setTimeout(() => {
        onExpire();
      }, 1600);
    }
  };

  const progressPercent = Math.max(0, (timeLeft / TOTAL_TIME) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-500/80 rounded-3xl shadow-2xl p-6 relative overflow-hidden">
        {/* Progress bar along top edge */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              progressPercent > 35 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header Badge */}
        <div className="flex items-center justify-between mb-4 mt-1">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-sm tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Antonym Bonus Challenge</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 font-mono-numbers text-sm font-black">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Found Word Display */}
        <div className="text-center py-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            You Found
          </span>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-wider my-0.5">
            {targetWord}
          </h3>
          {definition && (
            <p className="text-xs text-slate-600 dark:text-slate-300 italic px-3 line-clamp-2 mt-1">
              "{definition}"
            </p>
          )}
        </div>

        {/* Status Feedback: Solved vs Failed vs Guessing */}
        {solved ? (
          <div className="bg-emerald-500/15 border-2 border-emerald-500/50 rounded-2xl p-4 text-center animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-lg mb-1">
              <CheckCircle2 className="w-6 h-6" />
              <span>Correct Antonym!</span>
            </div>
            <p className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              "{matchedAntonym}"
            </p>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono-numbers">
              <span>+300 Points</span>
              <span>·</span>
              <span>+5.0s Added to Clock!</span>
            </div>
          </div>
        ) : failed ? (
          <div className="bg-rose-500/15 border-2 border-rose-500/50 rounded-2xl p-4 text-center animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 font-black text-lg mb-1">
              <XCircle className="w-6 h-6" />
              <span>{selectedChoice ? 'Incorrect Antonym!' : 'Time Expired!'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              The correct opposite of <strong>{targetWord}</strong> was:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 uppercase font-black text-sm">
                {correctAntonym}
              </strong>
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-bold mb-3">
              <Mic className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Tap the correct opposite or shout it into mic:</span>
            </div>

            {/* Stable 3-Choice Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              {choices.map((choice, idx) => {
                const isSelected = selectedChoice === choice;
                const isThisTheCorrectOne = choice.toUpperCase() === correctAntonym;

                let buttonClass = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-700/60 shadow-sm';

                if (handledRef.current) {
                  if (isSelected && isThisTheCorrectOne) {
                    buttonClass = 'bg-emerald-500 text-white border-2 border-emerald-600 shadow-lg scale-105';
                  } else if (isSelected && !isThisTheCorrectOne) {
                    buttonClass = 'bg-rose-500 text-white border-2 border-rose-600 shadow-md animate-shake';
                  } else if (!isSelected && isThisTheCorrectOne) {
                    // Reveal the right one in green if player picked wrong
                    buttonClass = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/60 font-black';
                  } else {
                    buttonClass = 'opacity-40 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
                  }
                }

                return (
                  <button
                    key={`${choice}-${idx}`}
                    type="button"
                    disabled={handledRef.current}
                    onClick={() => handleSelectChoice(choice)}
                    className={`py-3 px-2 rounded-2xl text-xs font-black uppercase transition-all tracking-wider text-center cursor-pointer select-none active:scale-95 disabled:cursor-not-allowed ${buttonClass}`}
                  >
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-center">
              <span className="text-[11px] font-bold text-slate-400">
                Pick carefully · 1 guess · Bonus: +300 points &amp; +5s
              </span>
            </div>
          </div>
        )}

        {/* Skip button */}
        {!handledRef.current && (
          <button
            type="button"
            onClick={onExpire}
            className="mt-4 w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Skip Bonus
          </button>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Trophy, Sparkles, Mic, ArrowRight, Clock, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LevelSummaryModalProps {
  level: number;
  score: number;
  wordsFoundCount: number;
  wordsTotal: number;
  voiceFoundCount: number;
  antonymsMasteredCount: number;
  timeRemainingBonus: number;
  nextGridSize: number;
  nextTimeLimit: number;
  onNextLevel: () => void;
}

export const LevelSummaryModal: React.FC<LevelSummaryModalProps> = ({
  level,
  score,
  wordsFoundCount,
  wordsTotal,
  voiceFoundCount,
  antonymsMasteredCount,
  timeRemainingBonus,
  nextGridSize,
  nextTimeLimit,
  onNextLevel,
}) => {
  React.useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 },
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-white">
        {/* Celebration Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 mb-3 animate-bounce">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Stage {level} Complete!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Excellent recognition and vocabulary mastery.
          </p>
        </div>

        {/* Breakdown Stats */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 mb-6 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Words Discovered</span>
            <span className="font-bold font-mono-numbers">
              {wordsFoundCount} / {wordsTotal}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Mic className="w-3.5 h-3.5 text-emerald-500" />
              <span>Shouted by Voice</span>
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
              {voiceFoundCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Antonyms Mastered</span>
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono-numbers">
              {antonymsMasteredCount} (+{antonymsMasteredCount * 300} pts)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Time Bonus</span>
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono-numbers">
              +{timeRemainingBonus} pts
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm sm:text-base font-extrabold">
            <span>Total Score</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono-numbers">
              {score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Next Stage Preview */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>Next Stage Alert:</span>
          </div>
          <p>
            Grid expands to <strong>{nextGridSize}x{nextGridSize}</strong> with faster{' '}
            <strong>{nextTimeLimit}s</strong> countdown and harder Oxford vocabulary!
          </p>
        </div>

        {/* Continue Button */}
        <button
          onClick={onNextLevel}
          className="w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 text-white font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <span>Launch Stage {level + 1}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

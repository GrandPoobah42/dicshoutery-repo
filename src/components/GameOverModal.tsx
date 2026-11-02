import React from 'react';
import { RotateCcw, Trophy, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { DiscoveredWordItem } from './WordListLedger';

interface GameOverModalProps {
  score: number;
  highScore: number;
  level: number;
  discoveredWords: DiscoveredWordItem[];
  hiddenWordsRemaining: string[];
  onNextStage: () => void;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  highScore,
  level,
  discoveredWords,
  hiddenWordsRemaining,
  onNextStage,
  onRestart,
}) => {
  const isNewRecord = score > 0 && score >= highScore;
  const antonymsSolvedCount = discoveredWords.filter(w => w.antonymSolved).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-white text-center max-h-[90vh] overflow-y-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 mb-3">
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Time's Up!</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Stage {level} completed. Here is your vocabulary performance breakdown.
        </p>

        {isNewRecord && (
          <div className="mb-4 py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 animate-pulse">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>New Personal Best High Score!</span>
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 mb-6 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Score</span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
              {score.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Words Spotted</span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono-numbers">
              {discoveredWords.length}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Antonyms Won</span>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono-numbers">
              {antonymsSolvedCount}
            </p>
          </div>
        </div>

        {/* Words Found List */}
        {discoveredWords.length > 0 && (
          <div className="text-left mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Words You Spotted ({discoveredWords.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {discoveredWords.map((w, idx) => (
                <span
                  key={`${w.id}-${idx}`}
                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold font-mono-numbers flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{w.word}</span>
                  {w.antonymSolved && <span className="text-amber-500 text-[10px]">★</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Other words that were in the grid */}
        {hiddenWordsRemaining.length > 0 && (
          <div className="text-left mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Other Hidden Words in the Grid
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {Array.from(new Set(hiddenWordsRemaining)).slice(0, 10).map((word, idx) => (
                <span
                  key={`${word}-${idx}`}
                  className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium font-mono-numbers"
                >
                  {word}
                </span>
              ))}
              {hiddenWordsRemaining.length > 10 && (
                <span className="text-xs text-slate-400 self-center">
                  +{hiddenWordsRemaining.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onNextStage}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>Next Stage (Stage {level + 1})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onRestart}
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Stage</span>
          </button>
        </div>
      </div>
    </div>
  );
};

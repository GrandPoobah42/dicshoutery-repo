import React from 'react';
import { WordPlacement } from '../utils/wordSearchGenerator';
import { DiscoveredWordItem } from './WordListLedger';
import { CheckCircle2, Circle, Sparkles, BookOpen, Trophy } from 'lucide-react';

interface TargetWordListProps {
  allHiddenWords: WordPlacement[];
  discoveredWords: DiscoveredWordItem[];
  onTriggerAntonymBonus?: (item: DiscoveredWordItem) => void;
  playStyle: 'SHOUT_OUT' | 'SWIPE_LIST';
  onSwitchPlayStyle: (style: 'SHOUT_OUT' | 'SWIPE_LIST') => void;
}

export const TargetWordList: React.FC<TargetWordListProps> = ({
  allHiddenWords,
  discoveredWords,
  onTriggerAntonymBonus,
  playStyle,
  onSwitchPlayStyle,
}) => {
  const discoveredMap = React.useMemo(() => {
    const map = new Map<string, DiscoveredWordItem>();
    for (const d of discoveredWords) {
      map.set(d.word.toUpperCase(), d);
    }
    return map;
  }, [discoveredWords]);

  const totalWords = allHiddenWords.length;
  const foundCount = allHiddenWords.filter(w => discoveredMap.has(w.word.toUpperCase())).length;
  const progressPercent = totalWords > 0 ? Math.round((foundCount / totalWords) * 100) : 0;
  const allFound = totalWords > 0 && foundCount === totalWords;

  return (
    <div className="bg-gradient-to-b from-white to-amber-50/30 dark:from-slate-900 dark:to-slate-900/90 border-2 border-amber-300 dark:border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col h-full min-h-[460px]">
      {/* Header with Mode Toggle & Stats */}
      <div className="pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {playStyle === 'SWIPE_LIST' ? 'Target Word Checklist' : 'Matrix Word Ledger'}
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-black border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onSwitchPlayStyle('SWIPE_LIST')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                playStyle === 'SWIPE_LIST'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Swipe List
            </button>
            <button
              type="button"
              onClick={() => onSwitchPlayStyle('SHOUT_OUT')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                playStyle === 'SHOUT_OUT'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Shout Out
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 font-mono-numbers">
          <span>
            Found: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{foundCount}</strong> / {totalWords} words
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-black">{progressPercent}% Cleared</span>
        </div>
        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* All Found Banner */}
      {allFound && (
        <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center gap-2.5 shadow-lg animate-in zoom-in-95">
          <Trophy className="w-6 h-6 shrink-0 fill-amber-300 text-amber-300" />
          <div className="text-xs">
            <p className="font-black text-sm">ALL LIST WORDS FOUND!</p>
            <p className="opacity-90">Outstanding! Full board bonus earned.</p>
          </div>
        </div>
      )}

      {/* Checklist list */}
      <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 space-y-2">
        {allHiddenWords.map((item, idx) => {
          const foundItem = discoveredMap.get(item.word.toUpperCase());
          const isFound = !!foundItem;

          return (
            <div
              key={`${item.id}-${idx}`}
              className={`p-3 rounded-2xl border-2 transition-all shadow-sm ${
                isFound
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-400/80 dark:border-emerald-500/50 scale-[0.99]'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isFound ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 fill-emerald-100 dark:fill-emerald-950" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                  <span
                    className={`font-black text-base tracking-wider uppercase ${
                      isFound
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.word}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono-numbers ${
                      isFound
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isFound ? `+${foundItem?.earnedPoints || item.word.length} pts` : `${item.word.length} letters`}
                  </span>
                </div>
              </div>

              {/* Real definition from dictionaryapi.dev */}
              {item.definition && (
                <div className="mt-1.5 pl-7">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-2">
                    "{item.definition}"
                  </p>
                </div>
              )}

              {/* Antonym bonus link if found and has antonyms */}
              {isFound && foundItem && (
                <div className="mt-2 pl-7 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  {foundItem.antonymSolved ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      Antonym: <strong>{foundItem.solvedAntonymText}</strong> (+300 pts)
                    </span>
                  ) : foundItem.primaryAntonym ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Antonym: <strong className="uppercase">{foundItem.primaryAntonym}</strong>
                      </span>
                      {onTriggerAntonymBonus && (
                        <button
                          type="button"
                          onClick={() => onTriggerAntonymBonus(foundItem)}
                          className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] shadow-sm hover:bg-amber-300 transition-colors cursor-pointer"
                        >
                          Bonus +300
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

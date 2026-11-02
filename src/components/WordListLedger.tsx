import React from 'react';
import { WordPlacement } from '../utils/wordSearchGenerator';
import { Mic, Sparkles, CheckCircle, Search } from 'lucide-react';

export interface DiscoveredWordItem extends WordPlacement {
  antonymSolved?: boolean;
  solvedAntonymText?: string;
  earnedPoints: number;
}

interface WordListLedgerProps {
  discoveredWords: DiscoveredWordItem[];
  onTriggerAntonymBonus?: (item: DiscoveredWordItem) => void;
}

export const WordListLedger: React.FC<WordListLedgerProps> = ({
  discoveredWords,
  onTriggerAntonymBonus,
}) => {
  const totalLettersFound = discoveredWords.reduce((sum, w) => sum + w.word.length, 0);

  return (
    <div className="bg-gradient-to-b from-white to-amber-50/30 dark:from-slate-900 dark:to-slate-900/90 border-2 border-amber-300 dark:border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col h-full min-h-[440px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-3.5">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Discovered Words
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            1 Letter = 1 Point
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-numbers">
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black shadow-sm">
            {discoveredWords.length} Words ({totalLettersFound} pts)
          </span>
        </div>
      </div>

      {/* Discovered List vs Zero-state */}
      {discoveredWords.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-amber-300/60 dark:border-amber-500/30 rounded-2xl my-auto bg-amber-500/5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 animate-pulse">
            <Search className="w-7 h-7" />
          </div>
          <h5 className="font-black text-slate-900 dark:text-white text-base mb-1">
            Spot Words in the Matrix!
          </h5>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-[240px] leading-relaxed">
            Every letter is worth <strong className="text-amber-600 dark:text-amber-400 font-extrabold">1 point</strong>.
            Shout words into your mic or drag letters to claim them!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px] pr-1">
          {discoveredWords.map((item, idx) => {
            return (
              <div
                key={`${item.id}-${idx}`}
                className="p-3.5 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md bg-white dark:bg-slate-800 animate-in fade-in slide-in-from-right-3 duration-200"
                style={{
                  borderColor: `${item.color}80`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ring-2 ring-white"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-black tracking-wider text-base sm:text-lg text-slate-900 dark:text-white uppercase">
                      {item.word}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.foundByVoice && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        <Mic className="w-3 h-3" />
                        <span>Voice</span>
                      </span>
                    )}

                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 font-mono-numbers border border-amber-400/40">
                      +{item.earnedPoints} pts ({item.word.length} letters)
                    </span>
                  </div>
                </div>

                {/* Oxford definition */}
                {item.definition && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-2 line-clamp-2">
                    "{item.definition}"
                  </p>
                )}

                {/* Antonym Bonus Status */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  {item.antonymSolved ? (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        Antonym: <strong>{item.solvedAntonymText}</strong> (+300 pts)
                      </span>
                    </div>
                  ) : item.primaryAntonym ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Oxford Antonym: <strong className="uppercase">{item.primaryAntonym}</strong>
                      </span>
                      {onTriggerAntonymBonus && (
                        <button
                          onClick={() => onTriggerAntonymBonus(item)}
                          className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Bonus +300</span>
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

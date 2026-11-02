import React from 'react';
import { Mic, ListOrdered, Sparkles, Clock, X, BookOpen, Smartphone } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xl font-bold">How to Play Dicshoutery</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Rule 1: Choose Your Playstyle */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                1. Two Great Ways to Play
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Choose between <strong>Find from List (Swipe)</strong> for a classic target word checklist with full-board bonuses, or <strong>Shout Out Game (Voice)</strong> for high-adrenaline voice recognition with a +50% voice multiplier!
              </p>
            </div>
          </div>

          {/* Rule 2: iPhone & Mobile Swiping */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                2. Smooth Swiping on iPhone &amp; Mobile
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Swipe your finger continuously across letter tiles in any direction (horizontal, vertical, diagonal). You can also tap the starting letter and then tap the ending letter to select a line.
              </p>
            </div>
          </div>

          {/* Rule 3: DictionaryAPI.dev Integration */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                3. Powered by DictionaryAPI.dev
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Any valid English dictionary word can be spotted on the grid! Definitions, parts of speech, and verified antonyms are pulled live from <code>dictionaryapi.dev</code> and Oxford references.
              </p>
            </div>
          </div>

          {/* Rule 4: Scoring */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                4. 1 Letter = 1 Point &amp; Multipliers
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Longer words give more points! Shouting words adds a +50% voice multiplier, and consecutive finds build up your streak multiplier (up to 4x). Clearing all words on the list grants a massive +500 bonus.
              </p>
            </div>
          </div>

          {/* Rule 5: Antonym Rush */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                5. 5-Second Antonym Rush
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                When a word is discovered, trigger its antonym challenge! Shout or tap its opposite within 5 seconds to earn <strong>+300 bonus points</strong> and add <strong>+5 seconds</strong> to the round timer.
              </p>
            </div>
          </div>

          {/* Rule 6: Word Learning Facility */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                6. Auto-Learning Facility (5 Attempts Rule)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Notice a real word that isn't recognized yet? Simply swipe or shout it <strong>5 times</strong> in the game, and the engine automatically learns and permanently adds it to your recognized vocabulary bank!
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};

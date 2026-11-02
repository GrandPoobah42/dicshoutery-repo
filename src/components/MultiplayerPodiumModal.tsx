import React, { useEffect } from 'react';
import { Trophy, Medal, Sparkles, RotateCcw, ArrowRight, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Player } from './PassDeviceModal';
import { sound } from '../services/soundEffects';

interface MultiplayerPodiumModalProps {
  players: Player[];
  onRematch: () => void;
  onMainMenu: () => void;
}

export const MultiplayerPodiumModal: React.FC<MultiplayerPodiumModalProps> = ({
  players,
  onRematch,
  onMainMenu,
}) => {
  // Sort players by descending score
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  useEffect(() => {
    sound.playLevelVictory();
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-3xl shadow-2xl p-6 sm:p-8 text-center text-slate-900 dark:text-white relative max-h-[92vh] overflow-y-auto">
        {/* Crown & Winner Announcement */}
        <div className="relative mb-4 flex flex-col items-center justify-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 border-2 border-amber-500/30 mb-2 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-500 flex items-center gap-1.5">
            <Crown className="w-4 h-4 fill-amber-500" />
            <span>Multiplayer Champion</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            <span style={{ color: winner.color }}>{winner.name}</span> Wins!
          </h2>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers mt-1">
            {winner.score.toLocaleString()} Points
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className="space-y-2.5 my-6 text-left">
          {ranked.map((p, idx) => {
            const isWinner = idx === 0;
            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isWinner
                    ? 'bg-amber-500/10 border-amber-400/80 shadow-md ring-2 ring-amber-400/30'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-500 text-slate-950'
                        : idx === 1
                        ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-white'
                        : idx === 2
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <div>
                    <h4
                      className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-1.5"
                      style={{ color: p.color }}
                    >
                      <span>{p.name}</span>
                      {isWinner && <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-numbers">
                      {p.wordsCount} words · {p.antonymsCount} antonyms
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono-numbers">
                    {p.score.toLocaleString()}
                  </span>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">PTS</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onRematch}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch</span>
          </button>
          <button
            onClick={onMainMenu}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer"
          >
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

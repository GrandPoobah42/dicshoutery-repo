import React, { useState, useEffect } from 'react';
import { Smartphone, ArrowRight, Trophy, Sparkles, User } from 'lucide-react';
import { sound } from '../services/soundEffects';

export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  wordsCount: number;
  antonymsCount: number;
}

interface PassDeviceModalProps {
  finishedPlayer: Player;
  nextPlayer: Player;
  roundNumber: number;
  totalRounds: number;
  onStartNextTurn: () => void;
}

export const PassDeviceModal: React.FC<PassDeviceModalProps> = ({
  finishedPlayer,
  nextPlayer,
  roundNumber,
  totalRounds,
  onStartNextTurn,
}) => {
  const [countdown, setCountdown] = useState<number>(3);
  const [autoStarted, setAutoStarted] = useState<boolean>(false);

  useEffect(() => {
    sound.playTurnPass();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl p-6 sm:p-8 text-center text-slate-900 dark:text-white relative overflow-hidden">
        {/* Playful background confetti sparkles */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Turn Finished Recap */}
        <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
            Round {roundNumber} of {totalRounds}
          </span>
          <h3 className="text-xl font-black mt-1 text-slate-800 dark:text-slate-100">
            Time's Up for <span style={{ color: finishedPlayer.color }}>{finishedPlayer.name}</span>!
          </h3>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs font-bold font-mono-numbers">
            <span className="text-emerald-600 dark:text-emerald-400">
              +{finishedPlayer.wordsCount} Words
            </span>
            <span>·</span>
            <span className="text-amber-600 dark:text-amber-400">
              {finishedPlayer.score.toLocaleString()} Total Pts
            </span>
          </div>
        </div>

        {/* Pass Device Animation Hero */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 border-2 border-amber-500/30 flex items-center justify-center animate-bounce">
              <Smartphone className="w-10 h-10" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Pass device to
          </h2>
          <div
            className="inline-flex items-center gap-2 mt-2 px-5 py-2 rounded-2xl font-black text-2xl tracking-wide shadow-md"
            style={{
              backgroundColor: `${nextPlayer.color}22`,
              color: nextPlayer.color,
              borderColor: nextPlayer.color,
            }}
          >
            <User className="w-6 h-6" />
            <span>{nextPlayer.name}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Hand the device over and get ready to spot hidden words and shout them aloud!
        </p>

        {/* Start Button */}
        <button
          onClick={onStartNextTurn}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base tracking-wide transition-all shadow-xl shadow-emerald-500/30 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Ready {nextPlayer.name}? Start Turn!</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

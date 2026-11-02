import React from 'react';
import { Volume2, VolumeX, Flame, Trophy, HelpCircle, RotateCcw, Users, User, GraduationCap } from 'lucide-react';
import { Player } from './PassDeviceModal';

interface HUDProps {
  level: number;
  score: number;
  highScore: number;
  streak: number;
  timeLeft: number;
  totalRoundTime: number;
  onOpenHowToPlay: () => void;
  onRestart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenLearnedWords?: () => void;
  learnedWordsCount?: number;
  // Multiplayer props
  activePlayer?: Player | null;
  roundNumber?: number;
  totalRounds?: number;
  isMultiplayer?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  score,
  highScore,
  streak,
  timeLeft,
  totalRoundTime,
  onOpenHowToPlay,
  onRestart,
  isMuted,
  onToggleMute,
  onOpenLearnedWords,
  learnedWordsCount = 0,
  activePlayer,
  roundNumber = 1,
  totalRounds = 1,
  isMultiplayer = false,
}) => {
  const isUrgent = timeLeft <= 15;
  const isFinalPips = timeLeft <= 5 && timeLeft > 0;
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / totalRoundTime) * 100));

  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand & Player / Stage Badge */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
              <span>Dic<span className="text-emerald-500">shout</span><span className="text-amber-500">ery</span></span>
              <span className="text-amber-500 text-xl font-black">!</span>
            </span>

            {isMultiplayer && activePlayer ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm border"
                style={{
                  backgroundColor: `${activePlayer.color}15`,
                  borderColor: `${activePlayer.color}50`,
                  color: activePlayer.color,
                }}
              >
                <User className="w-3.5 h-3.5" />
                <span>{activePlayer.name}'s Turn</span>
                <span className="text-slate-400 font-normal">·</span>
                <span className="font-mono-numbers">R{roundNumber}/{totalRounds}</span>
              </div>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-xl font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono-numbers">
                Stage {level}
              </span>
            )}
          </div>

          {/* Quick Action Icons for mobile */}
          <div className="flex items-center gap-1 md:hidden">
            {onOpenLearnedWords && (
              <button
                type="button"
                onClick={onOpenLearnedWords}
                className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
                title="Word Learning Facility"
                aria-label="Word Learning Facility"
              >
                <GraduationCap className="w-4 h-4" />
                {learnedWordsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center font-mono-numbers">
                    {learnedWordsCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenHowToPlay}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="How to Play"
              aria-label="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Dynamic Countdown Clock with Progressive Urgency */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-center">
          <div
            className={`flex items-center gap-3 px-5 py-2 rounded-2xl border transition-all duration-150 ${
              isFinalPips
                ? 'bg-rose-600 text-white border-rose-500 animate-bounce ring-4 ring-rose-500/50 shadow-xl shadow-rose-500/30 scale-105'
                : isUrgent
                ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse ring-2 ring-rose-500/40'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex flex-col text-left">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  isFinalPips ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {isFinalPips ? 'Countdown Pips!' : 'Time Remaining'}
              </span>
              <span className="text-2xl font-black font-mono-numbers tracking-tight">
                {formattedTime}
              </span>
            </div>

            {/* Micro visual progress bar */}
            <div
              className={`w-16 h-2 rounded-full overflow-hidden ${
                isFinalPips ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isFinalPips ? 'bg-white' : isUrgent ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>

          {/* Streak Flame multiplier */}
          {streak > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold text-xs animate-bounce shadow-sm">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{streak}x Multiplier!</span>
            </div>
          )}
        </div>

        {/* Right: Score & Settings */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                {isMultiplayer ? `${activePlayer?.name || 'Player'}'s Score` : 'Score'}
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono-numbers">
                {score.toLocaleString()}
              </span>
            </div>

            {!isMultiplayer && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 pl-3 border-l border-slate-200 dark:border-slate-800">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono-numbers">Best: {highScore.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            {onOpenLearnedWords && (
              <button
                type="button"
                onClick={onOpenLearnedWords}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer shadow-sm"
                title="Word Learning Facility"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Learned ({learnedWordsCount})</span>
              </button>
            )}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onRestart}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Restart Round"
              aria-label="Restart Round"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenHowToPlay}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="How to Play"
              aria-label="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

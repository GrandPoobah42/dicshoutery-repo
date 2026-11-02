/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HUD } from './components/HUD';
import { WordSearchGrid, FoundWordDisplay } from './components/WordSearchGrid';
import { WordListLedger, DiscoveredWordItem } from './components/WordListLedger';
import { TargetWordList } from './components/TargetWordList';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AntonymBonusModal } from './components/AntonymBonusModal';
import { GameOverModal } from './components/GameOverModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { VoiceTuningModal } from './components/VoiceTuningModal';
import { PassDeviceModal, Player } from './components/PassDeviceModal';
import { MultiplayerPodiumModal } from './components/MultiplayerPodiumModal';
import { OXFORD_LEXICON } from './data/dictionary';
import { lookupDictionaryWord, verifyAntonymWithApi, getLearnedWords, recordWordAttempt } from './services/dictionaryService';
import { LearnedWordsModal } from './components/LearnedWordsModal';
import {
  generateWordSearch,
  findWordInGrid,
  GeneratedBoard,
  Coordinate,
  VIBRANT_WORD_COLORS,
} from './utils/wordSearchGenerator';
import { speechController } from './services/speechRecognition';
import { sound } from './services/soundEffects';
import {
  Play,
  HelpCircle,
  Trophy,
  Sparkles,
  Users,
  User,
  Plus,
  Trash2,
  Mic,
  Flame,
  Volume2,
  CheckCircle2,
  Wand2,
  ListOrdered,
  Radio,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PASS_DEVICE' | 'PODIUM' | 'GAME_OVER';
type GameMode = 'SOLO' | 'MULTIPLAYER';
export type PlayStyle = 'SHOUT_OUT' | 'SWIPE_LIST';

const PLAYER_COLORS = ['#10B981', '#F59E0B', '#EC4899', '#6366F1'];

interface StageConfig {
  gridSize: number;
  seedCount: number;
  timeLimit: number;
}

const getStageConfig = (level: number, playStyle: PlayStyle): StageConfig => {
  if (playStyle === 'SWIPE_LIST') {
    // Curated concise target list (10-16 words) ideal for finding from a list
    switch (level) {
      case 1:
        return { gridSize: 8, seedCount: 10, timeLimit: 75 };
      case 2:
        return { gridSize: 9, seedCount: 13, timeLimit: 70 };
      case 3:
        return { gridSize: 10, seedCount: 16, timeLimit: 65 };
      default:
        return {
          gridSize: Math.min(12, 9 + Math.floor((level - 2) / 2)),
          seedCount: Math.min(20, 14 + (level - 3) * 2),
          timeLimit: Math.max(50, 70 - (level - 3) * 5),
        };
    }
  }

  // Shout out blitz config
  switch (level) {
    case 1:
      return { gridSize: 9, seedCount: 18, timeLimit: 60 };
    case 2:
      return { gridSize: 10, seedCount: 22, timeLimit: 55 };
    case 3:
      return { gridSize: 11, seedCount: 25, timeLimit: 50 };
    default:
      return {
        gridSize: Math.min(12, 10 + Math.floor((level - 2) / 2)),
        seedCount: Math.min(28, 22 + (level - 3) * 2),
        timeLimit: Math.max(45, 55 - (level - 3) * 5),
      };
  }
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [gameMode, setGameMode] = useState<GameMode>('SOLO');
  const [playStyle, setPlayStyle] = useState<PlayStyle>('SWIPE_LIST'); // Choice: Shout Out vs Swipe List
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('dicshoutery_high_score') ||
        localStorage.getItem('lexishout_high_score');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [streak, setStreak] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [totalRoundTime, setTotalRoundTime] = useState<number>(60);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Regional Accent Voice Tuning
  const [showVoiceTuning, setShowVoiceTuning] = useState<boolean>(false);
  const [pendingStartMode, setPendingStartMode] = useState<GameMode | null>(null);
  const [isVoiceCalibrated, setIsVoiceCalibrated] = useState<boolean>(() =>
    speechController.isAccentCalibrated()
  );

  // Multiplayer State
  const [players, setPlayers] = useState<Player[]>([
    { id: 'p1', name: 'Player 1', color: '#10B981', score: 0, wordsCount: 0, antonymsCount: 0 },
    { id: 'p2', name: 'Player 2', color: '#F59E0B', score: 0, wordsCount: 0, antonymsCount: 0 },
  ]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(2);
  const [finishedTurnPlayer, setFinishedTurnPlayer] = useState<Player | null>(null);

  // Board and Discovered words
  const [board, setBoard] = useState<GeneratedBoard | null>(null);
  const [discoveredWords, setDiscoveredWords] = useState<DiscoveredWordItem[]>([]);

  // Active Antonym Bonus State
  const [activeBonusItem, setActiveBonusItem] = useState<DiscoveredWordItem | null>(null);

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showLearnedWords, setShowLearnedWords] = useState<boolean>(false);
  const [learnedWordsCount, setLearnedWordsCount] = useState<number>(() => getLearnedWords().length);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleMute = () => {
    const next = sound.toggleMuted();
    setIsMuted(next);
  };

  // Setup a stage
  const setupStage = useCallback(
    async (stageLevel: number, chosenStyle: PlayStyle = playStyle) => {
      const config = getStageConfig(stageLevel, chosenStyle);
      setTimeLeft(config.timeLimit);
      setTotalRoundTime(config.timeLimit);
      setDiscoveredWords([]);
      setActiveBonusItem(null);
      setStreak(1);

      const generated = generateWordSearch(OXFORD_LEXICON, config.gridSize, config.seedCount);
      setBoard(generated);

      // Asynchronously enrich definitions from dictionaryapi.dev for words in board
      for (const item of generated.allHiddenWords) {
        lookupDictionaryWord(item.word).then(enriched => {
          if (enriched && enriched.definition && enriched.definition !== item.definition) {
            item.definition = enriched.definition;
            if (enriched.antonyms && enriched.antonyms.length > 0) {
              item.antonyms = enriched.antonyms;
              item.primaryAntonym = enriched.primaryAntonym;
            }
          }
        }).catch(() => {});
      }
    },
    [playStyle]
  );

  // Launch Solo Game Direct
  const handleStartSoloDirect = async () => {
    setGameMode('SOLO');
    setLevel(1);
    setScore(0);
    setStreak(1);
    await setupStage(1, playStyle);
    setGameState('PLAYING');

    // Only auto-start continuous mic in Shout Out mode; keep silent in Swipe List mode
    if (playStyle === 'SHOUT_OUT') {
      try {
        await speechController.startListening();
      } catch {}
    } else {
      speechController.stopListening();
    }
  };

  // Launch Multiplayer Game Direct
  const handleStartMultiplayerDirect = async () => {
    setGameMode('MULTIPLAYER');
    setLevel(1);
    setCurrentPlayerIdx(0);
    setCurrentRound(1);

    const freshPlayers = players.map(p => ({
      ...p,
      score: 0,
      wordsCount: 0,
      antonymsCount: 0,
    }));
    setPlayers(freshPlayers);

    await setupStage(1, playStyle);
    setScore(0);
    setGameState('PLAYING');

    if (playStyle === 'SHOUT_OUT') {
      try {
        await speechController.startListening();
      } catch {}
    } else {
      speechController.stopListening();
    }
  };

  // Check calibration before playing if in shout out mode
  const handleRequestStartSolo = () => {
    if (playStyle === 'SHOUT_OUT' && !speechController.isAccentCalibrated()) {
      setPendingStartMode('SOLO');
      setShowVoiceTuning(true);
    } else {
      handleStartSoloDirect();
    }
  };

  const handleRequestStartMultiplayer = () => {
    if (playStyle === 'SHOUT_OUT' && !speechController.isAccentCalibrated()) {
      setPendingStartMode('MULTIPLAYER');
      setShowVoiceTuning(true);
    } else {
      handleStartMultiplayerDirect();
    }
  };

  const handleTuningCompleted = () => {
    setShowVoiceTuning(false);
    setIsVoiceCalibrated(true);
    showToast('Voice successfully tuned to your regional accent!');

    if (pendingStartMode === 'MULTIPLAYER') {
      handleStartMultiplayerDirect();
    } else {
      handleStartSoloDirect();
    }
    setPendingStartMode(null);
  };

  const handleTuningSkipped = () => {
    setShowVoiceTuning(false);
    if (pendingStartMode === 'MULTIPLAYER') {
      handleStartMultiplayerDirect();
    } else if (pendingStartMode === 'SOLO') {
      handleStartSoloDirect();
    }
    setPendingStartMode(null);
  };

  // Add / Remove players in multiplayer setup
  const handleAddPlayer = () => {
    if (players.length >= 4) return;
    const newIdx = players.length;
    const newColor = PLAYER_COLORS[newIdx % PLAYER_COLORS.length];
    setPlayers(prev => [
      ...prev,
      {
        id: `p${newIdx + 1}`,
        name: `Player ${newIdx + 1}`,
        color: newColor,
        score: 0,
        wordsCount: 0,
        antonymsCount: 0,
      },
    ]);
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 2) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePlayerName = (id: string, name: string) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
  };

  // Restart Round
  const handleRestartRound = () => {
    setupStage(level, playStyle);
    setGameState('PLAYING');
  };

  const handleNextStage = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setupStage(nextLvl, playStyle);
    setGameState('PLAYING');
  };

  // Switch play style anytime during game
  const handleSwitchPlayStyle = async (newStyle: PlayStyle) => {
    setPlayStyle(newStyle);
    if (newStyle === 'SHOUT_OUT') {
      try {
        await speechController.startListening();
        showToast('Switched to Shout Out mode! Mic is active.');
      } catch {}
    } else {
      speechController.stopListening();
      showToast('Switched to Swipe List mode! Find target words on matrix.');
    }
  };

  // Word Discovery Handler - Powered by https://dictionaryapi.dev/
  const processDiscoveredWord = useCallback(
    async (candidate: string, explicitPath?: Coordinate[], byVoice: boolean = false) => {
      if (!board || gameState !== 'PLAYING') return;

      const upper = candidate.trim().toUpperCase();
      if (upper.length < 2) return;

      // 1. Check if already spotted
      const alreadyFound = discoveredWords.some(w => w.word === upper);
      if (alreadyFound) {
        showToast(`"${upper}" was already spotted!`);
        return;
      }

      // 2. DICTIONARY API LOOKUP: Verify against Free Dictionary API (https://dictionaryapi.dev/)
      let lexiconEntry = await lookupDictionaryWord(upper);
      if (!lexiconEntry) {
        // Record attempt in Learning Facility: 5 attempts automatically adds it to dictionary!
        const { attempts, newlyLearned } = recordWordAttempt(upper);
        if (newlyLearned) {
          setLearnedWordsCount(getLearnedWords().length);
          sound.playLevelVictory();
          confetti({
            particleCount: 85,
            spread: 85,
            origin: { y: 0.6 },
          });
          showToast(`🎓 Word Learned! "${upper}" added to recognized vocabulary!`);
          lexiconEntry = await lookupDictionaryWord(upper);
        } else {
          if (!byVoice) {
            sound.playPip(160, 0.12);
          }
          showToast(`"${upper}" not recognized yet (${attempts}/5 calls to auto-learn into dictionary!)`);
          return;
        }
      }

      if (!lexiconEntry) return;

      // 3. Grid presence check
      let path = explicitPath;
      if (!path) {
        path = findWordInGrid(board.grid, upper) || undefined;
      }

      if (!path) {
        if (!byVoice) {
          sound.playPip(180, 0.12);
          showToast(`"${upper}" is not on the grid`);
        }
        return;
      }

      const color = VIBRANT_WORD_COLORS[discoveredWords.length % VIBRANT_WORD_COLORS.length];

      // Scoring: 1 point per letter + Voice multiplier
      const letterPoints = upper.length;
      const voiceMultiplier = byVoice ? 1.5 : 1.0;
      const streakMultiplier = Math.min(4, streak);
      const earned = Math.round(letterPoints * voiceMultiplier * streakMultiplier);

      const newItem: DiscoveredWordItem = {
        id: `found-${upper}-${Date.now()}`,
        word: upper,
        tier: lexiconEntry.tier,
        path,
        found: true,
        foundByVoice: byVoice,
        color,
        definition: lexiconEntry.definition,
        antonyms: lexiconEntry.antonyms,
        primaryAntonym: lexiconEntry.primaryAntonym,
        earnedPoints: earned,
        antonymSolved: false,
      };

      sound.playWordFound(byVoice);
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.7 },
      });

      const updatedDiscovered = [newItem, ...discoveredWords];
      setDiscoveredWords(updatedDiscovered);

      setScore(prev => {
        const nextScore = prev + earned;
        if (gameMode === 'SOLO' && nextScore > highScore) {
          setHighScore(nextScore);
          localStorage.setItem('dicshoutery_high_score', nextScore.toString());
        }
        return nextScore;
      });

      if (gameMode === 'MULTIPLAYER') {
        setPlayers(prev =>
          prev.map((p, idx) =>
            idx === currentPlayerIdx
              ? { ...p, score: p.score + earned, wordsCount: p.wordsCount + 1 }
              : p
          )
        );
      }

      setStreak(prev => Math.min(5, prev + 1));

      // Check if all list words cleared in Swipe List mode!
      if (playStyle === 'SWIPE_LIST') {
        const targetWords = board.allHiddenWords.map(w => w.word.toUpperCase());
        const discoveredSet = new Set(updatedDiscovered.map(w => w.word.toUpperCase()));
        const remainingTargets = targetWords.filter(tw => !discoveredSet.has(tw));

        if (remainingTargets.length === 0) {
          // ALL TARGET WORDS FOUND! Award +500 Clear Bonus!
          const clearBonus = 500;
          setScore(prev => prev + clearBonus);
          sound.playLevelVictory();
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
          });
          showToast(`🏆 ALL TARGET WORDS CLEARED! +${clearBonus} Full Board Bonus!`);
        } else {
          showToast(`Found "${upper}"! (+${earned} pts, ${remainingTargets.length} words left)`);
        }
      } else {
        if (newItem.antonyms.length > 0) {
          setActiveBonusItem(newItem);
        } else {
          showToast(`Spotted "${upper}"! (+${earned} pts for ${letterPoints} letters)`);
        }
      }
    },
    [board, gameState, discoveredWords, streak, highScore, gameMode, currentPlayerIdx, playStyle]
  );

  // Drag/Swipe selection from grid - validates word with dictionaryapi.dev & Learning Facility
  const handleSelectLetters = async (word: string, path: Coordinate[]) => {
    const forward = word.toUpperCase();
    const backward = [...forward].reverse().join('');

    const lexForward = await lookupDictionaryWord(forward);
    if (lexForward) {
      await processDiscoveredWord(forward, path, false);
      return;
    }

    const lexBackward = await lookupDictionaryWord(backward);
    if (lexBackward) {
      await processDiscoveredWord(backward, [...path].reverse(), false);
      return;
    }

    // Word not in dictionary yet: track attempt in Learning Facility (swiped 5 times auto-learns!)
    const { attempts, newlyLearned } = recordWordAttempt(forward);
    if (newlyLearned) {
      setLearnedWordsCount(getLearnedWords().length);
      sound.playLevelVictory();
      confetti({
        particleCount: 85,
        spread: 85,
        origin: { y: 0.6 },
      });
      showToast(`🎓 Word Learned! "${forward}" has been added to recognized vocabulary!`);
      await processDiscoveredWord(forward, path, false);
    } else {
      sound.playPip(160, 0.12);
      showToast(`"${forward}" not in dictionary (${attempts}/5 swipes to auto-learn!)`);
    }
  };

  const handleShoutWord = (word: string) => {
    processDiscoveredWord(word, undefined, true);
  };

  // Continuous speech listener (Active in Shout Out mode or when user engages mic)
  useEffect(() => {
    const unsub = speechController.onVoiceDetected((cleanWord, fullTranscript) => {
      setLastTranscript(fullTranscript);

      if (gameState === 'PLAYING' && board && !activeBonusItem) {
        processDiscoveredWord(cleanWord, undefined, true);
      }
    });

    return () => unsub();
  }, [gameState, board, activeBonusItem, processDiscoveredWord]);

  // Antonym Bonus Resolution
  const handleAntonymSuccess = (solvedAntonym: string) => {
    if (!activeBonusItem) return;

    const bonusPoints = 300 * Math.min(4, streak);
    setScore(prev => {
      const nextScore = prev + bonusPoints;
      if (gameMode === 'SOLO' && nextScore > highScore) {
        setHighScore(nextScore);
        localStorage.setItem('dicshoutery_high_score', nextScore.toString());
      }
      return nextScore;
    });

    if (gameMode === 'MULTIPLAYER') {
      setPlayers(prev =>
        prev.map((p, idx) =>
          idx === currentPlayerIdx
            ? { ...p, score: p.score + bonusPoints, antonymsCount: p.antonymsCount + 1 }
            : p
        )
      );
    }

    setTimeLeft(prev => Math.min(totalRoundTime + 15, prev + 5));

    setDiscoveredWords(prev =>
      prev.map(w =>
        w.id === activeBonusItem.id
          ? { ...w, antonymSolved: true, solvedAntonymText: solvedAntonym }
          : w
      )
    );

    showToast(`Antonym Solved: "${solvedAntonym}"! (+${bonusPoints} pts & +5s)`);
    setActiveBonusItem(null);
  };

  const handleAntonymExpire = () => {
    setActiveBonusItem(null);
  };

  // Countdown timer with Progressive Volume Scaling & End Pips
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const nextTime = prev - 1;

        sound.playDynamicTimerTick(nextTime, totalRoundTime);

        if (nextTime <= 0) {
          clearInterval(timer);

          if (gameMode === 'MULTIPLAYER') {
            handleMultiplayerTurnEnd();
          } else {
            sound.playGameOver();
            setGameState('GAME_OVER');
          }
          return 0;
        }

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, gameMode, totalRoundTime, currentPlayerIdx, currentRound, totalRounds, players]);

  // Multiplayer Turn End Handler
  const handleMultiplayerTurnEnd = () => {
    const finished = players[currentPlayerIdx];
    setFinishedTurnPlayer(finished);

    const nextIdx = currentPlayerIdx + 1;

    if (nextIdx < players.length) {
      setGameState('PASS_DEVICE');
    } else {
      if (currentRound < totalRounds) {
        setGameState('PASS_DEVICE');
      } else {
        setGameState('PODIUM');
      }
    }
  };

  const handleStartNextTurn = () => {
    const nextIdx = currentPlayerIdx + 1;
    if (nextIdx < players.length) {
      setCurrentPlayerIdx(nextIdx);
    } else {
      setCurrentPlayerIdx(0);
      setCurrentRound(prev => prev + 1);
    }

    setupStage(level, playStyle);
    setScore(0);
    setGameState('PLAYING');
  };

  const activePlayer = gameMode === 'MULTIPLAYER' ? players[currentPlayerIdx] : null;
  const nextPlayer =
    gameMode === 'MULTIPLAYER'
      ? players[(currentPlayerIdx + 1) % players.length]
      : players[0];

  const foundWordsDisplay: FoundWordDisplay[] = discoveredWords.map(w => ({
    id: w.id,
    word: w.word,
    path: w.path,
    color: w.color,
  }));

  const hiddenRemainingWords = React.useMemo(() => {
    if (!board) return [];
    const foundSet = new Set(discoveredWords.map(w => w.word.toUpperCase()));
    const remaining = board.allHiddenWords
      .map(w => w.word.toUpperCase())
      .filter(w => !foundSet.has(w));
    return Array.from(new Set(remaining));
  }, [board, discoveredWords]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100/40 via-rose-50/30 to-emerald-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white px-7 py-3 rounded-full font-black text-xs sm:text-sm tracking-wide shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-150">
          {toastMessage}
        </div>
      )}

      {/* TITLE MENU & MULTIPLAYER SETUP */}
      {gameState === 'TITLE_MENU' && (
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-4xl mx-auto w-full my-auto">
          <div className="w-full bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden">
            {/* Playful energetic glows */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-gradient-to-r from-amber-400/25 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-gradient-to-r from-emerald-400/25 to-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Badges (High Score + Regional Accent Voice Calibrated + Dictionary API badge) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {highScore > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-500/20 border-2 border-amber-400 text-amber-800 dark:text-amber-300 font-black text-xs font-mono-numbers shadow-sm">
                  <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Solo Record: {highScore.toLocaleString()} pts</span>
                </div>
              )}

              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-sm">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>DictionaryAPI.dev Active</span>
              </div>

              <button
                type="button"
                onClick={() => setShowLearnedWords(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border-2 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-black text-xs shadow-sm hover:bg-indigo-500/20 transition-all cursor-pointer"
                title="View vocabulary words your game has auto-learned"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Learned Words ({learnedWordsCount})</span>
              </button>

              {playStyle === 'SHOUT_OUT' && (
                <button
                  type="button"
                  onClick={() => setShowVoiceTuning(true)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 text-xs font-black transition-all cursor-pointer shadow-sm ${
                    isVoiceCalibrated
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-amber-400/20 border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-400/30'
                  }`}
                  title="Calibrate your regional accent with 5 quick words"
                >
                  {isVoiceCalibrated ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Accent Tuned ✓</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>Tune Voice (5 Words)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Title & Tagline */}
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Dic<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">shout</span>
              <span className="text-amber-500">ery!</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed mb-6">
              Spot hidden words on the matrix, shout them or swipe from the checklist, and claim definitions and antonyms with DictionaryAPI!
            </p>

            {/* GAMEPLAY CHOICE: SHOUT OUT GAME vs FIND FROM A LIST VIA SWIPE */}
            <div className="mb-6 max-w-2xl mx-auto">
              <span className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Choose Game Playstyle:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {/* Option A: Find from a list via swipe */}
                <button
                  type="button"
                  onClick={() => setPlayStyle('SWIPE_LIST')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    playStyle === 'SWIPE_LIST'
                      ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400 shadow-lg'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-amber-300 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                      <ListOrdered className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        Find From List (Swipe)
                      </h3>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        Smooth iPhone Touch &amp; Checklist
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    A clear list of target words to find. Smoothly swipe across tiles on iPhone or desktop to cross off each word and earn full-board clear bonuses!
                  </p>
                  {playStyle === 'SWIPE_LIST' && (
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Selected Mode
                    </span>
                  )}
                </button>

                {/* Option B: Shout Out Game */}
                <button
                  type="button"
                  onClick={() => setPlayStyle('SHOUT_OUT')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    playStyle === 'SHOUT_OUT'
                      ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500 shadow-lg'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-emerald-400 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-emerald-500 text-white font-black">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        Shout Out Game (Voice)
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Microphone Blitz + 1.5x Voice Multiplier
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Hands-free shouting! Shout words into your mic the moment your eyes spot them for +50% voice score bonuses and rapid antonym rush rounds.
                  </p>
                  {playStyle === 'SHOUT_OUT' && (
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Selected Mode
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mode Selector Tabs: Solo vs Party */}
            <div className="flex items-center justify-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-md mx-auto mb-8 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setGameMode('SOLO')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gameMode === 'SOLO'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Solo Hunt</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('MULTIPLAYER')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gameMode === 'MULTIPLAYER'
                    ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Pass &amp; Play Party</span>
              </button>
            </div>

            {/* Multiplayer Setup Card */}
            {gameMode === 'MULTIPLAYER' && (
              <div className="max-w-lg mx-auto mb-8 p-5 rounded-2xl bg-gradient-to-b from-amber-50/40 to-white dark:from-slate-800/80 dark:to-slate-800/40 border-2 border-amber-300 dark:border-amber-500/50 text-left animate-in fade-in zoom-in-95 duration-200 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Players (2 to 4)
                  </h3>
                  {players.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddPlayer}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Player</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 mb-4">
                  {players.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-sm ring-2 ring-white"
                        style={{ backgroundColor: p.color }}
                      />
                      <input
                        type="text"
                        value={p.name}
                        onChange={e => handleUpdatePlayerName(p.id, e.target.value)}
                        placeholder={`Player ${idx + 1}`}
                        className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {players.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Rounds per player:
                  </span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setTotalRounds(r)}
                        className={`w-8 h-8 rounded-xl font-black font-mono-numbers transition-all cursor-pointer ${
                          totalRounds === r
                            ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                            : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Launch Action */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={gameMode === 'SOLO' ? handleRequestStartSolo : handleRequestStartMultiplayer}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base tracking-wide transition-all shadow-xl shadow-emerald-500/30 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>
                  {gameMode === 'SOLO'
                    ? playStyle === 'SWIPE_LIST'
                      ? 'Play Swipe Hunt (Solo)'
                      : 'Start Shout Out (Solo)'
                    : `Start Party (${players.length} Players)`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowHowToPlay(true)}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-base border-2 border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>How to Play</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ACTIVE PLAYING SCREEN */}
      {gameState === 'PLAYING' && board && (
        <div className="flex-1 flex flex-col">
          <HUD
            level={level}
            score={score}
            highScore={highScore}
            streak={streak}
            timeLeft={timeLeft}
            totalRoundTime={totalRoundTime}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            onRestart={handleRestartRound}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onOpenLearnedWords={() => setShowLearnedWords(true)}
            learnedWordsCount={learnedWordsCount}
            activePlayer={activePlayer}
            roundNumber={currentRound}
            totalRounds={totalRounds}
            isMultiplayer={gameMode === 'MULTIPLAYER'}
          />

          <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-4">
            {/* Visualizer & Shout Bar (Highlighted in Shout Out mode, subtle helper in Swipe List mode) */}
            <AudioVisualizer
              onShoutWord={handleShoutWord}
              lastTranscript={lastTranscript}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Matrix */}
              <div className="lg:col-span-8 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-xl">
                <WordSearchGrid
                  grid={board.grid}
                  foundWords={foundWordsDisplay}
                  onSelectLetters={handleSelectLetters}
                  size={board.size}
                  maxViableWordLength={board.maxViableWordLength}
                />
              </div>

              {/* Right Column: Target Word Checklist (Swipe List) OR Discovered Words Ledger (Shout Out) */}
              <div className="lg:col-span-4 h-full">
                {playStyle === 'SWIPE_LIST' ? (
                  <TargetWordList
                    allHiddenWords={board.allHiddenWords}
                    discoveredWords={discoveredWords}
                    onTriggerAntonymBonus={item => {
                      if (item.antonyms.length > 0 && !item.antonymSolved) {
                        setActiveBonusItem(item);
                      }
                    }}
                    playStyle={playStyle}
                    onSwitchPlayStyle={handleSwitchPlayStyle}
                  />
                ) : (
                  <WordListLedger
                    discoveredWords={discoveredWords}
                    onTriggerAntonymBonus={item => {
                      if (item.antonyms.length > 0 && !item.antonymSolved) {
                        setActiveBonusItem(item);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* PASS DEVICE TRANSITION MODAL (MULTIPLAYER) */}
      {gameState === 'PASS_DEVICE' && finishedTurnPlayer && (
        <PassDeviceModal
          finishedPlayer={finishedTurnPlayer}
          nextPlayer={nextPlayer}
          roundNumber={currentRound}
          totalRounds={totalRounds}
          onStartNextTurn={handleStartNextTurn}
        />
      )}

      {/* MULTIPLAYER PODIUM & WINNER MODAL */}
      {gameState === 'PODIUM' && (
        <MultiplayerPodiumModal
          players={players}
          onRematch={handleStartMultiplayerDirect}
          onMainMenu={() => setGameState('TITLE_MENU')}
        />
      )}

      {/* SOLO GAME OVER MODAL */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          score={score}
          highScore={highScore}
          level={level}
          discoveredWords={discoveredWords}
          hiddenWordsRemaining={hiddenRemainingWords}
          onNextStage={handleNextStage}
          onRestart={handleRestartRound}
        />
      )}

      {/* ANTONYM BONUS MODAL */}
      {activeBonusItem && (
        <AntonymBonusModal
          key={activeBonusItem.id}
          targetWord={activeBonusItem.word}
          definition={activeBonusItem.definition}
          antonyms={activeBonusItem.antonyms}
          primaryAntonym={activeBonusItem.primaryAntonym}
          onSuccess={handleAntonymSuccess}
          onExpire={handleAntonymExpire}
          lastTranscript={lastTranscript}
        />
      )}

      {/* VOICE ACCENT TUNING MODAL */}
      {showVoiceTuning && (
        <VoiceTuningModal
          onComplete={handleTuningCompleted}
          onClose={handleTuningSkipped}
        />
      )}

      {/* HOW TO PLAY MODAL */}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}

      {/* WORD LEARNING FACILITY MODAL */}
      {showLearnedWords && (
        <LearnedWordsModal
          onClose={() => setShowLearnedWords(false)}
          onWordAdded={() => setLearnedWordsCount(getLearnedWords().length)}
        />
      )}
    </div>
  );
}

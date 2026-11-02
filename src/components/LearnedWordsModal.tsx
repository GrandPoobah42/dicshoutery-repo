import React, { useState } from 'react';
import {
  GraduationCap,
  X,
  Trash2,
  Plus,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  getLearnedWords,
  removeLearnedWord,
  addLearnedWord,
  getSessionAttempts,
  LearnedWord,
} from '../services/dictionaryService';
import { sound } from '../services/soundEffects';

interface LearnedWordsModalProps {
  onClose: () => void;
  onWordAdded?: (word: string) => void;
}

export const LearnedWordsModal: React.FC<LearnedWordsModalProps> = ({
  onClose,
  onWordAdded,
}) => {
  const [learnedWords, setLearnedWords] = useState<LearnedWord[]>(() => getLearnedWords());
  const [sessionAttempts] = useState(() => getSessionAttempts());
  const [newWordInput, setNewWordInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newWordInput.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (clean.length < 2) {
      setFeedbackMsg('Word must be at least 2 letters.');
      return;
    }

    const added = addLearnedWord(clean, 'Manually added custom dictionary word.');
    setLearnedWords(prev => [added, ...prev.filter(w => w.word !== clean)]);
    setNewWordInput('');
    setFeedbackMsg(`"${clean}" added to your recognized dictionary!`);
    sound.playWordFound(false);
    onWordAdded?.(clean);
  };

  const handleDelete = (word: string) => {
    removeLearnedWord(word);
    setLearnedWords(prev => prev.filter(w => w.word !== word));
    sound.playPip(200, 0.1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-indigo-500/60 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Word Learning Facility</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Swiping or calling any word 5 times adds it automatically!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddCustom} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newWordInput}
              onChange={e => setNewWordInput(e.target.value)}
              placeholder="Teach new word (e.g. SLANG, JARGON)..."
              className="flex-1 bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
          {feedbackMsg && (
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 animate-in fade-in">
              {feedbackMsg}
            </p>
          )}
        </form>

        {/* Content Tabs / Scrollable Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Section 1: In-Progress Attempts in current game */}
          {sessionAttempts.length > 0 && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Learning in Progress ({sessionAttempts.length} words tracked)</span>
              </div>
              <div className="space-y-1.5">
                {sessionAttempts.map((item, idx) => (
                  <div
                    key={`${item.word}-${idx}`}
                    className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-500/20"
                  >
                    <span className="font-black tracking-wider uppercase">{item.word}</span>
                    <span className="font-mono-numbers font-bold text-[11px] text-amber-600 dark:text-amber-400">
                      {item.attempts} / 5 attempts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Permanently Learned Words */}
          <div>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <span>Learned Vocabulary Bank ({learnedWords.length})</span>
            </div>

            {learnedWords.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  No custom words learned yet.
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs mx-auto">
                  When you swipe or shout any word 5 times, it will automatically appear here and be permanently recognized!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {learnedWords.map((item, idx) => (
                  <div
                    key={`${item.word}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black tracking-wider text-sm uppercase">
                            {item.word}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            Auto-Learned
                          </span>
                        </div>
                        {item.definition && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                            {item.definition}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.word)}
                      title="Remove learned word"
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

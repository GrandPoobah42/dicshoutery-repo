/**
 * Dictionary API Service
 * Integrates with Free Dictionary API (https://dictionaryapi.dev/)
 * providing real-time English definitions, pronunciations, synonyms, and antonyms.
 * Includes a dynamic Learning Facility that learns unrecognised words swiped/called 5 times.
 */

import { findLexiconWord, LexiconWord, OXFORD_LEXICON } from '../data/dictionary';

// Storage key for persistent user-learned words
const LEARNED_WORDS_STORAGE_KEY = 'dicshoutery_learned_words';

export interface LearnedWord {
  word: string;
  learnedAt: number;
  timesAttempted: number;
  definition?: string;
}

// In-memory cache for fast lookups
const dictionaryCache = new Map<string, LexiconWord | null>();

// Pre-seed cache with local Oxford lexicon words
for (const entry of OXFORD_LEXICON) {
  dictionaryCache.set(entry.word.toUpperCase(), entry);
}

// In-memory session tracking for attempt counts during current game
const sessionAttempts = new Map<string, number>();

/**
 * Load learned words from localStorage and register into dictionary cache
 */
export function getLearnedWords(): LearnedWord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEARNED_WORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Register a newly learned word into cache and localStorage
 */
export function addLearnedWord(word: string, customDef?: string): LearnedWord {
  const normalized = word.trim().toUpperCase();
  const learnedList = getLearnedWords().filter(w => w.word !== normalized);

  const newLearned: LearnedWord = {
    word: normalized,
    learnedAt: Date.now(),
    timesAttempted: 5,
    definition: customDef || 'Player-taught recognized vocabulary word.',
  };

  learnedList.unshift(newLearned);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEARNED_WORDS_STORAGE_KEY, JSON.stringify(learnedList));
    } catch {}
  }

  // Register into active dictionary cache
  dictionaryCache.set(normalized, {
    word: normalized,
    tier: normalized.length >= 7 ? 3 : normalized.length >= 5 ? 2 : 1,
    partOfSpeech: 'learned term',
    definition: newLearned.definition || 'Player-taught recognized vocabulary word.',
    antonyms: [],
    primaryAntonym: '',
  });

  return newLearned;
}

/**
 * Delete a learned word
 */
export function removeLearnedWord(word: string): void {
  const normalized = word.trim().toUpperCase();
  const learnedList = getLearnedWords().filter(w => w.word !== normalized);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEARNED_WORDS_STORAGE_KEY, JSON.stringify(learnedList));
    } catch {}
  }
  dictionaryCache.delete(normalized);
}

// Load previously learned words on startup
if (typeof window !== 'undefined') {
  const saved = getLearnedWords();
  for (const item of saved) {
    dictionaryCache.set(item.word.toUpperCase(), {
      word: item.word.toUpperCase(),
      tier: item.word.length >= 7 ? 3 : item.word.length >= 5 ? 2 : 1,
      partOfSpeech: 'learned term',
      definition: item.definition || 'Player-taught recognized vocabulary word.',
      antonyms: [],
      primaryAntonym: '',
    });
  }
}

/**
 * Record an attempt to swipe or call an unrecognised word.
 * Returns { attempts: number, newlyLearned: boolean }
 */
export function recordWordAttempt(word: string): { attempts: number; newlyLearned: boolean } {
  const normalized = word.trim().toUpperCase();
  const current = (sessionAttempts.get(normalized) || 0) + 1;
  sessionAttempts.set(normalized, current);

  if (current >= 5) {
    addLearnedWord(normalized);
    sessionAttempts.delete(normalized);
    return { attempts: current, newlyLearned: true };
  }

  return { attempts: current, newlyLearned: false };
}

/**
 * Get current in-progress attempts for all words in the session
 */
export function getSessionAttempts(): Array<{ word: string; attempts: number }> {
  const result: Array<{ word: string; attempts: number }> = [];
  sessionAttempts.forEach((attempts, word) => {
    result.push({ word, attempts });
  });
  return result.sort((a, b) => b.attempts - a.attempts);
}

export interface DictionaryApiResponseItem {
  word: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
    synonyms?: string[];
    antonyms?: string[];
  }>;
}

/**
 * Fetch word details from https://dictionaryapi.dev/
 * with server proxy fallback, local lexicon fallback, and learned words facility.
 */
export async function lookupDictionaryWord(word: string): Promise<LexiconWord | null> {
  const normalized = word.trim().toUpperCase();
  if (!normalized || normalized.length < 2) return null;

  // 1. Check in-memory cache (includes Oxford Lexicon + Learned Words)
  if (dictionaryCache.has(normalized)) {
    return dictionaryCache.get(normalized) || null;
  }

  // 2. Check local Oxford Lexicon rules (including morphological suffix rules)
  const localMatch = findLexiconWord(normalized);
  if (localMatch) {
    dictionaryCache.set(normalized, localMatch);
    return localMatch;
  }

  // 3. Fetch from Free Dictionary API (https://dictionaryapi.dev/)
  try {
    const cleanWord = normalized.toLowerCase();
    let res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
      headers: { Accept: 'application/json' },
    });

    // If direct client fetch failed (or blocked by content filter), try server proxy
    if (!res.ok && res.status !== 404) {
      try {
        res = await fetch(`/api/dictionary/${encodeURIComponent(cleanWord)}`);
      } catch {}
    }

    if (!res.ok) {
      if (res.status === 404) {
        if (localMatch) return localMatch;
        dictionaryCache.set(normalized, null);
        return null;
      }
      return localMatch || null;
    }

    const data: DictionaryApiResponseItem[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return localMatch || null;
    }

    const firstEntry = data[0];
    const firstMeaning = firstEntry.meanings?.[0];
    const firstDef = firstMeaning?.definitions?.[0]?.definition || '';
    const partOfSpeech = firstMeaning?.partOfSpeech ? `${firstMeaning.partOfSpeech}.` : 'adj.';

    // Gather all antonyms found across all meanings and definitions
    const extractedAntonyms = new Set<string>();
    data.forEach(entry => {
      entry.meanings?.forEach(meaning => {
        meaning.antonyms?.forEach(ant => extractedAntonyms.add(ant.toUpperCase()));
        meaning.definitions?.forEach(def => {
          def.antonyms?.forEach(ant => extractedAntonyms.add(ant.toUpperCase()));
        });
      });
    });

    const antonymsArray = Array.from(extractedAntonyms);
    const primaryAntonym = antonymsArray[0] || '';

    let tier: 1 | 2 | 3 | 4 = 1;
    if (normalized.length >= 8) tier = 4;
    else if (normalized.length >= 6) tier = 3;
    else if (normalized.length >= 5) tier = 2;

    const result: LexiconWord = {
      word: normalized,
      tier,
      partOfSpeech,
      definition: firstDef || 'An English dictionary term.',
      antonyms: antonymsArray,
      primaryAntonym,
    };

    dictionaryCache.set(normalized, result);
    return result;
  } catch (_err) {
    return null;
  }
}

/**
 * Fast synchronous check if a word is recognized locally or cached
 */
export function isWordKnownLocally(word: string): boolean {
  const upper = word.trim().toUpperCase();
  if (dictionaryCache.has(upper)) {
    return dictionaryCache.get(upper) !== null;
  }
  return !!findLexiconWord(upper);
}

/**
 * Validate antonym using both local bank and dictionary API
 */
export async function verifyAntonymWithApi(targetWord: string, candidate: string): Promise<boolean> {
  const normTarget = targetWord.trim().toUpperCase();
  const normCandidate = candidate.trim().toUpperCase();
  if (!normTarget || !normCandidate) return false;

  const entry = await lookupDictionaryWord(normTarget);
  if (!entry) return false;

  if (entry.antonyms.some(a => a.toUpperCase() === normCandidate)) {
    return true;
  }

  const candidateEntry = await lookupDictionaryWord(normCandidate);
  if (candidateEntry && candidateEntry.antonyms.some(a => a.toUpperCase() === normTarget)) {
    return true;
  }

  return false;
}

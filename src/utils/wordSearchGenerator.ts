/**
 * Robust Word Search Matrix Generator & Real-time Grid Word Finder
 */

export interface Coordinate {
  r: number;
  c: number;
}

export interface WordPlacement {
  id: string;
  word: string;
  tier: 1 | 2 | 3 | 4;
  path: Coordinate[];
  found: boolean;
  foundByVoice: boolean;
  color: string;
  definition: string;
  antonyms: string[];
  primaryAntonym: string;
}

export interface GeneratedBoard {
  grid: string[][];
  allHiddenWords: WordPlacement[];
  maxViableWordLength: number;
  size: number;
}

// 8 Directions: [rowDelta, colDelta]
export const DIRECTIONS = [
  [0, 1],   // Left to Right
  [1, 0],   // Top to Bottom
  [1, 1],   // Diagonal Down-Right
  [-1, 1],  // Diagonal Up-Right
  [0, -1],  // Right to Left
  [-1, 0],  // Bottom to Top
  [1, -1],  // Diagonal Down-Left
  [-1, -1], // Diagonal Up-Left
];

// Ultra-vibrant, high-contrast candy colors for highlighting discovered words
export const VIBRANT_WORD_COLORS = [
  '#10B981', // Neon Mint Emerald
  '#F59E0B', // Radiant Sun Amber
  '#EC4899', // Hot Pink Neon
  '#06B6D4', // Electric Cyan
  '#8B5CF6', // Vivid Purple
  '#F43F5E', // Bright Coral Rose
  '#14B8A6', // Tropical Teal
  '#F97316', // Electric Orange
  '#6366F1', // Royal Indigo
  '#84CC16', // Lime Zest
  '#D946EF', // Electric Fuchsia
  '#0EA5E9', // Sky Blue
  '#E11D48', // Ruby Laser
  '#EAB308', // Golden Flame
];

const LETTER_POOL = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';

export function generateWordSearch(
  wordsPool: Array<{
    word: string;
    tier: 1 | 2 | 3 | 4;
    definition: string;
    antonyms: string[];
    primaryAntonym: string;
  }>,
  gridSize: number,
  targetCount: number = 22
): GeneratedBoard {
  const size = Math.max(gridSize, 8);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placements: WordPlacement[] = [];

  // Categorize candidates by length to guarantee a vibrant mix of short, medium, and longer words
  const validCandidates = wordsPool.filter(w => w.word.length <= size && w.word.length >= 2);

  const shortCandidates = validCandidates
    .filter(w => w.word.length >= 2 && w.word.length <= 3)
    .sort(() => Math.random() - 0.5);

  const mediumCandidates = validCandidates
    .filter(w => w.word.length >= 4 && w.word.length <= 5)
    .sort(() => Math.random() - 0.5);

  const longCandidates = validCandidates
    .filter(w => w.word.length >= 6)
    .sort(() => Math.random() - 0.5);

  // Balanced target quotas: e.g. 6 short, 10 medium, 6 long
  const targetLong = Math.min(longCandidates.length, Math.max(3, Math.floor(targetCount * 0.25)));
  const targetMedium = Math.min(mediumCandidates.length, Math.max(6, Math.floor(targetCount * 0.45)));
  const targetShort = Math.min(shortCandidates.length, targetCount - targetLong - targetMedium);

  // Strategy: Place longer words first while board is spacious, then medium, then short words (which fit easily)
  const orderedPool = [
    ...longCandidates.slice(0, targetLong),
    ...mediumCandidates.slice(0, targetMedium),
    ...shortCandidates.slice(0, targetShort),
    // Fallback overflow candidates
    ...validCandidates.sort(() => Math.random() - 0.5),
  ];

  // Deduplicate pool
  const seenWordIds = new Set<string>();
  const candidates: typeof wordsPool = [];
  for (const item of orderedPool) {
    if (!seenWordIds.has(item.word)) {
      seenWordIds.add(item.word);
      candidates.push(item);
    }
  }

  let placedCount = 0;

  for (let wIdx = 0; wIdx < candidates.length && placedCount < targetCount; wIdx++) {
    const item = candidates[wIdx];
    const word = item.word.toUpperCase();
    const len = word.length;
    let placed = false;
    let attempts = 0;
    const maxAttempts = 240;

    while (!placed && attempts < maxAttempts) {
      attempts++;
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const [dr, dc] = dir;

      const minR = dr < 0 ? len - 1 : 0;
      const maxR = dr > 0 ? size - len : size - 1;
      const minC = dc < 0 ? len - 1 : 0;
      const maxC = dc > 0 ? size - len : size - 1;

      if (minR > maxR || minC > maxC) continue;

      const startR = Math.floor(Math.random() * (maxR - minR + 1)) + minR;
      const startC = Math.floor(Math.random() * (maxC - minC + 1)) + minC;

      let canPlace = true;
      const testPath: Coordinate[] = [];

      for (let i = 0; i < len; i++) {
        const currR = startR + dr * i;
        const currC = startC + dc * i;
        const cellLetter = grid[currR][currC];

        if (cellLetter !== '' && cellLetter !== word[i]) {
          canPlace = false;
          break;
        }
        testPath.push({ r: currR, c: currC });
      }

      if (canPlace) {
        for (let i = 0; i < len; i++) {
          grid[testPath[i].r][testPath[i].c] = word[i];
        }

        const color = VIBRANT_WORD_COLORS[placedCount % VIBRANT_WORD_COLORS.length];
        placements.push({
          id: `w-${placedCount}-${word}`,
          word,
          tier: item.tier,
          path: testPath,
          found: false,
          foundByVoice: false,
          color,
          definition: item.definition,
          antonyms: item.antonyms,
          primaryAntonym: item.primaryAntonym,
        });
        placed = true;
        placedCount++;
      }
    }
  }

  // Calculate the maximum viable word length placed in this grid
  const maxViableWordLength = placements.length > 0
    ? Math.max(...placements.map(p => p.word.length))
    : 8;

  // Fill remaining cells with natural English letter distribution
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        const randomChar = LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
        grid[r][c] = randomChar;
      }
    }
  }

  return {
    grid,
    allHiddenWords: placements,
    maxViableWordLength,
    size,
  };
}

/**
 * Searches the grid for any occurrence of targetWord in all 8 directions.
 */
export function findWordInGrid(grid: string[][], targetWord: string): Coordinate[] | null {
  const word = targetWord.trim().toUpperCase();
  const len = word.length;
  const size = grid.length;
  if (len < 2 || len > size) return null;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== word[0]) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const endR = r + dr * (len - 1);
        const endC = c + dc * (len - 1);

        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

        let match = true;
        const path: Coordinate[] = [];

        for (let i = 0; i < len; i++) {
          const curR = r + dr * i;
          const curC = c + dc * i;
          if (grid[curR][curC] !== word[i]) {
            match = false;
            break;
          }
          path.push({ r: curR, c: curC });
        }

        if (match) {
          return path;
        }
      }
    }
  }

  return null;
}

/**
 * Checks if two coordinates form a valid straight or diagonal line,
 * with optional maxLength clamping!
 */
export function getLineBetweenClamped(
  start: Coordinate,
  end: Coordinate,
  maxLength: number
): { line: Coordinate[]; wasClamped: boolean } | null {
  const dr = end.r - start.r;
  const dc = end.c - start.c;

  const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
  const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;

  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  if (absDr !== 0 && absDc !== 0 && absDr !== absDc) {
    return null;
  }

  let requestedSteps = Math.max(absDr, absDc);
  let wasClamped = false;

  // Maximum allowed steps is maxLength - 1 (since total letters = steps + 1)
  const maxAllowedSteps = Math.max(1, maxLength - 1);
  if (requestedSteps > maxAllowedSteps) {
    requestedSteps = maxAllowedSteps;
    wasClamped = true;
  }

  const line: Coordinate[] = [];
  for (let i = 0; i <= requestedSteps; i++) {
    line.push({
      r: start.r + stepR * i,
      c: start.c + stepC * i,
    });
  }

  return { line, wasClamped };
}

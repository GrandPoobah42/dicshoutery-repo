import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Coordinate, getLineBetweenClamped } from '../utils/wordSearchGenerator';
import { sound } from '../services/soundEffects';
import { Sparkles, Touchpad } from 'lucide-react';

export interface FoundWordDisplay {
  id: string;
  word: string;
  path: Coordinate[];
  color: string;
}

interface WordSearchGridProps {
  grid: string[][];
  foundWords: FoundWordDisplay[];
  onSelectLetters: (word: string, path: Coordinate[]) => void;
  size: number;
  maxViableWordLength: number;
}

export const WordSearchGrid: React.FC<WordSearchGridProps> = ({
  grid,
  foundWords,
  onSelectLetters,
  size,
  maxViableWordLength,
}) => {
  const [startCell, setStartCell] = useState<Coordinate | null>(null);
  const [currentCell, setCurrentCell] = useState<Coordinate | null>(null);
  const [isPointerDown, setIsPointerDown] = useState<boolean>(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Calculate active line clamped strictly to maxViableWordLength
  const activeLineInfo = React.useMemo(() => {
    if (!startCell || !currentCell) return { line: [], wasClamped: false };
    const res = getLineBetweenClamped(startCell, currentCell, maxViableWordLength);
    if (!res) return { line: [startCell], wasClamped: false };
    return res;
  }, [startCell, currentCell, maxViableWordLength]);

  const activeLine = activeLineInfo.line;

  // Selected string
  const activeWordString = React.useMemo(() => {
    if (activeLine.length === 0) return '';
    return activeLine.map(pt => grid[pt.r]?.[pt.c] || '').join('');
  }, [activeLine, grid]);

  // Points preview: each letter is worth 1 point
  const currentLetterPoints = activeWordString.length;

  // Check if cell is in any found word
  const getCellFoundColors = useCallback(
    (r: number, c: number): string[] => {
      const colors: string[] = [];
      for (const fw of foundWords) {
        if (fw.path.some(pt => pt.r === r && pt.c === c)) {
          colors.push(fw.color);
        }
      }
      return colors;
    },
    [foundWords]
  );

  const isCellActive = useCallback(
    (r: number, c: number) => {
      return activeLine.some(pt => pt.r === r && pt.c === c);
    },
    [activeLine]
  );

  const submitSelection = useCallback(
    (line: Coordinate[]) => {
      if (line.length < 2) return;
      const word = line.map(pt => grid[pt.r]?.[pt.c] || '').join('');
      if (word.length >= 2) {
        onSelectLetters(word, line);
      }
    },
    [grid, onSelectLetters]
  );

  // Helper: locate grid cell from client screen coordinates (Works flawlessly on iOS Safari)
  const getCellFromCoords = useCallback((clientX: number, clientY: number): Coordinate | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const cellEl = el?.closest('[data-grid-cell="true"]');
    if (!cellEl) return null;
    const r = parseInt(cellEl.getAttribute('data-r') || '-1', 10);
    const c = parseInt(cellEl.getAttribute('data-c') || '-1', 10);
    if (r >= 0 && c >= 0) return { r, c };
    return null;
  }, []);

  // START DRAG / SWIPE
  const startDragAt = (r: number, c: number) => {
    setIsPointerDown(true);
    setStartCell({ r, c });
    setCurrentCell({ r, c });
    sound.playTileClick();
  };

  // UPDATE DRAG / SWIPE
  const updateDragTo = useCallback(
    (target: Coordinate | null) => {
      if (!target || !isPointerDown) return;
      setCurrentCell(prev => {
        if (!prev || prev.r !== target.r || prev.c !== target.c) {
          // Play subtle click when entering a new cell along a line
          sound.playTileClick();
          return target;
        }
        return prev;
      });
    },
    [isPointerDown]
  );

  // END DRAG / SWIPE
  const finishDrag = useCallback(() => {
    if (isPointerDown && activeLine.length > 1) {
      submitSelection(activeLine);
    }
    setIsPointerDown(false);
    setStartCell(null);
    setCurrentCell(null);
  }, [isPointerDown, activeLine, submitSelection]);

  // Click fallback (Tap start cell, then tap end cell)
  const handleCellClick = (r: number, c: number) => {
    if (!isPointerDown) {
      if (!startCell) {
        setStartCell({ r, c });
        setCurrentCell({ r, c });
        sound.playTileClick();
      } else {
        const res = getLineBetweenClamped(startCell, { r, c }, maxViableWordLength);
        if (res && res.line.length > 1) {
          submitSelection(res.line);
          setStartCell(null);
          setCurrentCell(null);
        } else {
          setStartCell({ r, c });
          setCurrentCell({ r, c });
          sound.playTileClick();
        }
      }
    }
  };

  // Global Pointer & Touch Move Listener (Guarantees smooth tracking on iPhones & iPads)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const cell = getCellFromCoords(e.clientX, e.clientY);
      if (cell) {
        updateDragTo(cell);
      }
    };

    const handlePointerUp = () => {
      if (isPointerDown) {
        finishDrag();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isPointerDown, getCellFromCoords, updateDragTo, finishDrag]);

  // Prevent default scrolling on mobile when dragging over the grid container
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (isPointerDown && e.touches.length > 0) {
        // Stop iOS Safari page bounce & pull-to-refresh while swiping
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const cell = getCellFromCoords(touch.clientX, touch.clientY);
        if (cell) {
          updateDragTo(cell);
        }
      }
    };

    const handleTouchEnd = () => {
      if (isPointerDown) {
        finishDrag();
      }
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isPointerDown, getCellFromCoords, updateDragTo, finishDrag]);

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Active selection preview with letter point calculation */}
      <div className="h-10 mb-2 flex items-center justify-center gap-2">
        {activeWordString ? (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
            <span className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-black text-sm sm:text-base tracking-widest rounded-full shadow-lg shadow-indigo-500/25">
              {activeWordString}
            </span>
            <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full shadow-sm">
              +{currentLetterPoints} PTS ({currentLetterPoints} letters)
            </span>
            {activeLineInfo.wasClamped && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                (Max {maxViableWordLength} letters)
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Swipe or shout words · 1 letter = 1 point! (iPhone swipe enabled)</span>
          </div>
        )}
      </div>

      {/* Grid container with ultra-vibrant card styling and touch-action: none */}
      <div
        ref={gridContainerRef}
        style={{
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        className="p-3 sm:p-5 bg-gradient-to-b from-white to-amber-50/20 dark:from-slate-900 dark:to-slate-900/90 border-2 border-amber-300 dark:border-amber-500/60 rounded-3xl shadow-2xl shadow-amber-500/10 select-none touch-none inline-block relative overflow-hidden"
      >
        <div
          className="grid gap-1.5 sm:gap-2.5 select-none touch-none"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const foundColors = getCellFoundColors(r, c);
              const isActive = isCellActive(r, c);
              const isFound = foundColors.length > 0;
              const primaryColor = foundColors[0];

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  data-grid-cell="true"
                  data-r={r}
                  data-c={c}
                  onPointerDown={(e) => {
                    // Prevent text selection or browser gesture on touch
                    startDragAt(r, c);
                  }}
                  onTouchStart={(e) => {
                    // Ensure iOS touches immediately register without 300ms delay
                    startDragAt(r, c);
                  }}
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    touchAction: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    backgroundColor: isFound && !isActive ? `${primaryColor}35` : undefined,
                    borderColor: isFound && !isActive ? primaryColor : undefined,
                  }}
                  className={`relative w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center rounded-xl font-black text-base sm:text-lg transition-all duration-100 select-none cursor-pointer touch-none ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 text-white scale-110 shadow-lg shadow-fuchsia-500/40 z-20 ring-2 ring-white'
                      : isFound
                      ? 'text-slate-950 dark:text-white font-black shadow-md ring-2 scale-[1.02]'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-400 hover:scale-105 shadow-sm hover:shadow-md'
                  }`}
                  aria-label={`Letter ${letter} at row ${r + 1}, column ${c + 1}`}
                >
                  <span className="relative z-10 pointer-events-none select-none">{letter}</span>

                  {/* 1 Point subscript badge */}
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-bold font-mono-numbers pointer-events-none select-none ${
                      isActive
                        ? 'text-white/80'
                        : isFound
                        ? 'text-slate-900/70 dark:text-white/70'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    1
                  </span>

                  {/* High-visibility vibrant color fill when found */}
                  {isFound && !isActive && (
                    <span
                      className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

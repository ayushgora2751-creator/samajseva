import React from 'react';
import { sounds } from '../services/soundEffects';

export default function Board({
  board = [],
  calledNumbers = [],
  winningCells = [],
  isMyTurn = false,
  lastCalled = null,
  onSelectNumber,
}) {
  const calledSet = new Set(calledNumbers);
  const winningSet = new Set(winningCells);

  const handleTileClick = (number) => {
    if (!isMyTurn) return;
    if (calledSet.has(number)) return;

    sounds.playTileSelect();
    if (onSelectNumber) {
      onSelectNumber(number);
    }
  };

  if (!board || board.length === 0) {
    return (
      <div className="w-full aspect-square max-w-[480px] flex items-center justify-center glass-panel rounded-2xl p-8 text-center text-purple-300">
        <div className="animate-pulse">Generating your randomized 5×5 arena board...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <div className="grid grid-cols-5 gap-2 sm:gap-3 p-3 sm:p-4 rounded-3xl glass-panel border-2 border-purple-500/30 shadow-2xl shadow-purple-950/60">
        {board.map((row, rowIndex) =>
          row.map((number, colIndex) => {
            const isCalled = calledSet.has(number);
            const isWinning = winningSet.has(`${rowIndex},${colIndex}`);
            const isRecent = lastCalled === number;
            const canClick = isMyTurn && !isCalled;

            let tileClasses = 'relative aspect-square rounded-xl sm:rounded-2xl font-black flex flex-col items-center justify-center select-none text-base sm:text-2xl transition-all duration-300 transform ';

            if (isWinning) {
              tileClasses += 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 border-2 border-amber-200 shadow-lg shadow-amber-500/60 scale-102 ring-2 ring-amber-300/60 ';
            } else if (isCalled) {
              tileClasses += 'bg-gradient-to-br from-[#7048FF]/80 to-[#398BFF]/70 text-white/90 border border-purple-400/40 shadow-md shadow-purple-900/40 ';
            } else if (canClick) {
              tileClasses += 'bg-[#1B1238]/80 hover:bg-[#7048FF]/30 text-white border border-purple-500/30 hover:border-[#398BFF] hover:shadow-lg hover:shadow-[#398BFF]/30 hover:-translate-y-0.5 cursor-pointer active:scale-95 ';
            } else {
              tileClasses += 'bg-[#1B1238]/50 text-gray-400/80 border border-white/5 cursor-not-allowed opacity-80 ';
            }

            if (isRecent) {
              tileClasses += 'ring-4 ring-[#EC65CB] animate-pulse ';
            }

            return (
              <button
                key={`${rowIndex}-${colIndex}-${number}`}
                onClick={() => handleTileClick(number)}
                disabled={!canClick}
                className={tileClasses}
                aria-label={`Bingo number ${number}`}
              >
                <span>{number}</span>

                {isCalled && !isWinning && (
                  <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-300 shadow-sm shadow-cyan-400" />
                )}

                {isWinning && (
                  <span className="absolute top-1 right-1 text-[10px] sm:text-xs">★</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


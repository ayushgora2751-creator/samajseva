import React from 'react';

const LETTERS = ['B', 'I', 'N', 'G', 'O'];

export default function BingoLetters({ completedLines = 0, label = 'BINGO PROGRESS' }) {
  const activeCount = Math.min(Math.max(completedLines, 0), 5);

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-[11px] font-bold tracking-widest text-purple-300/80 mb-2 uppercase">
          {label} ({activeCount}/5 Lines)
        </span>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        {LETTERS.map((letter, index) => {
          const isActive = index < activeCount;
          return (
            <div
              key={letter}
              className={`w-9 h-11 sm:w-11 sm:h-14 rounded-xl flex items-center justify-center font-black text-lg sm:text-2xl transition-all duration-500 transform ${
                isActive
                  ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-gray-950 shadow-lg shadow-amber-500/50 scale-105 border-2 border-amber-200'
                  : 'bg-white/5 text-gray-500 border border-white/10'
              }`}
            >
              {letter}
            </div>
          );
        })}
      </div>
    </div>
  );
}


import React from 'react';
import { History } from 'lucide-react';

export default function MoveHistory({ calledNumbers = [] }) {
  if (!calledNumbers || calledNumbers.length === 0) {
    return (
      <div className="w-full glass-card rounded-2xl p-3 text-center text-xs text-purple-300/60">
        No numbers called yet. Match is starting!
      </div>
    );
  }

  // Reverse so newest appears first
  const reversed = [...calledNumbers].reverse();

  return (
    <div className="w-full glass-card rounded-2xl p-3 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-2 text-xs font-bold text-purple-300/80 uppercase tracking-wider">
        <History className="w-3.5 h-3.5 text-blue-400" />
        <span>Called Numbers ({calledNumbers.length}/25)</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {reversed.map((num, idx) => (
          <span
            key={`${num}-${idx}`}
            className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 transition-transform ${
              idx === 0
                ? 'bg-[#EC65CB] text-white shadow-md shadow-pink-500/40 scale-110 border border-white/40'
                : 'bg-white/5 text-purple-200 border border-white/10'
            }`}
          >
            {num}
          </span>
        ))}
      </div>
    </div>
  );
}


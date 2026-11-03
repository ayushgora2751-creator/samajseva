import React from 'react';
import { Sparkles, Clock, AlertCircle } from 'lucide-react';

export default function TurnIndicator({ isMyTurn = false, opponentName = 'Opponent', lastMove = null }) {
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div
        className={`w-full max-w-[420px] py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 ${
          isMyTurn
            ? 'bg-gradient-to-r from-[#398BFF] via-[#7048FF] to-[#EC65CB] text-white shadow-xl shadow-purple-600/40 animate-pulse border border-white/30'
            : 'bg-white/5 text-purple-300/80 border border-purple-500/20'
        }`}
      >
        {isMyTurn ? (
          <>
            <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
            <span>YOUR TURN – PICK A NUMBER!</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>WAITING FOR {opponentName.toUpperCase()}&apos;S MOVE...</span>
          </>
        )}
      </div>

      {lastMove && (
        <span className="text-xs text-purple-300/70 font-semibold tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          Last call: <strong className="text-white">{lastMove.nickname}</strong> picked number{' '}
          <span className="px-1.5 py-0.5 rounded bg-purple-600/50 text-amber-300 font-bold border border-purple-400/40">
            {lastMove.number}
          </span>
        </span>
      )}
    </div>
  );
}


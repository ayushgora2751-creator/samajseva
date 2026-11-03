import React from 'react';
import { getAvatar } from '../utils/avatars';

export default function PlayerCard({
  player,
  isCurrentTurn = false,
  isMe = false,
  playerNumber = 1,
  completedLines = 0,
}) {
  const avatarData = getAvatar(player?.avatar);
  const isOnline = player?.is_online !== false;

  return (
    <div
      className={`relative p-3.5 sm:p-4 rounded-2xl glass-card transition-all duration-300 ${
        isCurrentTurn
          ? 'border-2 border-[#398BFF] shadow-lg shadow-[#398BFF]/25 scale-102 ring-1 ring-[#398BFF]/40'
          : 'border border-white/10 opacity-90'
      }`}
    >
      {/* Current Turn Badge */}
      {isCurrentTurn && (
        <span className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#398BFF] to-[#7048FF] text-white shadow-md shadow-blue-500/40 animate-pulse">
          Active Turn
        </span>
      )}

      <div className="flex items-center gap-3">
        {/* Avatar with gradient & online dot */}
        <div className="relative">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${avatarData.color} flex items-center justify-center text-2xl sm:text-3xl shadow-md border-2 border-white/20`}
          >
            {avatarData.emoji}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#100B24] ${
              isOnline ? 'bg-emerald-400' : 'bg-gray-500'
            }`}
            title={isOnline ? 'Online' : 'Disconnected'}
          />
        </div>

        {/* Player Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base text-white truncate">
              {player?.nickname || `Player ${playerNumber}`}
            </span>
            {isMe && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#7048FF]/50 text-purple-200 border border-purple-400/30">
                YOU
              </span>
            )}
          </div>
          <p className="text-xs text-purple-300/70 font-medium">
            Player {playerNumber}
          </p>

          {/* Lines progress bar */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              {completedLines} / 5 Lines
            </span>
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(completedLines * 20, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


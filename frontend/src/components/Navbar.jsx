import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Trophy, HelpCircle, Gamepad2 } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function Navbar({ onNavigate, currentPage, onOpenRules }) {
  const [muted, setMuted] = useState(sounds.isMuted());

  const handleToggleSound = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sounds.playClick();
    }
  };

  return (
    <nav className="w-full glass-panel sticky top-0 z-40 px-4 sm:px-8 py-3.5 border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => {
            sounds.playClick();
            onNavigate('home');
          }}
          className="flex items-center gap-3 group text-left transition-transform hover:scale-105"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7048FF] to-[#398BFF] flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/60 transition-all">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-purple-200 to-[#398BFF] bg-clip-text text-transparent">
              BINGO ARENA
            </span>
            <span className="hidden sm:block text-[10px] tracking-widest text-purple-300/70 font-semibold uppercase">
              Multiplayer 1–25
            </span>
          </div>
        </button>

        {/* Navigation Items */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              sounds.playClick();
              onNavigate('leaderboard');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              currentPage === 'leaderboard'
                ? 'bg-[#7048FF]/30 text-purple-300 border border-[#7048FF]/50'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Leaderboard</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              if (onOpenRules) onOpenRules();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">How to Play</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleSound}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}


import React, { useState } from 'react';
import { Play, PlusCircle, LogIn, Users, Zap, Shield, Sparkles, Trophy } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function HomePage({
  onOpenCreate,
  onOpenJoin,
  onQuickPlay,
  onOpenLeaderboard,
  onOpenRules,
}) {
  // Interactive preview board
  const [previewBoard, setPreviewBoard] = useState([
    [7, 23, 4, 19, 11],
    [15, 2, 21, 8, 14],
    [1, 18, 25, 6, 12],
    [20, 9, 16, 3, 22],
    [13, 24, 10, 5, 17],
  ]);
  const [previewSelected, setPreviewSelected] = useState(new Set([7, 21, 25, 3, 17]));

  const togglePreviewTile = (num) => {
    sounds.playTileSelect();
    setPreviewSelected((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  return (
    <div className="relative min-h-[calc(100vh-68px)] overflow-hidden">
      {/* Background Neon Orbs */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-[#7048FF]/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#398BFF]/20 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />

      {/* Floating decorative mini tiles */}
      <div className="hidden lg:block absolute top-28 left-16 px-4 py-2 rounded-2xl glass-card font-black text-xl text-purple-300 border border-purple-500/30 animate-float shadow-lg shadow-purple-900/50">
        #17
      </div>
      <div className="hidden lg:block absolute top-64 right-20 px-4 py-2 rounded-2xl glass-card font-black text-xl text-cyan-300 border border-cyan-500/30 animate-float shadow-lg shadow-blue-900/50" style={{ animationDelay: '1.5s' }}>
        #25
      </div>
      <div className="hidden lg:block absolute bottom-36 left-28 px-4 py-2 rounded-2xl glass-card font-black text-xl text-pink-300 border border-pink-500/30 animate-float shadow-lg shadow-pink-900/50" style={{ animationDelay: '2.5s' }}>
        #07
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border border-purple-500/30 text-xs font-bold text-purple-300 shadow-md shadow-purple-900/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Online 1v1 PvP Arena</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              LET THE NUMBERS <br />
              <span className="bg-gradient-to-r from-purple-400 via-[#398BFF] to-[#EC65CB] bg-clip-text text-transparent">
                DECIDE YOUR DESTINY
              </span>
            </h1>

            <p className="text-base sm:text-lg text-purple-200/80 max-w-2xl mx-auto lg:mx-0 font-medium">
              Challenge your friends in the ultimate 1–25 multiplayer Bingo experience. Pick your numbers, form 5 lines, and claim victory in real-time.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <button
                onClick={() => {
                  sounds.playClick();
                  onQuickPlay();
                }}
                className="py-4 px-7 rounded-2xl font-black text-base tracking-wide bg-gradient-to-r from-[#7048FF] to-[#398BFF] hover:from-[#8058FF] hover:to-[#499BFF] text-white shadow-xl shadow-purple-600/40 hover:shadow-purple-600/60 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:scale-98"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY ONLINE NOW</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenCreate();
                }}
                className="py-4 px-6 rounded-2xl font-bold text-base tracking-wide bg-white/10 hover:bg-white/15 text-white border border-purple-400/30 hover:border-purple-400/60 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-98"
              >
                <PlusCircle className="w-5 h-5 text-purple-300" />
                <span>Create Private Room</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenJoin();
                }}
                className="py-4 px-6 rounded-2xl font-bold text-base tracking-wide bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <LogIn className="w-5 h-5 text-blue-400" />
                <span>Join Room</span>
              </button>
            </div>

            {/* Counters / Stats Bar */}
            <div className="pt-6 grid grid-cols-3 gap-3 border-t border-purple-500/20 max-w-md mx-auto lg:mx-0">
              <div>
                <span className="block text-xl sm:text-2xl font-black text-white">2,480+</span>
                <span className="text-xs text-purple-300/70 font-semibold">Active Gladiators</span>
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-black text-amber-400">18,900+</span>
                <span className="text-xs text-purple-300/70 font-semibold">Games Played</span>
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-black text-emerald-400">99.9%</span>
                <span className="text-xs text-purple-300/70 font-semibold">Real-Time Sync</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Board Preview */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[390px] relative">
              {/* Outer decorative neon frame */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#7048FF] via-[#398BFF] to-[#EC65CB] opacity-40 blur-lg" />

              <div className="relative glass-panel rounded-3xl p-5 border border-purple-500/40 shadow-2xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-extrabold tracking-wider text-purple-200 uppercase">
                      Live Board Preview
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-400">Click tiles to test</span>
                </div>

                {/* 5x5 Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {previewBoard.map((row, rIdx) =>
                    row.map((num, cIdx) => {
                      const isSel = previewSelected.has(num);
                      return (
                        <button
                          key={`prev-${rIdx}-${cIdx}`}
                          onClick={() => togglePreviewTile(num)}
                          className={`aspect-square rounded-xl font-black text-sm sm:text-base flex items-center justify-center transition-all duration-200 select-none ${
                            isSel
                              ? 'bg-gradient-to-br from-[#7048FF] to-[#398BFF] text-white shadow-md shadow-purple-600/50 scale-105 border border-white/30'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between text-xs text-purple-300/80">
                  <span>Lines completed: <strong className="text-amber-300">1 / 5</strong></span>
                  <span className="font-bold text-[#398BFF] tracking-wider uppercase">[B] INGO</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="mt-20 pt-10 border-t border-purple-500/20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-purple-500/20 hover:border-[#7048FF]/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#7048FF]/20 flex items-center justify-center mb-4 text-[#7048FF]">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Instant WebSocket Sync</h3>
            <p className="text-sm text-purple-200/70 leading-relaxed">
              Sub-10ms synchronization powered by Django Channels. Every called number updates both arena screens instantly.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-purple-500/20 hover:border-[#398BFF]/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#398BFF]/20 flex items-center justify-center mb-4 text-[#398BFF]">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Server-Authoritative Rules</h3>
            <p className="text-sm text-purple-200/70 leading-relaxed">
              No client-side manipulation. Turns, line calculations (rows, columns, diagonals), and victories are mathematically verified on the backend.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-purple-500/20 hover:border-[#EC65CB]/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#EC65CB]/20 flex items-center justify-center mb-4 text-[#EC65CB]">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Persistent Leaderboards</h3>
            <p className="text-sm text-purple-200/70 leading-relaxed">
              Track wins, losses, win rates, and match statistics. Compete against top champions on the global leaderboard.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-purple-500/10 flex flex-col sm:flex-row items-center justify-between text-xs text-purple-300/60 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">BINGO ARENA</span>
            <span>&copy; 2026. Pick Your Numbers. Make Your Move.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onOpenRules} className="hover:text-white transition-colors">
              Rules
            </button>
            <button onClick={onOpenLeaderboard} className="hover:text-white transition-colors">
              Leaderboard
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}


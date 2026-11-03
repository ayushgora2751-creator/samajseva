import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Award } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function WinnerModal({
  winnerName,
  isTie = false,
  isWinner = false,
  myLines = 0,
  opponentLines = 0,
  onRematch,
  onHome,
}) {
  useEffect(() => {
    if (isWinner) {
      sounds.playVictory();
      // Fire multi-stage celebratory confetti
      const count = 200;
      const defaults = { origin: { y: 0.6 } };

      function fire(particleRatio, opts) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    } else if (!isTie) {
      sounds.playDefeat();
    }
  }, [isWinner, isTie]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 glass-panel border-2 border-purple-500/50 shadow-2xl shadow-purple-950/80 text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Crown / Trophy icon */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center shadow-xl shadow-amber-500/40 mb-4 border-2 border-amber-200">
          {isTie ? (
            <Award className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950" />
          ) : (
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950 animate-bounce" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-white mb-1">
          {isTie ? (
            <span className="text-amber-300">DOUBLE BINGO – IT&apos;S A TIE!</span>
          ) : isWinner ? (
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              VICTORY! BINGO ACHIEVED!
            </span>
          ) : (
            <span className="text-rose-400">{winnerName.toUpperCase()} WON!</span>
          )}
        </h2>

        <p className="text-sm text-purple-200/80 mb-6 font-medium">
          {isTie
            ? 'Both gladiators completed 5 lines on the arena!'
            : isWinner
            ? 'Incredible strategy! You conquered the arena and reached 5 lines first!'
            : 'Well fought! Regroup and challenge them to a rematch!'}
        </p>

        {/* Score comparison card */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <div className="p-2 rounded-xl bg-purple-900/30">
            <span className="text-[11px] font-bold text-purple-300 uppercase block">Your Lines</span>
            <span className="text-2xl font-black text-amber-300">{myLines} / 5</span>
          </div>
          <div className="p-2 rounded-xl bg-purple-900/30">
            <span className="text-[11px] font-bold text-purple-300 uppercase block">Opponent</span>
            <span className="text-2xl font-black text-cyan-300">{opponentLines} / 5</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              if (onRematch) onRematch();
            }}
            className="flex-1 py-3 px-4 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-[#7048FF] to-[#398BFF] hover:from-[#8058FF] hover:to-[#499BFF] text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch Now</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              if (onHome) onHome();
            }}
            className="py-3 px-4 rounded-xl font-bold text-sm tracking-wide bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>Leave Arena</span>
          </button>
        </div>
      </div>
    </div>
  );
}


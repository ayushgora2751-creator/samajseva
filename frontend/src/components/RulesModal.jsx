import React from 'react';
import { X, CheckCircle2, Flame, Award } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl p-6 sm:p-8 glass-panel border border-purple-500/40 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7048FF] to-[#398BFF] flex items-center justify-center text-xl">
            🎯
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">How to Play BINGO ARENA</h2>
        </div>

        <div className="space-y-4 text-sm text-purple-200/90 leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-bold">1. Independent 5×5 Board</strong>
              Both players receive their own secret, randomized arrangement of numbers 1 to 25.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <Flame className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-bold">2. Alternating Live Turns</strong>
              Take turns choosing an uncalled number. When a number is selected, it is stamped on both players&apos; boards in real time.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <Award className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-bold">3. Completed Lines (B - I - N - G - O)</strong>
              Complete any horizontal row, vertical column, or diagonal line to earn 1 point. Each point lights up a letter:
              <div className="flex gap-2 mt-2 font-black text-xs text-amber-300">
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40">1 Line = B</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40">2 Lines = I</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40">3 = N</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40">4 = G</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40">5 = O</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="text-xl shrink-0">👑</div>
            <div>
              <strong className="text-white block font-bold">4. Victory Condition</strong>
              The first gladiator to achieve 5 completed lines wins the match!
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="mt-6 w-full py-3 rounded-xl font-bold bg-[#7048FF] hover:bg-[#8058FF] text-white shadow-lg shadow-purple-600/30 transition-all"
        >
          Got It, Let&apos;s Play!
        </button>
      </div>
    </div>
  );
}


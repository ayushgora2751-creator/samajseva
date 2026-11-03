import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Loader2, Sparkles, Flame } from 'lucide-react';
import { getLeaderboard } from '../services/api';
import { getAvatar } from '../utils/avatars';
import { sounds } from '../services/soundEffects';

export default function LeaderboardPage({ onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    getLeaderboard()
      .then((data) => {
        if (mounted) {
          setProfiles(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load leaderboard.');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-68px)] max-w-4xl mx-auto px-4 py-8">
      {/* Top back button */}
      <button
        onClick={() => {
          sounds.playClick();
          onBack();
        }}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-purple-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border border-purple-500/30 text-xs font-bold text-purple-300 mb-3">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>HALL OF GLORY</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
          Arena Global Leaderboard
        </h1>
        <p className="text-sm text-purple-200/70">
          The most legendary Bingo tacticians ranked by total victories
        </p>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-purple-500/30 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-purple-300">
            <Loader2 className="w-8 h-8 animate-spin text-[#398BFF]" />
            <span className="text-sm font-semibold">Gathering gladiator stats...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-400 text-sm">
            {error}
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-16 text-center text-purple-300/70 space-y-2">
            <p className="text-base font-bold text-white">No matches played yet!</p>
            <p className="text-xs">Be the first gladiator to create a room and claim #1 on the leaderboard.</p>
          </div>
        ) : (
          <div className="divide-y divide-purple-500/10">
            {profiles.map((p, idx) => {
              const avatar = getAvatar(p.avatar);
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              let rankBadge = (
                <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center font-bold text-sm text-gray-400">
                  #{idx + 1}
                </span>
              );

              if (isTop1) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/20">
                    🥇
                  </span>
                );
              } else if (isTop2) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center font-black text-sm">
                    🥈
                  </span>
                );
              } else if (isTop3) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center font-black text-sm">
                    🥉
                  </span>
                );
              }

              return (
                <div
                  key={p.id || idx}
                  className="py-3.5 sm:py-4 px-2 sm:px-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors rounded-2xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {rankBadge}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar.color} flex items-center justify-center text-xl shadow-md shrink-0`}>
                      {avatar.emoji}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-black text-white text-sm sm:text-base truncate">
                        {p.nickname}
                      </span>
                      <span className="text-[11px] text-purple-300/70 font-semibold">
                        {p.games_played} Matches Played
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
                    <div>
                      <span className="block text-sm sm:text-base font-black text-emerald-400">
                        {p.wins} Wins
                      </span>
                      <span className="text-[11px] text-purple-300/60 font-medium">
                        {p.losses} Losses
                      </span>
                    </div>
                    <div className="w-14 sm:w-16">
                      <span className="block text-sm sm:text-base font-black text-amber-300">
                        {p.win_rate}%
                      </span>
                      <span className="text-[10px] uppercase font-bold text-purple-300/60">
                        Win Rate
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


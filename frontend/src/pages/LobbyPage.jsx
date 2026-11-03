import React, { useState } from 'react';
import { Copy, Check, Share2, LogOut, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { getAvatar } from '../utils/avatars';
import { sounds } from '../services/soundEffects';

export default function LobbyPage({
  roomCode,
  player,
  players = [],
  countdown = null,
  onLeaveRoom,
}) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}?room=${roomCode}`;

  const handleCopyCode = () => {
    sounds.playClick();
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    sounds.playClick();
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    sounds.playClick();
    const text = `Join my 1v1 Bingo Arena match! Room Code: ${roomCode}. Click here: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const p1 = players.find((p) => p.player_number === 1) || (player?.player_number === 1 ? player : null);
  const p2 = players.find((p) => p.player_number === 2) || (player?.player_number === 2 ? player : null);

  const p1Avatar = getAvatar(p1?.avatar);
  const p2Avatar = getAvatar(p2?.avatar);

  return (
    <div className="min-h-[calc(100vh-68px)] flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-10 border border-purple-500/40 shadow-2xl relative text-center">
        {/* Header */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border border-purple-500/30 text-xs font-bold text-purple-300 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>ARENA LOBBY</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
          Waiting for Opponent...
        </h1>
        <p className="text-sm text-purple-200/70 max-w-md mx-auto mb-6">
          Share your room code or invitation link with a friend to begin the 1v1 battle!
        </p>

        {/* Room Code Card */}
        <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/30 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-[11px] font-bold text-purple-300/70 uppercase tracking-widest block">
              Room Code
            </span>
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest bg-gradient-to-r from-white via-purple-200 to-[#398BFF] bg-clip-text text-transparent">
              {roomCode}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyCode}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#7048FF] hover:bg-[#8058FF] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all active:scale-95"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Player Slot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Player 1 Card */}
          <div className="p-4 rounded-2xl glass-card border border-purple-400/30 text-left relative overflow-hidden">
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Host
            </span>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p1Avatar.color} flex items-center justify-center text-2xl shadow-md`}>
                {p1Avatar.emoji}
              </div>
              <div className="min-w-0">
                <span className="block font-black text-white truncate text-base">
                  {p1?.nickname || 'Player 1'}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Ready in Lobby
                </span>
              </div>
            </div>
          </div>

          {/* Player 2 Card */}
          <div className={`p-4 rounded-2xl glass-card text-left relative overflow-hidden ${
            p2 ? 'border border-cyan-400/30' : 'border border-white/10 opacity-70 border-dashed'
          }`}>
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-400">
              Challenger
            </span>
            <div className="flex items-center gap-3">
              {p2 ? (
                <>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p2Avatar.color} flex items-center justify-center text-2xl shadow-md`}>
                    {p2Avatar.emoji}
                  </div>
                  <div className="min-w-0">
                    <span className="block font-black text-white truncate text-base">
                      {p2?.nickname || 'Player 2'}
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Connected!
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <span className="block font-bold text-gray-400 text-sm">
                      Waiting for Player 2...
                    </span>
                    <span className="text-xs text-purple-300/50">
                      Share room code to join
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Countdown Overlay if triggered */}
        {countdown !== null && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#7048FF]/30 to-[#398BFF]/30 border border-[#398BFF]/40 text-center animate-pulse">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-widest block mb-1">
              Both Players Ready!
            </span>
            <span className="text-3xl font-black text-white">
              Starting in {countdown}...
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              sounds.playClick();
              onLeaveRoom();
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
}


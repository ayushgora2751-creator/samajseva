import React, { useState } from 'react';
import { X, Play, Loader2, Sparkles } from 'lucide-react';
import { AVATARS } from '../utils/avatars';
import { sounds } from '../services/soundEffects';

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom, isCreating }) {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    sounds.playClick();
    const finalNickname = nickname.trim() || 'Player 1';
    onCreateRoom(finalNickname, selectedAvatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 glass-panel border border-purple-500/40 shadow-2xl relative">
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          disabled={isCreating}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7048FF] to-[#398BFF] flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Create Private Arena</h2>
            <p className="text-xs text-purple-300/70">Host a 1v1 match and invite a friend</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nickname Input */}
          <div>
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
              Your Player Tag
            </label>
            <input
              type="text"
              maxLength={20}
              placeholder="e.g. ShadowKnight"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#100B24]/80 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-[#398BFF] focus:ring-2 focus:ring-[#398BFF]/30 transition-all font-semibold"
              autoFocus
            />
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
              Choose Avatar
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedAvatar(av.id);
                  }}
                  className={`p-2.5 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
                    selectedAvatar === av.id
                      ? 'bg-gradient-to-b from-[#7048FF]/40 to-[#398BFF]/40 border-2 border-[#398BFF] shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 opacity-75'
                  }`}
                >
                  <span className="text-2xl">{av.emoji}</span>
                  <span className="text-[11px] font-bold text-gray-200 truncate w-full text-center">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3.5 px-4 rounded-xl font-black text-base tracking-wide bg-gradient-to-r from-[#7048FF] to-[#398BFF] hover:from-[#8058FF] hover:to-[#499BFF] text-white shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Arena...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Create &amp; Enter Lobby</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


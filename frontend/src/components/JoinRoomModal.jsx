import React, { useState } from 'react';
import { X, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { AVATARS } from '../utils/avatars';
import { sounds } from '../services/soundEffects';

export default function JoinRoomModal({
  isOpen,
  onClose,
  onJoinRoom,
  initialRoomCode = '',
  isJoining,
  joinError = '',
}) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[1].id);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    sounds.playClick();
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanNick = nickname.trim() || 'Player 2';
    if (!cleanCode) return;
    onJoinRoom(cleanCode, cleanNick, selectedAvatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 glass-panel border border-purple-500/40 shadow-2xl relative">
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          disabled={isJoining}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#398BFF] to-[#EC65CB] flex items-center justify-center shadow-md">
            <LogIn className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Join Bingo Arena</h2>
            <p className="text-xs text-purple-300/70">Enter code to battle your friend</p>
          </div>
        </div>

        {joinError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{joinError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Code */}
          <div>
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
              6-Letter Room Code
            </label>
            <input
              type="text"
              maxLength={8}
              placeholder="e.g. AB12CD"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl bg-[#100B24]/80 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-[#398BFF] focus:ring-2 focus:ring-[#398BFF]/30 transition-all font-mono font-black text-center text-xl tracking-widest uppercase"
              required
              autoFocus
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
              Your Player Tag
            </label>
            <input
              type="text"
              maxLength={20}
              placeholder="e.g. CyberViper"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#100B24]/80 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-[#398BFF] focus:ring-2 focus:ring-[#398BFF]/30 transition-all font-semibold"
            />
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
              Choose Avatar
            </label>
            <div className="grid grid-cols-3 gap-2">
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedAvatar(av.id);
                  }}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    selectedAvatar === av.id
                      ? 'bg-gradient-to-b from-[#398BFF]/40 to-[#EC65CB]/40 border-2 border-[#398BFF] shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 opacity-75'
                  }`}
                >
                  <span className="text-xl">{av.emoji}</span>
                  <span className="text-[10px] font-bold text-gray-200 truncate w-full text-center">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isJoining || !roomCode.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-black text-base tracking-wide bg-gradient-to-r from-[#398BFF] to-[#EC65CB] hover:from-[#499BFF] hover:to-[#FC75DB] text-white shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Entering Room...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Join Game</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


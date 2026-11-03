import React from 'react';
import { sounds } from '../services/soundEffects';

const EMOJIS = ['🎯', '🔥', '😱', '👏', '💥', '👑'];

export default function ReactionPicker({ onSendReaction }) {
  const handleClick = (emoji) => {
    sounds.playClick();
    if (onSendReaction) {
      onSendReaction(emoji);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 p-2 rounded-2xl glass-card border border-white/10">
      <span className="text-[10px] font-bold text-purple-300/60 uppercase tracking-widest pl-1 hidden sm:inline">
        React:
      </span>
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji)}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-white/10 active:scale-125 transition-transform flex items-center justify-center text-lg sm:text-xl"
          title={`Send ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}


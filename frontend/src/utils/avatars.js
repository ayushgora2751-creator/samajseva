export const AVATARS = [
  { id: 'cyber-fox', name: 'Cyber Fox', emoji: '🦊', color: 'from-orange-500 to-amber-600', ring: 'ring-orange-500' },
  { id: 'neon-cat', name: 'Neon Cat', emoji: '🐱', color: 'from-pink-500 to-purple-600', ring: 'ring-pink-500' },
  { id: 'pixel-robot', name: 'Pixel Bot', emoji: '🤖', color: 'from-cyan-400 to-blue-600', ring: 'ring-cyan-400' },
  { id: 'electro-wolf', name: 'Electro Wolf', emoji: '🐺', color: 'from-indigo-500 to-purple-700', ring: 'ring-indigo-400' },
  { id: 'cosmic-ape', name: 'Cosmic Ape', emoji: '🦍', color: 'from-emerald-400 to-teal-700', ring: 'ring-emerald-400' },
  { id: 'mystic-dragon', name: 'Mystic Dragon', emoji: '🐲', color: 'from-red-500 to-rose-700', ring: 'ring-red-500' },
];

export function getAvatar(avatarId) {
  return AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
}


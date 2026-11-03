/**
 * BINGO ARENA - Frontend Configuration
 * Connected to live production Render backend: https://samajseva.onrender.com
 */
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'http://localhost:8080'
  : (window.location.origin.includes('onrender.com') ? window.location.origin : 'https://samajseva.onrender.com');

// Supabase Configuration for Authentication & Real-Time Multiplayer
// Replace with your Project URL & Anon Key from your Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';

console.log('[BINGO ARENA] Connected to backend API:', API_BASE);

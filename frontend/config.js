/**
 * BINGO ARENA - Frontend Configuration
 * Connected to live production Render backend: https://samajseva.onrender.com
 */
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'http://localhost:8080'
  : (window.location.origin.includes('onrender.com') ? window.location.origin : 'https://samajseva.onrender.com');

// Supabase Configuration for Authentication & Real-Time Multiplayer
const SUPABASE_URL = window.SUPABASE_URL || 'https://rnrftpkfcorfhdrrabks.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_V1C8FjtBdJcOtwDlXleJUw_RDExJrrJ';

console.log('[BINGO ARENA] Connected to backend API:', API_BASE);

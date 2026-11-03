/**
 * BINGO ARENA - REST API Client
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function createRoom(nickname, avatar) {
  const res = await fetch(`${API_BASE}/api/rooms/create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, avatar }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create room.');
  }
  return res.json();
}

export async function joinRoom(roomCode, nickname, avatar, sessionToken = null) {
  const payload = { room_code: roomCode, nickname, avatar };
  if (sessionToken) payload.session_token = sessionToken;

  const res = await fetch(`${API_BASE}/api/rooms/join/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to join room.');
  }
  return res.json();
}

export async function getRoom(roomCode, sessionToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['X-Session-Token'] = sessionToken;

  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch room details.');
  }
  return res.json();
}

export async function getGameState(roomCode, sessionToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['X-Session-Token'] = sessionToken;

  const res = await fetch(`${API_BASE}/api/games/${roomCode}/`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch game state.');
  }
  return res.json();
}

export async function requestRematch(roomCode) {
  const res = await fetch(`${API_BASE}/api/games/${roomCode}/rematch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to start rematch.');
  }
  return res.json();
}

export async function getLeaderboard() {
  const res = await fetch(`${API_BASE}/api/leaderboard/`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}


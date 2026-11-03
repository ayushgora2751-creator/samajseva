/**
 * BINGO ARENA - Vanilla JavaScript Game Engine
 * Short Polling (every 2s), Server Authoritative, Web Audio API Sound Synthesis
 */

const AVATARS = [
  { id: 'cyber-fox', emoji: '🦊' },
  { id: 'neon-cat', emoji: '🐱' },
  { id: 'pixel-bot', emoji: '🤖' },
  { id: 'electro-wolf', emoji: '🐺' },
  { id: 'cosmic-ape', emoji: '🦍' },
  { id: 'mystic-dragon', emoji: '🐲' },
];

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('bingo_sound') !== 'false';
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('bingo_sound', this.enabled ? 'true' : 'false');
    return this.enabled;
  }

  playTone(freq, duration = 0.1, type = 'sine') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playClick() { this.playTone(600, 0.05, 'sine'); }
  playTile() { this.playTone(480, 0.12, 'triangle'); }
  playTurn() {
    this.playTone(523, 0.08, 'sine');
    setTimeout(() => this.playTone(659, 0.12, 'sine'), 90);
  }
  playVictory() {
    [523, 659, 783, 1046].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'sawtooth'), i * 130);
    });
  }
}

class BingoArena {
  constructor() {
    this.code = null;
    this.playerId = localStorage.getItem('bingo_player_id') || null;
    this.playerName = localStorage.getItem('bingo_player_name') || '';
    this.selectedAvatar = 'cyber-fox';
    this.card = null;
    this.pollTimer = null;
    this.sound = new SoundEngine();
    this.lastState = null;
    this.builderGrid = Array(5).fill(null).map(() => Array(5).fill(null));
    this.builderNextNumber = 1;
    this.seenMessageIds = new Set();
  }

  init() {
    this.renderAvatars();
    this.checkUrlParams();
    this.checkServerHealth();

    const nameInput = document.getElementById('create-player-name');
    if (nameInput && this.playerName) nameInput.value = this.playerName;
  }

  // Handle Render free-tier cold start detection
  async checkServerHealth() {
    const banner = document.getElementById('server-status-banner');
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      if (banner) banner.classList.remove('hidden');
    }, 2000);

    try {
      await fetch(`${API_BASE}/api/health/`, { signal: controller.signal });
      clearTimeout(timeout);
      if (banner) banner.classList.add('hidden');
    } catch (e) {
      // Server might still be waking up on Render
    }
  }

  renderAvatars() {
    ['create', 'join'].forEach((mode) => {
      const container = document.getElementById(`${mode}-avatars-list`);
      if (!container) return;
      container.innerHTML = '';
      AVATARS.forEach((av, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `avatar-btn ${i === 0 ? 'selected' : ''}`;
        btn.innerHTML = av.emoji;
        btn.onclick = () => {
          this.sound.playClick();
          container.querySelectorAll('.avatar-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedAvatar = av.id;
        };
        container.appendChild(btn);
      });
    });
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      const input = document.getElementById('join-room-code');
      if (input) input.value = code.toUpperCase();
    }
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen-view').forEach((s) => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  }

  showHome() {
    this.stopPolling();
    this.showScreen('screen-home');
  }

  toast(msg, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${isError ? 'toast-error' : ''}`;
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  toggleSound() {
    const enabled = this.sound.toggle();
    const icon = document.getElementById('sound-icon');
    if (icon) icon.innerText = enabled ? '🔊' : '🔇';
    if (enabled) this.sound.playClick();
  }

  openRulesModal() {
    this.sound.playClick();
    document.getElementById('modal-rules').classList.remove('hidden');
  }

  closeRulesModal() {
    this.sound.playClick();
    document.getElementById('modal-rules').classList.add('hidden');
  }

  // API Call: Create Room
  async createRoom() {
    this.sound.playClick();
    const name = document.getElementById('create-player-name').value.trim() || 'Host';
    this.playerName = name;
    localStorage.setItem('bingo_player_name', name);

    try {
      const res = await fetch(`${API_BASE}/api/rooms/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar: this.selectedAvatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room.');

      this.code = data.code;
      this.playerId = data.player_id;
      this.card = data.card;
      localStorage.setItem('bingo_player_id', data.player_id);

      this.openLobby();
    } catch (err) {
      this.toast(err.message, true);
    }
  }

  // API Call: Join Room
  async joinRoom() {
    this.sound.playClick();
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    const name = document.getElementById('join-player-name').value.trim() || 'Player';
    if (!code) {
      this.toast('Please enter a 6-letter room code.', true);
      return;
    }
    this.playerName = name;
    localStorage.setItem('bingo_player_name', name);

    try {
      const res = await fetch(`${API_BASE}/api/rooms/join/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, avatar: this.selectedAvatar, player_id: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room.');

      this.code = data.code;
      this.playerId = data.player_id;
      this.card = data.card;
      localStorage.setItem('bingo_player_id', data.player_id);

      this.openLobby();
    } catch (err) {
      this.toast(err.message, true);
    }
  }

  openLobby() {
    document.getElementById('lobby-room-code').innerText = this.code;
    this.showScreen('screen-lobby');
    this.initBuilderCard();
    this.startPolling();
  }

  copyRoomCode() {
    this.sound.playClick();
    if (!this.code) return;
    navigator.clipboard.writeText(this.code);
    const btn = document.getElementById('copy-btn-text');
    if (btn) btn.innerText = '✅ Copied!';
    setTimeout(() => { if (btn) btn.innerText = '📋 Copy Code'; }, 2000);
  }

  shareWhatsApp() {
    this.sound.playClick();
    const inviteUrl = `${window.location.origin}?room=${this.code}`;
    const text = `Join my Bingo Arena match! Room Code: ${this.code}\nLink: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  // =========================================================================
  // CARD BUILDER (Place numbers 1 to 25 by Choice)
  // =========================================================================
  initBuilderCard() {
    if (this.card && this.card.length === 5 && this.card[0].length === 5) {
      this.builderGrid = this.card.map((r) => [...r]);
    } else {
      this.builderGrid = Array(5).fill(null).map(() => Array(5).fill(null));
    }
    this.renderBuilderGrid();
  }

  renderBuilderGrid() {
    const grid = document.getElementById('builder-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const usedNumbers = new Set();
    this.builderGrid.forEach((row) => {
      row.forEach((n) => {
        if (n !== null && n !== undefined) usedNumbers.add(n);
      });
    });

    // Find smallest missing number in range 1..25
    let nextNum = 26;
    for (let i = 1; i <= 25; i++) {
      if (!usedNumbers.has(i)) {
        nextNum = i;
        break;
      }
    }
    this.builderNextNumber = nextNum;

    const badgeEl = document.getElementById('builder-next-num');
    const msgEl = document.getElementById('builder-msg');

    if (badgeEl) {
      badgeEl.innerText = nextNum <= 25 ? nextNum : '✅ 25/25';
    }
    if (msgEl) {
      if (usedNumbers.size === 25) {
        msgEl.innerHTML = '<span style="color: #4ade80; font-weight: 800;">✅ Board Ready! All 25 numbers arranged. Saved to arena!</span>';
      } else {
        msgEl.innerHTML = `Click any empty square to place number <strong>#${nextNum}</strong> (${usedNumbers.size}/25 placed)`;
      }
    }

    this.builderGrid.forEach((row, rIdx) => {
      row.forEach((num, cIdx) => {
        const tile = document.createElement('div');
        const isFilled = num !== null && num !== undefined;
        tile.className = 'builder-tile' + (isFilled ? ' filled' : ' empty empty-hint-text');

        if (isFilled) {
          tile.innerText = num;
          tile.title = `Click to remove #${num}`;
          tile.onclick = () => {
            this.sound.playClick();
            this.builderGrid[rIdx][cIdx] = null;
            this.renderBuilderGrid();
          };
        } else {
          tile.innerText = '+';
          tile.title = `Click to place #${nextNum}`;
          tile.onclick = () => {
            if (nextNum > 25) return;
            this.sound.playTile();
            this.builderGrid[rIdx][cIdx] = nextNum;
            this.renderBuilderGrid();

            // Auto-save if all 25 placed!
            const newUsed = new Set();
            this.builderGrid.forEach((r) => r.forEach((n) => { if (n) newUsed.add(n); }));
            if (newUsed.size === 25) {
              this.saveBuilderCard();
            }
          };
        }
        grid.appendChild(tile);
      });
    });
  }

  randomizeBuilderCard() {
    this.sound.playClick();
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    this.builderGrid = [];
    for (let r = 0; r < 5; r++) {
      this.builderGrid.push(numbers.slice(r * 5, (r + 1) * 5));
    }
    this.renderBuilderGrid();
    this.saveBuilderCard();
  }

  clearBuilderCard() {
    this.sound.playClick();
    this.builderGrid = Array(5).fill(null).map(() => Array(5).fill(null));
    this.renderBuilderGrid();
    this.toast('Card cleared. Click squares to place numbers 1 to 25!');
  }

  async saveBuilderCard() {
    const used = new Set();
    this.builderGrid.forEach((r) => r.forEach((n) => { if (n) used.add(n); }));
    if (used.size !== 25) {
      this.toast(`Please place all 25 numbers first (${used.size}/25 placed)`, true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/card/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId, card: this.builderGrid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save card.');
      this.card = this.builderGrid;
      this.toast('✅ Custom 5×5 Card Saved & Ready!');
    } catch (e) {
      this.toast(e.message, true);
    }
  }

  // API Call: Start Game (Host only)
  async startGame() {
    this.sound.playClick();
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game.');
      this.toast('Game is starting!');
    } catch (err) {
      this.toast(err.message, true);
    }
  }

  // Start short polling (every 2 seconds)
  startPolling() {
    this.stopPolling();
    this.pollState();
    this.pollTimer = setInterval(() => this.pollState(), 2000);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // Polling fetcher
  async pollState() {
    if (!this.code) return;
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/state/?player_id=${this.playerId || ''}`);
      if (!res.ok) return;
      const state = await res.json();
      this.handleStateUpdate(state);
    } catch (e) {
      // Network hiccup; retry on next poll
    }
  }

  handleStateUpdate(state) {
    if (state.my_card && state.my_card.length > 0) {
      this.card = state.my_card;
    }

    // Lobby Screen Updates
    if (state.status === 'waiting') {
      const countEl = document.getElementById('lobby-player-count');
      if (countEl) countEl.innerText = state.players.length;

      const listEl = document.getElementById('lobby-players-list');
      if (listEl) {
        listEl.innerHTML = state.players
          .map((p) => {
            const av = AVATARS.find((a) => a.id === p.avatar) || AVATARS[0];
            return `
              <div class="player-pill">
                <span class="p-avatar">${av.emoji}</span>
                <div class="p-info">
                  <span class="p-name">${p.name}</span>
                  <span class="p-tag">${p.is_host ? '👑 Host' : 'Player ' + p.turn_order}</span>
                </div>
              </div>
            `;
          })
          .join('');
      }

      const startBtn = document.getElementById('start-game-btn');
      if (startBtn) {
        if (state.is_host) {
          startBtn.style.display = 'block';
          startBtn.disabled = false;
          startBtn.innerText = state.players.length === 1 ? '▶ Start Battle (Solo Test)' : `⚔️ Start Battle (${state.players.length} Players)`;
        } else {
          startBtn.style.display = 'none';
        }
      }
    }

    // Active Game Updates
    if (state.status === 'playing' || state.status === 'finished') {
      if (!document.getElementById('screen-game').classList.contains('active')) {
        this.showScreen('screen-game');
        document.getElementById('game-room-code').innerText = state.code;
        document.getElementById('my-name-display').innerText = this.playerName || 'You';
      }

      // Turn indicators
      const turnBadge = document.getElementById('turn-badge');
      const turnDesc = document.getElementById('active-turn-text');
      if (turnBadge && turnDesc) {
        if (state.is_my_turn) {
          turnBadge.className = 'turn-badge my-turn';
          turnBadge.innerText = 'YOUR TURN';
          turnDesc.innerText = 'Click any uncalled number to call it!';
          if (this.lastState && !this.lastState.is_my_turn) {
            this.sound.playTurn();
          }
        } else {
          turnBadge.className = 'turn-badge';
          turnBadge.innerText = `${state.active_player_name.toUpperCase()}'S TURN`;
          turnDesc.innerText = `Waiting for ${state.active_player_name} to call a number...`;
        }
      }

      // Render 5x5 Grid
      this.renderBoard(state.called_list, state.my_lines?.winning_cells || [], state.is_my_turn);

      // Render B-I-N-G-O letters
      const letters = ['B', 'I', 'N', 'G', 'O'];
      const totalLines = state.my_lines?.total_lines || 0;
      document.getElementById('completed-lines-count').innerText = totalLines;
      letters.forEach((l, i) => {
        const el = document.getElementById(`letter-${l}`);
        if (el) {
          if (i < totalLines) el.classList.add('active');
          else el.classList.remove('active');
        }
      });

      // Called numbers chips
      const chipsEl = document.getElementById('called-chips-list');
      const countEl = document.getElementById('called-count');
      if (chipsEl && state.called_list) {
        countEl.innerText = state.called_list.length;
        if (state.called_list.length === 0) {
          chipsEl.innerHTML = '<span class="empty-hint">No numbers called yet.</span>';
        } else {
          chipsEl.innerHTML = [...state.called_list]
            .reverse()
            .map((num, idx) => `<span class="called-chip ${idx === 0 ? 'recent' : ''}">#${num}</span>`)
            .join('');
        }
      }

      // Mini players scoreboard
      const miniEl = document.getElementById('mini-players-list');
      if (miniEl && state.players) {
        miniEl.innerHTML = state.players
          .map(
            (p) => `
          <div class="mini-player-item ${p.is_turn ? 'is-active-turn' : ''}">
            <span class="name-part">${p.is_turn ? '👉' : ''} ${p.name}</span>
            <span class="lines-part">${p.lines_count} / 5 Lines</span>
          </div>
        `
          )
          .join('');
      }

      // Winner Modal Check
      if (state.status === 'finished' && state.winner_name) {
        this.showWinnerModal(state.winner_name);
      }
    }

    if (state.messages) {
      this.renderChatMessages(state.messages);
    }

    this.lastState = state;
  }

  renderBoard(calledNumbers, winningCells, isMyTurn) {
    const grid = document.getElementById('bingo-board-grid');
    if (!grid || !this.card) return;

    const calledSet = new Set(calledNumbers);
    const winSet = new Set(winningCells);

    grid.innerHTML = '';
    this.card.forEach((row, rIdx) => {
      row.forEach((num, cIdx) => {
        const isCalled = calledSet.has(num);
        const isWin = winSet.has(`${rIdx},${cIdx}`);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `bingo-tile ${isCalled ? 'called' : ''} ${isWin ? 'winning' : ''}`;
        btn.innerText = num;

        if (isMyTurn && !isCalled) {
          btn.onclick = () => this.callNumber(num);
        } else {
          btn.disabled = true;
        }

        grid.appendChild(btn);
      });
    });
  }

  // API Call: Call a number
  async callNumber(number) {
    this.sound.playTile();
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/call/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId, number }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to call number.');
      this.pollState();
    } catch (err) {
      this.toast(err.message, true);
    }
  }

  // API Call: Claim Bingo
  async claimBingo() {
    this.sound.playClick();
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/bingo/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Win validation failed.');
      this.toast('BINGO verified by server! Victory!');
      this.pollState();
    } catch (err) {
      this.toast(err.message, true);
    }
  }

  showWinnerModal(winnerName) {
    const modal = document.getElementById('modal-winner');
    if (!modal) return;
    const isMe = winnerName === this.playerName;
    document.getElementById('winner-title').innerText = isMe ? 'YOU CONQUERED THE ARENA!' : `${winnerName.toUpperCase()} WON!`;
    document.getElementById('winner-subtitle').innerText = isMe ? 'Flawless 5 lines completed!' : 'Better luck in the next round!';
    modal.classList.remove('hidden');

    if (isMe) {
      this.sound.playVictory();
      if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    }
  }

  // API Call: Rematch / Restart
  async restartGame() {
    this.sound.playClick();
    document.getElementById('modal-winner').classList.add('hidden');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/restart/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restart.');
      this.toast('Rematch starting with fresh 5x5 boards!');
      this.pollState();
    } catch (err) {
      this.toast(err.message, true);
    }
  }

  // =========================================================================
  // LIVE CHAT & EMOJI REACTIONS
  // =========================================================================
  async sendEmoji(emoji) {
    if (!this.code) return;
    this.sound.playClick();
    this.spawnFloatingEmoji(emoji);
    try {
      await fetch(`${API_BASE}/api/rooms/${this.code}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId, emoji }),
      });
      this.pollState();
    } catch (e) {}
  }

  async sendTextMessage() {
    if (!this.code) return;
    const input = document.getElementById('chat-input-field');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    this.sound.playClick();
    input.value = '';

    try {
      await fetch(`${API_BASE}/api/rooms/${this.code}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId, text }),
      });
      this.pollState();
    } catch (e) {
      this.toast('Failed to send message', true);
    }
  }

  spawnFloatingEmoji(emoji) {
    const container = document.getElementById('floating-emoji-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.innerText = emoji;
    el.style.right = `${15 + Math.random() * 110}px`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  renderChatMessages(messages) {
    const container = document.getElementById('chat-messages-list');
    if (!container || !messages) return;

    if (messages.length === 0) {
      container.innerHTML = '<span class="empty-hint">Say hi or tap an emoji above!</span>';
      return;
    }

    // Trigger floating emoji for new incoming emojis
    messages.forEach((m) => {
      if (!this.seenMessageIds.has(m.id)) {
        this.seenMessageIds.add(m.id);
        if (m.emoji && m.player_name !== this.playerName) {
          this.spawnFloatingEmoji(m.emoji);
        }
      }
    });

    const isNearBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 40;

    container.innerHTML = messages
      .map((m) => {
        const isEmojiOnly = m.emoji && !m.text;
        const content = isEmojiOnly ? m.emoji : (m.text + (m.emoji ? ' ' + m.emoji : ''));
        return `
          <div class="chat-item">
            <div class="chat-meta">
              <span class="chat-author">${m.player_name}</span>
              <span class="chat-time">${m.created_at_time || ''}</span>
            </div>
            <div class="chat-content ${isEmojiOnly ? 'emoji-only' : ''}">${content}</div>
          </div>
        `;
      })
      .join('');

    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }

  leaveRoom() {
    this.sound.playClick();
    this.stopPolling();
    this.code = null;
    this.card = null;
    document.getElementById('modal-winner').classList.add('hidden');
    this.showHome();
  }
}

const app = new BingoArena();
window.addEventListener('DOMContentLoaded', () => app.init());


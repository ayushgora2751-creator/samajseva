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

// Initialize Supabase Client
let supabaseClient = null;
try {
  if (
    typeof supabase !== 'undefined' &&
    typeof SUPABASE_URL !== 'undefined' &&
    SUPABASE_URL &&
    !SUPABASE_URL.includes('YOUR_PROJECT_ID')
  ) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[BINGO ARENA] Supabase client initialized!');
  }
} catch (e) {
  console.warn('[BINGO ARENA] Supabase init notice:', e.message);
}

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
    this.realtimeChannel = null;
    this._syncDebounce = null;
    this._isCalling = false;
  }

  init() {
    this.renderAvatars();
    this.checkUrlParams();
    this.checkServerHealth();

    const nameInput = document.getElementById('create-player-name');
    if (nameInput && this.playerName) nameInput.value = this.playerName;

    const joinNameInput = document.getElementById('join-player-name');
    if (joinNameInput && this.playerName) joinNameInput.value = this.playerName;
  }

  // Handle Render free-tier cold start detection
  async checkServerHealth() {
    const banner = document.getElementById('server-status-banner');
    const timeout = setTimeout(() => {
      if (banner) banner.classList.remove('hidden');
    }, 2000);

    try {
      const res = await fetch(`${API_BASE}/api/health/`);
      clearTimeout(timeout);
      if (res.ok && banner) {
        banner.classList.add('hidden');
      }
    } catch (e) {
      // Server may still be spinning up on Render free tier; retry in 5s
      setTimeout(() => this.checkServerHealth(), 5000);
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

    const btn = document.querySelector('#screen-home .action-card:first-child .btn-primary');
    if (btn) btn.disabled = true;

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
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        this.toast('Waking up server on Render... Free tier takes 20-30s on first load. Please try again in a few seconds!', true);
      } else {
        this.toast(err.message, true);
      }
    } finally {
      if (btn) btn.disabled = false;
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

    const btn = document.querySelector('#screen-home .action-card:last-child .btn-secondary');
    if (btn) btn.disabled = true;

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
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        this.toast('Waking up server on Render... Free tier takes 20-30s on first load. Please try again in a few seconds!', true);
      } else {
        this.toast(err.message, true);
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  openLobby() {
    document.getElementById('lobby-room-code').innerText = this.code;
    this.showScreen('screen-lobby');
    this.initBuilderCard();
    this.subscribeRealtime();
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
      this.broadcastRealtime('room_sync');
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
      this.broadcastRealtime('room_sync');
      this.pollState();
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
            const isHost = p.is_host;
            let readyPill = '';
            if (isHost) {
              readyPill = `<span class="ready-badge host-badge">👑 Host</span>`;
            } else if (p.is_ready) {
              readyPill = `<span class="ready-badge ready-yes">✅ READY</span>`;
            } else {
              readyPill = `<span class="ready-badge ready-no">⏳ NOT READY</span>`;
            }

            return `
              <div class="player-pill-3d ${p.is_ready ? 'is-ready-card' : ''}">
                <span class="p-avatar-3d">${av.emoji}</span>
                <div class="p-info">
                  <div class="p-name-row">
                    <span class="p-name">${p.name}</span>
                    ${readyPill}
                  </div>
                  <span class="p-tag">${isHost ? 'Room Creator' : 'Player ' + p.turn_order}</span>
                </div>
              </div>
            `;
          })
          .join('');
      }

      const startBtn = document.getElementById('start-game-btn');
      const readyBtn = document.getElementById('player-ready-btn');
      const readyHint = document.getElementById('lobby-ready-hint');

      const isHost = state.is_host;
      const nonHostPlayers = state.players.filter((p) => !p.is_host);
      const allOthersReady = nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.is_ready);
      const myPlayer = state.players.find((p) => p.player_id === this.playerId);
      const amIReady = state.my_ready !== undefined ? state.my_ready : (myPlayer ? myPlayer.is_ready : false);

      if (isHost) {
        if (readyBtn) readyBtn.style.display = 'none';
        if (startBtn) {
          startBtn.style.display = 'block';
          if (state.players.length === 1) {
            startBtn.disabled = false;
            startBtn.className = 'btn btn-primary btn-lg btn-3d pulse-glow';
            startBtn.innerText = '▶ Start Battle (Solo Test)';
            if (readyHint) readyHint.innerHTML = '💡 <em>Solo test mode ready. Invite a friend with the room code above for 1v1!</em>';
          } else if (allOthersReady) {
            startBtn.disabled = false;
            startBtn.className = 'btn btn-primary btn-lg btn-3d pulse-glow-success';
            startBtn.innerText = `⚔️ Start Battle (All ${state.players.length} Ready!)`;
            if (readyHint) readyHint.innerHTML = '✨ <strong>All players are ready!</strong> Host can start the match now.';
          } else {
            startBtn.disabled = true;
            startBtn.className = 'btn btn-secondary btn-lg btn-3d btn-waiting';
            const readyCount = nonHostPlayers.filter((p) => p.is_ready).length;
            startBtn.innerText = `⏳ Waiting for Players (${readyCount}/${nonHostPlayers.length} Ready)`;
            if (readyHint) readyHint.innerHTML = `⏳ Waiting for players to customize their board and click <strong>Ready</strong> (${readyCount}/${nonHostPlayers.length} ready)`;
          }
        }
      } else {
        if (startBtn) startBtn.style.display = 'none';
        if (readyBtn) {
          readyBtn.style.display = 'block';
          if (amIReady) {
            readyBtn.className = 'btn btn-lg btn-3d btn-ready-active';
            readyBtn.innerText = '✅ YOU ARE READY (Tap to Cancel)';
            if (readyHint) readyHint.innerHTML = '✅ You are marked ready! Waiting for host to launch the battle...';
          } else {
            readyBtn.className = 'btn btn-lg btn-3d btn-ready-pending pulse-amber';
            readyBtn.innerText = '⚡ CLICK WHEN READY';
            if (readyHint) readyHint.innerHTML = '👉 Click <strong>"Click When Ready"</strong> once you have arranged your board!';
          }
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

      // Hide winner modal if transitioning to a new active round
      const winnerModal = document.getElementById('modal-winner');
      if (winnerModal && !winnerModal.classList.contains('hidden') && state.status === 'playing') {
        winnerModal.classList.add('hidden');
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

      // Update Claim Bingo Button feedback
      const claimBtn = document.getElementById('claim-bingo-btn');
      if (claimBtn) {
        if (totalLines >= 5) {
          claimBtn.className = 'btn btn-gold btn-block pulse-glow';
          claimBtn.innerText = '👑 CLAIM BINGO NOW! (5/5 LINES REACHED)';
        } else {
          claimBtn.className = 'btn btn-gold btn-block';
          claimBtn.innerText = `⭐ CLAIM BINGO (${totalLines}/5 Lines)`;
        }
      }

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
    if (this._isCalling) return;
    this._isCalling = true;
    this.sound.playTile();
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/call/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId, number }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to call number.');
      this.broadcastRealtime('room_sync');
      this.pollState();
    } catch (err) {
      this.toast(err.message, true);
    } finally {
      this._isCalling = false;
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
      this.broadcastRealtime('room_sync');
      this.pollState();
    } catch (err) {
      this.toast(err.message, true);
    }
  }

  showWinnerModal(winnerName) {
    const modal = document.getElementById('modal-winner');
    if (!modal) return;
    const isMe = winnerName === this.playerName;
    const isFirstShow = modal.classList.contains('hidden');
    document.getElementById('winner-title').innerText = isMe ? 'YOU CONQUERED THE ARENA!' : `${winnerName.toUpperCase()} WON!`;
    document.getElementById('winner-subtitle').innerText = isMe ? 'Flawless 5 lines completed!' : 'Better luck in the next round!';
    modal.classList.remove('hidden');

    if (isMe && isFirstShow) {
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
      this.broadcastRealtime('room_sync');
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
    this.broadcastRealtime('reaction', { emoji });
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
      this.broadcastRealtime('room_sync');
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

  // =========================================================================
  // PLAYER READY STATUS (Lobby Coordination)
  // =========================================================================
  async toggleReady() {
    if (!this.code || !this.playerId) return;
    this.sound.playClick();
    const btn = document.getElementById('player-ready-btn');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${this.code}/ready/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ready status.');
      this.toast(data.is_ready ? '✅ You are marked Ready!' : 'Marked as Not Ready.');
      this.broadcastRealtime('room_sync');
      this.pollState();
    } catch (err) {
      this.toast(err.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // =========================================================================
  // SUPABASE REALTIME MULTIPLAYER (Zero-Lag Sync)
  // =========================================================================
  triggerSync() {
    if (this._syncDebounce) clearTimeout(this._syncDebounce);
    this._syncDebounce = setTimeout(() => this.pollState(), 150);
  }

  subscribeRealtime() {
    if (!supabaseClient || !this.code) return;
    this.unsubscribeRealtime();
    this.realtimeChannel = supabaseClient.channel('bingo-room-' + this.code);
    this.realtimeChannel
      .on('broadcast', { event: 'room_sync' }, () => {
        this.triggerSync();
      })
      .on('broadcast', { event: 'reaction' }, (eventData) => {
        const p = eventData?.payload || eventData;
        if (p && p.emoji && p.sender !== this.playerName) {
          this.spawnFloatingEmoji(p.emoji);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.broadcastRealtime('room_sync');
        }
      });
  }

  unsubscribeRealtime() {
    if (this.realtimeChannel && supabaseClient) {
      supabaseClient.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  broadcastRealtime(event, payload = {}) {
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: event,
        payload: { ...payload, sender: this.playerName },
      });
    }
  }

  leaveRoom() {
    this.sound.playClick();
    this.unsubscribeRealtime();
    this.stopPolling();
    this.code = null;
    this.card = null;
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    document.getElementById('modal-winner').classList.add('hidden');
    this.showHome();
  }
}

const app = new BingoArena();
window.addEventListener('DOMContentLoaded', () => app.init());


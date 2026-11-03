/**
 * BINGO ARENA - Real-time WebSocket Client
 */

export class GameSocket {
  constructor(roomCode, sessionToken, onMessage, onError, onConnect, onDisconnect) {
    this.roomCode = roomCode;
    this.sessionToken = sessionToken;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this.ws = null;
    this.closedExplicitly = false;
    this.reconnectTimer = null;
  }

  connect() {
    this.closedExplicitly = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || 'localhost:8080';
    const wsUrl = `${protocol}//${host}/ws/game/${this.roomCode}/`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.onConnect) this.onConnect();
        // Immediately authenticate with backend
        this.send({
          action: 'authenticate',
          session_token: this.sessionToken,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = (err) => {
        if (this.onError) this.onError(err);
      };

      this.ws.onclose = () => {
        if (this.onDisconnect) this.onDisconnect();
        if (!this.closedExplicitly) {
          // Attempt automatic reconnection after 2 seconds
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, 2000);
        }
      };
    } catch (err) {
      if (this.onError) this.onError(err);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not open. ReadyState:', this.ws?.readyState);
    }
  }

  makeMove(number) {
    this.send({
      action: 'make_move',
      number: number,
      session_token: this.sessionToken,
    });
  }

  sendReaction(emoji) {
    this.send({
      action: 'send_reaction',
      emoji: emoji,
      session_token: this.sessionToken,
    });
  }

  requestRematch() {
    this.send({
      action: 'rematch',
      session_token: this.sessionToken,
    });
  }

  disconnect() {
    this.closedExplicitly = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}


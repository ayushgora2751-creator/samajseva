import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GameArena from './pages/GameArena';
import LeaderboardPage from './pages/LeaderboardPage';
import CreateRoomModal from './components/CreateRoomModal';
import JoinRoomModal from './components/JoinRoomModal';
import RulesModal from './components/RulesModal';
import { createRoom, joinRoom, getRoom } from './services/api';
import { GameSocket } from './services/websocket';
import { sounds } from './services/soundEffects';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Active Session State
  const [roomCode, setRoomCode] = useState(null);
  const [player, setPlayer] = useState(null);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const socketRef = useRef(null);

  // Check URL query param ?room=CODE on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setJoinRoomCode(code.toUpperCase());
      setIsJoinOpen(true);
    }
  }, []);

  // WebSocket connection & event handling
  const setupWebSocket = (code, token) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = new GameSocket(
      code,
      token,
      // onMessage
      (data) => {
        if (data.type === 'initial_state') {
          setGameState(data);
          if (data.current_player) {
            setPlayer(data.current_player);
          }
          if (data.room_status === 'playing' || data.game_status === 'active') {
            setCurrentPage('game');
          } else {
            setCurrentPage('lobby');
          }
        } else if (data.type === 'game_started') {
          // Both players connected -> start countdown
          setCountdown(3);
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev === 1) {
                clearInterval(interval);
                setCountdown(null);
                setCurrentPage('game');
                return null;
              }
              return prev ? prev - 1 : null;
            });
          }, 800);
        } else if (data.type === 'game_update') {
          setGameState((prev) => ({
            ...prev,
            last_move: data.last_move,
            called_numbers: data.called_numbers,
            current_turn: data.current_turn,
            p1_stats: data.p1_stats,
            p2_stats: data.p2_stats,
            game_status: data.game_status,
            winner: data.winner,
          }));
        } else if (data.type === 'player_status_change') {
          setGameState((prev) => {
            if (!prev) return prev;
            const updated = { ...prev };
            if (data.player_number === 1 && updated.p1) {
              updated.p1.is_online = data.is_online;
            } else if (data.player_number === 2 && updated.p2) {
              updated.p2.is_online = data.is_online;
            }
            return updated;
          });
        } else if (data.type === 'reaction_broadcast') {
          setFloatingReaction({ emoji: data.emoji, nickname: data.nickname });
          setTimeout(() => setFloatingReaction(null), 2500);
        } else if (data.type === 'rematch_started') {
          setGameState((prev) => ({
            ...prev,
            called_numbers: [],
            current_turn: 1,
            game_status: 'active',
            winner: null,
            last_move: null,
            p1_stats: { total_lines: 0, winning_cells: [] },
            p2_stats: { total_lines: 0, winning_cells: [] },
          }));
          setCurrentPage('game');
        } else if (data.type === 'move_error') {
          alert(`Move not accepted: ${data.error}`);
        }
      },
      // onError
      (err) => {
        setIsConnected(false);
      },
      // onConnect
      () => {
        setIsConnected(true);
      },
      // onDisconnect
      () => {
        setIsConnected(false);
      }
    );

    socket.connect();
    socketRef.current = socket;
  };

  // Create Room
  const handleCreateRoom = async (nickname, avatar) => {
    setIsCreating(true);
    try {
      const data = await createRoom(nickname, avatar);
      setRoomCode(data.room_code);
      setPlayer(data.player);
      setRoom(data.room);
      setIsCreateOpen(false);
      setCurrentPage('lobby');

      // Connect WebSocket
      setupWebSocket(data.room_code, data.player.session_token);
    } catch (err) {
      alert(err.message || 'Failed to create room.');
    } finally {
      setIsCreating(false);
    }
  };

  // Join Room
  const handleJoinRoom = async (code, nickname, avatar) => {
    setIsJoining(true);
    setJoinError('');
    try {
      const data = await joinRoom(code, nickname, avatar);
      setRoomCode(data.room_code);
      setPlayer(data.player);
      setRoom(data.room);
      setIsJoinOpen(false);

      // Connect WebSocket
      setupWebSocket(data.room_code, data.player.session_token);
    } catch (err) {
      setJoinError(err.message || 'Could not join room.');
    } finally {
      setIsJoining(false);
    }
  };

  // Make Move
  const handleMakeMove = (number) => {
    if (socketRef.current) {
      socketRef.current.makeMove(number);
    }
  };

  // Send Reaction
  const handleSendReaction = (emoji) => {
    if (socketRef.current) {
      socketRef.current.sendReaction(emoji);
    }
  };

  // Rematch
  const handleRematch = () => {
    if (socketRef.current) {
      socketRef.current.requestRematch();
    }
  };

  // Leave Room
  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setRoomCode(null);
    setPlayer(null);
    setRoom(null);
    setGameState(null);
    setIsConnected(false);
    setCurrentPage('home');
    // Clear URL param if present
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-[#100B24] text-white flex flex-col selection:bg-[#7048FF] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => {
          if (currentPage === 'game') {
            if (window.confirm('Do you want to leave the active match?')) {
              handleLeaveRoom();
              setCurrentPage(page);
            }
          } else {
            setCurrentPage(page);
          }
        }}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenJoin={() => {
              setJoinRoomCode('');
              setJoinError('');
              setIsJoinOpen(true);
            }}
            onQuickPlay={() => setIsCreateOpen(true)}
            onOpenLeaderboard={() => setCurrentPage('leaderboard')}
            onOpenRules={() => setIsRulesOpen(true)}
          />
        )}

        {currentPage === 'lobby' && (
          <LobbyPage
            roomCode={roomCode}
            player={player}
            players={room?.players || []}
            countdown={countdown}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {currentPage === 'game' && (
          <GameArena
            roomCode={roomCode}
            player={player}
            gameState={gameState}
            onMakeMove={handleMakeMove}
            onSendReaction={handleSendReaction}
            onRematch={handleRematch}
            onLeaveRoom={handleLeaveRoom}
            isConnected={isConnected}
            floatingReaction={floatingReaction}
          />
        )}

        {currentPage === 'leaderboard' && (
          <LeaderboardPage onBack={() => setCurrentPage('home')} />
        )}
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateRoom={handleCreateRoom}
        isCreating={isCreating}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoinRoom={handleJoinRoom}
        initialRoomCode={joinRoomCode}
        isJoining={isJoining}
        joinError={joinError}
      />

      {isRulesOpen && <RulesModal onClose={() => setIsRulesOpen(false)} />}
    </div>
  );
}

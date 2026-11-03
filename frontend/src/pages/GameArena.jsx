import React, { useState, useEffect } from 'react';
import { LogOut, Wifi, WifiOff, Clock } from 'lucide-react';
import Board from '../components/Board';
import PlayerCard from '../components/PlayerCard';
import BingoLetters from '../components/BingoLetters';
import TurnIndicator from '../components/TurnIndicator';
import MoveHistory from '../components/MoveHistory';
import ReactionPicker from '../components/ReactionPicker';
import WinnerModal from '../components/WinnerModal';
import { sounds } from '../services/soundEffects';

export default function GameArena({
  roomCode,
  player,
  gameState,
  onMakeMove,
  onSendReaction,
  onRematch,
  onLeaveRoom,
  isConnected,
  floatingReaction,
}) {
  const [matchSeconds, setMatchSeconds] = useState(0);

  // Match timer
  useEffect(() => {
    if (gameState?.game_status === 'active') {
      const interval = setInterval(() => {
        setMatchSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.game_status]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const p1 = gameState?.p1;
  const p2 = gameState?.p2;
  const currentTurn = gameState?.current_turn || 1;
  const isMyTurn = gameState?.game_status === 'active' && currentTurn === player?.player_number;
  const calledNumbers = gameState?.called_numbers || [];
  const myStats = player?.player_number === 1 ? gameState?.p1_stats : gameState?.p2_stats;
  const opponentStats = player?.player_number === 1 ? gameState?.p2_stats : gameState?.p1_stats;
  const opponentName = player?.player_number === 1 ? (p2?.nickname || 'Opponent') : (p1?.nickname || 'Player 1');

  // Trigger sound when turn switches to me
  useEffect(() => {
    if (isMyTurn && gameState?.game_status === 'active') {
      sounds.playYourTurn();
    }
  }, [isMyTurn, gameState?.game_status]);

  // Trigger sound when a new line is completed
  const myCompletedLines = myStats?.total_lines || 0;
  useEffect(() => {
    if (myCompletedLines > 0) {
      sounds.playLineComplete();
    }
  }, [myCompletedLines]);

  const lastMove = gameState?.last_move || (calledNumbers.length > 0 ? {
    number: calledNumbers[calledNumbers.length - 1],
    nickname: currentTurn === 1 ? (p2?.nickname || 'Player 2') : (p1?.nickname || 'Player 1'),
  } : null);

  const isGameOver = gameState?.game_status === 'completed' || gameState?.game_status === 'tie';
  const isTie = gameState?.game_status === 'tie' || gameState?.winner === 'tie';
  const isWinner = !isTie && gameState?.winner === player?.nickname;

  return (
    <div className="min-h-[calc(100vh-68px)] max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col justify-between relative">
      {/* Floating Reaction Overlay */}
      {floatingReaction && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce flex flex-col items-center">
          <span className="text-7xl drop-shadow-2xl">{floatingReaction.emoji}</span>
          <span className="text-xs font-black tracking-wider bg-black/70 px-3 py-1 rounded-full text-purple-200 mt-2 border border-purple-500/40">
            {floatingReaction.nickname}
          </span>
        </div>
      )}

      {/* Top Arena Status Bar */}
      <div className="w-full glass-card rounded-2xl p-3 sm:p-4 mb-4 flex items-center justify-between border border-purple-500/20">
        {/* Room & Live Ping */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-white/5 border border-purple-500/30 flex items-center gap-2">
            <span className="text-[10px] font-bold text-purple-300 uppercase">Room:</span>
            <span className="font-mono font-black text-sm text-white tracking-wider">{roomCode}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
              isConnected
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Reconnecting...</span>
              </>
            )}
          </div>
        </div>

        {/* Match Timer */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{formatTime(matchSeconds)}</span>
        </div>

        {/* Leave / Exit Button */}
        <button
          onClick={() => {
            sounds.playClick();
            if (window.confirm('Are you sure you want to leave the active match?')) {
              onLeaveRoom();
            }
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/50 hover:text-rose-300 border border-white/10 text-gray-300 transition-colors"
          title="Exit Arena"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid: Player 1, Arena Board, Player 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Player 1 Card & Opponent Info */}
        <div className="lg:col-span-3 space-y-4">
          <PlayerCard
            player={p1}
            isCurrentTurn={currentTurn === 1}
            isMe={player?.player_number === 1}
            playerNumber={1}
            completedLines={gameState?.p1_stats?.total_lines || 0}
          />

          <div className="hidden lg:block">
            <BingoLetters
              completedLines={gameState?.p1_stats?.total_lines || 0}
              label={`${p1?.nickname || 'Player 1'}'s Bingo`}
            />
          </div>
        </div>

        {/* Middle: 5x5 Main Board & Turn Status */}
        <div className="lg:col-span-6 flex flex-col items-center gap-4">
          <TurnIndicator
            isMyTurn={isMyTurn}
            opponentName={opponentName}
            lastMove={lastMove}
          />

          {/* Interactive 5x5 Bingo Board */}
          <Board
            board={player?.board}
            calledNumbers={calledNumbers}
            winningCells={myStats?.winning_cells || []}
            isMyTurn={isMyTurn}
            lastCalled={calledNumbers[calledNumbers.length - 1]}
            onSelectNumber={onMakeMove}
          />

          {/* Mobile/Compact Bingo Progress */}
          <div className="lg:hidden w-full">
            <BingoLetters
              completedLines={myCompletedLines}
              label="Your B-I-N-G-O Progress"
            />
          </div>

          {/* Called Numbers Chips */}
          <MoveHistory calledNumbers={calledNumbers} />

          {/* Reaction Picker */}
          <ReactionPicker onSendReaction={onSendReaction} />
        </div>

        {/* Right Side: Player 2 Card */}
        <div className="lg:col-span-3 space-y-4">
          <PlayerCard
            player={p2}
            isCurrentTurn={currentTurn === 2}
            isMe={player?.player_number === 2}
            playerNumber={2}
            completedLines={gameState?.p2_stats?.total_lines || 0}
          />

          <div className="hidden lg:block">
            <BingoLetters
              completedLines={gameState?.p2_stats?.total_lines || 0}
              label={`${p2?.nickname || 'Player 2'}'s Bingo`}
            />
          </div>
        </div>
      </div>

      {/* Winner Celebration Modal */}
      {isGameOver && (
        <WinnerModal
          winnerName={gameState?.winner || 'Winner'}
          isTie={isTie}
          isWinner={isWinner}
          myLines={myCompletedLines}
          opponentLines={opponentStats?.total_lines || 0}
          onRematch={onRematch}
          onHome={onLeaveRoom}
        />
      )}
    </div>
  );
}


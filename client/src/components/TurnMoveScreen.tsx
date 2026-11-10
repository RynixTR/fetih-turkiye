// client/src/components/TurnMoveScreen.tsx
import React, { useState, useEffect } from 'react';
import { MapPieceState, Player, GameStage } from '../../../shared/types.js';
import { MapViewer } from './MapViewer.js';
import { haptic } from './Haptics.js';
import { sound } from './AudioEngine.js';

interface TurnMoveScreenProps {
  stage: GameStage;
  level: 1 | 2 | 3 | 4;
  pieces: Record<string, MapPieceState>;
  adjacency: Record<string, string[]>;
  activeTurnPlayerId: string | null;
  turnTimeRemainingMs: number;
  players: Player[];
  myPlayer: Player | null;
  onSelectCapital: (pieceId: string) => void;
  onExecuteMove: (pieceId: string) => void;
}

export const TurnMoveScreen: React.FC<TurnMoveScreenProps> = ({
  stage,
  level,
  pieces,
  adjacency,
  activeTurnPlayerId,
  turnTimeRemainingMs,
  players,
  myPlayer,
  onSelectCapital,
  onExecuteMove
}) => {
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  const isMyTurn = myPlayer ? myPlayer.id === activeTurnPlayerId : false;
  const activePlayer = players.find(p => p.id === activeTurnPlayerId);
  const secondsLeft = Math.max(0, Math.ceil(turnTimeRemainingMs / 1000));

  // Alert when it becomes player's turn
  useEffect(() => {
    if (isMyTurn) {
      haptic.yourTurn();
      sound.playConquest();
    }
  }, [isMyTurn]);

  // Reset selection when turn changes
  useEffect(() => {
    setSelectedPieceId(null);
  }, [activeTurnPlayerId]);

  // Compute legal moves
  const legalMoves = React.useMemo(() => {
    if (!myPlayer || !isMyTurn) return [];

    if (stage === 'CAPITAL_SELECTION') {
      // Any unowned piece
      return Object.keys(pieces).filter(id => pieces[id].ownerId === null);
    } else {
      // Normal moves: adjacent to any territory owned, unshielded
      const owned = new Set(myPlayer.territories);
      const neighborMoves = new Set<string>();

      for (const tId of myPlayer.territories) {
        const neighbors = adjacency[tId] || [];
        for (const n of neighbors) {
          if (!owned.has(n)) {
            neighborMoves.add(n);
          }
        }
      }

      let legal = Array.from(neighborMoves).filter(id => !pieces[id]?.isShielded);
      // Fallback if no neighbors available
      if (legal.length === 0) {
        legal = Object.keys(pieces).filter(id => !owned.has(id) && !pieces[id]?.isShielded);
      }
      return legal;
    }
  }, [myPlayer, isMyTurn, stage, pieces, adjacency]);

  const handleConfirmAction = (pieceId: string) => {
    if (!isMyTurn) return;
    if (stage === 'CAPITAL_SELECTION') {
      onSelectCapital(pieceId);
    } else {
      onExecuteMove(pieceId);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden bg-[#070b14]">
      {/* Turn Status Banner */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-2">
          {isMyTurn ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <div className="flex flex-col">
                <span className="text-xs uppercase font-black text-amber-400 tracking-wider">
                  {stage === 'CAPITAL_SELECTION' ? '👑 BAŞKENT SEÇİMİ' : '⚔️ FETİH HAMLESİ'}
                </span>
                <span className="text-base font-extrabold text-white">
                  Sıra Sende!
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: activePlayer?.color || '#94a3b8' }}
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {stage === 'CAPITAL_SELECTION' ? 'Başkent Seçiyor' : 'Hamle Yapıyor'}
                </span>
                <span className="text-sm font-extrabold text-white">
                  {activePlayer?.name || 'Bekleniyor...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Turn Countdown Timer */}
        <div className={`font-mono text-base font-black px-3 py-1 rounded-full border flex items-center gap-1 ${
          secondsLeft <= 3
            ? 'bg-rose-950/80 text-rose-400 border-rose-700 animate-pulse'
            : 'bg-slate-800 text-amber-400 border-slate-700'
        }`}>
          <span>⏱️</span>
          <span>{secondsLeft}s</span>
        </div>
      </div>

      {/* Interactive Map */}
      <MapViewer
        level={level}
        pieces={pieces}
        legalMoves={legalMoves}
        isMyTurn={isMyTurn}
        selectedPieceId={selectedPieceId}
        onSelectPiece={setSelectedPieceId}
        onConfirmPiece={handleConfirmAction}
        confirmButtonLabel={stage === 'CAPITAL_SELECTION' ? 'Başkent Olarak Seç' : 'Bu Parçayı Fethet'}
        players={players}
        disabled={!isMyTurn}
      />
    </div>
  );
};

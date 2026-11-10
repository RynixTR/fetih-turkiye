// client/src/components/TurnMoveScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { MapPieceState, Player, GameStage } from '../../../shared/types.js';
import { MapViewer } from './MapViewer.js';
import { haptic } from './Haptics.js';
import { sound } from './AudioEngine.js';
import { CrownIcon, SwordsIcon, BrokenCastleIcon, ShieldIcon } from './Icons.js';

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
  const legalMoves = useMemo(() => {
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

  // Inspect selected piece for dynamic guidance
  const selectedState = selectedPieceId ? pieces[selectedPieceId] : null;
  const selectedOwner = selectedState?.ownerId ? players.find(p => p.id === selectedState.ownerId) : null;
  const isSelectedLegal = selectedPieceId ? legalMoves.includes(selectedPieceId) : false;

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden bg-[#070b14]">
      {/* Turn & Tactical Instruction Banner */}
      <div className={`w-full border-b transition-colors px-3.5 py-2.5 z-10 shadow-lg flex flex-col gap-1.5 ${
        isMyTurn
          ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-amber-500/50'
          : 'bg-slate-900/95 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMyTurn ? (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs uppercase font-black text-amber-400 tracking-wider">
                  {stage === 'CAPITAL_SELECTION' ? '👑 1. ADIM: BAŞKENT SEÇİMİ' : '⚔️ HAMLE SIRASI SENDE'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: activePlayer?.color || '#94a3b8' }}
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {stage === 'CAPITAL_SELECTION' ? 'Başkent Seçiyor' : 'Hamle Yapıyor'}:{' '}
                  <strong className="text-white">{activePlayer?.name || 'Bekleniyor...'}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Turn Countdown Timer */}
          <div className={`font-mono text-sm font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
            secondsLeft <= 3
              ? 'bg-rose-950 text-rose-400 border-rose-600 animate-pulse'
              : isMyTurn
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            <span>⏱️</span>
            <span>{secondsLeft}s</span>
          </div>
        </div>

        {/* Dynamic Instructional Strategy Message */}
        <div className="text-xs leading-snug">
          {isMyTurn ? (
            stage === 'CAPITAL_SELECTION' ? (
              <div className="text-amber-200/90 font-medium flex items-center gap-1.5">
                <CrownIcon size={14} color="#f59e0b" />
                <span>
                  {selectedPieceId
                    ? 'Seçtiğin bölge senin kalen olacak. Alttan onayla!'
                    : 'Haritada parlayan bir bölgeye dokun ve ana başkentini kur (3 Can).'}
                </span>
              </div>
            ) : (
              <div className="text-slate-200 font-medium flex items-center gap-1.5">
                <SwordsIcon size={14} color="#fbbf24" />
                <span>
                  {selectedPieceId ? (
                    !isSelectedLegal ? (
                      <span className="text-rose-400">⚠️ Bu bölge sınırlarına komşu değil! Sarı parlayan yerlerden seç.</span>
                    ) : selectedState?.isCapital ? (
                      <span className="text-rose-300 font-bold">🔥 Düşman kalesine saldıracaksın! Kalan canı 1 azalacak.</span>
                    ) : selectedOwner ? (
                      <span className="text-amber-300 font-bold">⚔️ {selectedOwner.name}'in toprağını ele geçireceksin!</span>
                    ) : (
                      <span className="text-emerald-300 font-bold">🏳️ Boş bölgeyi fethederek sınırlarını genişleteceksin!</span>
                    )
                  ) : (
                    <span>Sarı parlayan bir komşu bölgeye dokun: Boş yer al, rakip toprağı çal veya başkente saldır!</span>
                  )}
                </span>
              </div>
            )
          ) : (
            <div className="text-slate-400 text-[11px]">
              Sıran geldiğinde bildirim çıkacak. Haritayı inceleyip sonraki hedefini belirleyebilirsin.
            </div>
          )}
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
        players={players}
        disabled={!isMyTurn}
        stage={stage}
      />
    </div>
  );
};

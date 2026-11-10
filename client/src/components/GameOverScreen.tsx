// client/src/components/GameOverScreen.tsx
import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player, MapPieceState } from '../../../shared/types.js';
import { CrownIcon, ColorblindBadge } from './Icons.js';
import { sound } from './AudioEngine.js';
import { haptic } from './Haptics.js';

interface GameOverScreenProps {
  winner: Player | null;
  finalPlacements: Player[];
  myPlayer: Player | null;
  isHost: boolean;
  onRestartGame: () => void;
  pieces: Record<string, MapPieceState>;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  winner,
  finalPlacements,
  myPlayer,
  isHost,
  onRestartGame,
  pieces
}) => {
  // Fire celebratory confetti on mount
  useEffect(() => {
    sound.playVictory();
    haptic.correct();

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      const interval = setInterval(() => {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x: Math.random(), y: 0.4 }
        });
      }, 1000);
      return () => clearInterval(interval);
    } catch (e) {
      // confetti fallback
    }
  }, []);

  // Compute game highlights
  const mostTerritories = [...finalPlacements].sort((a, b) => b.stats.territoriesTaken - a.stats.territoriesTaken)[0];
  const mostCorrect = [...finalPlacements].sort((a, b) => b.stats.correctAnswers - a.stats.correctAnswers)[0];
  const mostCapitalHits = [...finalPlacements].sort((a, b) => b.stats.capitalHits - a.stats.capitalHits)[0];

  const fastestPlayer = [...finalPlacements]
    .filter(p => p.stats.totalQuestions > 0)
    .sort((a, b) => (a.stats.totalResponseTimeMs / a.stats.totalQuestions) - (b.stats.totalResponseTimeMs / b.stats.totalQuestions))[0];

  const isMeWinner = myPlayer && winner && myPlayer.id === winner.id;

  return (
    <div className="flex-1 w-full flex flex-col p-4 overflow-y-auto safe-bottom">
      {/* Winner Spotlight Banner */}
      <div className="bg-gradient-to-b from-amber-500/25 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 text-center flex flex-col items-center gap-2 mb-4 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-1 shadow-lg shadow-amber-500/30 animate-bounce">
          <CrownIcon size={34} color="#f59e0b" />
        </div>

        <span className="text-xs uppercase font-black tracking-widest text-amber-400">
          TÜRKİYE'NİN TEK FATİHİ
        </span>

        <h1 className="font-display font-black text-3xl text-white tracking-wide">
          {winner?.name || 'Kazanan'}
        </h1>

        {isMeWinner && (
          <div className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow">
            🎉 TEBRİKLER! OYUNU KAZANDIN!
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
            style={{ backgroundColor: winner?.color }}
          >
            <ColorblindBadge symbol={winner?.symbol || 'circle'} size={12} color="#fff" />
          </div>
          <span className="text-xs text-slate-300 font-bold">
            {winner?.territories.length || 0} Parça Fethetti
          </span>
        </div>
      </div>

      {/* Match Statistics & Highlights Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {mostTerritories && (
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">🚩 En Çok Parça Alan</span>
            <strong className="text-sm text-amber-400 font-bold mt-0.5 truncate">
              {mostTerritories.name} ({mostTerritories.stats.territoriesTaken})
            </strong>
          </div>
        )}

        {mostCorrect && (
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">🧠 En Çok Doğru Bilen</span>
            <strong className="text-sm text-emerald-400 font-bold mt-0.5 truncate">
              {mostCorrect.name} ({mostCorrect.stats.correctAnswers})
            </strong>
          </div>
        )}

        {fastestPlayer && (
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">⚡ En Hızlı Cevaplayan</span>
            <strong className="text-sm text-cyan-400 font-bold mt-0.5 truncate">
              {fastestPlayer.name} ({(fastestPlayer.stats.totalResponseTimeMs / fastestPlayer.stats.totalQuestions / 1000).toFixed(1)}s)
            </strong>
          </div>
        )}

        {mostCapitalHits && mostCapitalHits.stats.capitalHits > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">💥 Başkent Avcısı</span>
            <strong className="text-sm text-rose-400 font-bold mt-0.5 truncate">
              {mostCapitalHits.name} ({mostCapitalHits.stats.capitalHits} Vuruş)
            </strong>
          </div>
        )}
      </div>

      {/* Final Placements List */}
      <div className="flex flex-col gap-1.5 flex-1 mb-4">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
          GENEL OYUN SIRALAMASI
        </span>

        <div className="flex flex-col gap-1.5">
          {finalPlacements.map((p, idx) => {
            const rank = idx + 1;
            const isMe = p.id === myPlayer?.id;

            return (
              <div
                key={p.id}
                className={`bg-slate-900/80 border rounded-xl px-3 py-2.5 flex items-center justify-between ${
                  rank === 1
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : isMe
                    ? 'border-slate-700 bg-slate-800/80'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg font-display font-black text-xs flex items-center justify-center shrink-0 ${
                      rank === 1
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rank}
                  </div>

                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 shadow"
                    style={{ backgroundColor: p.color }}
                  >
                    <ColorblindBadge symbol={p.symbol} size={13} color="#fff" />
                  </div>

                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    {p.name}
                    {isMe && <span className="text-[10px] bg-slate-800 text-slate-400 px-1 rounded">Sen</span>}
                  </span>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400 font-medium">
                    {p.stats.territoriesTaken} Fetih · {p.stats.correctAnswers} Doğru
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rematch Button */}
      <div className="mt-auto pt-2">
        {isHost ? (
          <button
            onClick={() => {
              haptic.tap();
              onRestartGame();
            }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-97 cursor-pointer"
          >
            <span>🔄</span>
            <span>Tekrar Oyna (Lobiye Dön)</span>
          </button>
        ) : (
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-center text-xs text-slate-300 font-semibold animate-pulse">
            Yöneticinin yeni oyunu başlatması bekleniyor...
          </div>
        )}
      </div>
    </div>
  );
};

// client/src/components/QuestionResultScreen.tsx
import React, { useEffect } from 'react';
import { QuestionResultView, Player } from '../../../shared/types.js';
import { ColorblindBadge } from './Icons.js';
import { sound } from './AudioEngine.js';
import { haptic } from './Haptics.js';

interface QuestionResultScreenProps {
  result: QuestionResultView;
  myPlayer: Player | null;
  roundNumber: number;
}

export const QuestionResultScreen: React.FC<QuestionResultScreenProps> = ({
  result,
  myPlayer,
  roundNumber
}) => {
  // Play sound on reveal
  useEffect(() => {
    if (myPlayer?.lastAnswer) {
      if (myPlayer.lastAnswer.isCorrect) {
        sound.playCorrect();
        haptic.correct();
      } else {
        sound.playIncorrect();
        haptic.incorrect();
      }
    }
  }, [myPlayer]);

  return (
    <div className="flex-1 w-full flex flex-col p-4 overflow-y-auto safe-bottom">
      {/* Top Banner: Correct Answer Card */}
      <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-xl flex flex-col gap-2 mb-3 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1">
            <span>✅</span>
            <span>DOĞRU CEVAP</span>
          </span>
          <span className="text-xs text-slate-400 font-bold">
            Tur {roundNumber}
          </span>
        </div>

        <div className="text-xl font-extrabold text-white leading-tight">
          {result.correctText}
        </div>

        {/* Trivia Fact: Biliyor muydun? */}
        {result.explanation && (
          <div className="mt-1 bg-slate-900/80 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-slate-300 flex items-start gap-2">
            <span className="text-emerald-400 text-sm mt-0.5">💡</span>
            <div className="leading-relaxed">
              <strong className="text-emerald-400 block mb-0.5 font-bold">Biliyor muydun?</strong>
              {result.explanation}
            </div>
          </div>
        )}
      </div>

      {/* Tur Sıralaması (Ranking List) */}
      <div className="flex flex-col gap-1.5 flex-1 mb-2">
        <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-400 mb-0.5">
          <span>👑 TUR HAMLE SIRALAMASI</span>
          <span>HIZ / FARK</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {result.ranking.map((entry, idx) => {
            const isMe = entry.playerId === myPlayer?.id;

            return (
              <div
                key={entry.playerId}
                className={`rounded-xl px-3 py-2.5 flex items-center justify-between border transition-all ${
                  isMe
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
                style={{
                  animationDelay: `${idx * 80}ms`
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Rank number badge */}
                  <div
                    className={`w-6 h-6 rounded-lg font-display font-black text-xs flex items-center justify-center shrink-0 ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : entry.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {entry.rank}
                  </div>

                  {/* Player avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 shadow"
                    style={{ backgroundColor: entry.playerColor }}
                  >
                    <ColorblindBadge symbol={entry.playerSymbol} size={13} color="#fff" />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight">
                      {entry.playerName}
                      {isMe && (
                        <span className="text-[10px] bg-amber-400 text-slate-950 px-1 rounded font-black">
                          Sen
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {entry.isCorrect
                        ? 'Doğru Bildi'
                        : entry.hasAnswered
                        ? (typeof entry.numericDiff !== 'undefined' ? `Fark: ${entry.numericDiff}` : 'Yanlış Bildi')
                        : 'Cevap Vermedi'}
                    </span>
                  </div>
                </div>

                {/* Speed / Status badge */}
                <div className="flex items-center gap-1.5 text-right font-mono text-xs">
                  {entry.isCorrect ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span>✓</span>
                      <span>{(entry.responseTimeMs / 1000).toFixed(2)}s</span>
                    </span>
                  ) : entry.hasAnswered ? (
                    <span className="text-rose-400 font-medium flex items-center gap-1">
                      <span>✕</span>
                      <span>{(entry.responseTimeMs / 1000).toFixed(2)}s</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      Boş
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Hint on Next Step */}
      <div className="mt-auto pt-2 text-center text-xs text-amber-400 font-semibold animate-pulse">
        {roundNumber === 1
          ? '🎯 1. Tur: Sıralamaya göre herkes Başkentini seçecek...'
          : '⚔️ Sıralamaya göre herkes 1 fetih hamlesi yapacak...'}
      </div>
    </div>
  );
};

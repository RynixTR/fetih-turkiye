// client/src/components/EliminationModal.tsx
import React, { useEffect } from 'react';
import { BrokenCastleIcon, SwordsIcon, EyeIcon } from './Icons.js';
import { sound } from './AudioEngine.js';
import { haptic } from './Haptics.js';

interface EliminationModalProps {
  isOpen: boolean;
  conquerorName?: string;
  eliminatedRank?: number;
  onClose: () => void;
  onLeaveGame: () => void;
}

export const EliminationModal: React.FC<EliminationModalProps> = ({
  isOpen,
  conquerorName,
  eliminatedRank,
  onClose,
  onLeaveGame
}) => {
  useEffect(() => {
    if (isOpen) {
      sound.playElimination();
      haptic.elimination();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-rose-500/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow backdrop */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-rose-950/80 border-2 border-rose-600/60 flex items-center justify-center mb-4 shadow-lg shadow-rose-950/50">
          <BrokenCastleIcon size={44} color="#f87171" />
        </div>

        {/* Title */}
        <span className="text-xs font-black tracking-widest text-rose-400 uppercase mb-1">
          BAŞKENTİN DÜŞTÜ
        </span>
        <h2 className="text-2xl font-black text-white font-display uppercase tracking-wide mb-2">
          Elendin!
        </h2>

        {/* Details */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 mb-5 flex flex-col gap-2 text-xs">
          {conquerorName && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Fetheden:</span>
              <strong className="text-amber-400 flex items-center gap-1">
                <SwordsIcon size={14} color="#f59e0b" />
                {conquerorName}
              </strong>
            </div>
          )}

          {eliminatedRank !== undefined && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Elenme Sıran:</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-white">
                {eliminatedRank}. sırada
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed text-left flex items-start gap-1.5">
            <EyeIcon size={14} color="#94a3b8" />
            <span>
              Artık <strong>izleyici modundasın</strong>. Haritayı canlı izleyebilir, soruları görebilir ve emoji gönderebilirsin.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={() => {
              haptic.tap();
              onClose();
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-2"
          >
            <EyeIcon size={16} color="#020617" />
            <span>Canlı İzlemeye Devam Et</span>
          </button>

          <button
            onClick={() => {
              haptic.tap();
              onLeaveGame();
            }}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-rose-300 border border-slate-700 font-bold text-xs active:scale-98 transition-colors"
          >
            Oyundan Çık
          </button>
        </div>
      </div>
    </div>
  );
};

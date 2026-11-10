// client/src/components/ReactionOverlay.tsx
import React from 'react';
import { REACTION_EMOJIS } from '../../../shared/constants.js';
import { haptic } from './Haptics.js';

interface ReactionItem {
  id: string;
  emoji: string;
  senderName: string;
  senderColor: string;
  timestamp: number;
}

interface ReactionOverlayProps {
  reactions: ReactionItem[];
  onSendReaction: (emoji: string) => void;
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ reactions, onSendReaction }) => {
  return (
    <>
      {/* Floating active emojis in canvas */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden flex items-end justify-center pb-24">
        {reactions.map((rx, idx) => (
          <div
            key={rx.id}
            className="floating-emoji absolute flex flex-col items-center gap-0.5"
            style={{
              left: `${35 + ((idx * 17) % 40)}%`,
              bottom: '120px'
            }}
          >
            <span className="text-4xl filter drop-shadow-lg">{rx.emoji}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white shadow"
              style={{ backgroundColor: rx.senderColor || '#475569' }}
            >
              {rx.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Emoji sender dock (compact, light touch) */}
      <div className="w-full flex items-center justify-center gap-1.5 py-1 px-2 z-20 bg-slate-950/60 backdrop-blur-xs border-t border-slate-800/40">
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => {
              haptic.tap();
              onSendReaction(emoji);
            }}
            className="w-9 h-9 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 flex items-center justify-center text-lg active:scale-125 transition-transform"
            title={`Tepki ver: ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};

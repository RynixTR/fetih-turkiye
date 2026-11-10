// client/src/components/CountdownScreen.tsx
import React, { useEffect, useState } from 'react';
import { sound } from './AudioEngine.js';
import { haptic } from './Haptics.js';

interface CountdownScreenProps {
  remainingMs: number;
  level: 1 | 2 | 3 | 4;
  levelDescription: string;
}

export const CountdownScreen: React.FC<CountdownScreenProps> = ({
  remainingMs,
  level,
  levelDescription
}) => {
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));
  const [prevSec, setPrevSec] = useState<number>(secondsLeft);

  useEffect(() => {
    if (secondsLeft !== prevSec) {
      setPrevSec(secondsLeft);
      if (secondsLeft > 1) {
        sound.playCountdownTick();
        haptic.tap();
      } else {
        sound.playCountdownGo();
        haptic.correct();
      }
    }
  }, [secondsLeft, prevSec]);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0a0f1d] via-[#111827] to-[#070b14] relative overflow-hidden select-none">
      {/* Decorative background grid and glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      <div className="absolute w-72 h-72 rounded-full bg-amber-500/10 filter blur-3xl" />

      {/* Map Level Announcement Card */}
      <div className="z-10 bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-1.5 mb-8 max-w-xs animate-in zoom-in-95 duration-200">
        <span className="text-xs uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1">
          <span>🗺️</span>
          <span>HARİTA HAZIRLANDI</span>
        </span>
        <div className="font-extrabold text-base text-white">
          {levelDescription}
        </div>
        <p className="text-xs text-slate-400">
          İlk soruya en hızlı doğru cevabı vererek başkentini ilk seçen sen ol!
        </p>
      </div>

      {/* Huge Animated Number */}
      <div className="z-10 flex flex-col items-center justify-center my-4">
        <div
          key={secondsLeft}
          className="font-display font-black text-8xl text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 animate-in zoom-in-50 duration-300 drop-shadow-[0_0_35px_rgba(245,158,11,0.5)]"
        >
          {secondsLeft}
        </div>
        <span className="text-sm font-extrabold text-slate-300 tracking-wider uppercase mt-2">
          OYUN BAŞLIYOR...
        </span>
      </div>
    </div>
  );
};

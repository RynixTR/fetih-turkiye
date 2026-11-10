// client/src/components/Header.tsx
import React from 'react';
import { GameStage, Player } from '../../../shared/types.js';
import { VolumeOnIcon, VolumeOffIcon, SettingsIcon, HelpIcon, EyeIcon } from './Icons.js';
import { sound } from './AudioEngine.js';
import { haptic } from './Haptics.js';

interface HeaderProps {
  roomCode: string;
  stage: GameStage;
  roundNumber: number;
  players: Player[];
  myPlayer: Player | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  isDoomsday: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  stage,
  roundNumber,
  players,
  myPlayer,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenHowToPlay,
  isDoomsday
}) => {
  const alivePlayers = players.filter(p => p.isAlive && !p.isSpectator);

  return (
    <header className="w-full bg-slate-900/90 border-b border-slate-800 px-3 py-2.5 safe-top flex items-center justify-between z-20 backdrop-blur-md">
      {/* Left: Logo & Room info */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-extrabold text-base font-display tracking-wider">
              FETİH TR
            </span>
            {roomCode && (
              <span className="bg-slate-800 text-slate-300 font-mono text-xs px-1.5 py-0.5 rounded font-bold border border-slate-700">
                {roomCode}
              </span>
            )}
          </div>
          {stage !== 'LOBBY' && (
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <span>Tur {roundNumber}</span>
              <span>·</span>
              <span className="text-emerald-400">{alivePlayers.length} Hayatta</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Spectator badge or Doomsday badge */}
      <div className="flex items-center gap-1.5">
        {myPlayer?.isSpectator && (
          <span className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
            <EyeIcon size={13} color="#fda4af" />
            İzliyorsun
          </span>
        )}

        {isDoomsday && (
          <span className="bg-red-900/90 text-red-200 border border-red-500 px-2 py-0.5 rounded-full text-xs font-black tracking-wider animate-bounce">
            🔥 KIYAMET
          </span>
        )}
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            haptic.tap();
            onToggleSound();
          }}
          className="w-9 h-9 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95"
          aria-label="Ses"
          title="Ses Aç/Kapat"
        >
          {soundEnabled ? <VolumeOnIcon size={18} color="#f59e0b" /> : <VolumeOffIcon size={18} color="#94a3b8" />}
        </button>

        <button
          onClick={() => {
            haptic.tap();
            onOpenHowToPlay();
          }}
          className="w-9 h-9 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95"
          aria-label="Nasıl Oynanır"
          title="Nasıl Oynanır"
        >
          <HelpIcon size={18} />
        </button>

        <button
          onClick={() => {
            haptic.tap();
            onOpenSettings();
          }}
          className="w-9 h-9 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95"
          aria-label="Ayarlar"
          title="Ayarlar"
        >
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  );
};

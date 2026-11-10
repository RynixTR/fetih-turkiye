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
  onLeaveGame?: () => void;
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
  onLeaveGame,
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
          <div className="flex items-center gap-1">
            <span className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
              <EyeIcon size={13} color="#fda4af" />
              İzliyorsun
            </span>
            {onLeaveGame && (
              <button
                onClick={() => {
                  haptic.tap();
                  onLeaveGame();
                }}
                className="bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 hover:border-rose-800 px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors active:scale-95"
                title="Oyundan Çık"
              >
                Çık
              </button>
            )}
          </div>
        )}

        {isDoomsday && (
          <span className="bg-red-900/90 text-red-200 border border-red-500 px-2 py-0.5 rounded-full text-xs font-black tracking-wider animate-bounce">
            🔥 KIYAMET
          </span>
        )}
      </div>

      {/* Right: Quick Action Controls & Alive Player Count */}
      <div className="flex items-center gap-1.5">
        {stage !== 'LOBBY' && (
          <div className="bg-slate-800/80 border border-slate-700/80 px-2 py-1 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-1" title="Kalan Hayatta Oyuncu">
            <span className="text-emerald-400 font-extrabold">{alivePlayers.length}</span>
            <span className="text-[10px] text-slate-400">Canlı</span>
          </div>
        )}

        <button
          onClick={() => {
            haptic.tap();
            onToggleSound();
          }}
          className="w-8 h-8 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95"
          aria-label="Ses"
          title="Ses Aç/Kapat"
        >
          {soundEnabled ? <VolumeOnIcon size={16} color="#f59e0b" /> : <VolumeOffIcon size={16} color="#94a3b8" />}
        </button>

        <button
          onClick={() => {
            haptic.tap();
            onOpenHowToPlay();
          }}
          className="w-8 h-8 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95"
          aria-label="Nasıl Oynanır"
          title="Nasıl Oynanır"
        >
          <HelpIcon size={16} />
        </button>

        <button
          onClick={() => {
            haptic.tap();
            onOpenSettings();
          }}
          className="w-8 h-8 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95"
          aria-label="Ayarlar"
          title="Ayarlar"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
};

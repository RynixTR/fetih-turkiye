// client/src/components/LobbyScreen.tsx
import React, { useState } from 'react';
import { Player, RoomSettings, GameLength, QuestionDifficultySetting } from '../../../shared/types.js';
import { CrownIcon, CopyIcon, ShareIcon, ColorblindBadge, HelpIcon } from './Icons.js';
import { GAME_LENGTH_CONFIG } from '../../../shared/constants.js';
import { haptic } from './Haptics.js';

interface LobbyScreenProps {
  roomCode: string;
  players: Player[];
  myPlayer: Player | null;
  isHost: boolean;
  settings: RoomSettings;
  onUpdateSettings: (newSettings: Partial<RoomSettings>) => void;
  onStartGame: () => void;
  onKickPlayer: (token: string) => void;
  onOpenHowToPlay: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  players,
  myPlayer,
  isHost,
  settings,
  onUpdateSettings,
  onStartGame,
  onKickPlayer,
  onOpenHowToPlay
}) => {
  const [copied, setCopied] = useState(false);
  const [kickConfirmPlayer, setKickConfirmPlayer] = useState<Player | null>(null);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?oda=${roomCode}`
    : `https://fetihturkiye.com/?oda=${roomCode}`;

  const handleCopyLink = () => {
    haptic.tap();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    haptic.tap();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Fetih Türkiye Oyunu Daveti',
          text: `Fetih Türkiye bilgi ve harita fethi oyununa davet edildin! Oda Kodu: ${roomCode}`,
          url: inviteUrl
        });
      } catch (err) {
        // Share dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  // Compute map pieces & duration preview
  const playerCount = players.length;
  let piecesPreview = '7 Bölge (Seviye 1)';
  if (playerCount >= 8) piecesPreview = '81 İl Tek Tek (Seviye 4)';
  else if (playerCount >= 6) piecesPreview = '45 İl Grubu (Seviye 3)';
  else if (playerCount >= 4) piecesPreview = '22 Bölüm (Seviye 2)';

  const durationPreview = settings.gameLength === 'short'
    ? '6 - 10 dk'
    : settings.gameLength === 'normal'
    ? '9 - 14 dk'
    : '12 - 18 dk';

  return (
    <div className="flex-1 w-full flex flex-col p-4 overflow-y-auto safe-bottom">
      {/* Big Room Code Header */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl flex flex-col items-center text-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-widest text-amber-400 font-extrabold">
          ODA KODU
        </span>
        <div className="font-display font-black text-4xl tracking-widest text-white select-all">
          {roomCode}
        </div>

        {/* Copy & Share Buttons */}
        <div className="flex items-center gap-2 w-full pt-1">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-xs text-white flex items-center justify-center gap-1.5 active:scale-95"
          >
            <CopyIcon size={14} color="#f59e0b" />
            <span>{copied ? 'Kopyalandı! ✓' : 'Linki Kopyala'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20"
          >
            <ShareIcon size={14} color="#000" />
            <span>Arkadaşını Çağır</span>
          </button>
        </div>
      </div>

      {/* Players Counter & List */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <span>🛡️ Oyuncular</span>
            <span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full border border-slate-700">
              {players.length} / 10
            </span>
          </span>
          <button
            onClick={onOpenHowToPlay}
            className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <HelpIcon size={13} color="#f59e0b" />
            <span>Nasıl Oynanır?</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {players.map(p => (
            <div
              key={p.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-center gap-2.5">
                {/* Avatar with color and symbol */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shadow-md text-white font-bold text-xs"
                  style={{ backgroundColor: p.color }}
                >
                  <ColorblindBadge symbol={p.symbol} size={15} color="#fff" />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">
                      {p.name}
                    </span>
                    {p.id === myPlayer?.id && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1 rounded font-medium">
                        Sen
                      </span>
                    )}
                    {p.isHost && (
                      <span className="flex items-center gap-0.5 text-amber-400" title="Oda Yöneticisi">
                        <CrownIcon size={14} color="#f59e0b" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Sembol: {p.symbolName}
                  </span>
                </div>
              </div>

              {/* Host Kick Option */}
              {isHost && !p.isHost && (
                <button
                  onClick={() => setKickConfirmPlayer(p)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded bg-rose-950/40 border border-rose-800/50 active:scale-95"
                >
                  At
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Host Settings or Read-only Settings */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 mb-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
            {isHost ? 'YÖNETİCİ AYARLARI' : 'OYUN AYARLARI'}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {isHost ? 'Canlı Değiştirilebilir' : 'Yönetici Belirler'}
          </span>
        </div>

        {/* Game Length */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300">Oyun Uzunluğu</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['short', 'normal', 'long'] as GameLength[]).map(len => (
              <button
                key={len}
                disabled={!isHost}
                onClick={() => {
                  haptic.tap();
                  onUpdateSettings({ gameLength: len });
                }}
                className={`py-2 px-1 rounded-xl font-bold text-xs border transition-all ${
                  settings.gameLength === len
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700/60'
                } ${!isHost ? 'cursor-default' : 'active:scale-95'}`}
              >
                {len === 'short' ? 'Kısa (2 Can)' : len === 'normal' ? 'Normal (3 Can)' : 'Uzun (4 Can)'}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300">Soru Zorluğu</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['easy', 'normal', 'hard'] as QuestionDifficultySetting[]).map(diff => (
              <button
                key={diff}
                disabled={!isHost}
                onClick={() => {
                  haptic.tap();
                  onUpdateSettings({ difficulty: diff });
                }}
                className={`py-2 px-1 rounded-xl font-bold text-xs border transition-all ${
                  settings.difficulty === diff
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700/60'
                } ${!isHost ? 'cursor-default' : 'active:scale-95'}`}
              >
                {diff === 'easy' ? 'Rahat' : diff === 'normal' ? 'Normal' : 'Zor'}
              </button>
            ))}
          </div>
        </div>

        {/* Game Stats Preview */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block text-[10px]">Tahmini Süre</span>
            <strong className="text-amber-400">{durationPreview}</strong>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Harita Tipi</span>
            <strong className="text-white">{piecesPreview}</strong>
          </div>
        </div>
      </div>

      {/* Start Game Action Bar */}
      <div className="mt-auto pt-2">
        {isHost ? (
          <button
            disabled={players.length < 2}
            onClick={() => {
              haptic.tap();
              onStartGame();
            }}
            className={`w-full py-4 rounded-xl font-extrabold text-lg flex items-center justify-center gap-2 shadow-xl transition-transform ${
              players.length >= 2
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-amber-500/25 active:scale-97 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <span>👑</span>
            <span>{players.length >= 2 ? 'Oyunu Başlat' : 'En az 2 oyuncu gerekli'}</span>
          </button>
        ) : (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 text-center flex items-center justify-center gap-2 text-sm font-semibold text-slate-300 animate-pulse">
            <span>⏳</span>
            <span>Yönetici oyunu başlatmayı bekliyor...</span>
          </div>
        )}
      </div>

      {/* Kick Confirmation Modal */}
      {kickConfirmPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-slate-900 border border-rose-500/50 rounded-2xl p-5 text-center flex flex-col gap-3">
            <h4 className="text-lg font-bold text-white">Oyuncuyu At</h4>
            <p className="text-sm text-slate-300">
              <strong className="text-rose-400">{kickConfirmPlayer.name}</strong> odadan atılsın mı? Bu odaya bir daha katılamaz.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setKickConfirmPlayer(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  onKickPlayer(kickConfirmPlayer.sessionToken);
                  setKickConfirmPlayer(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm shadow-md shadow-rose-600/30"
              >
                Evet, At
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

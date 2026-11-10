// client/src/components/OpeningScreen.tsx
import React, { useState, useEffect } from 'react';
import { validatePlayerName } from '../../../shared/constants.js';
import { SwordsIcon } from './Icons.js';
import { haptic } from './Haptics.js';

interface OpeningScreenProps {
  initialRoomCode?: string;
  onJoinOrCreate: (name: string, roomCode?: string) => void;
  isLoading: boolean;
  errorMessage?: string;
}

export const OpeningScreen: React.FC<OpeningScreenProps> = ({
  initialRoomCode = '',
  onJoinOrCreate,
  isLoading,
  errorMessage
}) => {
  const [name, setName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [isJoiningExisting, setIsJoiningExisting] = useState<boolean>(Boolean(initialRoomCode));
  const [localError, setLocalError] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('fetih_player_name');
    if (saved) setName(saved);
  }, []);

  const handleAction = (createRoom: boolean) => {
    haptic.tap();
    setLocalError('');

    const val = validatePlayerName(name);
    if (!val.valid) {
      setLocalError(val.error || 'Lütfen geçerli bir isim giriniz.');
      return;
    }

    // Save name in browser for next time
    localStorage.setItem('fetih_player_name', val.sanitized!);

    if (createRoom) {
      onJoinOrCreate(val.sanitized!, undefined);
    } else {
      if (!roomCode.trim()) {
        setLocalError('Lütfen katılmak istediğin 4 haneli oda kodunu gir.');
        return;
      }
      onJoinOrCreate(val.sanitized!, roomCode.trim().toUpperCase());
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-between p-6 safe-top safe-bottom bg-gradient-to-b from-[#0a0f1d] via-[#0f172a] to-[#070b14] overflow-y-auto">
      {/* Game Branding & Logo */}
      <div className="flex flex-col items-center text-center mt-4 mb-4">
        {/* Animated Turkish Flag & Crescent Emblem */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 p-0.5 shadow-2xl shadow-amber-500/25 mb-3 flex items-center justify-center">
          <div className="w-full h-full bg-[#0a0f1d] rounded-[22px] flex items-center justify-center text-amber-400">
            <SwordsIcon size={42} color="#f59e0b" />
          </div>
        </div>

        <h1 className="font-display font-black text-4xl text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-wider">
          FETİH TÜRKİYE
        </h1>
        <p className="text-xs text-amber-400/90 font-bold tracking-widest uppercase mt-1">
          Canlı Bilgi & Harita Fethi Oyunu
        </p>
      </div>

      {/* Main Entry Card */}
      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 my-auto backdrop-blur-md">
        {/* Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Oyuncu Takma Adın
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Örn: Fatih, Bilge..."
            maxLength={14}
            disabled={isLoading}
            className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-base placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
          <span className="text-[11px] text-slate-400">
            2-14 karakter, Türkçe harfler desteklenir.
          </span>
        </div>

        {/* Existing Room Code (if invited or joining) */}
        {isJoiningExisting && (
          <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Oda Kodu</span>
              <button
                type="button"
                onClick={() => {
                  setIsJoiningExisting(false);
                  setRoomCode('');
                }}
                className="text-amber-400 text-[11px] hover:underline"
              >
                Yeni Oda Kur
              </button>
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Örn: K7P9"
              maxLength={4}
              disabled={isLoading}
              className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-display font-black text-center text-2xl tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        {/* Error message if any */}
        {(localError || errorMessage) && (
          <div className="bg-rose-950/80 border border-rose-800/80 rounded-xl p-3 text-rose-300 text-xs font-bold text-center">
            {localError || errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {isJoiningExisting ? (
            <button
              disabled={isLoading || !name.trim() || !roomCode.trim()}
              onClick={() => handleAction(false)}
              className="btn-primary w-full"
            >
              <span>{isLoading ? 'Bağlanılıyor...' : 'Odaya Katıl'}</span>
            </button>
          ) : (
            <>
              <button
                disabled={isLoading || !name.trim()}
                onClick={() => handleAction(true)}
                className="btn-primary w-full"
              >
                <span>👑</span>
                <span>{isLoading ? 'Kuruluyor...' : 'Yeni Oda Kur'}</span>
              </button>

              <button
                disabled={isLoading}
                onClick={() => {
                  haptic.tap();
                  setIsJoiningExisting(true);
                }}
                className="btn-secondary w-full"
              >
                <span>Mevcut Odaya Katıl</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-slate-500 font-medium mt-4">
        2-10 oyuncu · Gerçek Zamanlı · Türkiye Haritası
      </div>
    </div>
  );
};

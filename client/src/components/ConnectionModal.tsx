// client/src/components/ConnectionModal.tsx
import React from 'react';
import { haptic } from './Haptics.js';

interface ConnectionModalProps {
  isWakingUp: boolean;
  isReconnecting: boolean;
  kickedMessage?: string;
  onReset: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isWakingUp,
  isReconnecting,
  kickedMessage,
  onReset
}) => {
  if (!isWakingUp && !isReconnecting && !kickedMessage) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center flex flex-col items-center gap-3 shadow-2xl">
        {isWakingUp ? (
          <>
            <div className="w-14 h-14 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-2" />
            <h3 className="font-display font-extrabold text-xl text-white">
              Sunucu Uyanıyor...
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bulut sunucu uyku modundan çıkıyor. Birkaç saniye içinde oyun açılacaktır. Lütfen bekleyiniz.
            </p>
          </>
        ) : isReconnecting ? (
          <>
            <div className="w-14 h-14 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-2" />
            <h3 className="font-display font-extrabold text-xl text-white">
              Bağlantı Yenileniyor...
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              İnternet bağlantın koptu. Kaldığın yerden devam etmek için otomatik olarak bağlanılıyor (20 sn süren var).
            </p>
          </>
        ) : kickedMessage ? (
          <>
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-600 flex items-center justify-center text-rose-400 text-2xl mb-2">
              ⚠️
            </div>
            <h3 className="font-display font-extrabold text-xl text-rose-400">
              Odadan Ayrıldın
            </h3>
            <p className="text-sm text-slate-300">
              {kickedMessage}
            </p>
            <button
              onClick={() => {
                haptic.tap();
                onReset();
              }}
              className="mt-3 w-full py-3 rounded-xl bg-slate-800 border border-slate-700 font-bold text-sm text-white active:scale-95"
            >
              Ana Ekrana Dön
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

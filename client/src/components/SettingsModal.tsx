// client/src/components/SettingsModal.tsx
import React, { useState, useEffect } from 'react';
import { VolumeOnIcon, VolumeOffIcon } from './Icons.js';
import { haptic } from './Haptics.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export type FontSizeOption = 'normal' | 'large' | 'xlarge';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound
}) => {
  const [fontSize, setFontSize] = useState<FontSizeOption>('normal');

  useEffect(() => {
    const saved = (localStorage.getItem('fetih_font_size') as FontSizeOption) || 'normal';
    setFontSize(saved);
    applyFontSizeClass(saved);
  }, []);

  const applyFontSizeClass = (size: FontSizeOption) => {
    document.body.classList.remove('font-large', 'font-xlarge');
    if (size === 'large') document.body.classList.add('font-large');
    if (size === 'xlarge') document.body.classList.add('font-xlarge');
  };

  const handleFontSizeChange = (size: FontSizeOption) => {
    haptic.tap();
    setFontSize(size);
    localStorage.setItem('fetih_font_size', size);
    applyFontSizeClass(size);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-5 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h3 className="font-display font-extrabold text-xl text-amber-400">
              Oyun Ayarları
            </h3>
          </div>
          <button
            onClick={() => {
              haptic.tap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Font Size Accessibility Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-300 flex items-center justify-between">
            <span>Metin Boyutu (Okunabilirlik)</span>
            <span className="text-xs text-amber-400 font-medium">
              {fontSize === 'normal' ? 'Normal (18px+)' : fontSize === 'large' ? 'Büyük (20px+)' : 'Çok Büyük (22px+)'}
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleFontSizeChange('normal')}
              className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                fontSize === 'normal'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => handleFontSizeChange('large')}
              className={`py-3 rounded-xl font-bold text-base border transition-all ${
                fontSize === 'large'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Büyük
            </button>
            <button
              onClick={() => handleFontSizeChange('xlarge')}
              className={`py-3 rounded-xl font-extrabold text-lg border transition-all ${
                fontSize === 'xlarge'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Çok Büyük
            </button>
          </div>
          <p className="text-[12px] text-slate-400 pt-0.5">
            Göz yormayan, yüksek kontrastlı ve yaşlı oyuncular için optimize edilmiş tipografi.
          </p>
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-700/80 flex items-center justify-center">
              {soundEnabled ? <VolumeOnIcon size={18} color="#f59e0b" /> : <VolumeOffIcon size={18} color="#94a3b8" />}
            </div>
            <div>
              <div className="text-sm font-bold text-white">Ses Efektleri</div>
              <div className="text-xs text-slate-400">Geri sayım, fetih ve zafer sesleri</div>
            </div>
          </div>
          <button
            onClick={() => {
              haptic.tap();
              onToggleSound();
            }}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-amber-500' : 'bg-slate-700'}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Colorblind assistance note */}
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40 text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200 block mb-1">♿ Renk Körlüğü Desteği:</strong>
          Tüm oyuncular ve harita parçaları renklerin yanında daire, yıldız, kare gibi özgün geometrik sembollerle kodlanmıştır.
        </div>

        <button
          onClick={() => {
            haptic.tap();
            onClose();
          }}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300 border border-slate-700 active:scale-95"
        >
          Tamam
        </button>
      </div>
    </div>
  );
};

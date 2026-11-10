// client/src/components/HowToPlayModal.tsx
import React, { useState } from 'react';
import { CrownIcon, CastleIcon, SwordsIcon, ShieldIcon } from './Icons.js';
import { haptic } from './Haptics.js';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: '1. Soru Aşaması',
      icon: '🧠',
      desc: 'Her turda hayatta olan herkese AYNI ANDA aynı soru gelir. Doğru cevabı en hızlı veren en büyük avantajı elde eder. Süre dolana kadar kimse doğru cevabı göremez.'
    },
    {
      title: '2. Sıralama Kuralı',
      icon: '⚡',
      desc: 'Önce doğru bilenler cevap hızına göre, ardından yanlış bilenler hızına göre, en son ise cevap vermeyenler sıralanır. Herkes turda 1 hamle hakkına sahiptir.'
    },
    {
      title: '3. Harita Fethi & Kalkan',
      icon: '🗺️',
      desc: 'Sıran geldiğinde kendi parçana KOMŞU olan boş bir yeri veya rakip parçasını alırsın. Yeni fethettiğin parça o turun sonuna kadar kalkana sahip olur (tekrar saldırılamaz).'
    },
    {
      title: '4. Başkent & Eleme',
      icon: '👑',
      desc: 'Her oyuncunun bir BAŞKENTİ vardır (2-4 can). Başkentine vurulan oyuncunun canı 1 azalır. Canı sıfırlanan ELENİR ve TÜM toprakları başkentini düşüren fatihe geçer!'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="font-display font-extrabold text-xl text-amber-400">
              Nasıl Oynanır?
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

        {/* Current Step Card */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col items-center text-center gap-3 min-h-[190px] justify-center">
          <div className="text-4xl">{steps[step].icon}</div>
          <h4 className="font-extrabold text-lg text-amber-300">
            {steps[step].title}
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {steps[step].desc}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                haptic.tap();
                setStep(i);
              }}
              className={`h-2 rounded-full transition-all ${step === i ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'}`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-2 pt-1">
          {step > 0 && (
            <button
              onClick={() => {
                haptic.tap();
                setStep(s => s - 1);
              }}
              className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold active:scale-95"
            >
              Geri
            </button>
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => {
                haptic.tap();
                setStep(s => s + 1);
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 active:scale-95"
            >
              İleri
            </button>
          ) : (
            <button
              onClick={() => {
                haptic.tap();
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Anladım, Oyna!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

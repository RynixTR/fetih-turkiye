// client/src/components/QuestionScreen.tsx
import React, { useState, useEffect } from 'react';
import { QuestionClientView, Player } from '../../../shared/types.js';
import { sound } from './AudioEngine.js';
import { haptic } from './Haptics.js';

interface QuestionScreenProps {
  question: QuestionClientView;
  stageTimeRemainingMs: number;
  myPlayer: Player | null;
  onSubmitAnswer: (answer: number) => void;
  onUseHint: () => void;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({
  question,
  stageTimeRemainingMs,
  myPlayer,
  onSubmitAnswer,
  onUseHint
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [numericInput, setNumericInput] = useState<string>('');
  const [hintUsedLocally, setHintUsedLocally] = useState<boolean>(false);

  const totalTimeMs = (question.timeLimit || 20) * 1000;
  const clampedRemainingMs = Math.max(0, Math.min(totalTimeMs, stageTimeRemainingMs));
  const progressRatio = clampedRemainingMs / totalTimeMs;
  const secondsLeft = Math.ceil(clampedRemainingMs / 1000);

  const isLocked = selectedAnswer !== null || Boolean(myPlayer?.hasAnsweredCurrentQuestion);
  const isSpectator = Boolean(myPlayer?.isSpectator || !myPlayer?.isAlive);

  // Tick-tock audio during last 5 seconds
  useEffect(() => {
    if (secondsLeft <= 5 && secondsLeft > 0 && !isLocked) {
      sound.playTick();
    }
  }, [secondsLeft, isLocked]);

  const handleSelectOption = (idx: number) => {
    if (isLocked || isSpectator) return;
    haptic.tap();
    setSelectedAnswer(idx);
    onSubmitAnswer(idx);
  };

  const handleNumericSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked || isSpectator || !numericInput.trim()) return;
    const numVal = Number(numericInput.trim());
    if (isNaN(numVal)) return;
    haptic.tap();
    setSelectedAnswer(numVal);
    onSubmitAnswer(numVal);
  };

  const handleNumericKey = (char: string) => {
    if (isLocked || isSpectator) return;
    haptic.tap();
    if (char === 'C') {
      setNumericInput('');
    } else if (char === '⌫') {
      setNumericInput(prev => prev.slice(0, -1));
    } else {
      if (numericInput.length < 8) {
        setNumericInput(prev => prev + char);
      }
    }
  };

  // Determine timer bar color: green -> yellow -> red
  let timerBarColor = 'bg-emerald-500';
  if (progressRatio < 0.25) {
    timerBarColor = 'bg-rose-500';
  } else if (progressRatio < 0.5) {
    timerBarColor = 'bg-amber-500';
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="flex-1 w-full flex flex-col p-4 overflow-y-auto safe-bottom justify-between">
      {/* Top Header: Category & Timer Bar */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <span className="bg-slate-800/90 text-amber-400 px-2.5 py-1 rounded-full border border-slate-700 uppercase tracking-wider">
            🏷️ {question.categoryName}
          </span>

          {/* Time digits */}
          <div className={`font-mono text-base font-extrabold flex items-center gap-1 ${secondsLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            <span>⏱️</span>
            <span>{secondsLeft}s</span>
          </div>
        </div>

        {/* Animated Timer Progress Bar */}
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-100 ease-linear ${timerBarColor} ${secondsLeft <= 5 ? 'animate-pulse' : ''}`}
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Question Text Box (Accessible, large high contrast) */}
      <div className="my-auto py-4 px-3 text-center flex flex-col items-center justify-center">
        <h2 className="text-[var(--font-question)] font-extrabold text-white leading-snug drop-shadow-sm select-text">
          {question.text}
        </h2>

        {/* 50/50 Hint Button if eligible */}
        {myPlayer?.hintAvailable && !hintUsedLocally && question.type === 'multiple_choice' && !isLocked && !isSpectator && (
          <button
            onClick={() => {
              setHintUsedLocally(true);
              onUseHint();
            }}
            className="mt-3 px-3 py-1.5 rounded-full bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95"
          >
            <span>💡</span>
            <span>50/50 İpucu Hakkını Kullan (2 Yanlışı Ele)</span>
          </button>
        )}
      </div>

      {/* Answer Options Area */}
      {question.type === 'multiple_choice' && question.options ? (
        <div className="flex flex-col gap-2.5 my-auto">
          {question.options.map((optText, idx) => {
            const isEliminatedByHint = myPlayer?.eliminatedOptions?.includes(idx);
            const isChosen = selectedAnswer === idx;

            return (
              <button
                key={idx}
                disabled={isLocked || isSpectator || isEliminatedByHint}
                onClick={() => handleSelectOption(idx)}
                className={`w-full min-h-[var(--btn-min-height)] p-3 rounded-2xl font-bold text-left flex items-center gap-3 border transition-all ${
                  isEliminatedByHint
                    ? 'opacity-25 bg-slate-900 border-slate-800 line-through cursor-not-allowed text-slate-500'
                    : isChosen
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/25 scale-[1.01]'
                    : isLocked
                    ? 'bg-slate-900/80 text-slate-400 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700/80 active:scale-98 shadow-md'
                }`}
              >
                {/* Letter badge (A, B, C, D, E) */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-sm shrink-0 border ${
                    isChosen
                      ? 'bg-slate-950 text-amber-400 border-slate-800'
                      : 'bg-slate-800 text-amber-400 border-slate-700'
                  }`}
                >
                  {optionLetters[idx]}
                </div>

                <span className="text-[17px] leading-tight flex-1">
                  {optText}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Numeric estimate keypad */
        <div className="flex flex-col gap-2.5 my-auto">
          {/* Numeric Display */}
          <div className="w-full bg-slate-900/90 border-2 border-amber-500/50 rounded-2xl p-3 flex items-center justify-between text-white">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tahminin:
            </span>
            <div className="flex items-baseline gap-1.5 font-display font-black text-3xl text-amber-400">
              <span>{numericInput || '—'}</span>
              {question.unit && (
                <span className="text-sm font-sans font-bold text-slate-300">
                  {question.unit}
                </span>
              )}
            </div>
          </div>

          {/* Numeric keypad grid */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
              <button
                key={k}
                disabled={isLocked || isSpectator}
                onClick={() => handleNumericKey(k)}
                className={`py-3 rounded-xl font-display font-extrabold text-xl flex items-center justify-center border transition-all ${
                  k === 'C'
                    ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                    : k === '⌫'
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-900 text-white border-slate-700/80 active:bg-slate-800'
                } ${isLocked ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Confirm Button for Numeric */}
          {!isLocked && !isSpectator && (
            <button
              disabled={!numericInput.trim()}
              onClick={() => handleNumericSubmit()}
              className={`w-full py-3.5 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-transform ${
                numericInput.trim()
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-amber-500/25 active:scale-98'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <span>Tahmini Onayla</span>
            </button>
          )}
        </div>
      )}

      {/* Lock / Spectator Notice Footer */}
      <div className="mt-auto pt-2 text-center">
        {isSpectator ? (
          <div className="bg-rose-950/80 border border-rose-800/60 rounded-xl p-2.5 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5">
            <span>👁️</span>
            <span>İzleyici modundasın, cevap veremezsin.</span>
          </div>
        ) : isLocked ? (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-2.5 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse">
            <span>🔒</span>
            <span>Cevabın kilitlendi. Diğer oyuncular bekleniyor...</span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 font-medium">
            Hızlı cevap vermek sıralamada avantaj sağlar!
          </div>
        )}
      </div>
    </div>
  );
};

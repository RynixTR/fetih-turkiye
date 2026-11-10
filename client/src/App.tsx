// client/src/App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameStateView, Player, RoomSettings } from '../../shared/types.js';
import { Header } from './components/Header.js';
import { OpeningScreen } from './components/OpeningScreen.js';
import { LobbyScreen } from './components/LobbyScreen.js';
import { CountdownScreen } from './components/CountdownScreen.js';
import { QuestionScreen } from './components/QuestionScreen.js';
import { QuestionResultScreen } from './components/QuestionResultScreen.js';
import { TurnMoveScreen } from './components/TurnMoveScreen.js';
import { GameOverScreen } from './components/GameOverScreen.js';
import { ReactionOverlay } from './components/ReactionOverlay.js';
import { HowToPlayModal } from './components/HowToPlayModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { ConnectionModal } from './components/ConnectionModal.js';
import { EliminationModal } from './components/EliminationModal.js';
import { sound } from './components/AudioEngine.js';
import { haptic } from './components/Haptics.js';

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameStateView | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [roomCodeParam, setRoomCodeParam] = useState<string>('');

  // UI state
  const [isWakingUp, setIsWakingUp] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [kickedMessage, setKickedMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modals
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.enabled);
  const [eliminationModalData, setEliminationModalData] = useState<{
    isOpen: boolean;
    conquerorName?: string;
    rank?: number;
  }>({ isOpen: false });

  const sessionTokenRef = useRef<string | null>(null);
  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

  // Live Countdown Clocks (High-precision synchronized timers)
  const stageDeadlineRef = useRef<number>(0);
  const turnDeadlineRef = useRef<number>(0);
  const [liveStageTimeMs, setLiveStageTimeMs] = useState<number>(0);
  const [liveTurnTimeMs, setLiveTurnTimeMs] = useState<number>(0);

  // WakeLock reference so mobile phone screen doesn't turn off
  const wakeLockRef = useRef<any>(null);

  // Check URL query param for invite link (?oda=ABCD)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('oda') || urlParams.get('room') || '';
      if (code) {
        setRoomCodeParam(code.toUpperCase().trim());
      }
    }
  }, []);

  // Request WakeLock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          // Ignore if battery saver or permissions block
        }
      }
    };
    if (gameState?.stage && gameState.stage !== 'LOBBY' && gameState.stage !== 'GAME_OVER') {
      requestWakeLock();
    }
  }, [gameState?.stage]);

  // High-precision 50ms tick interval for real-time live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveStageTimeMs(Math.max(0, stageDeadlineRef.current - now));
      setLiveTurnTimeMs(Math.max(0, turnDeadlineRef.current - now));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Unlock Web Audio API on first user interaction (Mobile Safari & Chrome compliance)
  useEffect(() => {
    const handleFirstTouch = () => {
      sound.unlock();
    };
    window.addEventListener('pointerdown', handleFirstTouch, { once: true });
    return () => window.removeEventListener('pointerdown', handleFirstTouch);
  }, []);

  // Check /health endpoint on start for cold-starts
  useEffect(() => {
    let active = true;
    const checkServerHealth = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 2500));
        await Promise.race([fetch('/health'), timeoutPromise]);
      } catch (e) {
        if (active) {
          setIsWakingUp(true);
          // Poll until server responds
          const poll = setInterval(async () => {
            try {
              const res = await fetch('/health');
              if (res.ok) {
                setIsWakingUp(false);
                clearInterval(poll);
              }
            } catch (err) {}
          }, 2000);
        }
      }
    };
    checkServerHealth();
    return () => { active = false; };
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsReconnecting(false);

      // Ping for RTT latency measurement
      newSocket.emit('ping_rtt', { clientTimestamp: Date.now() });

      // If we have an existing sessionToken and roomCode, auto-reconnect!
      const savedToken = localStorage.getItem('fetih_session_token');
      const savedRoom = localStorage.getItem('fetih_current_room');
      const savedName = localStorage.getItem('fetih_player_name');

      if (savedToken && savedRoom && savedName && !gameState) {
        newSocket.emit('join_room', {
          roomCode: savedRoom,
          name: savedName,
          sessionToken: savedToken
        }, (res: any) => {
          if (res?.success) {
            setGameState(res.state);
            setSessionToken(res.sessionToken);
          }
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      if (gameState?.stage && gameState.stage !== 'LOBBY') {
        setIsReconnecting(true);
      }
    });

    newSocket.on('game_state', (state: GameStateView) => {
      setGameState(state);
      setIsLoading(false);
      setErrorMessage('');

      const now = Date.now();
      const serverOffset = state.serverTime ? (now - state.serverTime) : 0;
      stageDeadlineRef.current = state.stageDeadline
        ? (state.stageDeadline + serverOffset)
        : (now + (state.stageTimeRemainingMs || 0));
      turnDeadlineRef.current = state.turnDeadline
        ? (state.turnDeadline + serverOffset)
        : (now + (state.turnTimeRemainingMs || 0));

      setLiveStageTimeMs(Math.max(0, stageDeadlineRef.current - now));
      setLiveTurnTimeMs(Math.max(0, turnDeadlineRef.current - now));
    });

    newSocket.on('kicked', data => {
      setKickedMessage(data?.message || 'Odadan atıldınız.');
      setGameState(null);
      localStorage.removeItem('fetih_session_token');
      localStorage.removeItem('fetih_current_room');
    });

    newSocket.on('player_eliminated', data => {
      sound.playElimination();
      haptic.elimination();
      if (data?.eliminatedPlayerId && data.eliminatedPlayerId === sessionTokenRef.current) {
        setEliminationModalData({
          isOpen: true,
          conquerorName: data.conquerorPlayerName,
          rank: data.eliminatedRank
        });
      }
    });

    newSocket.on('doomsday_alert', data => {
      sound.playDoomsday();
      haptic.capitalHit();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle Join or Create Room
  const handleJoinOrCreate = useCallback((name: string, targetRoomCode?: string) => {
    if (!socket) return;
    setIsLoading(true);
    setErrorMessage('');

    socket.emit('join_room', {
      roomCode: targetRoomCode,
      name,
      sessionToken
    }, (res: any) => {
      setIsLoading(false);
      if (!res?.success) {
        setErrorMessage(res?.error || 'Odaya katılırken bir hata oluştu.');
        haptic.incorrect();
      } else {
        setGameState(res.state);
        setSessionToken(res.sessionToken);
        localStorage.setItem('fetih_session_token', res.sessionToken);
        localStorage.setItem('fetih_current_room', res.roomCode);
        haptic.correct();
      }
    });
  }, [socket, sessionToken]);

  // Host Actions
  const handleUpdateSettings = useCallback((newSettings: Partial<RoomSettings>) => {
    socket?.emit('update_settings', { settings: newSettings });
  }, [socket]);

  const handleStartGame = useCallback(() => {
    socket?.emit('start_game', {}, (res: any) => {
      if (!res?.success) {
        setErrorMessage(res?.error || 'Oyun başlatılamadı.');
      }
    });
  }, [socket]);

  const handleKickPlayer = useCallback((targetToken: string) => {
    socket?.emit('kick_player', { targetSessionToken: targetToken });
  }, [socket]);

  const handleRestartGame = useCallback(() => {
    socket?.emit('restart_game');
  }, [socket]);

  // Player Actions
  const handleSubmitAnswer = useCallback((answer: number) => {
    socket?.emit('submit_answer', {
      answer,
      clientTimestamp: Date.now()
    });
  }, [socket]);

  const handleUseHint = useCallback(() => {
    socket?.emit('use_hint');
  }, [socket]);

  const handleSelectCapital = useCallback((pieceId: string) => {
    socket?.emit('select_capital', { pieceId });
  }, [socket]);

  const handleExecuteMove = useCallback((targetPieceId: string) => {
    socket?.emit('execute_move', { targetPieceId });
  }, [socket]);

  const handleSendReaction = useCallback((emoji: string) => {
    socket?.emit('send_reaction', { emoji });
  }, [socket]);

  const handleToggleSound = useCallback(() => {
    const res = sound.toggle();
    setSoundEnabled(res);
  }, []);

  const handleResetToHome = useCallback(() => {
    setKickedMessage('');
    setGameState(null);
    localStorage.removeItem('fetih_session_token');
    localStorage.removeItem('fetih_current_room');
  }, []);

  const myPlayer = gameState?.players.find(p => p.id === gameState.myPlayerId) || null;

  return (
    <div className="app-viewport-wrapper">
      {/* Desktop Helper Card (Visible only on wider screens) */}
      <aside className="desktop-side-banner">
        <div className="text-3xl mb-2">📱</div>
        <h4 className="font-display font-black text-lg text-amber-400 uppercase tracking-wider">
          Fetih Türkiye
        </h4>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Bu oyun <strong>mobil telefonlar</strong> için tasarlanmıştır. En iyi dokunmatik deneyim için telefondan oynayınız.
        </p>
        {gameState?.roomCode && (
          <div className="mt-3 p-2 bg-slate-900 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400 block text-[10px]">ODA KODU</span>
            <strong className="text-amber-400 font-mono text-base">{gameState.roomCode}</strong>
          </div>
        )}
      </aside>

      {/* Main Mobile App Frame (Max 440px width, 100dvh) */}
      <main className={`mobile-phone-frame ${gameState?.isDoomsdayActive ? 'doomsday-active-vignette' : ''}`}>
        {/* Top Header if in room */}
        {gameState && (
          <Header
            roomCode={gameState.roomCode}
            stage={gameState.stage}
            roundNumber={gameState.roundNumber}
            players={gameState.players}
            myPlayer={myPlayer}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
            onLeaveGame={handleResetToHome}
            isDoomsday={gameState.isDoomsdayActive}
          />
        )}

        {/* Screen Controller */}
        {!gameState ? (
          <OpeningScreen
            initialRoomCode={roomCodeParam}
            onJoinOrCreate={handleJoinOrCreate}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : gameState.stage === 'LOBBY' ? (
          <LobbyScreen
            roomCode={gameState.roomCode}
            players={gameState.players}
            myPlayer={myPlayer}
            isHost={gameState.isHost}
            settings={gameState.settings}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
            onKickPlayer={handleKickPlayer}
            onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          />
        ) : gameState.stage === 'COUNTDOWN' ? (
          <CountdownScreen
            remainingMs={liveStageTimeMs}
            level={gameState.mapLevel}
            levelDescription={gameState.mapLevelDescription}
          />
        ) : gameState.stage === 'QUESTION' && gameState.question ? (
          <QuestionScreen
            question={gameState.question}
            stageTimeRemainingMs={liveStageTimeMs}
            myPlayer={myPlayer}
            onSubmitAnswer={handleSubmitAnswer}
            onUseHint={handleUseHint}
          />
        ) : gameState.stage === 'QUESTION_RESULT' && gameState.questionResult ? (
          <QuestionResultScreen
            result={gameState.questionResult}
            myPlayer={myPlayer}
            roundNumber={gameState.roundNumber}
            remainingMs={liveStageTimeMs}
          />
        ) : (gameState.stage === 'CAPITAL_SELECTION' || gameState.stage === 'TURN_MOVE' || gameState.stage === 'ROUND_SUMMARY') ? (
          <TurnMoveScreen
            stage={gameState.stage}
            level={gameState.mapLevel}
            pieces={gameState.pieces}
            adjacency={gameState.adjacency}
            activeTurnPlayerId={gameState.activeTurnPlayerId}
            turnTimeRemainingMs={liveTurnTimeMs}
            players={gameState.players}
            myPlayer={myPlayer}
            onSelectCapital={handleSelectCapital}
            onExecuteMove={handleExecuteMove}
          />
        ) : gameState.stage === 'GAME_OVER' ? (
          <GameOverScreen
            winner={gameState.winner}
            finalPlacements={gameState.finalPlacements}
            myPlayer={myPlayer}
            isHost={gameState.isHost}
            onRestartGame={handleRestartGame}
            pieces={gameState.pieces}
          />
        ) : null}

        {/* Floating Reactions Bar & Overlay */}
        {gameState && gameState.stage !== 'GAME_OVER' && (
          <ReactionOverlay
            reactions={gameState.activeReactions}
            onSendReaction={handleSendReaction}
          />
        )}

        {/* Modals */}
        <HowToPlayModal
          isOpen={isHowToPlayOpen}
          onClose={() => setIsHowToPlayOpen(false)}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />

        <ConnectionModal
          isWakingUp={isWakingUp}
          isReconnecting={isReconnecting}
          kickedMessage={kickedMessage}
          onReset={handleResetToHome}
        />

        <EliminationModal
          isOpen={eliminationModalData.isOpen}
          conquerorName={eliminationModalData.conquerorName}
          eliminatedRank={eliminationModalData.rank}
          onClose={() => setEliminationModalData(prev => ({ ...prev, isOpen: false }))}
          onLeaveGame={handleResetToHome}
        />
      </main>
    </div>
  );
};

// server/src/GameRoom.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  GameStage,
  GameStateView,
  RoomSettings,
  Player,
  PlayerRankingEntry,
  MapPieceState,
  QuestionClientView,
  QuestionResultView
} from '../../shared/types.js';
import {
  TIMERS,
  GAME_LENGTH_CONFIG,
  PLAYER_PALETTE,
  REACTION_EMOJIS,
  validatePlayerName
} from '../../shared/constants.js';
import { QuestionManager, RawQuestion } from './QuestionManager.js';
import { MapEngine } from './MapEngine.js';

export class GameRoom {
  public readonly code: string;
  private io: SocketIOServer;
  private questionManager: QuestionManager;
  private mapEngine: MapEngine;

  // Room state
  public stage: GameStage = 'LOBBY';
  public roundNumber: number = 0;
  public mapLevel: 1 | 2 | 3 | 4 = 1;
  public mapLevelDescription: string = '';
  public settings: RoomSettings = {
    gameLength: 'normal',
    difficulty: 'normal',
    soundEffects: true
  };

  public players: Map<string, Player> = new Map(); // sessionToken -> Player
  public socketMap: Map<string, string> = new Map(); // socket.id -> sessionToken
  public kickedTokens: Set<string> = new Set();
  public disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  // Active turn & round state
  public currentQuestion: RawQuestion | null = null;
  public currentRanking: PlayerRankingEntry[] = [];
  public pieces: Record<string, MapPieceState> = {};
  public adjacency: Record<string, string[]> = {};
  public shieldedPieceIds: string[] = [];

  public activeTurnPlayerId: string | null = null;
  public turnQueue: string[] = [];
  public turnIndex: number = 0;

  // Timers & intervals
  private stageTimer: NodeJS.Timeout | null = null;
  private stageDeadline: number = 0;
  private turnTimer: NodeJS.Timeout | null = null;
  private turnDeadline: number = 0;

  // Game clock & Doomsday
  public gameStartedAt: number | null = null;
  public isDoomsdayActive: boolean = false;
  public doomsdayStartedAtRound: number | null = null;

  // Winner & End stats
  public winner: Player | null = null;
  public finalPlacements: Player[] = [];
  private eliminationOrderCounter: number = 1;

  // Floating reactions
  public reactions: Array<{
    id: string;
    emoji: string;
    senderName: string;
    senderColor: string;
    timestamp: number;
  }> = [];

  constructor(
    code: string,
    io: SocketIOServer,
    questionManager: QuestionManager,
    mapEngine: MapEngine
  ) {
    this.code = code;
    this.io = io;
    this.questionManager = questionManager;
    this.mapEngine = mapEngine;
  }

  // ==========================================
  // PLAYER CONNECTION & LOBBY MANAGEMENT
  // ==========================================

  public join(
    socket: Socket,
    name: string,
    existingSessionToken?: string
  ): { success: boolean; error?: string; sessionToken?: string } {
    // Check if kicked
    if (existingSessionToken && this.kickedTokens.has(existingSessionToken)) {
      return { success: false, error: 'Bu odadan yönetici tarafından çıkarıldınız.' };
    }

    // Check reconnection
    if (existingSessionToken && this.players.has(existingSessionToken)) {
      const existingPlayer = this.players.get(existingSessionToken)!;
      this.socketMap.set(socket.id, existingSessionToken);
      existingPlayer.isConnected = true;
      existingPlayer.disconnectedAt = null;

      // Cancel disconnect timer if active
      if (this.disconnectTimers.has(existingSessionToken)) {
        clearTimeout(this.disconnectTimers.get(existingSessionToken)!);
        this.disconnectTimers.delete(existingSessionToken);
        console.log(`[GameRoom ${this.code}] Player ${existingPlayer.name} reconnected in time.`);
      }

      socket.join(this.code);
      this.broadcastState();
      return { success: true, sessionToken: existingSessionToken };
    }

    // Validate new player name
    const val = validatePlayerName(name);
    if (!val.valid) {
      return { success: false, error: val.error };
    }
    const sanitizedName = val.sanitized!;

    // Check duplicate name
    for (const p of this.players.values()) {
      if (p.name.toLocaleLowerCase('tr-TR') === sanitizedName.toLocaleLowerCase('tr-TR')) {
        return { success: false, error: 'Bu isim odada kullanılıyor.' };
      }
    }

    // Room capacity check (max 10 players)
    if (this.players.size >= 10) {
      return { success: false, error: 'Oda dolu (Maksimum 10 oyuncu).' };
    }

    const sessionToken = existingSessionToken || `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const isFirstPlayer = this.players.size === 0;

    // Assign color and colorblind symbol
    const assignedPalette = PLAYER_PALETTE[this.players.size % PLAYER_PALETTE.length];

    const isLateJoiner = this.stage !== 'LOBBY';

    const newPlayer: Player = {
      id: sessionToken,
      sessionToken,
      name: sanitizedName,
      color: assignedPalette.color,
      symbol: assignedPalette.symbol,
      symbolName: assignedPalette.symbolName,
      isHost: isFirstPlayer,
      isAlive: !isLateJoiner,
      isSpectator: isLateJoiner,
      eliminatedOrder: null,
      capitalPieceId: null,
      capitalHp: GAME_LENGTH_CONFIG[this.settings.gameLength].capitalHp,
      maxCapitalHp: GAME_LENGTH_CONFIG[this.settings.gameLength].capitalHp,
      territories: [],
      hintAvailable: false,
      hintUsedInGame: false,
      lastAnswer: null,
      hasAnsweredCurrentQuestion: false,
      stats: {
        territoriesTaken: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        totalResponseTimeMs: 0,
        capitalHits: 0,
        survivedRounds: 0
      },
      isConnected: true,
      disconnectedAt: null
    };

    this.players.set(sessionToken, newPlayer);
    this.socketMap.set(socket.id, sessionToken);
    socket.join(this.code);

    console.log(`[GameRoom ${this.code}] ${sanitizedName} joined (isHost: ${isFirstPlayer}, spectator: ${isLateJoiner})`);
    this.broadcastState();

    return { success: true, sessionToken };
  }

  public handleDisconnect(socketId: string) {
    const sessionToken = this.socketMap.get(socketId);
    if (!sessionToken) return;

    this.socketMap.delete(socketId);
    const player = this.players.get(sessionToken);
    if (!player) return;

    player.isConnected = false;
    player.disconnectedAt = Date.now();
    console.log(`[GameRoom ${this.code}] ${player.name} disconnected. Starting 20s grace period.`);

    // If game is in progress and player is alive, give 20 seconds grace period
    if (this.stage !== 'LOBBY' && player.isAlive && !player.isSpectator) {
      const timer = setTimeout(() => {
        this.handlePlayerTimeout(sessionToken);
      }, TIMERS.DISCONNECT_GRACE_SECONDS * 1000);
      this.disconnectTimers.set(sessionToken, timer);
    }

    // Host transfer rule: If host disconnects, transfer to longest standing connected player
    if (player.isHost) {
      this.transferHost();
    }

    this.broadcastState();
  }

  private transferHost() {
    let nextHost: Player | null = null;
    for (const p of this.players.values()) {
      if (p.isConnected) {
        nextHost = p;
        break;
      }
    }
    if (nextHost) {
      for (const p of this.players.values()) {
        p.isHost = false;
      }
      nextHost.isHost = true;
      console.log(`[GameRoom ${this.code}] Host transferred to ${nextHost.name}`);
      this.io.to(this.code).emit('notification', {
        message: `${nextHost.name} artık odanın yöneticisi.`
      });
    }
  }

  private handlePlayerTimeout(sessionToken: string) {
    const player = this.players.get(sessionToken);
    if (!player || player.isConnected) return;

    console.log(`[GameRoom ${this.code}] Disconnect timeout expired for ${player.name}. Eliminating.`);
    this.mapEngine.handlePlayerDisconnectTimeout(this.pieces, player);

    // If it was currently their turn, auto-skip or auto-advance
    if (this.activeTurnPlayerId === sessionToken) {
      this.advanceTurn();
    }

    this.checkWinCondition();
    this.broadcastState();
  }

  private advanceTurn() {
    this.clearTurnTimer();
    this.turnIndex++;
    if (this.stage === 'CAPITAL_SELECTION') {
      this.startCapitalSelectionTurn();
    } else if (this.stage === 'TURN_MOVE') {
      this.startPlayerMoveTurn();
    }
  }

  public kickPlayer(hostSocketId: string, targetSessionToken: string): boolean {
    const hostToken = this.socketMap.get(hostSocketId);
    const host = hostToken ? this.players.get(hostToken) : null;
    if (!host || !host.isHost) return false;

    const target = this.players.get(targetSessionToken);
    if (!target || target.isHost) return false;

    this.kickedTokens.add(targetSessionToken);
    this.players.delete(targetSessionToken);

    // Find target's socket and kick
    for (const [sockId, tkn] of this.socketMap.entries()) {
      if (tkn === targetSessionToken) {
        const targetSock = this.io.sockets.sockets.get(sockId);
        if (targetSock) {
          targetSock.emit('kicked', { message: 'Yönetici tarafından odadan atıldınız.' });
          targetSock.leave(this.code);
        }
        this.socketMap.delete(sockId);
      }
    }

    this.broadcastState();
    return true;
  }

  public updateSettings(hostSocketId: string, newSettings: Partial<RoomSettings>): boolean {
    const hostToken = this.socketMap.get(hostSocketId);
    const host = hostToken ? this.players.get(hostToken) : null;
    if (!host || !host.isHost || this.stage !== 'LOBBY') return false;

    if (newSettings.gameLength) this.settings.gameLength = newSettings.gameLength;
    if (newSettings.difficulty) this.settings.difficulty = newSettings.difficulty;
    if (typeof newSettings.soundEffects === 'boolean') this.settings.soundEffects = newSettings.soundEffects;

    this.broadcastState();
    return true;
  }

  // ==========================================
  // GAME LIFECYCLE & STATE MACHINE
  // ==========================================

  public startGame(hostSocketId: string): { success: boolean; error?: string } {
    const hostToken = this.socketMap.get(hostSocketId);
    const host = hostToken ? this.players.get(hostToken) : null;
    if (!host || !host.isHost) {
      return { success: false, error: 'Sadece yönetici oyunu başlatabilir.' };
    }

    const aliveCount = Array.from(this.players.values()).filter(p => p.isConnected).length;
    if (aliveCount < 2) {
      return { success: false, error: 'En az 2 oyuncu gerekli.' };
    }

    console.log(`[GameRoom ${this.code}] Starting game with ${aliveCount} players.`);

    // Choose map level based on connected player count
    this.mapLevel = this.mapEngine.getMapLevelForPlayerCount(aliveCount);
    const mapInit = this.mapEngine.initializeGamePieces(this.mapLevel);
    this.pieces = mapInit.pieces;
    this.adjacency = mapInit.adjacency;
    this.mapLevelDescription = mapInit.levelDescription;

    // Reset player HP and states
    const maxHp = GAME_LENGTH_CONFIG[this.settings.gameLength].capitalHp;
    for (const p of this.players.values()) {
      p.isAlive = p.isConnected;
      p.isSpectator = !p.isConnected;
      p.capitalHp = maxHp;
      p.maxCapitalHp = maxHp;
      p.territories = [];
      p.capitalPieceId = null;
      p.eliminatedOrder = null;
      p.hintAvailable = false;
      p.hintUsedInGame = false;
    }

    this.roundNumber = 0;
    this.gameStartedAt = Date.now();
    this.isDoomsdayActive = false;
    this.doomsdayStartedAtRound = null;
    this.eliminationOrderCounter = 1;
    this.winner = null;

    // Transition to COUNTDOWN
    this.transitionToCountdown();
    return { success: true };
  }

  private transitionToCountdown() {
    this.stage = 'COUNTDOWN';
    this.stageDeadline = Date.now() + TIMERS.COUNTDOWN_SECONDS * 1000;
    this.broadcastState();

    this.clearStageTimer();
    this.stageTimer = setTimeout(() => {
      this.startNextRound();
    }, TIMERS.COUNTDOWN_SECONDS * 1000);
  }

  private startNextRound() {
    this.roundNumber++;
    console.log(`[GameRoom ${this.code}] Starting Round ${this.roundNumber}`);

    // Check catch-up hint balancing (Prompt Section 3-H):
    // "En az parçaya sahip hayatta oyuncuya soru aşamasında bir kez ipucu hakkı verilir (yanlış 2 şıkkı eler).
    // Hak oyun başına bir oyuncuya en fazla 1 kez ve sadece Tur 4'ten sonra verilir."
    if (this.roundNumber >= 4) {
      const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isSpectator);
      if (alivePlayers.length > 0) {
        const minTerritories = Math.min(...alivePlayers.map(p => p.territories.length));
        for (const p of alivePlayers) {
          if (p.territories.length === minTerritories && !p.hintUsedInGame) {
            p.hintAvailable = true;
          }
        }
      }
    }

    // Get question
    this.currentQuestion = this.questionManager.getNextQuestion(
      this.code,
      this.roundNumber,
      this.settings.difficulty
    );

    // Reset answer states
    for (const p of this.players.values()) {
      p.hasAnsweredCurrentQuestion = false;
      p.lastAnswer = null;
      p.eliminatedOptions = undefined;
    }

    this.stage = 'QUESTION';
    const timeLimitSec = this.currentQuestion.timeLimit || TIMERS.QUESTION_DEFAULT_SECONDS;
    this.stageDeadline = Date.now() + timeLimitSec * 1000;

    this.broadcastState();

    this.clearStageTimer();
    this.stageTimer = setTimeout(() => {
      this.closeQuestionPhase();
    }, timeLimitSec * 1000);
  }

  public submitAnswer(
    socketId: string,
    answer: number,
    clientSendTimestamp?: number
  ): boolean {
    if (this.stage !== 'QUESTION' || !this.currentQuestion) return false;

    const sessionToken = this.socketMap.get(socketId);
    if (!sessionToken) return false;

    const player = this.players.get(sessionToken);
    if (!player || !player.isAlive || player.isSpectator || player.hasAnsweredCurrentQuestion) {
      return false;
    }

    // Latency compensation: calculate response time relative to question start
    const now = Date.now();
    const questionStartTime = this.stageDeadline - (this.currentQuestion.timeLimit * 1000);
    const rawElapsed = now - questionStartTime;
    const responseTimeMs = Math.max(100, Math.min(this.currentQuestion.timeLimit * 1000, rawElapsed));

    const evalResult = this.questionManager.evaluateAnswer(this.currentQuestion, answer);

    player.hasAnsweredCurrentQuestion = true;
    player.lastAnswer = {
      answer,
      submittedAt: now,
      responseTimeMs,
      isCorrect: evalResult.isCorrect,
      numericDiff: evalResult.numericDiff
    };

    player.stats.totalQuestions++;
    player.stats.totalResponseTimeMs += responseTimeMs;
    if (evalResult.isCorrect) {
      player.stats.correctAnswers++;
    }

    // Notify submitting player that answer was locked
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('answer_received', {
        responseTimeMs,
        message: 'Cevabın alındı, diğerleri bekleniyor...'
      });
    }

    this.broadcastState();

    // Check if ALL alive connected players have answered
    const aliveConnected = Array.from(this.players.values()).filter(p => p.isAlive && !p.isSpectator && p.isConnected);
    const allAnswered = aliveConnected.every(p => p.hasAnsweredCurrentQuestion);

    if (allAnswered) {
      console.log(`[GameRoom ${this.code}] All alive players answered early. Closing question phase.`);
      this.clearStageTimer();
      this.closeQuestionPhase();
    }

    return true;
  }

  public useHint(socketId: string): { success: boolean; eliminatedIndexes?: number[] } {
    if (this.stage !== 'QUESTION' || !this.currentQuestion || this.currentQuestion.type !== 'multiple_choice') {
      return { success: false };
    }
    const sessionToken = this.socketMap.get(socketId);
    const player = sessionToken ? this.players.get(sessionToken) : null;
    if (!player || !player.hintAvailable || player.hintUsedInGame) {
      return { success: false };
    }

    // 50/50: Eliminate 2 wrong options
    const correctIdx = this.currentQuestion.correctIndex ?? 0;
    const wrongIndexes = [0, 1, 2, 3, 4].filter(i => i !== correctIdx);
    // Pick 2 random wrong
    wrongIndexes.sort(() => Math.random() - 0.5);
    const eliminated = wrongIndexes.slice(0, 2);

    player.hintAvailable = false;
    player.hintUsedInGame = true;
    player.eliminatedOptions = eliminated;

    return { success: true, eliminatedIndexes: eliminated };
  }

  private closeQuestionPhase() {
    if (!this.currentQuestion) return;

    // Compute ranking
    this.currentRanking = this.questionManager.computeRanking(
      this.currentQuestion,
      Array.from(this.players.values())
    );

    this.stage = 'QUESTION_RESULT';
    this.stageDeadline = Date.now() + TIMERS.QUESTION_RESULT_SECONDS * 1000;
    this.broadcastState();

    this.clearStageTimer();
    this.stageTimer = setTimeout(() => {
      this.startMovesOrCapitalSelection();
    }, TIMERS.QUESTION_RESULT_SECONDS * 1000);
  }

  private startMovesOrCapitalSelection() {
    // Round 1: Capital selection
    if (this.roundNumber === 1 && !this.allCapitalsSelected()) {
      this.stage = 'CAPITAL_SELECTION';
      // Turn queue is ranking order
      this.turnQueue = this.currentRanking.map(r => r.playerId).filter(id => {
        const p = this.players.get(id);
        return p && p.isAlive && !p.isSpectator;
      });
      this.turnIndex = 0;
      this.startCapitalSelectionTurn();
    } else {
      // Normal turn moves
      this.stage = 'TURN_MOVE';
      this.turnQueue = this.currentRanking.map(r => r.playerId).filter(id => {
        const p = this.players.get(id);
        return p && p.isAlive && !p.isSpectator;
      });
      this.turnIndex = 0;
      this.startPlayerMoveTurn();
    }
  }

  private allCapitalsSelected(): boolean {
    const alive = Array.from(this.players.values()).filter(p => p.isAlive && !p.isSpectator);
    return alive.every(p => p.capitalPieceId !== null);
  }

  // ==========================================
  // CAPITAL SELECTION (ROUND 1 ONLY)
  // ==========================================

  private startCapitalSelectionTurn() {
    if (this.turnIndex >= this.turnQueue.length) {
      // All capital selections finished, now start round 1 moves!
      this.stage = 'TURN_MOVE';
      this.turnIndex = 0;
      this.startPlayerMoveTurn();
      return;
    }

    const playerId = this.turnQueue[this.turnIndex];
    this.activeTurnPlayerId = playerId;
    this.turnDeadline = Date.now() + TIMERS.CAPITAL_SELECTION_SECONDS * 1000;

    console.log(`[GameRoom ${this.code}] Capital selection turn: ${playerId}`);
    this.broadcastState();

    this.clearTurnTimer();
    this.turnTimer = setTimeout(() => {
      this.autoSelectCapital(playerId);
    }, TIMERS.CAPITAL_SELECTION_SECONDS * 1000);
  }

  public selectCapital(socketId: string, pieceId: string): boolean {
    if (this.stage !== 'CAPITAL_SELECTION') return false;
    const sessionToken = this.socketMap.get(socketId);
    if (!sessionToken || sessionToken !== this.activeTurnPlayerId) return false;

    const player = this.players.get(sessionToken);
    if (!player) return false;

    const maxHp = GAME_LENGTH_CONFIG[this.settings.gameLength].capitalHp;
    const success = this.mapEngine.setCapital(this.pieces, pieceId, player, maxHp);
    if (!success) return false;

    console.log(`[GameRoom ${this.code}] ${player.name} selected capital: ${pieceId}`);
    this.clearTurnTimer();
    this.turnIndex++;
    this.startCapitalSelectionTurn();
    return true;
  }

  private autoSelectCapital(playerId: string) {
    const player = this.players.get(playerId);
    if (!player || player.capitalPieceId !== null) {
      this.turnIndex++;
      this.startCapitalSelectionTurn();
      return;
    }

    // Pick a random unowned piece
    const unownedPieces = Object.keys(this.pieces).filter(id => this.pieces[id].ownerId === null);
    if (unownedPieces.length > 0) {
      const chosen = unownedPieces[Math.floor(Math.random() * unownedPieces.length)];
      const maxHp = GAME_LENGTH_CONFIG[this.settings.gameLength].capitalHp;
      this.mapEngine.setCapital(this.pieces, chosen, player, maxHp);
      console.log(`[GameRoom ${this.code}] Auto-selected capital ${chosen} for ${player.name}`);
    }

    this.turnIndex++;
    this.startCapitalSelectionTurn();
  }

  // ==========================================
  // TURN MOVES (IN RANKING ORDER)
  // ==========================================

  private startPlayerMoveTurn() {
    if (this.turnIndex >= this.turnQueue.length) {
      this.finishRoundSummary();
      return;
    }

    const playerId = this.turnQueue[this.turnIndex];
    const player = this.players.get(playerId);

    if (!player || !player.isAlive || player.isSpectator) {
      this.turnIndex++;
      this.startPlayerMoveTurn();
      return;
    }

    this.activeTurnPlayerId = playerId;
    this.turnDeadline = Date.now() + TIMERS.TURN_MOVE_SECONDS * 1000;

    console.log(`[GameRoom ${this.code}] Move turn for ${player.name}`);
    this.broadcastState();

    this.clearTurnTimer();
    this.turnTimer = setTimeout(() => {
      this.autoExecuteMove(playerId);
    }, TIMERS.TURN_MOVE_SECONDS * 1000);
  }

  public executeMove(socketId: string, targetPieceId: string): boolean {
    if (this.stage !== 'TURN_MOVE') return false;
    const sessionToken = this.socketMap.get(socketId);
    if (!sessionToken || sessionToken !== this.activeTurnPlayerId) return false;

    const player = this.players.get(sessionToken);
    if (!player) return false;

    // Verify legal moves
    const legalMoves = this.mapEngine.getLegalMovesForPlayer(
      this.pieces,
      this.adjacency,
      player,
      Array.from(this.players.values())
    );

    if (!legalMoves.includes(targetPieceId)) {
      console.warn(`[GameRoom ${this.code}] Illegal move attempted by ${player.name} to ${targetPieceId}`);
      return false;
    }

    const res = this.mapEngine.executeMove(
      this.pieces,
      player,
      targetPieceId,
      Array.from(this.players.values())
    );

    if (!res.success) return false;

    console.log(`[GameRoom ${this.code}] ${player.name} moved to ${targetPieceId} (type: ${res.type})`);

    // Handle elimination if happened
    if (res.eliminatedPlayer) {
      this.handlePlayerElimination(res.eliminatedPlayer, player);
    }

    this.clearTurnTimer();

    // Check immediate win
    if (this.checkWinCondition()) {
      return true;
    }

    this.turnIndex++;
    this.startPlayerMoveTurn();
    return true;
  }

  private autoExecuteMove(playerId: string) {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) {
      this.turnIndex++;
      this.startPlayerMoveTurn();
      return;
    }

    const legalMoves = this.mapEngine.getLegalMovesForPlayer(
      this.pieces,
      this.adjacency,
      player,
      Array.from(this.players.values())
    );

    if (legalMoves.length > 0) {
      const chosen = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      const res = this.mapEngine.executeMove(
        this.pieces,
        player,
        chosen,
        Array.from(this.players.values())
      );
      console.log(`[GameRoom ${this.code}] Auto-move executed for ${player.name} -> ${chosen}`);
      if (res.eliminatedPlayer) {
        this.handlePlayerElimination(res.eliminatedPlayer, player);
      }
    }

    if (this.checkWinCondition()) {
      return;
    }

    this.turnIndex++;
    this.startPlayerMoveTurn();
  }

  private handlePlayerElimination(eliminated: Player, conqueror: Player) {
    eliminated.isAlive = false;
    eliminated.isSpectator = true;
    eliminated.eliminatedOrder = this.eliminationOrderCounter++;

    console.log(`[GameRoom ${this.code}] ${eliminated.name} ELIMINATED by ${conqueror.name}! Rank: ${eliminated.eliminatedOrder}`);

    this.io.to(this.code).emit('player_eliminated', {
      eliminatedPlayerId: eliminated.id,
      eliminatedPlayerName: eliminated.name,
      conquerorPlayerId: conqueror.id,
      conquerorPlayerName: conqueror.name
    });
  }

  // ==========================================
  // ROUND SUMMARY, DOOMSDAY & WIN CONDITION
  // ==========================================

  private finishRoundSummary() {
    this.stage = 'ROUND_SUMMARY';
    this.activeTurnPlayerId = null;

    // Check survived rounds for all alive players
    for (const p of this.players.values()) {
      if (p.isAlive && !p.isSpectator) {
        p.stats.survivedRounds++;
      }
    }

    // Check Win Condition first
    if (this.checkWinCondition()) {
      return;
    }

    // Check Doomsday threshold (Prompt Section 3-G):
    // "Oyun, yönetici ayarına göre belirli süreyi (10 / 14 / 18 dakika) geçince 'KIYAMET' başlar.
    // Bundan sonra her turun sonunda hayatta olan TÜM başkentler 1 can kaybeder."
    const elapsedSeconds = this.gameStartedAt ? (Date.now() - this.gameStartedAt) / 1000 : 0;
    const doomsdayThreshold = GAME_LENGTH_CONFIG[this.settings.gameLength].doomsdaySeconds;

    if (elapsedSeconds >= doomsdayThreshold) {
      if (!this.isDoomsdayActive) {
        this.isDoomsdayActive = true;
        this.doomsdayStartedAtRound = this.roundNumber;
        console.log(`[GameRoom ${this.code}] KIYAMET (DOOMSDAY) BAŞLADI!`);
        this.io.to(this.code).emit('doomsday_alert', {
          message: 'KIYAMET BAŞLADI: Her turun sonunda tüm başkentler 1 can kaybeder!'
        });
      }

      // Every round end, all alive capitals lose 1 HP!
      const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isSpectator);
      const fallenPlayers: Player[] = [];

      for (const p of alivePlayers) {
        if (p.capitalPieceId && this.pieces[p.capitalPieceId]) {
          const capPiece = this.pieces[p.capitalPieceId];
          capPiece.capitalHp = Math.max(0, capPiece.capitalHp - 1);
          p.capitalHp = capPiece.capitalHp;

          if (capPiece.capitalHp === 0) {
            fallenPlayers.push(p);
          }
        }
      }

      // Check simultaneous capital death tiebreaker (Prompt Section 3-G):
      // "Aynı anda herkesin başkenti bitecek olursa, o anda en çok parçaya sahip oyuncu
      // (eşitlikte en çok doğru cevap veren) hayatta kalır ve kazanır."
      if (fallenPlayers.length === alivePlayers.length && alivePlayers.length > 1) {
        // Tiebreaker
        alivePlayers.sort((a, b) => {
          const terrDiff = b.territories.length - a.territories.length;
          if (terrDiff !== 0) return terrDiff;
          return b.stats.correctAnswers - a.stats.correctAnswers;
        });
        const tieWinner = alivePlayers[0];
        console.log(`[GameRoom ${this.code}] Simultaneous Doomsday death. Winner by tiebreaker: ${tieWinner.name}`);
        this.declareWinner(tieWinner);
        return;
      } else {
        // Individual fallen players from doomsday
        for (const fallen of fallenPlayers) {
          fallen.isAlive = false;
          fallen.isSpectator = true;
          fallen.eliminatedOrder = this.eliminationOrderCounter++;
        }
      }
    }

    // Check Win Condition again after Doomsday damage
    if (this.checkWinCondition()) {
      return;
    }

    // Clear shields for the next round
    this.mapEngine.clearShields(this.pieces);

    this.broadcastState();

    // 4 seconds summary pause before next question
    this.clearStageTimer();
    this.stageTimer = setTimeout(() => {
      this.startNextRound();
    }, 4000);
  }

  public checkWinCondition(): boolean {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isSpectator);

    if (alivePlayers.length === 1) {
      this.declareWinner(alivePlayers[0]);
      return true;
    } else if (alivePlayers.length === 0) {
      // Rare edge case: no one alive (pick player with most territories)
      const allSorted = Array.from(this.players.values()).sort((a, b) => b.territories.length - a.territories.length);
      if (allSorted.length > 0) {
        this.declareWinner(allSorted[0]);
        return true;
      }
    }
    return false;
  }

  private declareWinner(winner: Player) {
    this.stage = 'GAME_OVER';
    this.winner = winner;
    this.activeTurnPlayerId = null;
    this.clearStageTimer();
    this.clearTurnTimer();

    // Order final placements: 1st winner, then reverse elimination order (last eliminated = 2nd)
    const others = Array.from(this.players.values())
      .filter(p => p.id !== winner.id)
      .sort((a, b) => (b.eliminatedOrder ?? 0) - (a.eliminatedOrder ?? 0));

    this.finalPlacements = [winner, ...others];

    console.log(`[GameRoom ${this.code}] GAME OVER! Winner: ${winner.name}`);
    this.broadcastState();
  }

  public restartGame(hostSocketId: string): boolean {
    const hostToken = this.socketMap.get(hostSocketId);
    const host = hostToken ? this.players.get(hostToken) : null;
    if (!host || !host.isHost || this.stage !== 'GAME_OVER') return false;

    console.log(`[GameRoom ${this.code}] Restarting game back to LOBBY.`);
    this.stage = 'LOBBY';
    this.roundNumber = 0;
    this.currentQuestion = null;
    this.currentRanking = [];
    this.pieces = {};
    this.winner = null;
    this.finalPlacements = [];
    this.isDoomsdayActive = false;
    this.gameStartedAt = null;

    // Reset all players to alive and ready for next game
    const maxHp = GAME_LENGTH_CONFIG[this.settings.gameLength].capitalHp;
    for (const p of this.players.values()) {
      p.isAlive = true;
      p.isSpectator = false;
      p.eliminatedOrder = null;
      p.capitalPieceId = null;
      p.capitalHp = maxHp;
      p.maxCapitalHp = maxHp;
      p.territories = [];
      p.hintAvailable = false;
      p.hintUsedInGame = false;
      p.lastAnswer = null;
      p.hasAnsweredCurrentQuestion = false;
    }

    this.broadcastState();
    return true;
  }

  // ==========================================
  // REACTIONS & BROADCASTING
  // ==========================================

  public sendReaction(socketId: string, emoji: string) {
    if (!REACTION_EMOJIS.includes(emoji)) return;
    const sessionToken = this.socketMap.get(socketId);
    const player = sessionToken ? this.players.get(sessionToken) : null;
    if (!player) return;

    const reactionItem = {
      id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      senderName: player.name,
      senderColor: player.color,
      timestamp: Date.now()
    };

    this.reactions.push(reactionItem);
    if (this.reactions.length > 20) {
      this.reactions.shift();
    }

    this.io.to(this.code).emit('reaction_received', reactionItem);
  }

  public getClientState(sessionToken: string): GameStateView {
    const player = this.players.get(sessionToken);
    const isHost = player ? player.isHost : false;

    let questionClient: QuestionClientView | null = null;
    if (this.stage === 'QUESTION' && this.currentQuestion) {
      questionClient = this.questionManager.toClientView(this.currentQuestion);
    }

    let questionResult: QuestionResultView | null = null;
    if ((this.stage === 'QUESTION_RESULT' || this.stage === 'CAPITAL_SELECTION' || this.stage === 'TURN_MOVE') && this.currentQuestion) {
      questionResult = this.questionManager.getResultView(this.currentQuestion, this.currentRanking);
    }

    const elapsedSeconds = this.gameStartedAt ? Math.floor((Date.now() - this.gameStartedAt) / 1000) : 0;

    return {
      roomCode: this.code,
      stage: this.stage,
      roundNumber: this.roundNumber,
      mapLevel: this.mapLevel,
      mapLevelDescription: this.mapLevelDescription,
      settings: this.settings,
      players: Array.from(this.players.values()),
      myPlayerId: sessionToken,
      isHost,
      activeTurnPlayerId: this.activeTurnPlayerId,
      turnTimeRemainingMs: Math.max(0, this.turnDeadline - Date.now()),
      stageTimeRemainingMs: Math.max(0, this.stageDeadline - Date.now()),
      question: questionClient,
      questionResult,
      pieces: this.pieces,
      adjacency: this.adjacency,
      shieldedPieceIds: Object.values(this.pieces).filter(p => p.isShielded).map(p => p.id),
      isDoomsdayActive: this.isDoomsdayActive,
      doomsdayStartedAtRound: this.doomsdayStartedAtRound,
      gameStartedAt: this.gameStartedAt,
      elapsedGameSeconds: elapsedSeconds,
      winner: this.winner,
      finalPlacements: this.finalPlacements,
      activeReactions: this.reactions.slice(-10)
    };
  }

  public broadcastState() {
    for (const [sockId, sessionToken] of this.socketMap.entries()) {
      const socket = this.io.sockets.sockets.get(sockId);
      if (socket) {
        socket.emit('game_state', this.getClientState(sessionToken));
      }
    }
  }

  private clearStageTimer() {
    if (this.stageTimer) {
      clearTimeout(this.stageTimer);
      this.stageTimer = null;
    }
  }

  private clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  public destroy() {
    this.clearStageTimer();
    this.clearTurnTimer();
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.questionManager.clearRoom(this.code);
  }
}

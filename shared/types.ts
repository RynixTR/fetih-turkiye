// shared/types.ts

export type GameStage =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'QUESTION'
  | 'QUESTION_RESULT'
  | 'CAPITAL_SELECTION'
  | 'TURN_MOVE'
  | 'ROUND_SUMMARY'
  | 'GAME_OVER';

export type GameLength = 'short' | 'normal' | 'long';
export type QuestionDifficultySetting = 'easy' | 'normal' | 'hard';

export interface RoomSettings {
  gameLength: GameLength; // short=2 HP/10min, normal=3 HP/14min, long=4 HP/18min
  difficulty: QuestionDifficultySetting; // easy / normal / hard
  soundEffects: boolean;
}

export type ColorblindSymbol =
  | 'circle'
  | 'star'
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'hexagon'
  | 'cross'
  | 'heart'
  | 'shield'
  | 'sun';

export interface PlayerIdentity {
  color: string;
  symbol: ColorblindSymbol;
  symbolName: string;
}

export interface PlayerStats {
  territoriesTaken: number;
  correctAnswers: number;
  totalQuestions: number;
  totalResponseTimeMs: number;
  capitalHits: number;
  survivedRounds: number;
}

export interface PlayerAnswer {
  answer: number; // chosen index (0..4) or numeric estimate
  submittedAt: number; // server timestamp adjusted by RTT
  responseTimeMs: number;
  isCorrect: boolean;
  numericDiff?: number;
}

export interface Player {
  id: string; // session token / socket id
  sessionToken: string;
  name: string;
  color: string;
  symbol: ColorblindSymbol;
  symbolName: string;
  isHost: boolean;
  isAlive: boolean;
  isSpectator: boolean;
  eliminatedOrder: number | null; // e.g. 1st, 2nd, 3rd, etc.
  capitalPieceId: string | null;
  capitalHp: number;
  maxCapitalHp: number;
  territories: string[]; // piece IDs
  hintAvailable: boolean; // 50/50 hint
  hintUsedInGame: boolean;
  eliminatedOptions?: number[]; // for 50/50 hint (indexes of 2 eliminated wrong options)
  lastAnswer: PlayerAnswer | null;
  hasAnsweredCurrentQuestion: boolean;
  stats: PlayerStats;
  isConnected: boolean;
  disconnectedAt: number | null;
}

export interface QuestionClientView {
  id: string;
  type: 'multiple_choice' | 'numeric';
  category: string;
  categoryName: string;
  difficulty: string;
  text: string;
  options?: string[]; // exactly 5 for multiple_choice
  unit?: string; // for numeric questions
  timeLimit: number; // seconds
}

export interface QuestionResultView {
  id: string;
  correctAnswer: number;
  correctText: string;
  explanation: string;
  ranking: PlayerRankingEntry[];
}

export interface PlayerRankingEntry {
  playerId: string;
  playerName: string;
  playerColor: string;
  playerSymbol: ColorblindSymbol;
  rank: number;
  isCorrect: boolean;
  responseTimeMs: number;
  numericDiff?: number;
  hasAnswered: boolean;
}

export interface MapPieceState {
  id: string;
  name: string;
  ownerId: string | null; // null if neutral / unassigned
  isCapital: boolean;
  capitalOwnerId: string | null;
  capitalHp: number;
  isShielded: boolean; // cannot be attacked in the current round
  provinces: number[]; // plate numbers
}

export interface GameStateView {
  roomCode: string;
  stage: GameStage;
  roundNumber: number;
  mapLevel: 1 | 2 | 3 | 4;
  mapLevelDescription: string;
  settings: RoomSettings;
  players: Player[];
  myPlayerId: string;
  isHost: boolean;
  activeTurnPlayerId: string | null;
  turnTimeRemainingMs: number;
  stageTimeRemainingMs: number;
  stageDeadline?: number;
  turnDeadline?: number;
  serverTime?: number;
  question: QuestionClientView | null;
  questionResult: QuestionResultView | null;
  pieces: Record<string, MapPieceState>;
  adjacency: Record<string, string[]>;
  shieldedPieceIds: string[];
  isDoomsdayActive: boolean;
  doomsdayStartedAtRound: number | null;
  gameStartedAt: number | null;
  elapsedGameSeconds: number;
  winner: Player | null;
  finalPlacements: Player[];
  activeReactions: Array<{
    id: string;
    emoji: string;
    senderName: string;
    senderColor: string;
    timestamp: number;
  }>;
}

export interface TurnActionMove {
  targetPieceId: string;
}

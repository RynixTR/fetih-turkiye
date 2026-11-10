// server/src/QuestionManager.ts
import fs from 'fs';
import path from 'path';
import {
  QuestionClientView,
  QuestionResultView,
  PlayerRankingEntry,
  Player,
  QuestionDifficultySetting
} from '../../shared/types.js';
import { CATEGORY_NAMES } from '../../shared/constants.js';

export interface RawQuestion {
  id: string;
  type: 'multiple_choice' | 'numeric';
  category: string;
  difficulty: 'orta_kolay' | 'orta' | 'orta_zor' | 'zor';
  text: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer: number;
  unit?: string;
  explanation: string;
  timeLimit: number;
}

export class QuestionManager {
  private questions: RawQuestion[] = [];
  private usedQuestionIdsByRoom: Map<string, Set<string>> = new Map();

  constructor() {
    this.loadQuestions();
  }

  private loadQuestions() {
    // Resolve questions.json location
    const possiblePaths = [
      path.join(process.cwd(), 'server', 'data', 'questions.json'),
      path.join(__dirname, '..', 'data', 'questions.json'),
      path.join(__dirname, '..', '..', 'server', 'data', 'questions.json')
    ];

    let loaded = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        this.questions = JSON.parse(raw);
        console.log(`[QuestionManager] Loaded ${this.questions.length} questions from ${p}`);
        loaded = true;
        break;
      }
    }

    if (!loaded) {
      throw new Error('[QuestionManager] Could not find questions.json!');
    }
  }

  public getNextQuestion(
    roomCode: string,
    roundNumber: number,
    difficultySetting: QuestionDifficultySetting
  ): RawQuestion {
    if (!this.usedQuestionIdsByRoom.has(roomCode)) {
      this.usedQuestionIdsByRoom.set(roomCode, new Set());
    }
    const used = this.usedQuestionIdsByRoom.get(roomCode)!;

    // Difficulty progression based on round number (Prompt section 3-G):
    // Round 1-2: orta_kolay
    // Round 3-4: orta
    // Round 5-6: orta_zor
    // Round 7+: zor
    let baseDifficulty: 'orta_kolay' | 'orta' | 'orta_zor' | 'zor' = 'orta_kolay';
    if (roundNumber >= 7) {
      baseDifficulty = 'zor';
    } else if (roundNumber >= 5) {
      baseDifficulty = 'orta_zor';
    } else if (roundNumber >= 3) {
      baseDifficulty = 'orta';
    } else {
      baseDifficulty = 'orta_kolay';
    }

    // Lobby difficulty shifts the target level
    if (difficultySetting === 'easy') {
      if (baseDifficulty === 'zor') baseDifficulty = 'orta_zor';
      else if (baseDifficulty === 'orta_zor') baseDifficulty = 'orta';
      else if (baseDifficulty === 'orta') baseDifficulty = 'orta_kolay';
    } else if (difficultySetting === 'hard') {
      if (baseDifficulty === 'orta_kolay') baseDifficulty = 'orta';
      else if (baseDifficulty === 'orta') baseDifficulty = 'orta_zor';
      else if (baseDifficulty === 'orta_zor') baseDifficulty = 'zor';
    }

    // ~15% chance of numeric question (roughly every 6-7 questions, or if roundNumber % 6 === 0)
    const isNumericRound = roundNumber % 6 === 0 || Math.random() < 0.15;

    // Filter available pool
    let candidates = this.questions.filter(q => {
      if (used.has(q.id)) return false;
      if (isNumericRound) {
        return q.type === 'numeric';
      }
      return q.difficulty === baseDifficulty && q.type === 'multiple_choice';
    });

    // Fallbacks if candidates exhausted
    if (candidates.length === 0) {
      candidates = this.questions.filter(q => !used.has(q.id));
    }
    if (candidates.length === 0) {
      // If entire pool exhausted in a super long game, reset used
      used.clear();
      candidates = this.questions;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    used.add(selected.id);
    return selected;
  }

  public toClientView(q: RawQuestion): QuestionClientView {
    // Strictly withhold correctIndex and correctAnswer from client!
    return {
      id: q.id,
      type: q.type,
      category: q.category,
      categoryName: CATEGORY_NAMES[q.category] || q.category,
      difficulty: q.difficulty,
      text: q.text,
      options: q.options ? [...q.options] : undefined,
      unit: q.unit,
      timeLimit: q.timeLimit || 20
    };
  }

  public evaluateAnswer(
    q: RawQuestion,
    submittedAnswer: number
  ): { isCorrect: boolean; numericDiff?: number } {
    if (q.type === 'multiple_choice') {
      return { isCorrect: submittedAnswer === q.correctIndex };
    } else {
      const diff = Math.abs(submittedAnswer - q.correctAnswer);
      // For numeric question, exact match is correct, but ranking will sort by proximity
      return { isCorrect: diff === 0, numericDiff: diff };
    }
  }

  public computeRanking(
    q: RawQuestion,
    players: Player[]
  ): PlayerRankingEntry[] {
    const alivePlayers = players.filter(p => p.isAlive && !p.isSpectator);

    // Group 1: Answered players
    const answered: Array<{
      player: Player;
      isCorrect: boolean;
      responseTimeMs: number;
      numericDiff?: number;
      arrivalOrder: number;
    }> = [];

    // Group 2: Unanswered players
    const unanswered: Player[] = [];

    alivePlayers.forEach((p, idx) => {
      if (p.hasAnsweredCurrentQuestion && p.lastAnswer) {
        answered.push({
          player: p,
          isCorrect: p.lastAnswer.isCorrect,
          responseTimeMs: p.lastAnswer.responseTimeMs,
          numericDiff: p.lastAnswer.numericDiff,
          arrivalOrder: idx
        });
      } else {
        unanswered.push(p);
      }
    });

    let sortedAnswered: typeof answered = [];

    if (q.type === 'multiple_choice') {
      // 1. Doğru bilenler hızına göre (en hızlı 1.)
      const correct = answered
        .filter(a => a.isCorrect)
        .sort((a, b) => a.responseTimeMs - b.responseTimeMs || a.arrivalOrder - b.arrivalOrder);

      // 2. Yanlış bilenler hızına göre (en hızlı 1.)
      const incorrect = answered
        .filter(a => !a.isCorrect)
        .sort((a, b) => a.responseTimeMs - b.responseTimeMs || a.arrivalOrder - b.arrivalOrder);

      sortedAnswered = [...correct, ...incorrect];
    } else {
      // Sayı sorusu: En yakın tahmin birinci olur, eşitlikte hız belirler
      sortedAnswered = [...answered].sort((a, b) => {
        const diffA = a.numericDiff ?? Infinity;
        const diffB = b.numericDiff ?? Infinity;
        if (diffA !== diffB) {
          return diffA - diffB;
        }
        return a.responseTimeMs - b.responseTimeMs || a.arrivalOrder - b.arrivalOrder;
      });
    }

    // 3. En sona hiç cevap vermeyenler (kendi aralarında en az parçası olan önce)
    const sortedUnanswered = [...unanswered].sort((a, b) => {
      const pieceDiff = a.territories.length - b.territories.length;
      if (pieceDiff !== 0) return pieceDiff;
      return a.name.localeCompare(b.name);
    });

    const result: PlayerRankingEntry[] = [];
    let rank = 1;

    for (const a of sortedAnswered) {
      result.push({
        playerId: a.player.id,
        playerName: a.player.name,
        playerColor: a.player.color,
        playerSymbol: a.player.symbol,
        rank: rank++,
        isCorrect: a.isCorrect,
        responseTimeMs: a.responseTimeMs,
        numericDiff: a.numericDiff,
        hasAnswered: true
      });
    }

    for (const u of sortedUnanswered) {
      result.push({
        playerId: u.id,
        playerName: u.name,
        playerColor: u.color,
        playerSymbol: u.symbol,
        rank: rank++,
        isCorrect: false,
        responseTimeMs: q.timeLimit * 1000,
        hasAnswered: false
      });
    }

    return result;
  }

  public getResultView(q: RawQuestion, ranking: PlayerRankingEntry[]): QuestionResultView {
    let correctText = '';
    if (q.type === 'multiple_choice' && q.options && typeof q.correctIndex === 'number') {
      correctText = q.options[q.correctIndex];
    } else {
      correctText = `${q.correctAnswer} ${q.unit || ''}`.trim();
    }

    return {
      id: q.id,
      correctAnswer: q.type === 'multiple_choice' ? (q.correctIndex ?? 0) : q.correctAnswer,
      correctText,
      explanation: q.explanation,
      ranking
    };
  }

  public clearRoom(roomCode: string) {
    this.usedQuestionIdsByRoom.delete(roomCode);
  }
}

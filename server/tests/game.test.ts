// server/tests/game.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionManager, RawQuestion } from '../src/QuestionManager.js';
import { MapEngine } from '../src/MapEngine.js';
import { Player, MapPieceState } from '../../shared/types.js';

describe('Fetih Türkiye - Game Logic & Rules', () => {
  let qManager: QuestionManager;
  let mapEngine: MapEngine;

  beforeEach(() => {
    qManager = new QuestionManager();
    mapEngine = new MapEngine();
  });

  describe('1. Map Level Selection (Section 4)', () => {
    it('selects Level 1 (7 regions) for 2-3 players', () => {
      expect(mapEngine.getMapLevelForPlayerCount(2)).toBe(1);
      expect(mapEngine.getMapLevelForPlayerCount(3)).toBe(1);
    });

    it('selects Level 2 (22 subregions) for 4-5 players', () => {
      expect(mapEngine.getMapLevelForPlayerCount(4)).toBe(2);
      expect(mapEngine.getMapLevelForPlayerCount(5)).toBe(2);
    });

    it('selects Level 3 (45 county groups) for 6-7 players', () => {
      expect(mapEngine.getMapLevelForPlayerCount(6)).toBe(3);
      expect(mapEngine.getMapLevelForPlayerCount(7)).toBe(3);
    });

    it('selects Level 4 (81 provinces) for 8-10 players', () => {
      expect(mapEngine.getMapLevelForPlayerCount(8)).toBe(4);
      expect(mapEngine.getMapLevelForPlayerCount(10)).toBe(4);
    });
  });

  describe('2. Ranking Rule (Section 3-C)', () => {
    it('ranks correct fast -> correct slow -> incorrect fast -> incorrect slow -> unanswered by piece count', () => {
      const sampleQuestion: RawQuestion = {
        id: 'test_q1',
        type: 'multiple_choice',
        category: 'tarih',
        difficulty: 'orta',
        text: 'Test sorusu?',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctIndex: 2,
        correctAnswer: 2,
        explanation: 'Test notu',
        timeLimit: 20
      };

      const players: Player[] = [
        {
          id: 'p_unanswered_few_pieces',
          sessionToken: 't1',
          name: 'Cevapsız Az Parça',
          color: '#1',
          symbol: 'circle',
          symbolName: 'Daire',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c1',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c1'], // 1 territory
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: null,
          hasAnsweredCurrentQuestion: false,
          stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_unanswered_many_pieces',
          sessionToken: 't2',
          name: 'Cevapsız Çok Parça',
          color: '#2',
          symbol: 'star',
          symbolName: 'Yıldız',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c2',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c2', 't2a', 't2b'], // 3 territories
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: null,
          hasAnsweredCurrentQuestion: false,
          stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_correct_slow',
          sessionToken: 't3',
          name: 'Doğru Yavaş',
          color: '#3',
          symbol: 'triangle',
          symbolName: 'Üçgen',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c3',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c3'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 2, submittedAt: 1000, responseTimeMs: 6500, isCorrect: true },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 1, totalQuestions: 1, totalResponseTimeMs: 6500, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_correct_fast',
          sessionToken: 't4',
          name: 'Doğru Hızlı',
          color: '#4',
          symbol: 'square',
          symbolName: 'Kare',
          isHost: true,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c4',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c4'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 2, submittedAt: 1000, responseTimeMs: 1200, isCorrect: true },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 1, totalQuestions: 1, totalResponseTimeMs: 1200, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_wrong_fast',
          sessionToken: 't5',
          name: 'Yanlış Hızlı',
          color: '#5',
          symbol: 'diamond',
          symbolName: 'Elmas',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c5',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c5'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 1, submittedAt: 1000, responseTimeMs: 1500, isCorrect: false },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 1, totalResponseTimeMs: 1500, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_wrong_slow',
          sessionToken: 't6',
          name: 'Yanlış Yavaş',
          color: '#6',
          symbol: 'hexagon',
          symbolName: 'Altıgen',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c6',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c6'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 0, submittedAt: 1000, responseTimeMs: 8000, isCorrect: false },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 1, totalResponseTimeMs: 8000, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        }
      ];

      const ranking = qManager.computeRanking(sampleQuestion, players);

      // Expected order:
      // 1. Doğru Hızlı (p_correct_fast)
      // 2. Doğru Yavaş (p_correct_slow)
      // 3. Yanlış Hızlı (p_wrong_fast)
      // 4. Yanlış Yavaş (p_wrong_slow)
      // 5. Cevapsız Az Parça (p_unanswered_few_pieces: 1 territory)
      // 6. Cevapsız Çok Parça (p_unanswered_many_pieces: 3 territories)
      expect(ranking[0].playerId).toBe('p_correct_fast');
      expect(ranking[1].playerId).toBe('p_correct_slow');
      expect(ranking[2].playerId).toBe('p_wrong_fast');
      expect(ranking[3].playerId).toBe('p_wrong_slow');
      expect(ranking[4].playerId).toBe('p_unanswered_few_pieces');
      expect(ranking[5].playerId).toBe('p_unanswered_many_pieces');
    });

    it('ranks numeric questions by closest estimate first, and speed on tie', () => {
      const numQ: RawQuestion = {
        id: 'num_test',
        type: 'numeric',
        category: 'tarih',
        difficulty: 'orta',
        text: 'Atatürk Samsun\'a hangi yıl çıktı?',
        correctAnswer: 1919,
        unit: 'Yıl',
        explanation: '19 Mayıs 1919',
        timeLimit: 20
      };

      const players: Player[] = [
        {
          id: 'p_exact_fast',
          sessionToken: 't1',
          name: 'Tam İsabet Hızlı',
          color: '#1',
          symbol: 'circle',
          symbolName: 'Daire',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c1',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c1'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 1919, submittedAt: 1000, responseTimeMs: 2000, isCorrect: true, numericDiff: 0 },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 1, totalQuestions: 1, totalResponseTimeMs: 2000, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_exact_slow',
          sessionToken: 't2',
          name: 'Tam İsabet Yavaş',
          color: '#2',
          symbol: 'star',
          symbolName: 'Yıldız',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c2',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c2'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 1919, submittedAt: 1000, responseTimeMs: 5000, isCorrect: true, numericDiff: 0 },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 1, totalQuestions: 1, totalResponseTimeMs: 5000, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_close_1920',
          sessionToken: 't3',
          name: 'Yakın 1920',
          color: '#3',
          symbol: 'triangle',
          symbolName: 'Üçgen',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c3',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c3'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 1920, submittedAt: 1000, responseTimeMs: 1000, isCorrect: false, numericDiff: 1 },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 1, totalResponseTimeMs: 1000, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        },
        {
          id: 'p_far_1923',
          sessionToken: 't4',
          name: 'Uzak 1923',
          color: '#4',
          symbol: 'square',
          symbolName: 'Kare',
          isHost: false,
          isAlive: true,
          isSpectator: false,
          eliminatedOrder: null,
          capitalPieceId: 'c4',
          capitalHp: 3,
          maxCapitalHp: 3,
          territories: ['c4'],
          hintAvailable: false,
          hintUsedInGame: false,
          lastAnswer: { answer: 1923, submittedAt: 1000, responseTimeMs: 800, isCorrect: false, numericDiff: 4 },
          hasAnsweredCurrentQuestion: true,
          stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 1, totalResponseTimeMs: 800, capitalHits: 0, survivedRounds: 0 },
          isConnected: true,
          disconnectedAt: null
        }
      ];

      const ranking = qManager.computeRanking(numQ, players);
      expect(ranking[0].playerId).toBe('p_exact_fast');
      expect(ranking[1].playerId).toBe('p_exact_slow');
      expect(ranking[2].playerId).toBe('p_close_1920');
      expect(ranking[3].playerId).toBe('p_far_1923');
    });
  });

  describe('3. Map Adjacency & Move Execution (Section 3-E)', () => {
    it('enforces adjacency and prevents moving to non-neighboring pieces', () => {
      const { pieces, adjacency } = mapEngine.initializeGamePieces(1); // 7 Regions
      const player: Player = {
        id: 'p1',
        sessionToken: 'p1',
        name: 'Marmara Kralı',
        color: '#red',
        symbol: 'circle',
        symbolName: 'Daire',
        isHost: true,
        isAlive: true,
        isSpectator: false,
        eliminatedOrder: null,
        capitalPieceId: 'marmara',
        capitalHp: 3,
        maxCapitalHp: 3,
        territories: ['marmara'],
        hintAvailable: false,
        hintUsedInGame: false,
        lastAnswer: null,
        hasAnsweredCurrentQuestion: false,
        stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
        isConnected: true,
        disconnectedAt: null
      };

      pieces['marmara'].ownerId = 'p1';
      pieces['marmara'].isCapital = true;
      pieces['marmara'].capitalOwnerId = 'p1';
      pieces['marmara'].capitalHp = 3;

      const legal = mapEngine.getLegalMovesForPlayer(pieces, adjacency, player, [player]);
      // Marmara neighbors: Ege, İç Anadolu, Karadeniz
      expect(legal).toContain('ege');
      expect(legal).toContain('ic_anadolu');
      expect(legal).toContain('karadeniz');
      // Doğu Anadolu is NOT adjacent to Marmara
      expect(legal).not.toContain('dogu_anadolu');
      expect(legal).not.toContain('guneydogu_anadolu');
    });

    it('shields conquered territories for the round', () => {
      const { pieces } = mapEngine.initializeGamePieces(1);
      const attacker: Player = {
        id: 'p1',
        sessionToken: 'p1',
        name: 'Saldırgan',
        color: '#red',
        symbol: 'circle',
        symbolName: 'Daire',
        isHost: true,
        isAlive: true,
        isSpectator: false,
        eliminatedOrder: null,
        capitalPieceId: 'marmara',
        capitalHp: 3,
        maxCapitalHp: 3,
        territories: ['marmara'],
        hintAvailable: false,
        hintUsedInGame: false,
        lastAnswer: null,
        hasAnsweredCurrentQuestion: false,
        stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
        isConnected: true,
        disconnectedAt: null
      };

      const res = mapEngine.executeMove(pieces, attacker, 'ege', [attacker]);
      expect(res.success).toBe(true);
      expect(res.type).toBe('claim_empty');
      expect(pieces['ege'].ownerId).toBe('p1');
      expect(pieces['ege'].isShielded).toBe(true);

      // Another player tries to attack shielded ege in the same round
      const other: Player = {
        id: 'p2',
        sessionToken: 'p2',
        name: 'Diğer',
        color: '#blue',
        symbol: 'star',
        symbolName: 'Yıldız',
        isHost: false,
        isAlive: true,
        isSpectator: false,
        eliminatedOrder: null,
        capitalPieceId: 'akdeniz',
        capitalHp: 3,
        maxCapitalHp: 3,
        territories: ['akdeniz'],
        hintAvailable: false,
        hintUsedInGame: false,
        lastAnswer: null,
        hasAnsweredCurrentQuestion: false,
        stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
        isConnected: true,
        disconnectedAt: null
      };

      const failRes = mapEngine.executeMove(pieces, other, 'ege', [attacker, other]);
      expect(failRes.success).toBe(false);
      expect(failRes.type).toBe('invalid');
    });
  });

  describe('4. Capital Damage, Elimination & Territory Transfer (Section 3-E, 3-F)', () => {
    it('damages capital by 1 HP and shields it; does not transfer ownership on hit', () => {
      const { pieces } = mapEngine.initializeGamePieces(1);
      const attacker: Player = {
        id: 'p1',
        sessionToken: 'p1',
        name: 'Attacker',
        color: '#red',
        symbol: 'circle',
        symbolName: 'Daire',
        isHost: true,
        isAlive: true,
        isSpectator: false,
        eliminatedOrder: null,
        capitalPieceId: 'marmara',
        capitalHp: 3,
        maxCapitalHp: 3,
        territories: ['marmara'],
        hintAvailable: false,
        hintUsedInGame: false,
        lastAnswer: null,
        hasAnsweredCurrentQuestion: false,
        stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
        isConnected: true,
        disconnectedAt: null
      };

      const defender: Player = {
        id: 'p2',
        sessionToken: 'p2',
        name: 'Defender',
        color: '#blue',
        symbol: 'star',
        symbolName: 'Yıldız',
        isHost: false,
        isAlive: true,
        isSpectator: false,
        eliminatedOrder: null,
        capitalPieceId: 'ege',
        capitalHp: 3,
        maxCapitalHp: 3,
        territories: ['ege', 'akdeniz'],
        hintAvailable: false,
        hintUsedInGame: false,
        lastAnswer: null,
        hasAnsweredCurrentQuestion: false,
        stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
        isConnected: true,
        disconnectedAt: null
      };

      pieces['ege'].ownerId = 'p2';
      pieces['ege'].isCapital = true;
      pieces['ege'].capitalOwnerId = 'p2';
      pieces['ege'].capitalHp = 3;

      const res = mapEngine.executeMove(pieces, attacker, 'ege', [attacker, defender]);
      expect(res.success).toBe(true);
      expect(res.type).toBe('attack_capital');
      expect(res.capitalRemainingHp).toBe(2);
      expect(pieces['ege'].capitalHp).toBe(2);
      expect(pieces['ege'].ownerId).toBe('p2'); // Still defender's capital!
      expect(pieces['ege'].isShielded).toBe(true);
    });

    it('eliminates player when capital HP drops to 0 and transfers ALL territories to conqueror', () => {
      const { pieces } = mapEngine.initializeGamePieces(1);
      const attacker: Player = {
        id: 'p1',
        sessionToken: 'p1',
        name: 'Attacker',
        color: '#red',
        symbol: 'circle',
        symbolName: 'Daire',
        isHost: true,
        isAlive: true,
        isSpectator: false,
        eliminatedOrder: null,
        capitalPieceId: 'marmara',
        capitalHp: 3,
        maxCapitalHp: 3,
        territories: ['marmara'],
        hintAvailable: false,
        hintUsedInGame: false,
        lastAnswer: null,
        hasAnsweredCurrentQuestion: false,
        stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
        isConnected: true,
        disconnectedAt: null
      };

      const defender: Player = {
        id: 'p2',
        sessionToken: 'p2',
        name: 'Defender',
        color: '#blue',
        symbol: 'star',
        symbolName: 'Yıldız',
        isHost: false,
        isAlive: true,
        isSpectator: false,
        eliminatedOrder: null,
        capitalPieceId: 'ege',
        capitalHp: 1, // Only 1 HP left!
        maxCapitalHp: 3,
        territories: ['ege', 'akdeniz', 'ic_anadolu'],
        hintAvailable: false,
        hintUsedInGame: false,
        lastAnswer: null,
        hasAnsweredCurrentQuestion: false,
        stats: { territoriesTaken: 0, correctAnswers: 0, totalQuestions: 0, totalResponseTimeMs: 0, capitalHits: 0, survivedRounds: 0 },
        isConnected: true,
        disconnectedAt: null
      };

      pieces['ege'].ownerId = 'p2';
      pieces['ege'].isCapital = true;
      pieces['ege'].capitalOwnerId = 'p2';
      pieces['ege'].capitalHp = 1;

      pieces['akdeniz'].ownerId = 'p2';
      pieces['ic_anadolu'].ownerId = 'p2';

      const res = mapEngine.executeMove(pieces, attacker, 'ege', [attacker, defender]);
      expect(res.success).toBe(true);
      expect(res.type).toBe('attack_capital');
      expect(res.eliminatedPlayer).toBeDefined();
      expect(res.eliminatedPlayer!.id).toBe('p2');
      expect(defender.isAlive).toBe(false);

      // Check all 3 territories transferred to attacker
      expect(attacker.territories).toContain('ege');
      expect(attacker.territories).toContain('akdeniz');
      expect(attacker.territories).toContain('ic_anadolu');
      expect(pieces['ege'].ownerId).toBe('p1');
      expect(pieces['akdeniz'].ownerId).toBe('p1');
      expect(pieces['ic_anadolu'].ownerId).toBe('p1');
    });
  });
});

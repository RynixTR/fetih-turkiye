// server/scripts/simulate-bots.ts
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { QuestionManager } from '../src/QuestionManager.js';
import { MapEngine } from '../src/MapEngine.js';
import { GameRoom } from '../src/GameRoom.js';

// Mock Socket.IO server for headless simulation
const server = http.createServer();
const io = new SocketIOServer(server);

const questionManager = new QuestionManager();
const mapEngine = new MapEngine();

interface SimResult {
  playerCount: number;
  winnerName: string;
  totalRounds: number;
  simulatedDurationSeconds: number;
  doomsdayTriggered: boolean;
  eliminations: number;
}

async function simulateGame(playerCount: number): Promise<SimResult> {
  const roomCode = `SIM${playerCount}`;
  const room = new GameRoom(roomCode, io, questionManager, mapEngine);

  // Settings: short for fast test, or normal
  room.settings.gameLength = 'short'; // 10 min doomsday, 2 HP
  room.settings.difficulty = 'normal';

  const botNames = [
    'Alp Arslan', 'Bilge Kağan', 'Fatih', 'Tomris Hatun', 'Mete Han',
    'Yıldırım', 'Selçuk Bey', 'Köroğlu', 'Battal Gazi', 'Karamanoğlu'
  ];

  // Join bots
  const mockSockets: Array<{ id: string; name: string; token: string }> = [];
  for (let i = 0; i < playerCount; i++) {
    const sockId = `mock_socket_${playerCount}_${i}`;
    const name = botNames[i];
    const mockSocket: any = {
      id: sockId,
      join: () => {},
      leave: () => {},
      emit: () => {}
    };

    const res = room.join(mockSocket, name);
    mockSockets.push({ id: sockId, name, token: res.sessionToken! });
  }

  // Host starts game
  const hostSock = mockSockets[0];
  const startRes = room.startGame(hostSock.id);
  if (!startRes.success) {
    throw new Error(`Failed to start simulation with ${playerCount} players: ${startRes.error}`);
  }

  let safetyCounter = 0;
  const maxIterations = 200; // prevent infinite loops

  while (room.stage !== 'GAME_OVER' && safetyCounter < maxIterations) {
    safetyCounter++;

    if (room.stage === 'COUNTDOWN') {
      // Advance countdown immediately
      (room as any).startNextRound();
    } else if (room.stage === 'QUESTION') {
      // Simulate answers from all alive players
      const alivePlayers = Array.from(room.players.values()).filter(p => p.isAlive && !p.isSpectator);
      const q = room.currentQuestion!;

      for (const p of alivePlayers) {
        // Find socket
        const s = mockSockets.find(ms => ms.token === p.sessionToken);
        if (!s) continue;

        // 10% chance of random bot disconnect and reconnect
        if (Math.random() < 0.1) {
          room.handleDisconnect(s.id);
          s.id = `${s.id}_re_${Date.now()}`;
          const reMockSocket: any = { id: s.id, join: () => {}, leave: () => {}, emit: () => {} };
          room.join(reMockSocket, p.name, p.sessionToken);
        }

        // 15% chance bot doesn't answer (unanswered)
        if (Math.random() < 0.15) {
          continue;
        }

        let answer = 0;
        if (q.type === 'multiple_choice') {
          // 65% chance bot knows correct answer, 35% random guess
          if (Math.random() < 0.65) {
            answer = q.correctIndex ?? 0;
          } else {
            answer = Math.floor(Math.random() * 5);
          }
        } else {
          // Numeric question: close guess or exact
          const delta = (Math.random() - 0.5) * 10;
          answer = Math.round(q.correctAnswer + delta);
        }

        room.submitAnswer(s.id, answer);
      }

      // Close question phase
      (room as any).closeQuestionPhase();
    } else if (room.stage === 'QUESTION_RESULT') {
      // Advance to moves/capital selection
      (room as any).startMovesOrCapitalSelection();
    } else if (room.stage === 'CAPITAL_SELECTION') {
      // Pick capital for current player
      const activeId = room.activeTurnPlayerId;
      if (activeId) {
        const s = mockSockets.find(ms => ms.token === activeId);
        const unowned = Object.keys(room.pieces).filter(id => room.pieces[id].ownerId === null);
        if (unowned.length > 0 && s) {
          const chosen = unowned[Math.floor(Math.random() * unowned.length)];
          room.selectCapital(s.id, chosen);
        } else {
          (room as any).autoSelectCapital(activeId);
        }
      }
    } else if (room.stage === 'TURN_MOVE') {
      // Execute move for active player
      const activeId = room.activeTurnPlayerId;
      if (activeId) {
        const s = mockSockets.find(ms => ms.token === activeId);
        const p = room.players.get(activeId);
        let moved = false;
        if (p && s) {
          const legal = mapEngine.getLegalMovesForPlayer(
            room.pieces,
            room.adjacency,
            p,
            Array.from(room.players.values())
          );
          if (legal.length > 0) {
            // Prioritize attacking enemy capital if adjacent!
            const capTarget = legal.find(id => room.pieces[id].isCapital);
            const chosen = capTarget || legal[Math.floor(Math.random() * legal.length)];
            moved = room.executeMove(s.id, chosen);
          }
        }
        if (!moved) {
          (room as any).autoExecuteMove(activeId);
        }
      }
    } else if (room.stage === 'ROUND_SUMMARY') {
      // Force elapsed time if rounds get high to test Doomsday
      if (room.roundNumber >= 6) {
        room.gameStartedAt = Date.now() - 650 * 1000; // > 600s = Doomsday!
      }
      (room as any).clearStageTimer();
      (room as any).finishRoundSummary();
      if (room.stage === 'ROUND_SUMMARY') {
        (room as any).clearStageTimer();
        (room as any).startNextRound();
      }
    }
  }

  if (room.stage !== 'GAME_OVER') {
    throw new Error(`Simulation failed to conclude within ${maxIterations} turns!`);
  }

  const eliminations = Array.from(room.players.values()).filter(p => !p.isAlive).length;
  const result: SimResult = {
    playerCount,
    winnerName: room.winner ? room.winner.name : 'Unknown',
    totalRounds: room.roundNumber,
    simulatedDurationSeconds: room.roundNumber * 45, // approx 45s per round
    doomsdayTriggered: room.isDoomsdayActive,
    eliminations
  };

  room.destroy();
  return result;
}

async function runAllSimulations() {
  console.log('====================================================');
  console.log('FETİH TÜRKİYE — AUTOMATED BOT GAME SIMULATION REPORT');
  console.log('Testing player counts: 2, 3, 4, 5, 6, 8, 10');
  console.log('====================================================\n');

  const counts = [2, 3, 4, 5, 6, 8, 10];
  const results: SimResult[] = [];

  for (const n of counts) {
    const res = await simulateGame(n);
    results.push(res);
    console.log(`[BOT MATCH: ${n} PLAYERS]`);
    console.log(`- Kazanan: ${res.winnerName}`);
    console.log(`- Toplam Tur: ${res.totalRounds}`);
    console.log(`- Tahmini Oyun Süresi: ~${Math.round(res.simulatedDurationSeconds / 60)} dakika (${res.simulatedDurationSeconds}s)`);
    console.log(`- Elenen Oyuncu Sayısı: ${res.eliminations}`);
    console.log(`- Kıyamet (Doomsday) Devreye Girdi mi: ${res.doomsdayTriggered ? 'EVET' : 'HAYIR'}`);
    console.log('----------------------------------------------------');
  }

  console.log('\nALL 7 MULTI-BOT SIMULATION RUNS COMPLETED SUCCESSFULLY WITH ZERO DEADLOCKS!');
  process.exit(0);
}

runAllSimulations().catch(err => {
  console.error('Simulation error:', err);
  process.exit(1);
});

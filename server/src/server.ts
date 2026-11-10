// server/src/server.ts
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { QuestionManager } from './QuestionManager.js';
import { MapEngine } from './MapEngine.js';
import { RoomManager } from './RoomManager.js';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

app.use(cors());
app.use(express.json());

// Initialize services
const questionManager = new QuestionManager();
const mapEngine = new MapEngine();
const roomManager = new RoomManager(io, questionManager, mapEngine);

// Health check endpoint (for Render.com & monitoring)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
    activeRooms: roomManager.getActiveRoomCount(),
    activePlayers: roomManager.getActivePlayerCount()
  });
});

// Serve client in production
const candidatePaths = [
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), 'client', 'dist')
];
const clientDistPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || candidatePaths[0];
console.log(`[Fetih Türkiye Server] Serving static files from: ${clientDistPath}`);
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Fetih Türkiye</title><meta charset="utf-8"></head>
        <body style="background:#0b1120;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1>Fetih Türkiye Sunucusu Aktif</h1>
            <p>İstemci henüz derlenmemiş veya geliştirme modunda çalışıyor.</p>
            <p>Lütfen <code>npm run dev</code> veya <code>npm run build</code> komutunu çalıştırınız.</p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

// Periodic empty room cleanup (every 30 seconds)
setInterval(() => {
  roomManager.cleanEmptyRooms();
}, 30000);

// Socket.IO Events
io.on('connection', socket => {
  let currentRoomCode: string | null = null;
  let currentSessionToken: string | null = null;

  // Latency RTT measurement
  socket.on('ping_rtt', data => {
    socket.emit('pong_rtt', {
      clientTimestamp: data?.clientTimestamp || Date.now(),
      serverTimestamp: Date.now()
    });
  });

  // Join or Create Room
  socket.on('join_room', (data, callback) => {
    const { roomCode, name, sessionToken } = data || {};
    let targetRoom = roomCode ? roomManager.getRoom(roomCode) : null;

    if (!targetRoom) {
      if (roomCode) {
        if (typeof callback === 'function') {
          return callback({ success: false, error: 'Oda bulunamadı. Lütfen oda kodunu kontrol ediniz.' });
        }
        return socket.emit('error_message', { message: 'Oda bulunamadı.' });
      }
      // Create new room if no code provided
      targetRoom = roomManager.getOrCreateRoom();
    }

    const joinRes = targetRoom.join(socket, name, sessionToken);
    if (!joinRes.success) {
      if (typeof callback === 'function') return callback(joinRes);
      return socket.emit('error_message', { message: joinRes.error });
    }

    currentRoomCode = targetRoom.code;
    currentSessionToken = joinRes.sessionToken || null;

    if (typeof callback === 'function') {
      callback({
        success: true,
        roomCode: targetRoom.code,
        sessionToken: currentSessionToken,
        state: targetRoom.getClientState(currentSessionToken!)
      });
    }
  });

  // Host: Update Settings
  socket.on('update_settings', data => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      room.updateSettings(socket.id, data?.settings || {});
    }
  });

  // Host: Kick Player
  socket.on('kick_player', data => {
    if (!currentRoomCode || !data?.targetSessionToken) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      room.kickPlayer(socket.id, data.targetSessionToken);
    }
  });

  // Host: Start Game
  socket.on('start_game', (data, callback) => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      const res = room.startGame(socket.id);
      if (typeof callback === 'function') callback(res);
    }
  });

  // Player: Submit Answer
  socket.on('submit_answer', data => {
    if (!currentRoomCode || typeof data?.answer === 'undefined') return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      room.submitAnswer(socket.id, Number(data.answer), data.clientTimestamp);
    }
  });

  // Player: Use 50/50 Hint
  socket.on('use_hint', (data, callback) => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      const res = room.useHint(socket.id);
      if (typeof callback === 'function') callback(res);
    }
  });

  // Player: Select Capital
  socket.on('select_capital', data => {
    if (!currentRoomCode || !data?.pieceId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      room.selectCapital(socket.id, data.pieceId);
    }
  });

  // Player: Execute Move
  socket.on('execute_move', data => {
    if (!currentRoomCode || !data?.targetPieceId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      room.executeMove(socket.id, data.targetPieceId);
    }
  });

  // Player: Send Emoji Reaction
  socket.on('send_reaction', data => {
    if (!currentRoomCode || !data?.emoji) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      room.sendReaction(socket.id, data.emoji);
    }
  });

  // Host: Rematch / Restart Game
  socket.on('restart_game', () => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      room.restartGame(socket.id);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = roomManager.getRoom(currentRoomCode);
      if (room) {
        room.handleDisconnect(socket.id);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Fetih Türkiye Server] Running on http://localhost:${PORT}`);
});

// server/src/RoomManager.ts
import { Server as SocketIOServer } from 'socket.io';
import { ROOM_CODE_CHARS, ROOM_CODE_LENGTH } from '../../shared/constants.js';
import { QuestionManager } from './QuestionManager.js';
import { MapEngine } from './MapEngine.js';
import { GameRoom } from './GameRoom.js';

export class RoomManager {
  private io: SocketIOServer;
  private questionManager: QuestionManager;
  private mapEngine: MapEngine;
  private rooms: Map<string, GameRoom> = new Map();

  constructor(io: SocketIOServer, questionManager: QuestionManager, mapEngine: MapEngine) {
    this.io = io;
    this.questionManager = questionManager;
    this.mapEngine = mapEngine;
  }

  public generateRoomCode(): string {
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const randIdx = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
        code += ROOM_CODE_CHARS[randIdx];
      }
      attempts++;
      if (attempts > 1000) break;
    } while (this.rooms.has(code));

    return code;
  }

  public getOrCreateRoom(code?: string): GameRoom {
    const normalizedCode = (code || this.generateRoomCode()).toUpperCase().trim();
    if (this.rooms.has(normalizedCode)) {
      return this.rooms.get(normalizedCode)!;
    }

    const newRoom = new GameRoom(normalizedCode, this.io, this.questionManager, this.mapEngine);
    this.rooms.set(normalizedCode, newRoom);
    console.log(`[RoomManager] Created new room: ${normalizedCode}. Total rooms: ${this.rooms.size}`);
    return newRoom;
  }

  public getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }

  public removeRoom(code: string): void {
    const normalizedCode = code.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);
    if (room) {
      room.destroy();
      this.rooms.delete(normalizedCode);
      console.log(`[RoomManager] Destroyed room: ${normalizedCode}. Remaining rooms: ${this.rooms.size}`);
    }
  }

  public cleanEmptyRooms(): void {
    for (const [code, room] of this.rooms.entries()) {
      const activePlayers = Array.from(room.players.values()).filter(p => p.isConnected);
      if (activePlayers.length === 0) {
        this.removeRoom(code);
      }
    }
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }

  public getActivePlayerCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += Array.from(room.players.values()).filter(p => p.isConnected).length;
    }
    return count;
  }
}

// server/src/MapEngine.ts
import fs from 'fs';
import path from 'path';
import { MapPieceState, Player } from '../../shared/types.js';

export interface MapDataFile {
  viewBox: string;
  provinces: Record<number, {
    id: string;
    plate: number;
    name: string;
    paths: string[];
    bounds: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number };
  }>;
  levels: Record<1 | 2 | 3 | 4, {
    type: string;
    description: string;
    pieces: Record<string, {
      id: string;
      name: string;
      provinces: number[];
      bounds?: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number };
    }>;
    adjacency: Record<string, string[]>;
  }>;
}

export class MapEngine {
  private mapData!: MapDataFile;

  constructor() {
    const possiblePaths = [
      path.join(process.cwd(), 'shared', 'mapData.json'),
      path.join(__dirname, '..', '..', 'shared', 'mapData.json'),
      path.join(__dirname, '..', 'shared', 'mapData.json')
    ];

    let loaded = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        this.mapData = JSON.parse(raw);
        console.log(`[MapEngine] Loaded mapData from ${p}`);
        loaded = true;
        break;
      }
    }

    if (!loaded) {
      throw new Error('[MapEngine] Could not find mapData.json!');
    }
  }

  public getMapLevelForPlayerCount(count: number): 1 | 2 | 3 | 4 {
    if (count <= 3) return 1;
    if (count <= 5) return 2;
    if (count <= 7) return 3;
    return 4;
  }

  public initializeGamePieces(level: 1 | 2 | 3 | 4): {
    pieces: Record<string, MapPieceState>;
    adjacency: Record<string, string[]>;
    levelDescription: string;
  } {
    const levelDef = this.mapData.levels[level];
    const pieces: Record<string, MapPieceState> = {};

    for (const [id, def] of Object.entries(levelDef.pieces)) {
      pieces[id] = {
        id,
        name: def.name,
        ownerId: null,
        isCapital: false,
        capitalOwnerId: null,
        capitalHp: 0,
        isShielded: false,
        provinces: def.provinces
      };
    }

    return {
      pieces,
      adjacency: levelDef.adjacency,
      levelDescription: levelDef.description
    };
  }

  public setCapital(
    pieces: Record<string, MapPieceState>,
    pieceId: string,
    player: Player,
    maxHp: number
  ): boolean {
    const piece = pieces[pieceId];
    if (!piece) return false;
    if (piece.ownerId !== null || piece.isCapital) return false;

    piece.ownerId = player.id;
    piece.isCapital = true;
    piece.capitalOwnerId = player.id;
    piece.capitalHp = maxHp;

    player.capitalPieceId = pieceId;
    player.capitalHp = maxHp;
    player.maxCapitalHp = maxHp;
    if (!player.territories.includes(pieceId)) {
      player.territories.push(pieceId);
    }
    return true;
  }

  public getLegalMovesForPlayer(
    pieces: Record<string, MapPieceState>,
    adjacency: Record<string, string[]>,
    player: Player,
    allPlayers: Player[]
  ): string[] {
    const alivePlayers = allPlayers.filter(p => p.isAlive && !p.isSpectator);
    const playerTerritorySet = new Set(player.territories);

    // Calculate whether any other player is "dominant" (> sum of all others combined)
    // In that case, attacking their capital has no extra restriction beyond adjacency.
    const neighboringPieceIds = new Set<string>();

    for (const ownedId of player.territories) {
      const neighbors = adjacency[ownedId] || [];
      for (const n of neighbors) {
        if (!playerTerritorySet.has(n)) {
          neighboringPieceIds.add(n);
        }
      }
    }

    // Filter out shielded pieces
    let legal = Array.from(neighboringPieceIds).filter(targetId => {
      const target = pieces[targetId];
      if (!target) return false;
      if (target.isShielded) return false;
      return true;
    });

    // If player has NO legal neighbor moves (e.g. boxed in or all neighbors shielded),
    // prompt section 3-E states: "Hiç komşu hamlesi kalmayan oyuncu için sunucu herhangi bir boş ya da rakip parçayı seçilebilir yapar."
    if (legal.length === 0) {
      legal = Object.keys(pieces).filter(id => {
        const p = pieces[id];
        if (playerTerritorySet.has(id)) return false;
        if (p.isShielded) return false;
        return true;
      });
    }

    return legal;
  }

  public executeMove(
    pieces: Record<string, MapPieceState>,
    attacker: Player,
    targetPieceId: string,
    allPlayers: Player[]
  ): {
    success: boolean;
    type: 'claim_empty' | 'attack_normal' | 'attack_capital' | 'invalid';
    conqueredPlayerId?: string;
    capitalDamage?: boolean;
    capitalRemainingHp?: number;
    eliminatedPlayer?: Player;
  } {
    const target = pieces[targetPieceId];
    if (!target) return { success: false, type: 'invalid' };
    if (target.ownerId === attacker.id) return { success: false, type: 'invalid' };
    if (target.isShielded) return { success: false, type: 'invalid' };

    // Case 1: Empty piece
    if (target.ownerId === null) {
      target.ownerId = attacker.id;
      target.isShielded = true;
      attacker.territories.push(targetPieceId);
      attacker.stats.territoriesTaken++;
      return { success: true, type: 'claim_empty' };
    }

    // Case 2: Target is enemy Capital
    if (target.isCapital && target.capitalOwnerId) {
      const defender = allPlayers.find(p => p.id === target.capitalOwnerId);
      target.capitalHp = Math.max(0, target.capitalHp - 1);
      target.isShielded = true; // Shielded for remainder of this round
      attacker.stats.capitalHits++;

      if (defender) {
        defender.capitalHp = target.capitalHp;
      }

      // Check if defender eliminated
      if (target.capitalHp === 0 && defender && defender.isAlive) {
        defender.isAlive = false;
        // Prompt Section 3-F: All territories of the eliminated player transfer to the conqueror!
        const transferredTerritories = [...defender.territories];
        defender.territories = [];

        for (const tId of transferredTerritories) {
          const tPiece = pieces[tId];
          if (tPiece) {
            tPiece.ownerId = attacker.id;
            if (tPiece.isCapital && tPiece.capitalOwnerId === defender.id) {
              // Convert fallen capital to normal territory of the attacker
              tPiece.isCapital = false;
              tPiece.capitalOwnerId = null;
              tPiece.capitalHp = 0;
            }
          }
          if (!attacker.territories.includes(tId)) {
            attacker.territories.push(tId);
          }
        }
        attacker.stats.territoriesTaken += transferredTerritories.length;

        return {
          success: true,
          type: 'attack_capital',
          capitalDamage: true,
          capitalRemainingHp: 0,
          eliminatedPlayer: defender
        };
      }

      return {
        success: true,
        type: 'attack_capital',
        capitalDamage: true,
        capitalRemainingHp: target.capitalHp
      };
    }

    // Case 3: Target is normal enemy piece
    const previousOwnerId = target.ownerId;
    const defender = allPlayers.find(p => p.id === previousOwnerId);
    if (defender) {
      defender.territories = defender.territories.filter(id => id !== targetPieceId);
    }

    target.ownerId = attacker.id;
    target.isShielded = true;
    attacker.territories.push(targetPieceId);
    attacker.stats.territoriesTaken++;

    return {
      success: true,
      type: 'attack_normal',
      conqueredPlayerId: previousOwnerId || undefined
    };
  }

  public clearShields(pieces: Record<string, MapPieceState>): void {
    for (const piece of Object.values(pieces)) {
      piece.isShielded = false;
    }
  }

  public handlePlayerDisconnectTimeout(
    pieces: Record<string, MapPieceState>,
    disconnectedPlayer: Player
  ): void {
    // Prompt Section 3-F:
    // "Dönmezse elenmiş sayılır ve parçaları (başkenti dahil) nötr gri (sahipsiz) olur, kimseye geçmez."
    disconnectedPlayer.isAlive = false;
    for (const tId of disconnectedPlayer.territories) {
      const piece = pieces[tId];
      if (piece) {
        piece.ownerId = null;
        piece.isCapital = false;
        piece.capitalOwnerId = null;
        piece.capitalHp = 0;
        piece.isShielded = false;
      }
    }
    disconnectedPlayer.territories = [];
  }
}

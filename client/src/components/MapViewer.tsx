// client/src/components/MapViewer.tsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import mapDataJson from '../../../shared/mapData.json';
import { MapPieceState, Player } from '../../../shared/types.js';
import { CastleIcon, ShieldIcon, ColorblindBadge } from './Icons.js';
import { haptic } from './Haptics.js';

interface MapViewerProps {
  level: 1 | 2 | 3 | 4;
  pieces: Record<string, MapPieceState>;
  legalMoves: string[];
  isMyTurn: boolean;
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
  onConfirmPiece: (pieceId: string) => void;
  confirmButtonLabel?: string;
  players: Player[];
  disabled?: boolean;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  level,
  pieces,
  legalMoves,
  isMyTurn,
  selectedPieceId,
  onSelectPiece,
  onConfirmPiece,
  confirmButtonLabel = 'Seçimi Onayla',
  players,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom transform state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch tracking for pinch-zoom and drag
  const touchStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialDistance: number;
    initialZoom: number;
    lastTapTime: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialDistance: 0,
    initialZoom: 1,
    lastTapTime: 0
  });

  const levelDef = mapDataJson.levels[level] || mapDataJson.levels[1];
  const provincesMap = mapDataJson.provinces as Record<string, any>;

  // Compile piece vector data (paths and centroid)
  const pieceGeometry = useMemo(() => {
    const geo: Record<string, { paths: string[]; centerX: number; centerY: number; provinceNames: string[] }> = {};
    for (const [id, def] of Object.entries(levelDef.pieces)) {
      const paths: string[] = [];
      const provNames: string[] = [];
      let sumX = 0, sumY = 0;

      for (const plate of def.provinces) {
        const prov = provincesMap[plate];
        if (prov) {
          paths.push(...prov.paths);
          provNames.push(prov.name);
          sumX += prov.bounds.centerX;
          sumY += prov.bounds.centerY;
        }
      }

      const centerX = def.provinces.length > 0 ? sumX / def.provinces.length : 500;
      const centerY = def.provinces.length > 0 ? sumY / def.provinces.length : 250;

      geo[id] = {
        paths,
        centerX,
        centerY,
        provinceNames: provNames
      };
    }
    return geo;
  }, [level, levelDef, provincesMap]);

  // Reset zoom & pan
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    haptic.tap();
  }, []);

  // Center on a piece when selected
  const handlePieceClick = useCallback((id: string) => {
    if (disabled) return;
    haptic.tap();
    onSelectPiece(id);

    // Smoothly pan towards the center of selected piece
    const geo = pieceGeometry[id];
    if (geo && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // ViewBox is 1007.478 x 527.323
      const scaleX = rect.width / 1007.478;
      const scaleY = rect.height / 527.323;
      const targetZoom = Math.max(zoom, 1.4);
      setZoom(targetZoom);
      const targetPanX = -(geo.centerX - 503) * scaleX * 0.5;
      const targetPanY = -(geo.centerY - 263) * scaleY * 0.5;
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [disabled, onSelectPiece, pieceGeometry, zoom]);

  // Touch handlers for Pan & Pinch Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      const timeSinceLastTap = now - touchStateRef.current.lastTapTime;
      if (timeSinceLastTap < 300) {
        // Double tap -> toggle zoom
        setZoom(prev => (prev > 1.2 ? 1 : 1.8));
        setPan({ x: 0, y: 0 });
        haptic.tap();
      }
      touchStateRef.current.lastTapTime = now;
      touchStateRef.current.isDragging = true;
      touchStateRef.current.startX = e.touches[0].clientX - pan.x;
      touchStateRef.current.startY = e.touches[0].clientY - pan.y;
    } else if (e.touches.length === 2) {
      touchStateRef.current.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStateRef.current.initialDistance = Math.hypot(dx, dy);
      touchStateRef.current.initialZoom = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStateRef.current.isDragging) {
      const newX = e.touches[0].clientX - touchStateRef.current.startX;
      const newY = e.touches[0].clientY - touchStateRef.current.startY;
      // Clamp pan limits based on zoom
      const maxPan = 150 * zoom;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY))
      });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (touchStateRef.current.initialDistance > 0) {
        const factor = dist / touchStateRef.current.initialDistance;
        const newZoom = Math.max(0.9, Math.min(3.0, touchStateRef.current.initialZoom * factor));
        setZoom(newZoom);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.isDragging = false;
  };

  // Mouse drag for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStateRef.current.isDragging = true;
    touchStateRef.current.startX = e.clientX - pan.x;
    touchStateRef.current.startY = e.clientY - pan.y;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchStateRef.current.isDragging) {
      const newX = e.clientX - touchStateRef.current.startX;
      const newY = e.clientY - touchStateRef.current.startY;
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    touchStateRef.current.isDragging = false;
  };

  // Selected piece info
  const selectedDef = selectedPieceId ? levelDef.pieces[selectedPieceId] : null;
  const selectedState = selectedPieceId ? pieces[selectedPieceId] : null;
  const selectedGeo = selectedPieceId ? pieceGeometry[selectedPieceId] : null;
  const isSelectedLegal = selectedPieceId ? legalMoves.includes(selectedPieceId) : false;

  const ownerPlayer = selectedState?.ownerId
    ? players.find(p => p.id === selectedState.ownerId)
    : null;

  return (
    <div className="flex flex-col flex-1 w-full h-full relative overflow-hidden select-none bg-[#070b14]">
      {/* Map Interactive Canvas */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative overflow-hidden cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          viewBox={mapDataJson.viewBox || "0 0 1007.478 527.323"}
          className="w-full h-full transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          <defs>
            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background sea tint */}
          <rect width="100%" height="100%" fill="#070b14" />

          {/* Render each Piece */}
          {Object.entries(levelDef.pieces).map(([id, def]) => {
            const pieceState = pieces[id];
            const geo = pieceGeometry[id];
            if (!geo) return null;

            const isSelected = selectedPieceId === id;
            const isLegal = legalMoves.includes(id);

            // Determine piece fill color
            let fillColor = '#1e293b'; // Default neutral dark slate
            let strokeColor = '#334155';
            let strokeWidth = 1.2;

            const pieceOwner = pieceState?.ownerId
              ? players.find(p => p.id === pieceState.ownerId)
              : null;

            if (pieceOwner) {
              fillColor = pieceOwner.color;
            }

            if (isSelected) {
              strokeColor = '#f59e0b';
              strokeWidth = 3;
            } else if (isMyTurn && isLegal) {
              strokeColor = '#fbbf24';
              strokeWidth = 2.5;
            }

            return (
              <g
                key={id}
                onClick={() => handlePieceClick(id)}
                className={`transition-colors duration-200 cursor-pointer ${isMyTurn && isLegal ? 'legal-move-pulse' : ''}`}
                style={{
                  opacity: (isMyTurn && !isLegal && legalMoves.length > 0) ? 0.65 : 1
                }}
              >
                {geo.paths.map((d, pathIdx) => (
                  <path
                    key={pathIdx}
                    d={d}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="hover:brightness-110 active:brightness-95"
                  />
                ))}

                {/* Capital Castle Badge */}
                {pieceState?.isCapital && (
                  <g transform={`translate(${geo.centerX - 16}, ${geo.centerY - 24})`}>
                    <circle cx="16" cy="16" r="14" fill="#000" stroke="#f59e0b" strokeWidth="2.5" />
                    <g transform="translate(6, 6)">
                      <CastleIcon size={20} color="#f59e0b" />
                    </g>
                    {/* HP Hearts/Dots Badge */}
                    <g transform="translate(6, 32)">
                      <rect x="-4" y="-2" width="28" height="12" rx="6" fill="#000" stroke="#f59e0b" strokeWidth="1" />
                      <text x="10" y="8" fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle">
                        ❤️{pieceState.capitalHp}
                      </text>
                    </g>
                  </g>
                )}

                {/* Shield Badge */}
                {pieceState?.isShielded && !pieceState?.isCapital && (
                  <g transform={`translate(${geo.centerX - 12}, ${geo.centerY - 12})`}>
                    <circle cx="12" cy="12" r="12" fill="#000" stroke="#38bdf8" strokeWidth="2" />
                    <g transform="translate(3, 3)">
                      <ShieldIcon size={18} color="#38bdf8" />
                    </g>
                  </g>
                )}

                {/* Player Symbol Badge (for colorblind accessibility) on owned normal territories */}
                {pieceOwner && !pieceState?.isCapital && !pieceState?.isShielded && (
                  <g transform={`translate(${geo.centerX - 9}, ${geo.centerY - 9})`}>
                    <circle cx="9" cy="9" r="9" fill="rgba(0,0,0,0.6)" />
                    <g transform="translate(2, 2)">
                      <ColorblindBadge symbol={pieceOwner.symbol} size={14} color="#ffffff" />
                    </g>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* View Controls (Zoom in, Zoom out, Reset) */}
        <div className="absolute right-3 top-3 flex flex-col gap-2 z-10">
          <button
            onClick={() => setZoom(z => Math.min(3.0, z + 0.3))}
            className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700 text-white font-bold flex items-center justify-center text-xl shadow-lg active:scale-95"
            aria-label="Yakınlaştır"
          >
            +
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.9, z - 0.3))}
            className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700 text-white font-bold flex items-center justify-center text-xl shadow-lg active:scale-95"
            aria-label="Uzaklaştır"
          >
            −
          </button>
          <button
            onClick={handleResetView}
            className="w-10 h-10 rounded-full bg-slate-900/80 border border-amber-500/50 text-amber-400 font-bold flex items-center justify-center text-sm shadow-lg active:scale-95"
            title="Haritayı Sıfırla"
          >
            🎯
          </button>
        </div>
      </div>

      {/* Bottom Territory Info Bar & Confirmation Action */}
      <div className="w-full bg-slate-900/95 border-t border-slate-800 p-3 safe-bottom shadow-2xl flex flex-col gap-2">
        {selectedPieceId && selectedDef ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-400 font-semibold tracking-wider uppercase">
                  {selectedState?.isCapital ? '👑 BAŞKENT' : selectedState?.ownerId ? '⚔️ ELE GEÇİRİLMİŞ' : '🏳️ BOŞ PARÇA'}
                </div>
                <div className="text-base font-extrabold text-white flex items-center gap-2">
                  {selectedDef.name}
                  {ownerPlayer && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold text-white flex items-center gap-1"
                      style={{ backgroundColor: ownerPlayer.color }}
                    >
                      <ColorblindBadge symbol={ownerPlayer.symbol} size={12} color="#fff" />
                      {ownerPlayer.name}
                    </span>
                  )}
                </div>
              </div>

              {selectedState?.isCapital && (
                <div className="text-right">
                  <span className="text-xs text-slate-400">Başkent Canı</span>
                  <div className="text-sm font-black text-rose-400 flex items-center gap-1">
                    {'❤️'.repeat(selectedState.capitalHp)}
                  </div>
                </div>
              )}
            </div>

            {/* List of included provinces in combined piece */}
            {selectedGeo && selectedGeo.provinceNames.length > 1 && (
              <div className="text-xs text-slate-400 bg-slate-800/80 px-2 py-1.5 rounded-lg border border-slate-700/50 flex flex-wrap gap-1">
                <span className="text-slate-300 font-medium">Kapsadığı İller:</span>
                <span>{selectedGeo.provinceNames.join(' · ')}</span>
              </div>
            )}

            {/* Confirm button */}
            {isMyTurn && (
              <button
                disabled={disabled || !isSelectedLegal}
                onClick={() => {
                  haptic.tap();
                  onConfirmPiece(selectedPieceId);
                }}
                className={`w-full py-3.5 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-97 ${
                  isSelectedLegal
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-amber-500/25'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {isSelectedLegal ? (
                  <>
                    <span>⚡</span>
                    <span>{confirmButtonLabel}</span>
                  </>
                ) : (
                  <span>Komşu Olmayan Parça Seçilemez</span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-sm text-slate-400">
            {isMyTurn ? (
              <span className="text-amber-400 font-semibold animate-pulse">
                👉 Hamle yapmak için parlayan bir parçaya dokun
              </span>
            ) : (
              <span>Haritayı incelemek için parçalara dokunabilir veya yakınlaştırabilirsin</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

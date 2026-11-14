import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SCENARIOS } from '../data/scenarios';
import { ActiveRunState } from '../types/game';
import { getDoorId, getDoorWorldTransform } from '../utils/gameEngine';

interface ExpandableMapProps {
  run: ActiveRunState;
  expanded: boolean;
  onToggleExpand: () => void;
}

export function ExpandableMap({ run, expanded, onToggleExpand }: ExpandableMapProps) {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(4.2); // pixels per meter on expanded map

  const scenario = SCENARIOS[run.scenarioId];

  const drawWorldMap = (
    canvas: HTMLCanvasElement,
    scale: number,
    showRoomLabels: boolean
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0B111B';
    ctx.fillRect(0, 0, w, h);

    const toScreenX = (wx: number) => w / 2 + (wx - run.playerX) * scale;
    const toScreenY = (wz: number) => h / 2 + (wz - run.playerZ) * scale;

    // Subtle grid lines every 24m (chunk boundary)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    const minCx = Math.floor((run.playerX - w / (2 * scale)) / 24) - 1;
    const maxCx = Math.ceil((run.playerX + w / (2 * scale)) / 24) + 1;
    const minCz = Math.floor((run.playerZ - h / (2 * scale)) / 24) - 1;
    const maxCz = Math.ceil((run.playerZ + h / (2 * scale)) / 24) + 1;

    for (let cx = minCx; cx <= maxCx; cx++) {
      const sx = toScreenX(cx * 24 - 12);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    for (let cz = minCz; cz <= maxCz; cz++) {
      const sy = toScreenY(cz * 24 - 12);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }

    const chunks = Object.values(run.chunks);

    // 1. Roads
    ctx.fillStyle = '#1E293B';
    for (const ch of chunks) {
      for (const r of ch.roads) {
        const sx = toScreenX(r.x - r.w / 2);
        const sy = toScreenY(r.z - r.d / 2);
        ctx.fillRect(sx, sy, r.w * scale, r.d * scale);
      }
    }

    // 2. Active Hazard Zones
    for (const ch of chunks) {
      for (const haz of ch.hazards) {
        if (haz.activationWave > run.wave) continue;
        const sx = toScreenX(haz.x);
        const sy = toScreenY(haz.z);
        ctx.beginPath();
        ctx.arc(sx, sy, haz.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle =
          haz.level === 2 ? 'rgba(239, 68, 68, 0.28)' : 'rgba(245, 158, 11, 0.18)';
        ctx.fill();
      }
    }

    // 3. Rooms & Doorways
    for (const ch of chunks) {
      for (const room of ch.rooms) {
        const rx = toScreenX(room.x - room.w / 2);
        const ry = toScreenY(room.z - room.d / 2);
        const rw = room.w * scale;
        const rd = room.d * scale;

        ctx.fillStyle = room.isShelter ? 'rgba(56, 189, 248, 0.18)' : 'rgba(148, 163, 184, 0.22)';
        ctx.fillRect(rx, ry, rw, rd);

        ctx.strokeStyle = room.isShelter ? '#38BDF8' : '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, rw, rd);

        room.doors.forEach((door, dIdx) => {
          const doorId = getDoorId(room, door, dIdx);
          const isOpen = Boolean(run.openDoorIds[doorId]);
          const tr = getDoorWorldTransform(room, door);
          const dx = toScreenX(tr.x);
          const dy = toScreenY(tr.z);
          const halfSpan = (door.width * scale) / 2;
          ctx.lineWidth = isOpen ? 2.5 : 3;
          ctx.strokeStyle = isOpen ? '#10B981' : '#F59E0B';
          ctx.beginPath();
          if (tr.isHoriz) {
            ctx.moveTo(dx - halfSpan, dy);
            ctx.lineTo(dx + halfSpan, dy);
          } else {
            ctx.moveTo(dx, dy - halfSpan);
            ctx.lineTo(dx, dy + halfSpan);
          }
          ctx.stroke();
        });

        if (showRoomLabels && scale >= 2.8) {
          ctx.fillStyle = '#E2E8F0';
          ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(room.name, rx + rw / 2, ry + rd / 2 + 3);
        }
      }
    }

    // 4. Rubble Barriers
    ctx.fillStyle = '#F97316';
    for (const ch of chunks) {
      for (const rub of ch.rubbles) {
        if (run.clearedRubbleIds[rub.id]) continue;
        const rx = toScreenX(rub.x - rub.w / 2);
        const ry = toScreenY(rub.z - rub.d / 2);
        ctx.fillRect(rx, ry, Math.max(3, rub.w * scale), Math.max(3, rub.d * scale));
      }
    }

    // 5. Extraction Pads
    for (const ch of chunks) {
      if (!ch.extraction) continue;
      const sx = toScreenX(ch.extraction.x);
      const sy = toScreenY(ch.extraction.z);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(5, 2.2 * scale), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (showRoomLabels) {
        ctx.fillStyle = '#6EE7B7';
        ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EXTRACT', sx, sy - Math.max(7, 2.5 * scale));
      }
    }

    // 6. Supply Caches, Ground Pickups & Superpowers
    for (const ch of chunks) {
      for (const c of ch.caches) {
        if (run.searchedCacheIds[c.id]) continue;
        const sx = toScreenX(c.x);
        const sy = toScreenY(c.z);
        ctx.fillStyle = c.locked ? '#FBBF24' : '#38BDF8';
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
      }
      for (const p of ch.pickups || []) {
        if (run.collectedPickupIds[p.id]) continue;
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.z);
        ctx.fillStyle = '#7DD3FC';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3.5);
        ctx.lineTo(sx + 3.5, sy);
        ctx.lineTo(sx, sy + 3.5);
        ctx.lineTo(sx - 3.5, sy);
        ctx.closePath();
        ctx.fill();
      }
      for (const pw of ch.powerUps || []) {
        if (run.collectedPowerUpIds[pw.id]) continue;
        const sx = toScreenX(pw.x);
        const sy = toScreenY(pw.z);
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FACC15';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      for (const g of ch.guns || []) {
        if (run.collectedGunIds[g.id]) continue;
        const sx = toScreenX(g.x);
        const sy = toScreenY(g.z);
        ctx.fillStyle = '#F43F5E';
        ctx.fillRect(sx - 3.5, sy - 3.5, 7, 7);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - 3.5, sy - 3.5, 7, 7);
      }
      for (const coin of ch.coins || []) {
        if (run.collectedCoinIds[coin.id]) continue;
        const sx = toScreenX(coin.x);
        const sy = toScreenY(coin.z);
        ctx.beginPath();
        ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FBBF24';
        ctx.fill();
      }
    }

    // 7. Chasing Predators & Monsters
    for (const pr of Object.values(run.predatorStates)) {
      if (!pr.alive) continue;
      const sx = toScreenX(pr.x);
      const sy = toScreenY(pr.z);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 5.5);
      ctx.lineTo(sx + 5, sy + 4.5);
      ctx.lineTo(sx - 5, sy + 4.5);
      ctx.closePath();
      ctx.fillStyle = pr.kind === 'apex_monster' ? '#EF4444' : '#FB923C';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    // 8. Stranded Survivors
    for (const s of Object.values(run.survivorStates)) {
      if (s.status !== 'stranded') continue;
      const sx = toScreenX(s.x);
      const sy = toScreenY(s.z);
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = s.inHazard ? '#EF4444' : '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 8. Player Marker + 1st-Person View Cone at center
    const px = w / 2;
    const py = h / 2;
    const lookAngle = -run.playerYaw - Math.PI / 2; // Three.js yaw 0 faces -Z (up on screen)

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 24, lookAngle - 0.45, lookAngle + 0.45);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#10B981';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  };

  useEffect(() => {
    if (!expanded && miniCanvasRef.current) {
      drawWorldMap(miniCanvasRef.current, 2.4, false);
    }
    if (expanded && fullCanvasRef.current) {
      drawWorldMap(fullCanvasRef.current, zoom, true);
    }
  });

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label="Expand Sector Map"
        title="Click to expand explored world map (M)"
        className="group relative overflow-hidden rounded-xl border border-slate-700/90 bg-[#0B111B]/92 shadow-xl hover:border-amber-400 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        <canvas
          ref={miniCanvasRef}
          width={156}
          height={156}
          className="block w-[96px] h-[96px] sm:w-[144px] sm:h-[144px] md:w-[156px] md:h-[156px]"
        />
        <div className="flex items-center justify-between border-t border-slate-800 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold text-slate-300 group-hover:text-amber-300">
          <span>Map</span>
          <Maximize2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </div>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded World Map"
    >
      <div className="w-full max-w-4xl rounded-xl border border-slate-700 bg-[#131C2B] p-4 sm:p-5 space-y-3 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">
              {scenario.title} · {Object.keys(run.chunks).length} Sectors Explored ·{' '}
              {Math.round(run.distanceTraveled)}m Traveled
            </p>
            <h3 className="font-display text-2xl font-bold text-slate-100">
              Infinite Sector Map
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1.6, z - 0.8))}
              aria-label="Zoom out map"
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(8.5, z + 0.8))}
              aria-label="Zoom in map"
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Minimize Map</span>
            </button>
          </div>
        </div>

        <div
          onClick={onToggleExpand}
          title="Click map to minimize"
          className="overflow-hidden rounded-lg border border-slate-800 bg-[#0B111B] cursor-pointer flex justify-center"
        >
          <canvas
            ref={fullCanvasRef}
            width={840}
            height={480}
            className="w-full h-auto max-h-[56dvh] block"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>You &amp; View Cone</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Stranded Civilian</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-sky-400" />
              <span>Supply Cache</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rotate-45 bg-sky-300" />
              <span>Ground Supply</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400 border border-white" />
              <span>Superpower</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span>Gold Coin</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-rose-500 border border-white" />
              <span>30s Gun</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 border border-white" />
              <span>Predator</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-emerald-400" />
              <span>Extraction Pad</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-orange-500" />
              <span>Debris Barrier</span>
            </span>
          </div>
          <span className="text-slate-400">Click map or press M to close</span>
        </div>
      </div>
    </div>
  );
}

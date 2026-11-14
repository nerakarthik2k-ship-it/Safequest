import {
  AlertTriangle,
  ArrowUp,
  Backpack,
  ChevronDown,
  ChevronUp,
  Coins,
  Compass,
  Crosshair,
  Eye,
  Heart,
  Home,
  Moon,
  Navigation,
  Plus,
  RotateCcw,
  RotateCw,
  Settings,
  Shield,
  ShieldCheck,
  Skull,
  Sun,
  Trash2,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { CHARACTERS } from '../data/characters';
import { GAME_MODES } from '../data/gameModes';
import { GUNS } from '../data/guns';
import { POWER_UPS } from '../data/powerUps';
import { createItem, SCENARIOS } from '../data/scenarios';
import { formatPhaseLabel, t } from '../i18n/translations';
import {
  ActiveRunState,
  CameraViewMode,
  CustomMusicControls,
  LanguageCode,
  NearbyPrompt,
  PowerUpType,
  ResourceArrowTarget,
  ThemeMode,
} from '../types/game';
import { groupInventory, hasItemType } from '../utils/gameEngine';
import { CustomMusicPlayer } from './CustomMusicPlayer';
import { ExpandableMap } from './ExpandableMap';
import { VirtualJoystick } from './VirtualJoystick';

interface GameHUDProps {
  run: ActiveRunState;
  lang: LanguageCode;
  nearbyPrompt: NearbyPrompt | null;
  resourceArrow: ResourceArrowTarget | null;
  extractionDist: number;
  extractionAngleDeg: number;
  mapExpanded: boolean;
  muted: boolean;
  sprintActive: boolean;
  viewMode: CameraViewMode;
  theme: ThemeMode;
  totalCoins: number;
  music: CustomMusicControls;
  onToggleMap: () => void;
  onToggleMute: () => void;
  onToggleSprint: () => void;
  onToggleViewMode: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onQuickHeal: () => void;
  onJoystickChange: (vec: { x: number; y: number }) => void;
  onRotateCamera: (deltaRad: number) => void;
  onJump: () => void;
  onFireGun: () => void;
  onInteractPrompt: (prompt: NearbyPrompt) => void;
  onUseItem: (itemId: string) => void;
  onDropItem: (itemId: string) => void;
  onRestart: () => void;
  onExitMenu: () => void;
}

export function GameHUD({
  run,
  lang,
  nearbyPrompt,
  resourceArrow,
  extractionDist,
  extractionAngleDeg,
  mapExpanded,
  muted,
  sprintActive,
  viewMode,
  theme,
  totalCoins,
  music,
  onToggleMap,
  onToggleMute,
  onToggleSprint,
  onToggleViewMode,
  onToggleTheme,
  onOpenSettings,
  onQuickHeal,
  onJoystickChange,
  onRotateCamera,
  onJump,
  onFireGun,
  onInteractPrompt,
  onUseItem,
  onDropItem,
  onRestart,
  onExitMenu,
}: GameHUDProps) {
  const [packExpanded, setPackExpanded] = useState(true);
  const scenario = SCENARIOS[run.scenarioId];
  const modeDef = GAME_MODES[run.gameMode];
  const activeChar = CHARACTERS[run.characterId];
  const stackedItems = groupInventory(run.inventory);
  const hasGear = hasItemType(run.inventory, 'gear');
  const hasMedkit = hasItemType(run.inventory, 'medkit');
  const gearEmoji = createItem('gear', scenario, 'hud-gear').emoji;
  const healthRatio = run.maxHealth > 0 ? run.health / run.maxHealth : 0;
  const healthStatus =
    healthRatio > 0.7 ? 'OPTIMAL' : healthRatio > 0.35 ? 'INJURED' : 'CRITICAL';
  const staminaRatio = run.maxStamina > 0 ? run.stamina / run.maxStamina : 0;

  const survivorsList = Object.values(run.survivorStates);
  const escortedCount = survivorsList.filter((s) => s.status === 'escorted').length;
  const savedSoloCount = survivorsList.filter((s) => s.status === 'self_evacuated').length;
  const strandedCount = survivorsList.filter((s) => s.status === 'stranded').length;
  const savedTotalCount = escortedCount + savedSoloCount;

  const latestLog = run.logs[0];

  const isWaveImminent = run.nextWaveInSec <= 5 && run.nextWaveInSec > 0;
  const isWaveStrike = run.elapsedSec < run.waveBannerUntilSec && run.wave > 0;
  const isAllClear = run.disasterPhase === 'all_clear';
  const phasePct = Math.min(100, Math.round((run.elapsedSec / Math.max(1, run.disasterDurationSec)) * 100));

  const warningBanner =
    run.inHazardLevel === 2
      ? {
          tone: 'critical' as const,
          title: `DANGER: INSIDE ${scenario.severeLabel.toUpperCase()}`,
          detail: hasGear
            ? `${scenario.gearName} reducing damage — move clear now.`
            : `Rapid health loss! Escape zone or equip ${scenario.gearName}.`,
        }
      : isWaveStrike
      ? {
          tone: 'strike' as const,
          title: `WAVE ${run.wave} DISASTER SURGE`,
          detail: `${scenario.severeLabel} has intensified across the sector.`,
        }
      : isWaveImminent
      ? {
          tone: 'incoming' as const,
          title: `INCOMING ${scenario.severeLabel.toUpperCase()} IN ${Math.ceil(run.nextWaveInSec)}s`,
          detail:
            run.scenarioId === 'blizzard' || run.scenarioId === 'coldwave' || run.scenarioId === 'avalanche'
              ? 'Get inside a heated shelter or fire an Emergency Flare.'
              : run.scenarioId === 'earthquake' || run.scenarioId === 'volcano'
              ? 'Brace for seismic tremors and falling debris.'
              : `Move toward solid shelter or equip ${scenario.gearName}.`,
        }
      : run.inHazardLevel === 1
      ? {
          tone: 'moderate' as const,
          title: `HAZARD EXPOSURE: ${scenario.hazardLabel.toUpperCase()}`,
          detail: `Stamina draining — seek indoor shelter or ${scenario.gearName}.`,
        }
      : null;

  const activePowerList = (
    Object.entries(run.activePowers) as Array<[PowerUpType, number]>
  ).filter(([, rem]) => typeof rem === 'number' && rem > 0);

  let nearestPredatorDist = 999;
  let nearestPredatorName = '';
  for (const pr of Object.values(run.predatorStates)) {
    if (!pr.alive) continue;
    const d = Math.hypot(run.playerX - pr.x, run.playerZ - pr.z);
    if (d < nearestPredatorDist) {
      nearestPredatorDist = d;
      nearestPredatorName = pr.name;
    }
  }
  const activeGunDef = run.activeGun ? GUNS[run.activeGun.type] : null;

  const isWaterBiome =
    run.scenarioId === 'flood' ||
    run.scenarioId === 'tsunami' ||
    run.scenarioId === 'storm_surge' ||
    run.scenarioId === 'glof';
  const isColdBiome =
    run.scenarioId === 'blizzard' ||
    run.scenarioId === 'avalanche' ||
    run.scenarioId === 'coldwave' ||
    run.scenarioId === 'heavy_snowfall' ||
    run.scenarioId === 'hailstorm';
  const isStormBiome =
    run.scenarioId === 'thunderstorm' ||
    run.scenarioId === 'cyclone' ||
    run.scenarioId === 'windstorm';
  const isHeatOrDustBiome =
    run.scenarioId === 'wildfire' ||
    run.scenarioId === 'volcano' ||
    run.scenarioId === 'asteroid' ||
    run.scenarioId === 'heatwave' ||
    run.scenarioId === 'duststorm' ||
    run.scenarioId === 'drought';

  const vignetteGradient =
    run.inHazardLevel === 2
      ? isWaterBiome
        ? 'radial-gradient(circle at center, transparent 52%, rgba(14, 165, 233, 0.44) 100%)'
        : isColdBiome
        ? 'radial-gradient(circle at center, transparent 50%, rgba(186, 230, 253, 0.48) 100%)'
        : isStormBiome
        ? 'radial-gradient(circle at center, transparent 50%, rgba(99, 102, 241, 0.45) 100%)'
        : run.scenarioId === 'tornado'
        ? 'radial-gradient(circle at center, transparent 52%, rgba(132, 204, 22, 0.36) 100%)'
        : 'radial-gradient(circle at center, transparent 50%, rgba(239, 68, 68, 0.45) 100%)'
      : run.inHazardLevel === 1
      ? 'radial-gradient(circle at center, transparent 60%, rgba(245, 158, 11, 0.25) 100%)'
      : isColdBiome && run.currentRoomName === 'Outdoor Corridor'
      ? 'radial-gradient(circle at center, transparent 65%, rgba(186, 230, 253, 0.22) 100%)'
      : isHeatOrDustBiome
      ? 'radial-gradient(circle at center, transparent 68%, rgba(249, 115, 22, 0.14) 100%)'
      : undefined;

  return (
    <>
      {/* Screen-Space Atmospheric & Hazard Vignette (z-10) */}
      {vignetteGradient && (
        <div
          className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-300 ${
            run.inHazardLevel === 2 ? 'animate-hazard' : ''
          }`}
          style={{ background: vignetteGradient }}
        />
      )}

      {/* Press-anywhere floating joystick on left half of screen (z-10) */}
      {!mapExpanded && <VirtualJoystick onVectorChange={onJoystickChange} />}

      {/* HUD Chrome Layer */}
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-5">
        {/* Top Section: Vitals | Lifecycle + Resource Arrow | Controls + Minimap */}
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left Compact Vitals Panel */}
            <div className="pointer-events-auto w-full max-w-[335px] rounded-xl border border-slate-700/80 bg-[#0B111B]/92 p-3.5 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="truncate">{scenario.title}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-300 font-medium shrink-0">{modeDef.title}</span>
                    <span aria-hidden="true">·</span>
                    {(() => {
                      const isNight = Math.floor(run.elapsedSec / 60) % 2 === 1;
                      const remCycleSec = Math.max(1, Math.ceil(60 - (run.elapsedSec % 60)));
                      return (
                        <span
                          title="Day and Night switch every 60 seconds"
                          className={`inline-flex items-center gap-1 font-mono-tabular font-semibold shrink-0 ${
                            isNight ? 'text-sky-300' : 'text-amber-300'
                          }`}
                        >
                          {isNight ? (
                            <Moon className="h-3 w-3 text-sky-400" />
                          ) : (
                            <Sun className="h-3 w-3 text-amber-400" />
                          )}
                          <span>
                            {isNight ? t(lang, 'night') : t(lang, 'day')} ({remCycleSec}s)
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Home className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span className="font-display text-lg font-bold text-slate-100 truncate">
                      {run.currentRoomName}
                    </span>
                  </div>
                </div>

                {/* Extraction Compass */}
                <div
                  className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 shrink-0"
                  title={`Direction & distance to nearest ${scenario.extractionName}`}
                >
                  <Compass
                    className={`h-4 w-4 transition-transform duration-150 ${
                      isAllClear ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                    style={{ transform: `rotate(${extractionAngleDeg}deg)` }}
                  />
                  <span
                    className={`font-mono-tabular text-[10px] font-semibold mt-0.5 ${
                      isAllClear ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {extractionDist}m
                  </span>
                </div>
              </div>

              {/* Disaster Lifecycle & All-Clear Status Bar */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span
                    className={`font-bold uppercase tracking-wider truncate ${
                      isAllClear
                        ? 'text-emerald-400'
                        : run.disasterPhase === 'peak_danger'
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {formatPhaseLabel(lang, run.disasterPhase)}
                  </span>
                  <span className="font-mono-tabular text-slate-300 shrink-0">
                    {isAllClear ? 'READY' : `${Math.ceil(run.disasterTimeRemainingSec)}s`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAllClear
                        ? 'bg-emerald-500'
                        : run.disasterPhase === 'peak_danger'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${phasePct}%` }}
                  />
                </div>
              </div>

              {/* Health System & Stamina Bars */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Heart className="h-3 w-3 text-rose-400 shrink-0" />
                      <span
                        className={`font-bold text-[10px] ${
                          healthStatus === 'OPTIMAL'
                            ? 'text-emerald-400'
                            : healthStatus === 'INJURED'
                            ? 'text-amber-400'
                            : 'text-red-400 animate-pulse'
                        }`}
                      >
                        {t(lang, 'healthLabel')}
                      </span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-100">
                      {Math.ceil(run.health)}/{run.maxHealth}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-150 ${
                        healthRatio > 0.7
                          ? 'bg-emerald-500'
                          : healthRatio > 0.35
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, healthRatio * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-slate-300 truncate">
                      <Wind className="h-3 w-3 text-sky-400 shrink-0" />
                      <span className="truncate">{scenario.staminaLabel}</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-100">
                      {Math.ceil(run.stamina)}/{run.maxStamina}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-150 ${
                        staminaRatio > 0.35 ? 'bg-sky-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, staminaRatio * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Medkit Heal + Character Tag */}
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-mono-tabular text-slate-400 truncate">
                  {activeChar.callsign} · {activeChar.name}
                </span>
                {hasMedkit && run.health < run.maxHealth && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      onQuickHeal();
                      e.currentTarget.blur();
                    }}
                    className="inline-flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 font-semibold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    title="Use Medkit (H)"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Heal (H)</span>
                  </button>
                )}
              </div>

              {/* Survivor, Point Counter, Coins, Kills & Gear Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {run.gameMode === 'rescue_ops'
                      ? `${savedTotalCount}/${modeDef.requiredRescues} Saved · ${strandedCount} Nearby`
                      : run.gameMode === 'endless_survival'
                      ? `${Math.floor(run.elapsedSec)}s · ${savedTotalCount} Saved`
                      : `${escortedCount} Party · ${savedSoloCount} Evac · ${strandedCount} Nearby`}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2.5">
                  <span
                    title={t(lang, 'pointsLabel')}
                    className="inline-flex items-center gap-1 font-mono-tabular font-bold text-emerald-300"
                  >
                    <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{run.points.toLocaleString()}</span>
                  </span>
                  <span
                    title="Collected Coins"
                    className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-amber-300"
                  >
                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                    <span>{totalCoins}</span>
                    {run.coinsCollected > 0 && (
                      <span className="text-[10px] text-emerald-300">+{run.coinsCollected}</span>
                    )}
                  </span>
                  {run.predatorsDefeatedCount > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono-tabular text-rose-400 font-semibold">
                      <Skull className="h-3 w-3" />
                      <span>{run.predatorsDefeatedCount}</span>
                    </span>
                  )}
                  {hasGear && (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                      <span aria-hidden="true">{gearEmoji}</span>
                      <Shield className="h-3 w-3" />
                    </span>
                  )}
                </span>
              </div>

              {latestLog && (
                <p className="text-[11px] text-slate-300 border-t border-slate-800/80 pt-1.5 line-clamp-2 leading-snug">
                  {latestLog.text}
                </p>
              )}
            </div>

            {/* Top-Center: Intelligent Non-Spoilery Directional Resource Arrow + All-Clear Notice */}
            <div className="hidden sm:flex flex-col items-center gap-2 max-w-[300px]">
              {resourceArrow && (
                <div
                  className="rounded-xl border border-amber-400/70 bg-[#0B111B]/92 px-3.5 py-2 shadow-xl flex items-center gap-3"
                  title={t(lang, 'resourceSignalHint')}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/15 shrink-0">
                    <Navigation
                      className="h-5 w-5 text-amber-400 transition-transform duration-150"
                      style={{ transform: `rotate(${resourceArrow.angleDeg}deg)` }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        {t(lang, 'resourceSignal')}
                      </span>
                      <span className="font-mono-tabular text-xs font-bold text-white">
                        {resourceArrow.distance}m
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight line-clamp-2">
                      {t(lang, 'resourceSignalHint')}
                    </p>
                  </div>
                </div>
              )}

              {isAllClear && run.gameMode !== 'endless_survival' && (
                <div className="rounded-xl border border-emerald-400/75 bg-emerald-950/92 px-3.5 py-2 text-xs font-semibold text-emerald-100 shadow-xl flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span>{t(lang, 'allClearReadyNotice')}</span>
                </div>
              )}

              {!isAllClear && run.earlyExitAttempts > 0 && (
                <div className="rounded-xl border border-amber-500/80 bg-[#23140B]/95 px-3.5 py-2 text-[11px] font-semibold text-amber-100 shadow-xl text-center">
                  {t(lang, 'waitAllClearNotice')}
                </div>
              )}
            </div>

            {/* Top-Right Click-to-Expand Minimap + Controls */}
            <div className="pointer-events-auto flex flex-col items-end gap-2.5">
              <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-slate-700/80 bg-[#0B111B]/92 px-2.5 py-1.5 shadow-xl">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onToggleViewMode();
                    e.currentTarget.blur();
                  }}
                  title="Switch 1st / 3rd Person View (V)"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === 'third_person'
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {viewMode === 'third_person' ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {viewMode === 'third_person' ? t(lang, 'thirdPerson') : t(lang, 'firstPerson')}
                  </span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onToggleTheme();
                    e.currentTarget.blur();
                  }}
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-sky-400" />
                  )}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onOpenSettings();
                    e.currentTarget.blur();
                  }}
                  title={t(lang, 'settings')}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <div className="h-4 w-px bg-slate-700" />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onRotateCamera(Math.PI / 6);
                    e.currentTarget.blur();
                  }}
                  title="Turn Left (Q)"
                  className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onRotateCamera(-Math.PI / 6);
                    e.currentTarget.blur();
                  }}
                  title="Turn Right (E)"
                  className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <div className="h-4 w-px bg-slate-700" />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onToggleMute();
                    e.currentTarget.blur();
                  }}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onRestart();
                    e.currentTarget.blur();
                  }}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onExitMenu();
                    e.currentTarget.blur();
                  }}
                  className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t(lang, 'disasters')}
                </button>
              </div>

              <CustomMusicPlayer
                music={music}
                muted={muted}
                variant="compact"
                onUnmute={onToggleMute}
              />

              {!mapExpanded && (
                <ExpandableMap run={run} expanded={false} onToggleExpand={onToggleMap} />
              )}
            </div>
          </div>

          {/* Incoming / Active Disaster Warning Banner */}
          {warningBanner && (
            <div className="flex justify-center">
              <div
                role="status"
                aria-live="polite"
                className={`w-full max-w-md rounded-xl border px-4 py-2.5 shadow-2xl flex items-center gap-3 ${
                  warningBanner.tone === 'critical'
                    ? 'border-red-500/80 bg-[#230E12]/95 text-red-100'
                    : warningBanner.tone === 'strike'
                    ? 'border-orange-500/80 bg-[#23140B]/95 text-orange-100'
                    : warningBanner.tone === 'incoming'
                    ? 'border-amber-400/80 bg-[#1F1809]/95 text-amber-100'
                    : 'border-amber-500/60 bg-[#131C2B]/92 text-slate-100'
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 shrink-0 ${
                    warningBanner.tone === 'critical'
                      ? 'text-red-400'
                      : warningBanner.tone === 'strike'
                      ? 'text-orange-400'
                      : 'text-amber-400'
                  }`}
                />
                <div className="min-w-0">
                  <p className="font-mono-tabular text-xs font-bold tracking-wide truncate">
                    {warningBanner.title}
                  </p>
                  <p className="text-[11px] opacity-90 truncate">{warningBanner.detail}</p>
                </div>
              </div>
            </div>
          )}

          {/* Active Limited-Time Superpowers, Equipped 30s Gun & Predator Alert */}
          {(activePowerList.length > 0 || (run.activeGun && activeGunDef) || nearestPredatorDist < 15) && (
            <div className="flex flex-wrap justify-center gap-2">
              {run.activeGun && activeGunDef && (
                <div
                  className="w-[196px] rounded-xl border bg-[#190D16]/94 px-3 py-2 shadow-xl space-y-1.5"
                  style={{ borderColor: activeGunDef.colorHex }}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-100 truncate">
                      {activeGunDef.emoji} {activeGunDef.name}
                    </span>
                    <span
                      className="font-mono-tabular font-bold shrink-0"
                      style={{ color: activeGunDef.colorHex }}
                    >
                      {Math.ceil(run.activeGun.remainingSec)}s
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full transition-all duration-150"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (run.activeGun.remainingSec / activeGunDef.durationSec) * 100)
                        )}%`,
                        backgroundColor: activeGunDef.colorHex,
                      }}
                    />
                  </div>
                </div>
              )}

              {nearestPredatorDist < 15 && (
                <div className="rounded-xl border border-red-500/80 bg-[#230E12]/94 px-3 py-2 shadow-xl flex items-center gap-2 text-xs text-red-100">
                  <Skull className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="font-semibold truncate">
                    {nearestPredatorName} chasing ({Math.round(nearestPredatorDist)}m)
                  </span>
                </div>
              )}

              {activePowerList.map(([powerKey, remSec]) => {
                const def = POWER_UPS[powerKey];
                const pct = Math.max(0, Math.min(100, (remSec / def.durationSec) * 100));
                return (
                  <div
                    key={powerKey}
                    className="w-[168px] rounded-xl border bg-[#0B111B]/92 px-3 py-2 shadow-xl space-y-1.5"
                    style={{ borderColor: def.colorHex }}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-100 truncate">
                        {def.emoji} {def.name}
                      </span>
                      <span
                        className="font-mono-tabular font-bold shrink-0"
                        style={{ color: def.colorHex }}
                      >
                        {Math.ceil(remSec)}s
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full transition-all duration-150"
                        style={{ width: `${pct}%`, backgroundColor: def.colorHex }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Row: Center Collapsible Backpack & Interact Prompt + Action Buttons */}
        <div className="flex items-end justify-center md:justify-between gap-4">
          <div className="hidden md:block w-[200px]" />

          {/* Bottom-Center Collapsible Backpack & Interact Dock */}
          <div className="pointer-events-auto w-full max-w-[520px] flex flex-col items-center gap-2">
            {nearbyPrompt && (
              <div className="w-full rounded-xl border border-amber-400/70 bg-[#131C2B]/95 px-4 py-2.5 flex items-center justify-between gap-4 shadow-2xl">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-400 truncate">
                    {nearbyPrompt.title}
                  </p>
                  <p className="text-[11px] text-slate-300 truncate">{nearbyPrompt.subtitle}</p>
                </div>
                <button
                  type="button"
                  disabled={nearbyPrompt.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    onInteractPrompt(nearbyPrompt);
                    e.currentTarget.blur();
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    nearbyPrompt.disabled
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                  }`}
                >
                  {nearbyPrompt.actionLabel} (F)
                </button>
              </div>
            )}

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                setPackExpanded((p) => !p);
                e.currentTarget.blur();
              }}
              className="inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-slate-700/80 bg-[#0B111B]/90 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
            >
              <Backpack className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">Pack · {run.inventory.length}</span>
              {stackedItems.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs">
                  {stackedItems.map((entry) => (
                    <span
                      key={entry.type}
                      title={`${entry.sampleItem.name} ×${entry.count}`}
                      className="inline-flex items-center gap-0.5 font-mono-tabular text-slate-200"
                    >
                      <span aria-hidden="true">{entry.sampleItem.emoji}</span>
                      <span className="text-[10px] text-amber-300">×{entry.count}</span>
                    </span>
                  ))}
                </span>
              )}
              {packExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>

            {packExpanded && (
              <div className="w-full max-h-[140px] overflow-y-auto rounded-xl border border-slate-700/80 bg-[#0B111B]/92 p-3 shadow-xl">
                {stackedItems.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-1">
                    Backpack empty — walk into rooms to scavenge supply lockers.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {stackedItems.map((entry) => {
                      const item = entry.sampleItem;
                      const usable =
                        item.type === 'medkit' || item.type === 'water' || item.type === 'flare';
                      return (
                        <div
                          key={entry.type}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-700/90 bg-slate-900 px-2.5 py-1.5"
                          title={item.description}
                        >
                          <span className="text-base leading-none" aria-hidden="true">
                            {item.emoji}
                          </span>
                          <span className="text-xs font-medium text-slate-100 whitespace-nowrap">
                            {item.shortLabel}
                            {entry.count > 1 && (
                              <span className="ml-1 font-mono-tabular text-amber-400">
                                ×{entry.count}
                              </span>
                            )}
                          </span>
                          {usable && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                onUseItem(item.id);
                                e.currentTarget.blur();
                              }}
                              className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
                            >
                              Use
                            </button>
                          )}
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              onDropItem(item.id);
                              e.currentTarget.blur();
                            }}
                            aria-label={`Drop ${item.name}`}
                            className="text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pointer-events-auto flex flex-col items-end gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              {run.activeGun && run.activeGun.remainingSec > 0 && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onFireGun();
                    e.currentTarget.blur();
                  }}
                  aria-label="Fire Weapon"
                  className="flex h-14 w-20 sm:w-24 flex-col items-center justify-center rounded-xl border border-rose-400 bg-rose-600 text-white shadow-xl hover:bg-rose-500 active:scale-95 transition-all cursor-pointer touch-none select-none"
                >
                  <Crosshair className="h-5 w-5 text-amber-200" />
                  <span className="text-[11px] font-bold tracking-wide">
                    FIRE <span className="hidden md:inline font-normal text-rose-100">(G)</span>
                  </span>
                </button>
              )}

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  onToggleSprint();
                  e.currentTarget.blur();
                }}
                aria-pressed={sprintActive}
                aria-label="Toggle Sprint"
                className={`flex h-14 w-20 sm:w-24 flex-col items-center justify-center rounded-xl border shadow-xl active:scale-95 transition-all cursor-pointer ${
                  sprintActive
                    ? 'border-amber-300 bg-amber-500 text-slate-950'
                    : 'border-slate-600 bg-[#131C2B]/95 text-slate-100 hover:border-amber-400/70 hover:bg-slate-800'
                }`}
              >
                <Zap className={`h-4 w-4 ${sprintActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span className="text-[11px] font-bold tracking-wide mt-0.5">
                  {sprintActive ? 'SPRINT ON' : 'SPRINT'}{' '}
                  <span
                    className={`hidden md:inline font-normal ${
                      sprintActive ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    (Shift)
                  </span>
                </span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onJump();
                  e.currentTarget.blur();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onJump();
                  }
                }}
                aria-label="Jump"
                className="flex h-14 w-20 sm:w-24 flex-col items-center justify-center rounded-xl border border-sky-400/60 bg-[#131C2B]/95 text-slate-100 shadow-xl hover:border-sky-300 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer touch-none select-none"
              >
                <ArrowUp className="h-5 w-5 text-sky-400" />
                <span className="text-[11px] font-bold tracking-wide">
                  JUMP <span className="hidden md:inline font-normal text-slate-400">(Space)</span>
                </span>
              </button>
            </div>

            <div className="hidden md:block text-right text-[11px] text-slate-300 bg-[#0B111B]/80 border border-slate-800 rounded-lg px-3 py-2 w-[225px]">
              <p>Drag: Look · Click / G: Fire Gun</p>
              <p>Shift: Sprint · Space: Jump</p>
              <p>F: Interact · M: Expand Map</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Map Overlay */}
      {mapExpanded && <ExpandableMap run={run} expanded={true} onToggleExpand={onToggleMap} />}
    </>
  );
}

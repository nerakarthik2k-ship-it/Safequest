import {
  ArrowRight,
  Award,
  CheckCircle2,
  Coins,
  Compass,
  Crosshair,
  Eye,
  HeartHandshake,
  Lock,
  Minus,
  PackageSearch,
  Plus,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Skull,
  Trophy,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_ORDER, REGIONS } from '../data/achievements';
import { CHARACTERS } from '../data/characters';
import { GAME_MODES, GAME_MODE_ORDER } from '../data/gameModes';
import { createItem, DISASTER_ORDER, SCENARIOS } from '../data/scenarios';
import { t } from '../i18n/translations';
import {
  CameraViewMode,
  CareerStats,
  CharacterId,
  CustomMusicControls,
  Difficulty,
  DisasterId,
  GameMode,
  ItemType,
  LanguageCode,
  RegionId,
} from '../types/game';
import { CustomMusicPlayer } from './CustomMusicPlayer';
import { WorldMapPanel } from './WorldMapPanel';

interface ShopCatalogItem {
  type: ItemType;
  cost: number;
  benefit: string;
}

const STARTING_SHOP_CATALOG: ShopCatalogItem[] = [
  { type: 'water', cost: 2, benefit: '+40% Stamina / Warmth' },
  { type: 'medkit', cost: 3, benefit: '+38% Health & stabilize' },
  { type: 'flare', cost: 3, benefit: 'Clears fog 18s & reveals caches' },
  { type: 'tool', cost: 4, benefit: 'Clears debris & unlocks caches' },
  { type: 'gear', cost: 5, benefit: 'Cuts hazard damage & drain' },
];

interface TitleMenuProps {
  lang: LanguageCode;
  selectedDisaster: DisasterId;
  difficulty: Difficulty;
  selectedMode: GameMode;
  selectedCharacter: CharacterId;
  viewMode: CameraViewMode;
  enablePredators: boolean;
  enableGuns: boolean;
  totalCoins: number;
  bestPoints: number;
  purchasedItems: ItemType[];
  careerStats: CareerStats;
  muted: boolean;
  music: CustomMusicControls;
  onSelectDisaster: (id: DisasterId) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onSelectMode: (mode: GameMode) => void;
  onChangeCharacter: () => void;
  onSelectViewMode: (mode: CameraViewMode) => void;
  onTogglePredators: () => void;
  onToggleGuns: () => void;
  onBuyResource: (itemType: ItemType, cost: number) => void;
  onRefundResource: (itemType: ItemType, cost: number) => void;
  onUnmute: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onStartRun: () => void;
}

export function TitleMenu({
  lang,
  selectedDisaster,
  difficulty,
  selectedMode,
  selectedCharacter,
  viewMode,
  enablePredators,
  enableGuns,
  totalCoins,
  bestPoints,
  purchasedItems,
  careerStats,
  muted,
  music,
  onSelectDisaster,
  onSelectDifficulty,
  onSelectMode,
  onChangeCharacter,
  onSelectViewMode,
  onTogglePredators,
  onToggleGuns,
  onBuyResource,
  onRefundResource,
  onUnmute,
  onOpenSettings,
  onOpenStats,
  onStartRun,
}: TitleMenuProps) {
  const active = SCENARIOS[selectedDisaster];
  const activeRegion = REGIONS[active.regionId];
  const activeDiff = DIFFICULTIES[difficulty];
  const activeMode = GAME_MODES[selectedMode];
  const activeChar = CHARACTERS[selectedCharacter];
  const activeGearEmoji = createItem('gear', active, 'menu-gear').emoji;
  const activeToolEmoji = createItem('tool', active, 'menu-tool').emoji;
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [selectedRegion, setSelectedRegion] = useState<RegionId | 'all'>('all');

  const isRegionUnlocked = (regionId: RegionId) =>
    careerStats.sandboxUnlockAll || careerStats.unlockedRegions.includes(regionId);

  const activeUnlocked = isRegionUnlocked(active.regionId);

  const handleSelectRegion = (region: RegionId | 'all') => {
    setSelectedRegion(region);
    if (region !== 'all') {
      const reg = REGIONS[region];
      if (!reg.disasters.includes(selectedDisaster)) {
        onSelectDisaster(reg.disasters[0]);
      }
    }
  };

  const visibleDisasters =
    selectedRegion === 'all' ? DISASTER_ORDER : REGIONS[selectedRegion].disasters;

  const markFailed = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const countQueued = (type: ItemType) =>
    purchasedItems.filter((item) => item === type).length;

  return (
    <main className="mx-auto max-w-[1440px] px-3.5 sm:px-6 py-5 sm:py-8 space-y-8 sm:space-y-12">
      {/* Hero Briefing Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-stretch">
        <div className="lg:col-span-7 relative min-h-[340px] lg:min-h-[460px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {active.imageUrl && !failedImages[active.id] ? (
            <img
              src={active.imageUrl}
              alt={`${active.title} at ${active.location}`}
              referrerPolicy="no-referrer"
              onError={() => markFailed(active.id)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center p-8 text-center"
              style={{
                background: `radial-gradient(circle at 30% 25%, ${active.accentHex}38, #0f172a 65%, #070b14 100%)`,
              }}
            >
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border"
                style={{
                  borderColor: `${active.accentHex}88`,
                  backgroundColor: `${active.accentHex}22`,
                }}
              >
                <ShieldAlert className="h-8 w-8" style={{ color: active.accentHex }} />
              </div>
              <p className="font-mono-tabular text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">
                {activeRegion.name} · {active.biomeLabel}
              </p>
              <p className="font-display text-3xl font-bold text-slate-100">{active.title}</p>
              <p className="text-sm text-slate-300 mt-1">{active.location}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B111B] via-[#0B111B]/45 to-transparent" />
          <div className="hero-photo-overlay absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300 mb-2">
              <span
                className="rounded px-2 py-0.5 font-semibold text-slate-950"
                style={{ backgroundColor: active.accentHex }}
              >
                {active.biomeLabel}
              </span>
              <span>{active.location}</span>
              <span aria-hidden="true">·</span>
              <span>Recommended: {DIFFICULTIES[active.recommendedMinDifficulty].label}+</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white text-balance">
              {active.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-200 leading-relaxed">
              {active.subtitle}
            </p>
          </div>
        </div>

        {/* Briefing & Controls Column */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-800 bg-[#131C2B] p-6 md:p-7">
          <div className="space-y-4">
            {/* Active Character, Best Points & Quick Modal Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-100 truncate">
                  {activeChar.name}{' '}
                  <span className="font-mono-tabular text-sky-400">({activeChar.callsign})</span>
                </p>
                <p className="text-[10px] text-emerald-400 truncate">{activeChar.perkLabel}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] font-semibold text-amber-300 mr-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>{bestPoints.toLocaleString()}</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenStats}
                  title={t(lang, 'achievementsStats')}
                  className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-emerald-400 hover:border-emerald-400 cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title={t(lang, 'settings')}
                  className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:border-amber-400 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onChangeCharacter}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-amber-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Character
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-amber-400 mb-1">Sector Briefing</p>
              <h2 className="font-display text-2xl font-bold text-slate-100 text-balance">
                Observe conditions, shelter through Peak Danger, wait for All-Clear
              </h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{active.briefing}</p>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-400 shrink-0">Hazard Behavior</span>
                <span className="text-right text-slate-200">{active.hazardMechanic}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Extraction Target</span>
                <span className="font-medium text-emerald-400">{active.extractionName}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Key Gear &amp; Tool</span>
                <span className="text-slate-200">
                  {activeGearEmoji} {active.gearName} · {activeToolEmoji} {active.toolName}
                </span>
              </div>
            </div>

            {/* 5-Tier Difficulty Progression */}
            <div className="border-t border-slate-800 pt-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">{t(lang, 'difficulty')}</span>
                <span className="text-[11px] text-amber-300 truncate">{activeDiff.tagline}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                {DIFFICULTY_ORDER.map((d) => {
                  const cfg = DIFFICULTIES[d];
                  const activeBtn = difficulty === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onSelectDifficulty(d)}
                      className={`rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        activeBtn
                          ? d === 'expert' || d === 'advanced'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-sky-400 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {activeDiff.compoundHazardEnabled && active.secondaryHazardId && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/25 px-3 py-1.5 text-[11px] text-amber-200">
                  Compound Emergency: Paired with{' '}
                  <strong className="text-white">
                    {SCENARIOS[active.secondaryHazardId].title}
                  </strong>
                </div>
              )}

              {/* Camera Perspective */}
              <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-900 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => onSelectViewMode('third_person')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === 'third_person'
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>{t(lang, 'thirdPerson')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectViewMode('first_person')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === 'first_person'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{t(lang, 'firstPerson')}</span>
                </button>
              </div>
            </div>

            {/* Optional Monsters & 30s Ground Guns */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-xs font-medium text-slate-400">
                  Monsters &amp; Guns (Optional)
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeMode.title}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={enablePredators}
                  onClick={onTogglePredators}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    enablePredators
                      ? 'border-rose-500/70 bg-rose-950/45 text-rose-100'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Skull
                      className={`h-3.5 w-3.5 shrink-0 ${
                        enablePredators ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    />
                    <span>Predators</span>
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      enablePredators
                        ? 'bg-rose-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {enablePredators ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={enableGuns}
                  onClick={onToggleGuns}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    enableGuns
                      ? 'border-amber-500/70 bg-amber-950/40 text-amber-100'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Crosshair
                      className={`h-3.5 w-3.5 shrink-0 ${
                        enableGuns ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    <span>30s Guns</span>
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      enableGuns
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {enableGuns ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* Custom Music Upload & Repeat Player */}
            <div className="border-t border-slate-800 pt-3">
              <CustomMusicPlayer music={music} muted={muted} onUnmute={onUnmute} />
            </div>
          </div>

          {/* Deploy Action Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-2.5">
            {!activeUnlocked && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-950/30 px-3 py-2 flex items-center justify-between gap-2 text-xs text-amber-200">
                <span>
                  Region locked ({activeRegion.name}). Complete an open mission or unlock Explorer Mode.
                </span>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="rounded bg-amber-500 px-2 py-1 text-[11px] font-bold text-slate-950 whitespace-nowrap cursor-pointer"
                >
                  Settings
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-amber-300">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span>{totalCoins} Coins</span>
                </span>
                {purchasedItems.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-300 font-medium">
                      +{purchasedItems.length} bought
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                disabled={!activeUnlocked}
                onClick={onStartRun}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeUnlocked
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>{t(lang, 'deploySimulation')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 6-Region Open-World Map */}
      <WorldMapPanel
        lang={lang}
        careerStats={careerStats}
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectRegion}
      />

      {/* Starting Resource Shop */}
      <section id="starting-shop" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-100 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-400" />
              <span>Starting Resource Shop</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Spend collected gold coins before deploying to pack extra emergency resources
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-[#131C2B] px-3.5 py-2">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-slate-300">Coin Balance</span>
            <span className="font-mono-tabular text-base font-bold text-amber-300">
              {totalCoins}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {STARTING_SHOP_CATALOG.map((offer) => {
            const itemInfo = createItem(offer.type, active, `shop-${offer.type}`);
            const queued = countQueued(offer.type);
            const canAfford = totalCoins >= offer.cost;
            return (
              <div
                key={offer.type}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#131C2B] p-4 space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl leading-none" aria-hidden="true">
                      {itemInfo.emoji}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-bold text-amber-300">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>{offer.cost}</span>
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-100 truncate">
                    {itemInfo.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-snug">{offer.benefit}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  {queued > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRefundResource(offer.type, offer.cost)}
                        aria-label={`Refund one ${itemInfo.name}`}
                        className="rounded-md border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono-tabular text-xs font-semibold text-emerald-300 min-w-[2.2rem] text-center">
                        ×{queued}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Not packed</span>
                  )}
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onBuyResource(offer.type, offer.cost)}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      canAfford
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Buy</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Game Modes Selector Grid */}
      <section id="game-modes-grid" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-slate-100">
            Select Game Mode
          </h2>
          <p className="text-xs text-slate-400">
            Nine tactical rulesets including Monster Mode, custom hazard pacing, and weapon drops
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {GAME_MODE_ORDER.map((modeId) => {
            const m = GAME_MODES[modeId];
            const isSel = modeId === selectedMode;
            return (
              <button
                key={modeId}
                type="button"
                onClick={() => onSelectMode(modeId)}
                className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                  isSel
                    ? 'border-sky-400 bg-[#182334] text-white'
                    : 'border-slate-800 bg-[#131C2B] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="font-medium text-sky-300 truncate">{m.shortRule}</span>
                  {isSel && <span className="font-semibold text-sky-400 shrink-0">Active</span>}
                </div>
                <h3 className="font-display text-lg font-bold text-slate-100">{m.title}</h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {m.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 23-Disaster Scenario Selector Grid */}
      <section id="scenarios-grid" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-slate-100">
            {t(lang, 'disasters')} ({visibleDisasters.length})
          </h2>
          <p className="text-xs text-slate-400">
            {selectedRegion === 'all'
              ? 'All 23 natural disaster scenarios across 6 biomes'
              : `Filtered to ${REGIONS[selectedRegion].name}`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleDisasters.map((id) => {
            const sc = SCENARIOS[id];
            const isSelected = id === selectedDisaster;
            const unlocked = isRegionUnlocked(sc.regionId);
            const clearedCount = careerStats.completedDisasters[id] ?? 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectDisaster(id)}
                className={`group text-left rounded-xl overflow-hidden border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                  isSelected
                    ? 'border-amber-500 bg-[#182334]'
                    : 'border-slate-800 bg-[#131C2B] hover:border-slate-600'
                } ${!unlocked ? 'opacity-80' : ''}`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  {sc.imageUrl && !failedImages[sc.id] ? (
                    <img
                      src={sc.imageUrl}
                      alt={sc.title}
                      referrerPolicy="no-referrer"
                      onError={() => markFailed(sc.id)}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full flex-col items-center justify-center p-4 text-center"
                      style={{
                        background: `linear-gradient(135deg, ${sc.accentHex}33, #0f172a 70%)`,
                      }}
                    >
                      <ShieldAlert className="h-7 w-7 mb-1.5" style={{ color: sc.accentHex }} />
                      <span className="text-[11px] font-semibold text-slate-200">
                        {sc.biomeLabel}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131C2B] via-transparent to-transparent" />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {!unlocked && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-950/90 border border-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                        <Lock className="h-3 w-3" />
                        <span>Locked</span>
                      </span>
                    )}
                    {clearedCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>×{clearedCount}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="truncate">{sc.location}</span>
                    {isSelected && (
                      <span className="font-semibold text-amber-400 shrink-0">Selected</span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-100">{sc.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {sc.subtitle}
                  </p>
                  <div className="pt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="truncate">
                      {createItem('gear', sc, `card-gear-${sc.id}`).emoji} {sc.gearName}
                    </span>
                    <span className="font-mono-tabular text-sky-300 shrink-0">
                      {DIFFICULTIES[sc.recommendedMinDifficulty].label}+
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Field Guide */}
      <section
        id="field-guide"
        className="border-t border-slate-800/80 pt-8 grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <PackageSearch className="h-4 w-4" />
            <span>01. Follow Signals &amp; Decide</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your directional resource compass points only to nearby supplies without spoiling what they
            are. Inspect caches, evaluate local conditions, and choose which tools or protection matter most.
          </p>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <HeartHandshake className="h-4 w-4" />
            <span>02. Respect All-Clear Protocols</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Never rush to extraction mid-crisis. Monitor the 5-stage Disaster Lifecycle bar, read roadside
            warning signs, shelter through Peak Danger, and evacuate only after Official All-Clear.
          </p>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sky-400 text-sm font-semibold">
            <Compass className="h-4 w-4" />
            <span>03. Learn From Every Run</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every run finishes with a 4-pillar Safety Performance Score and a detailed &ldquo;What You
            Did vs What You Should Have Done&rdquo; debrief grounded in real emergency safety science.
          </p>
        </div>
      </section>
    </main>
  );
}

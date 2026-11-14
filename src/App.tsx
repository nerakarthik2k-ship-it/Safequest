import { useCallback, useEffect, useRef, useState } from 'react';
import { CacheModal } from './components/CacheModal';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { EndReportModal } from './components/EndReportModal';
import { GameHUD } from './components/GameHUD';
import { RescueModal } from './components/RescueModal';
import { SettingsModal } from './components/SettingsModal';
import { SignModal } from './components/SignModal';
import { StartPage } from './components/StartPage';
import { StatsAchievementsModal } from './components/StatsAchievementsModal';
import { TitleMenu } from './components/TitleMenu';
import { TopBar } from './components/TopBar';
import { DIFFICULTIES } from './data/achievements';
import { CHARACTERS } from './data/characters';
import { GAME_MODES } from './data/gameModes';
import { GUNS } from './data/guns';
import { POWER_UPS } from './data/powerUps';
import { createItem, SCENARIOS } from './data/scenarios';
import { getLanguageDir } from './i18n/translations';
import { FirstPersonViewport } from './three/FirstPersonViewport';
import {
  ActiveRunState,
  CacheNode,
  CameraViewMode,
  CareerStats,
  CharacterId,
  ChunkData,
  CustomMusicControls,
  Difficulty,
  DisasterId,
  GameMode,
  GameState,
  GraphicsQuality,
  GunType,
  ItemType,
  LanguageCode,
  NearbyPrompt,
  PerformanceEvaluation,
  PowerUpType,
  ResourceArrowTarget,
  ThemeMode,
  WarningSign,
} from './types/game';
import {
  addLog,
  computeDisasterPhase,
  evaluateRunPerformance,
  getWaveInterval,
  hasItemType,
  initializeRun,
  loadCareerStats,
  recordRunToCareer,
  saveCareerStats,
} from './utils/gameEngine';
import { soundFX } from './utils/sound';

let runtimeItemId = 1000;
const COIN_STORAGE_KEY = 'lifeline_sector_coins';
const THEME_STORAGE_KEY = 'lifeline_sector_theme';
const BEST_POINTS_STORAGE_KEY = 'lifeline_sector_best_points';
const LANGUAGE_STORAGE_KEY = 'safequest_language';
const GRAPHICS_STORAGE_KEY = 'safequest_graphics';

function loadSavedCoins(): number {
  if (typeof window === 'undefined') return 5;
  try {
    const raw = window.localStorage.getItem(COIN_STORAGE_KEY);
    if (raw === null) return 5;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 5;
  } catch {
    return 5;
  }
}

function loadSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function loadSavedBestPoints(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(BEST_POINTS_STORAGE_KEY);
    if (raw === null) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

function loadSavedLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    const valid: LanguageCode[] = ['en', 'hi', 'es', 'fr', 'ar', 'zh', 'ja', 'pt', 'de', 'ko'];
    return raw && valid.includes(raw) ? raw : 'en';
  } catch {
    return 'en';
  }
}

function loadSavedGraphics(): GraphicsQuality {
  if (typeof window === 'undefined') return 'high';
  try {
    const raw = window.localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (raw === 'ultra' || raw === 'balanced' || raw === 'high') return raw;
    return 'high';
  } catch {
    return 'high';
  }
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START_PAGE');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('alex_ranger');
  const [customShirtHex, setCustomShirtHex] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<CameraViewMode>('third_person');
  const [theme, setTheme] = useState<ThemeMode>(loadSavedTheme);
  const [language, setLanguage] = useState<LanguageCode>(loadSavedLanguage);
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(loadSavedGraphics);
  const [careerStats, setCareerStats] = useState<CareerStats>(loadCareerStats);
  const careerStatsRef = useRef(careerStats);
  careerStatsRef.current = careerStats;
  const [bestPoints, setBestPoints] = useState<number>(loadSavedBestPoints);
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterId>('wildfire');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [selectedMode, setSelectedMode] = useState<GameMode>('standard_escape');
  const [enablePredators, setEnablePredators] = useState(false);
  const [enableGuns, setEnableGuns] = useState(false);
  const [totalCoins, setTotalCoins] = useState<number>(loadSavedCoins);
  const [purchasedItems, setPurchasedItems] = useState<ItemType[]>([]);
  const [run, setRun] = useState<ActiveRunState | null>(null);
  const [runKey, setRunKey] = useState(1);
  const [muted, setMuted] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  // Persistent custom soundtrack state (plays continuously on repeat across screens)
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicName, setMusicName] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicLoop, setMusicLoop] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.55);
  const [musicError, setMusicError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicUrlRef = useRef<string | null>(null);
  const pendingAutoPlayRef = useRef(false);

  const [nearbyPrompt, setNearbyPrompt] = useState<NearbyPrompt | null>(null);
  const [resourceArrow, setResourceArrow] = useState<ResourceArrowTarget | null>(null);
  const [extractionDist, setExtractionDist] = useState(40);
  const [extractionAngleDeg, setExtractionAngleDeg] = useState(0);
  const [cutsceneMode, setCutsceneMode] = useState<'intro' | 'extraction' | null>(null);
  const [cutsceneProgress, setCutsceneProgress] = useState(0);
  const [sprintActive, setSprintActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [performanceEval, setPerformanceEval] = useState<PerformanceEvaluation | null>(null);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<string[]>([]);
  const [newlyUnlockedRegion, setNewlyUnlockedRegion] = useState<string | null>(null);
  const recordedRunKeyRef = useRef<number>(0);

  const joystickVecRef = useRef({ x: 0, y: 0 });
  const yawOffsetRef = useRef(0);
  const jumpTriggerRef = useRef(0);
  const shootTriggerRef = useRef(0);
  const sprintRef = useRef(false);
  const warnedWaveRef = useRef<number>(-1);

  const toggleMute = () => {
    const next = !muted;
    soundFX.muted = next;
    setMuted(next);
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = musicLoop;
    el.muted = muted;
    el.volume = musicVolume;
  }, [musicLoop, muted, musicVolume, musicUrl]);

  useEffect(() => {
    return () => {
      if (musicUrlRef.current) {
        URL.revokeObjectURL(musicUrlRef.current);
      }
    };
  }, []);

  const attemptAudioPlay = useCallback((el: HTMLAudioElement) => {
    el.play()
      .then(() => {
        pendingAutoPlayRef.current = false;
        setMusicPlaying(true);
        setMusicError(null);
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError') {
          pendingAutoPlayRef.current = false;
          setMusicPlaying(false);
          setMusicError('Browser paused autoplay — tap Play to start track.');
        } else if (name === 'NotSupportedError') {
          pendingAutoPlayRef.current = false;
          setMusicPlaying(false);
          setMusicError('Audio format not supported by this browser.');
        }
      });
  }, []);

  const handleUploadMusic = useCallback(
    (file: File) => {
      if (musicUrlRef.current) {
        URL.revokeObjectURL(musicUrlRef.current);
      }
      const nextUrl = URL.createObjectURL(file);
      musicUrlRef.current = nextUrl;
      const cleanName = file.name.replace(/\.[^/.]+$/, '') || 'Custom Track';
      setMusicUrl(nextUrl);
      setMusicName(cleanName);
      setMusicLoop(true);
      setMusicError(null);
      pendingAutoPlayRef.current = true;

      if (muted) {
        soundFX.muted = false;
        setMuted(false);
      }

      const el = audioRef.current;
      if (el) {
        el.src = nextUrl;
        el.loop = true;
        el.muted = false;
        el.volume = musicVolume;
        el.currentTime = 0;
        el.load();
        attemptAudioPlay(el);
      }
    },
    [attemptAudioPlay, musicVolume, muted]
  );

  const handleToggleMusicPlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !musicUrlRef.current) return;
    setMusicError(null);
    if (el.paused) {
      if (!el.src) {
        el.src = musicUrlRef.current;
        el.load();
      }
      attemptAudioPlay(el);
    } else {
      pendingAutoPlayRef.current = false;
      el.pause();
    }
  }, [attemptAudioPlay]);

  const handleToggleMusicLoop = useCallback(() => {
    setMusicLoop((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.loop = next;
      }
      return next;
    });
  }, []);

  const handleMusicVolumeChange = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setMusicVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const handleClearMusic = useCallback(() => {
    pendingAutoPlayRef.current = false;
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    if (musicUrlRef.current) {
      URL.revokeObjectURL(musicUrlRef.current);
      musicUrlRef.current = null;
    }
    setMusicUrl(null);
    setMusicName(null);
    setMusicPlaying(false);
    setMusicError(null);
  }, []);

  const musicControls: CustomMusicControls = {
    trackName: musicName,
    hasTrack: Boolean(musicUrl),
    isPlaying: musicPlaying,
    isLooping: musicLoop,
    volume: musicVolume,
    error: musicError,
    onUploadFile: handleUploadMusic,
    onTogglePlay: handleToggleMusicPlay,
    onToggleLoop: handleToggleMusicLoop,
    onVolumeChange: handleMusicVolumeChange,
    onClearTrack: handleClearMusic,
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(COIN_STORAGE_KEY, String(totalCoins));
    } catch {
      // Ignore storage quota errors
    }
  }, [totalCoins]);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  useEffect(() => {
    if (!run) return;
    if (run.points > bestPoints) {
      setBestPoints(run.points);
      try {
        window.localStorage.setItem(BEST_POINTS_STORAGE_KEY, String(run.points));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [run, bestPoints]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage quota errors
    }
  }, [language]);

  useEffect(() => {
    try {
      window.localStorage.setItem(GRAPHICS_STORAGE_KEY, graphicsQuality);
    } catch {
      // Ignore storage quota errors
    }
  }, [graphicsQuality]);

  useEffect(() => {
    if (!run || run.outcome === 'ongoing' || recordedRunKeyRef.current === runKey) return;
    recordedRunKeyRef.current = runKey;
    const evalResult = evaluateRunPerformance(run);
    const { nextStats, newlyUnlockedAchievements: newAch, newlyUnlockedRegion: newReg } =
      recordRunToCareer(careerStatsRef.current, run, evalResult);
    setPerformanceEval(evalResult);
    setCareerStats(nextStats);
    setNewlyUnlockedAchievements(newAch);
    setNewlyUnlockedRegion(newReg);
  }, [run, runKey]);

  const handleToggleSandbox = useCallback(() => {
    setCareerStats((prev) => {
      const next = { ...prev, sandboxUnlockAll: !prev.sandboxUnlockAll };
      saveCareerStats(next);
      return next;
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'first_person' ? 'third_person' : 'first_person'));
  }, []);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    const isMonsterMode = mode === 'monster_hunt';
    setEnablePredators(isMonsterMode);
    setEnableGuns(isMonsterMode);
  }, []);

  const handleBuyResource = useCallback(
    (itemType: ItemType, cost: number) => {
      if (totalCoins < cost) return;
      soundFX.pickup();
      setTotalCoins((c) => Math.max(0, c - cost));
      setPurchasedItems((prev) => [...prev, itemType]);
    },
    [totalCoins]
  );

  const handleRefundResource = useCallback(
    (itemType: ItemType, cost: number) => {
      const idx = purchasedItems.lastIndexOf(itemType);
      if (idx === -1) return;
      const next = [...purchasedItems];
      next.splice(idx, 1);
      setPurchasedItems(next);
      setTotalCoins((c) => c + cost);
    },
    [purchasedItems]
  );

  const toggleSprint = useCallback(() => {
    setSprintActive((prev) => {
      const next = !prev;
      sprintRef.current = next;
      return next;
    });
  }, []);

  const startNewRun = useCallback(
    (
      disaster: DisasterId = selectedDisaster,
      diff: Difficulty = difficulty,
      mode: GameMode = selectedMode,
      predatorsEnabled: boolean = enablePredators,
      gunsEnabled: boolean = enableGuns,
      characterId: CharacterId = selectedCharacter
    ) => {
      const fresh = initializeRun(disaster, diff, mode, {
        enablePredators: predatorsEnabled,
        enableGuns: gunsEnabled,
        purchasedItems,
        characterId,
        customShirtHex,
      });
      setPurchasedItems([]);
      yawOffsetRef.current = 0;
      joystickVecRef.current = { x: 0, y: 0 };
      sprintRef.current = false;
      warnedWaveRef.current = -1;
      setSprintActive(false);
      setNearbyPrompt(null);
      setResourceArrow(null);
      setPerformanceEval(null);
      setNewlyUnlockedAchievements([]);
      setNewlyUnlockedRegion(null);
      setMapExpanded(false);
      setCutsceneProgress(0);
      setCutsceneMode('intro');
      soundFX.cutsceneCue();
      setRun(fresh);
      setRunKey((k) => k + 1);
      setGameState('PLAYING');
    },
    [
      selectedDisaster,
      difficulty,
      selectedMode,
      enablePredators,
      enableGuns,
      purchasedItems,
      selectedCharacter,
      customShirtHex,
    ]
  );

  const handleCollectPickup = useCallback((pickupId: string, itemType: ItemType) => {
    setRun((prev) => {
      if (!prev || prev.collectedPickupIds[pickupId]) return prev;
      const scenario = SCENARIOS[prev.scenarioId];
      const newItem = createItem(itemType, scenario, `item-${runtimeItemId++}`);
      soundFX.pickup();
      return {
        ...prev,
        inventory: [...prev.inventory, newItem],
        collectedPickupIds: { ...prev.collectedPickupIds, [pickupId]: true },
        itemsCollectedCount: prev.itemsCollectedCount + 1,
        points: prev.points + 25,
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          `Picked up ${newItem.emoji} ${newItem.name} (+25 pts).`,
          'item'
        ),
      };
    });
  }, []);

  const handleCollectCoin = useCallback((coinId: string, value: number) => {
    soundFX.coin();
    setTotalCoins((c) => c + value);
    setRun((prev) => {
      if (!prev || prev.collectedCoinIds[coinId]) return prev;
      const pts = 50 * value;
      return {
        ...prev,
        collectedCoinIds: { ...prev.collectedCoinIds, [coinId]: true },
        coinsCollected: prev.coinsCollected + value,
        points: prev.points + pts,
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          `Collected +${value} Gold Coin (+${pts} pts · ${prev.coinsCollected + value} coins).`,
          'item'
        ),
      };
    });
  }, []);

  const handleCollectPowerUp = useCallback((powerUpId: string, powerType: PowerUpType) => {
    setRun((prev) => {
      if (!prev || prev.collectedPowerUpIds[powerUpId]) return prev;
      const def = POWER_UPS[powerType];
      soundFX.rescue();
      return {
        ...prev,
        collectedPowerUpIds: { ...prev.collectedPowerUpIds, [powerUpId]: true },
        activePowers: {
          ...prev.activePowers,
          [powerType]: def.durationSec,
        },
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          `Activated ${def.emoji} ${def.name} (${def.durationSec}s): ${def.effectSummary}.`,
          'rescue'
        ),
      };
    });
  }, []);

  const handleCollectGun = useCallback((gunId: string, gunType: GunType) => {
    setRun((prev) => {
      if (!prev || prev.collectedGunIds[gunId]) return prev;
      const def = GUNS[gunType];
      soundFX.pickup();
      return {
        ...prev,
        collectedGunIds: { ...prev.collectedGunIds, [gunId]: true },
        activeGun: { type: gunType, remainingSec: def.durationSec },
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          `Equipped ${def.emoji} ${def.name} (${def.durationSec}s) — click screen, tap FIRE, or press G to shoot.`,
          'item'
        ),
      };
    });
  }, []);

  const handleKillPredator = useCallback((predatorId: string) => {
    setRun((prev) => {
      if (!prev) return prev;
      const target = prev.predatorStates[predatorId];
      if (!target || !target.alive) return prev;
      return {
        ...prev,
        predatorsDefeatedCount: prev.predatorsDefeatedCount + 1,
        points: prev.points + 150,
        predatorStates: {
          ...prev.predatorStates,
          [predatorId]: { ...target, alive: false, hp: 0 },
        },
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          `Eliminated ${target.name} (+150 pts)!`,
          'rescue'
        ),
      };
    });
  }, []);

  const handlePredatorHitPlayer = useCallback((predatorName: string, damage: number) => {
    setRun((prev) => {
      if (!prev || prev.outcome !== 'ongoing') return prev;
      if ((prev.activePowers.hazard_shield ?? 0) > 0) {
        return {
          ...prev,
          logs: addLog(
            prev.logs,
            prev.elapsedSec,
            `🛡️ Disaster Shield blocked ${predatorName}'s strike!`,
            'info'
          ),
        };
      }

      soundFX.predatorBite();
      const charDef = CHARACTERS[prev.characterId];
      const dmg = damage * GAME_MODES[prev.gameMode].damageMultiplier * charDef.damageMultiplier;
      const nextHealth = Math.max(0, prev.health - dmg);

      if (nextHealth <= 0) {
        soundFX.fail();
        setGameState('GAME_OVER');
        return {
          ...prev,
          health: 0,
          outcome: 'fallen',
          outcomeReason: `Taken down by ${predatorName} near ${prev.currentRoomName} after ${Math.round(
            prev.distanceTraveled
          )}m.`,
          logs: addLog(
            prev.logs,
            prev.elapsedSec,
            `${predatorName} overwhelmed you!`,
            'hazard'
          ),
        };
      }

      return {
        ...prev,
        health: nextHealth,
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          `${predatorName} struck you (-${Math.round(dmg)} HP)! Shoot it or run!`,
          'warning'
        ),
      };
    });
  }, []);

  const handleFireGun = useCallback(() => {
    shootTriggerRef.current += 1;
  }, []);

  const handleEnsureChunks = useCallback((newChunks: ChunkData[]) => {
    setRun((prev) => {
      if (!prev) return prev;
      const nextChunks = { ...prev.chunks };
      const nextCacheItems = { ...prev.cacheRemainingItems };
      const nextSurvivors = { ...prev.survivorStates };
      const nextPredators = { ...prev.predatorStates };

      for (const ch of newChunks) {
        if (!nextChunks[ch.key]) {
          nextChunks[ch.key] = ch;
          for (const c of ch.caches) {
            if (!nextCacheItems[c.id]) nextCacheItems[c.id] = [...c.items];
          }
          for (const s of ch.survivors) {
            if (!nextSurvivors[s.id]) nextSurvivors[s.id] = { ...s };
          }
          for (const pr of ch.predators || []) {
            if (!nextPredators[pr.id]) nextPredators[pr.id] = { ...pr };
          }
        }
      }

      return {
        ...prev,
        chunks: nextChunks,
        cacheRemainingItems: nextCacheItems,
        survivorStates: nextSurvivors,
        predatorStates: nextPredators,
      };
    });
  }, []);

  const handleTickSimulation = useCallback(
    (
      dt: number,
      px: number,
      pz: number,
      playerYaw: number,
      distDelta: number,
      roomName: string,
      inShelter: boolean,
      nearest: NearbyPrompt | null,
      extDist: number,
      extAngle: number,
      isSprinting: boolean,
      predatorPositions: Array<{ id: string; x: number; z: number }>,
      nearestResourceArrow: ResourceArrowTarget | null = null,
      terrainElevation: number = 0
    ) => {
      setNearbyPrompt((prev) => {
        if (
          prev?.id === nearest?.id &&
          prev?.kind === nearest?.kind &&
          prev?.disabled === nearest?.disabled &&
          prev?.actionLabel === nearest?.actionLabel
        ) {
          return prev;
        }
        return nearest;
      });
      setResourceArrow(nearestResourceArrow ?? null);
      setExtractionDist(extDist);
      setExtractionAngleDeg(extAngle);

      setRun((prev) => {
        if (!prev || prev.outcome !== 'ongoing') return prev;
        if (prev.activeSurvivorId || prev.activeCacheId || prev.activeSign) {
          return { ...prev, playerX: px, playerZ: pz, playerYaw };
        }

        const scenario = SCENARIOS[prev.scenarioId];
        const diffDef = DIFFICULTIES[prev.difficulty];
        const waveInterval = getWaveInterval(prev.difficulty, prev.gameMode);

        let nextWave = prev.wave;
        let nextWaveInSec = prev.nextWaveInSec - dt;
        let logs = prev.logs;
        const nextElapsed = prev.elapsedSec + dt;
        let waveBannerUntilSec = prev.waveBannerUntilSec;

        const nextPhase = computeDisasterPhase(nextElapsed, prev.disasterDurationSec);
        const nextTimeRem = Math.max(0, prev.disasterDurationSec - nextElapsed);

        if (nextPhase !== prev.disasterPhase) {
          if (nextPhase === 'peak_danger') {
            soundFX.siren();
            logs = addLog(
              logs,
              nextElapsed,
              '🚨 PEAK DANGER: Hold inside reinforced shelter until Official All-Clear!',
              'hazard'
            );
          } else if (nextPhase === 'subsiding') {
            logs = addLog(
              logs,
              nextElapsed,
              'Hazard is subsiding — remain cautious until Official All-Clear.',
              'info'
            );
          } else if (nextPhase === 'all_clear') {
            soundFX.allClear();
            logs = addLog(
              logs,
              nextElapsed,
              `✅ OFFICIAL ALL-CLEAR: Safe to evacuate toward ${scenario.extractionName}!`,
              'rescue'
            );
          }
        }

        const peakShelterSec =
          prev.peakShelterSec + (nextPhase === 'peak_danger' && inShelter ? dt : 0);
        const peakExposedSec =
          prev.peakExposedSec + (nextPhase === 'peak_danger' && !inShelter ? dt : 0);
        const highGroundSec = prev.highGroundSec + (terrainElevation >= 1.5 ? dt : 0);

        if (nextWaveInSec <= 5 && nextWaveInSec > 0 && warnedWaveRef.current !== prev.wave) {
          warnedWaveRef.current = prev.wave;
          soundFX.warning();
        }

        if (nextWaveInSec <= 0) {
          nextWave += 1;
          nextWaveInSec = waveInterval;
          waveBannerUntilSec = nextElapsed + 3.8;
          soundFX.hazard();
          logs = addLog(
            logs,
            nextElapsed,
            `Wave ${nextWave}: ${scenario.severeLabel} intensifies across the sector (+100 pts).`,
            'hazard'
          );
        }

        const prevPhaseIdx = Math.floor(prev.elapsedSec / 60);
        const nextPhaseIdx = Math.floor(nextElapsed / 60);
        if (nextPhaseIdx > prevPhaseIdx) {
          const isNightNow = nextPhaseIdx % 2 === 1;
          logs = addLog(
            logs,
            nextElapsed,
            isNightNow
              ? '🌙 Nightfall settles across the sector — headlamp engaged.'
              : '☀️ Daybreak — sunlight returns across the sector.',
            'info'
          );
        }

        // Tick active limited-time superpowers
        const nextPowers: Partial<Record<PowerUpType, number>> = {};
        let hasShieldPower = false;
        let hasRegenPower = false;
        let hasSpeedPower = false;
        for (const [k, rem] of Object.entries(prev.activePowers) as Array<[PowerUpType, number]>) {
          if (!rem || rem <= 0) continue;
          const nextRem = rem - dt;
          if (nextRem > 0) {
            nextPowers[k] = nextRem;
            if (k === 'hazard_shield') hasShieldPower = true;
            if (k === 'regen_aura') hasRegenPower = true;
            if (k === 'turbo_speed') hasSpeedPower = true;
          } else {
            const def = POWER_UPS[k];
            logs = addLog(logs, nextElapsed, `${def.emoji} ${def.name} wore off.`, 'info');
          }
        }

        // Tick active 30s gun timer
        let nextActiveGun = prev.activeGun;
        if (nextActiveGun) {
          const remGun = nextActiveGun.remainingSec - dt;
          if (remGun > 0) {
            nextActiveGun = { ...nextActiveGun, remainingSec: remGun };
          } else {
            const gDef = GUNS[nextActiveGun.type];
            logs = addLog(
              logs,
              nextElapsed,
              `${gDef.emoji} ${gDef.name} battery depleted (30s expired).`,
              'info'
            );
            nextActiveGun = null;
          }
        }

        // Sync live chasing predator coordinates
        let nextPredators = prev.predatorStates;
        if (predatorPositions.length > 0) {
          nextPredators = { ...prev.predatorStates };
          for (const pos of predatorPositions) {
            const existing = nextPredators[pos.id];
            if (existing && existing.alive) {
              nextPredators[pos.id] = { ...existing, x: pos.x, z: pos.z };
            }
          }
        }

        const modeDef = GAME_MODES[prev.gameMode];
        const charDef = CHARACTERS[prev.characterId];
        const hasGear = hasItemType(prev.inventory, 'gear');
        const survivorsList = Object.values(prev.survivorStates);
        const escorted = survivorsList.filter((s) => s.status === 'escorted');
        const hasMedic = escorted.some((s) => s.perkId === 'medic_aura');
        const hasResist = escorted.some((s) => s.perkId === 'hazard_resist');

        let maxHazLevel: 0 | 1 | 2 = 0;
        for (const ch of Object.values(prev.chunks)) {
          for (const h of ch.hazards) {
            if (h.activationWave > nextWave) continue;
            if (Math.hypot(px - h.x, pz - h.z) <= h.radius) {
              if (h.level === 2) maxHazLevel = 2;
              else if (maxHazLevel === 0) maxHazLevel = 1;
            }
          }
        }

        let health = prev.health;
        let stamina = prev.stamina;

        if (hasRegenPower) {
          health = Math.min(prev.maxHealth, health + dt * 8);
          stamina = Math.min(prev.maxStamina, stamina + dt * 12);
        } else if (inShelter && maxHazLevel === 0) {
          // Passive safe-shelter health regeneration
          health = Math.min(prev.maxHealth, health + dt * 2.0);
        }

        const compoundActive =
          diffDef.compoundHazardEnabled &&
          Boolean(scenario.secondaryHazardId) &&
          (nextPhase === 'onset' || nextPhase === 'peak_danger');
        const diffDmgMult = diffDef.damageMultiplier * (compoundActive ? 1.18 : 1.0);
        const isColdScenario =
          prev.scenarioId === 'blizzard' ||
          prev.scenarioId === 'avalanche' ||
          prev.scenarioId === 'coldwave' ||
          prev.scenarioId === 'heavy_snowfall';

        if (isColdScenario) {
          if (inShelter || hasShieldPower) {
            stamina = Math.min(prev.maxStamina, stamina + dt * 8.5);
          } else {
            const chillRate =
              (hasGear || hasResist ? 1.8 : 4.2) *
              modeDef.damageMultiplier *
              diffDef.staminaDrainMultiplier;
            stamina = Math.max(0, stamina - dt * chillRate);
          }
        } else if (maxHazLevel === 0 && !isSprinting) {
          const regenRate = inShelter ? 6.5 : 3.2;
          stamina = Math.min(prev.maxStamina, stamina + dt * regenRate);
        }

        if (isSprinting && !hasSpeedPower) {
          const sprintCost =
            (hasGear || hasResist ? 4.8 : 7.4) *
            modeDef.sprintCostMultiplier *
            diffDef.staminaDrainMultiplier;
          stamina = Math.max(2, stamina - dt * sprintCost);
        }

        if (!hasShieldPower) {
          if (maxHazLevel === 1) {
            const stamDrain =
              (hasGear || hasResist ? 2.2 : 5.2) *
              modeDef.damageMultiplier *
              diffDef.staminaDrainMultiplier;
            stamina = Math.max(0, stamina - dt * stamDrain);
            if (!hasGear && !inShelter) {
              health = Math.max(
                0,
                health -
                  dt *
                    (hasMedic ? 1.2 : 2.0) *
                    modeDef.damageMultiplier *
                    charDef.damageMultiplier *
                    diffDmgMult
              );
            }
          } else if (maxHazLevel === 2) {
            const baseDmg = 6.4 * diffDmgMult * modeDef.damageMultiplier * charDef.damageMultiplier;
            const hpDmg = baseDmg * (hasGear ? 0.35 : 1) * (hasMedic ? 0.65 : 1);
            health = Math.max(0, health - dt * hpDmg);
            stamina = Math.max(
              0,
              stamina -
                dt * (hasGear ? 3.0 : 7.5) * modeDef.damageMultiplier * diffDef.staminaDrainMultiplier
            );
          }
        }

        if (stamina <= 0 && !hasShieldPower) {
          health = Math.max(0, health - dt * 3.5 * charDef.damageMultiplier * diffDmgMult);
        }

        // Update nearby stranded survivors hazard countdowns
        let survivorChanged = false;
        const nextSurvivors = { ...prev.survivorStates };
        for (const [sid, s] of Object.entries(nextSurvivors)) {
          if (s.status !== 'stranded') continue;
          // Only tick hazard timer for survivors within loaded range (~45m)
          if (Math.hypot(s.x - px, s.z - pz) > 45) continue;

          let inDanger = false;
          for (const ch of Object.values(prev.chunks)) {
            for (const h of ch.hazards) {
              if (
                h.activationWave <= nextWave &&
                h.level === 2 &&
                Math.hypot(s.x - h.x, s.z - h.z) <= h.radius + 0.8
              ) {
                inDanger = true;
                break;
              }
            }
            if (inDanger) break;
          }

          if (!inDanger) {
            if (s.inHazard) {
              nextSurvivors[sid] = { ...s, inHazard: false };
              survivorChanged = true;
            }
            continue;
          }

          const rem = s.urgencySeconds - dt;
          if (rem <= 0) {
            logs = addLog(
              logs,
              nextElapsed,
              `Radio lost: ${s.name} in ${s.roomName} was overtaken by ${scenario.severeLabel}.`,
              'warning'
            );
            nextSurvivors[sid] = { ...s, inHazard: true, urgencySeconds: 0, status: 'lost' };
          } else {
            nextSurvivors[sid] = { ...s, inHazard: true, urgencySeconds: rem };
          }
          survivorChanged = true;
        }

        const nextFlare = Math.max(0, prev.flareTurnsRemainingSec - dt);
        const nextDistance = prev.distanceTraveled + distDelta;
        const distPoints =
          Math.floor(nextDistance * 2) - Math.floor(prev.distanceTraveled * 2);
        const wavePoints = nextWave > prev.wave ? 100 : 0;
        const nextPoints = prev.points + Math.max(0, distPoints) + wavePoints;

        if (health <= 0) {
          soundFX.fail();
          setGameState('GAME_OVER');
          return {
            ...prev,
            elapsedSec: nextElapsed,
            disasterPhase: nextPhase,
            disasterTimeRemainingSec: nextTimeRem,
            peakShelterSec,
            peakExposedSec,
            highGroundSec,
            wave: nextWave,
            nextWaveInSec,
            playerX: px,
            playerZ: pz,
            playerYaw,
            distanceTraveled: nextDistance,
            points: nextPoints,
            health: 0,
            stamina,
            currentRoomName: roomName,
            activePowers: nextPowers,
            activeGun: nextActiveGun,
            predatorStates: nextPredators,
            survivorStates: survivorChanged ? nextSurvivors : prev.survivorStates,
            flareTurnsRemainingSec: nextFlare,
            logs,
            inHazardLevel: maxHazLevel,
            waveBannerUntilSec,
            outcome: 'fallen',
            outcomeReason: `Overwhelmed by ${scenario.title.toLowerCase()} near ${roomName} after ${Math.round(
              nextDistance
            )}m.`,
          };
        }

        return {
          ...prev,
          elapsedSec: nextElapsed,
          disasterPhase: nextPhase,
          disasterTimeRemainingSec: nextTimeRem,
          peakShelterSec,
          peakExposedSec,
          highGroundSec,
          wave: nextWave,
          nextWaveInSec,
          playerX: px,
          playerZ: pz,
          playerYaw,
          distanceTraveled: nextDistance,
          points: nextPoints,
          health,
          stamina,
          currentRoomName: roomName,
          activePowers: nextPowers,
          activeGun: nextActiveGun,
          predatorStates: nextPredators,
          survivorStates: survivorChanged ? nextSurvivors : prev.survivorStates,
          flareTurnsRemainingSec: nextFlare,
          logs,
          inHazardLevel: maxHazLevel,
          waveBannerUntilSec,
        };
      });
    },
    []
  );

  const handleInteractPrompt = useCallback(
    (prompt: NearbyPrompt) => {
      if (prompt.disabled) return;

      if (prompt.kind === 'pickup' && prompt.itemType) {
        handleCollectPickup(prompt.id, prompt.itemType);
        return;
      }

      if (prompt.kind === 'powerup' && prompt.powerType) {
        handleCollectPowerUp(prompt.id, prompt.powerType);
        return;
      }

      if (prompt.kind === 'gun' && prompt.gunType) {
        handleCollectGun(prompt.id, prompt.gunType);
        return;
      }

      if (prompt.kind === 'survivor') {
        setRun((prev) => (prev ? { ...prev, activeSurvivorId: prompt.id } : prev));
        return;
      }

      if (prompt.kind === 'cache') {
        soundFX.pickup();
        setRun((prev) => {
          if (!prev) return prev;
          const firstOpen = !prev.searchedCacheIds[prompt.id];
          return {
            ...prev,
            searchedCacheIds: { ...prev.searchedCacheIds, [prompt.id]: true },
            activeCacheId: prompt.id,
            points: prev.points + (firstOpen ? 75 : 0),
          };
        });
        return;
      }

      if (prompt.kind === 'rubble') {
        soundFX.pickup();
        setRun((prev) => {
          if (!prev) return prev;
          const scenario = SCENARIOS[prev.scenarioId];
          return {
            ...prev,
            clearedRubbleIds: { ...prev.clearedRubbleIds, [prompt.id]: true },
            points: prev.points + 75,
            logs: addLog(
              prev.logs,
              prev.elapsedSec,
              `Cleared ${prompt.title} with ${scenario.toolName} (+75 pts).`,
              'info'
            ),
          };
        });
        return;
      }

      if (prompt.kind === 'sign') {
        soundFX.signRead();
        setRun((prev) => {
          if (!prev) return prev;
          let foundSign: WarningSign | null = null;
          for (const ch of Object.values(prev.chunks)) {
            const sg = (ch.signs || []).find((s) => s.id === prompt.id);
            if (sg) {
              foundSign = sg;
              break;
            }
          }
          if (!foundSign) return prev;
          const firstRead = !prev.signsReadIds[foundSign.id];
          return {
            ...prev,
            signsReadIds: { ...prev.signsReadIds, [foundSign.id]: true },
            activeSign: foundSign,
            points: prev.points + (firstRead ? 50 : 0),
            logs: firstRead
              ? addLog(
                  prev.logs,
                  prev.elapsedSec,
                  `Inspected field sign: ${foundSign.title} (+50 pts).`,
                  'info'
                )
              : prev.logs,
          };
        });
        return;
      }

      if (prompt.kind === 'door') {
        setRun((prev) => {
          if (!prev) return prev;
          const nextOpen = !prev.openDoorIds[prompt.id];
          if (nextOpen) soundFX.doorOpen();
          else soundFX.doorClose();
          return {
            ...prev,
            openDoorIds: {
              ...prev.openDoorIds,
              [prompt.id]: nextOpen,
            },
          };
        });
        return;
      }

      if (prompt.kind === 'extraction') {
        if (run?.gameMode === 'endless_survival') {
          soundFX.heal();
          setRun((prev) => {
            if (!prev || prev.claimedResupplyIds[prompt.id]) return prev;
            const scenario = SCENARIOS[prev.scenarioId];
            const supply1 = createItem('medkit', scenario, `item-${runtimeItemId++}`);
            const supply2 = createItem(
              prev.wave % 2 === 0 ? 'water' : 'flare',
              scenario,
              `item-${runtimeItemId++}`
            );
            return {
              ...prev,
              health: Math.min(prev.maxHealth, prev.health + 45),
              stamina: Math.min(prev.maxStamina, prev.stamina + 45),
              inventory: [...prev.inventory, supply1, supply2],
              itemsCollectedCount: prev.itemsCollectedCount + 2,
              points: prev.points + 150,
              claimedResupplyIds: { ...prev.claimedResupplyIds, [prompt.id]: true },
              logs: addLog(
                prev.logs,
                prev.elapsedSec,
                `Resupply Beacon claimed (+150 pts): +45 HP/Stamina, ${supply1.emoji} ${supply1.shortLabel} & ${supply2.emoji} ${supply2.shortLabel}.`,
                'rescue'
              ),
            };
          });
          return;
        }

        // REQUIREMENT 7: Level MUST NOT complete before Official All-Clear!
        if (run && run.disasterPhase !== 'all_clear') {
          soundFX.warning();
          setRun((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              earlyExitAttempts: prev.earlyExitAttempts + 1,
              logs: addLog(
                prev.logs,
                prev.elapsedSec,
                `Extraction held (${Math.ceil(
                  prev.disasterTimeRemainingSec
                )}s left): Wait inside safe shelter for Official All-Clear!`,
                'warning'
              ),
            };
          });
          return;
        }

        // Trigger the helicopter extraction cutscene looking out of the chopper
        soundFX.cutsceneCue();
        setNearbyPrompt(null);
        setMapExpanded(false);
        setCutsceneProgress(0);
        setCutsceneMode('extraction');
      }
    },
    [run?.gameMode, run?.disasterPhase, handleCollectPickup, handleCollectPowerUp, handleCollectGun]
  );

  const finalizeExtractionVictory = useCallback(() => {
    setCutsceneMode(null);
    soundFX.victory();
    setGameState('GAME_OVER');
    setRun((prev) => {
      if (!prev || prev.outcome !== 'ongoing') return prev;
      const scenario = SCENARIOS[prev.scenarioId];
      const finalSurvivors: ActiveRunState['survivorStates'] = {};
      for (const [k, s] of Object.entries(prev.survivorStates)) {
        finalSurvivors[k] = s.status === 'escorted' ? { ...s, status: 'rescued' } : s;
      }
      const saved = Object.values(finalSurvivors).filter(
        (s) => s.status === 'rescued' || s.status === 'self_evacuated'
      ).length;
      const extractionBonus = 500 + saved * 350;
      const finalPoints = prev.points + extractionBonus;
      return {
        ...prev,
        survivorStates: finalSurvivors,
        points: finalPoints,
        outcome: 'extracted',
        outcomeReason: `Extracted at ${scenario.extractionName} by rescue helicopter after ${Math.round(
          prev.distanceTraveled
        )}m with ${saved} civilian${saved === 1 ? '' : 's'} saved (+${extractionBonus} extraction pts).`,
      };
    });
  }, []);

  const handleCutsceneFinishOrSkip = useCallback(() => {
    if (cutsceneMode === 'extraction') {
      finalizeExtractionVictory();
    } else {
      setCutsceneMode(null);
    }
  }, [cutsceneMode, finalizeExtractionVictory]);

  const handleUseItem = useCallback((itemId: string) => {
    setRun((prev) => {
      if (!prev || prev.outcome !== 'ongoing') return prev;
      const item = prev.inventory.find((i) => i.id === itemId);
      if (!item) return prev;

      const scenario = SCENARIOS[prev.scenarioId];
      const remaining = prev.inventory.filter((i) => i.id !== itemId);

      if (item.type === 'medkit') {
        soundFX.heal();
        let stabilizedName: string | null = null;
        const nextSurvivors = { ...prev.survivorStates };
        for (const [k, s] of Object.entries(nextSurvivors)) {
          if (!stabilizedName && s.status === 'escorted' && s.escortSpeedPenalty > 0) {
            stabilizedName = s.name;
            nextSurvivors[k] = { ...s, escortSpeedPenalty: 0, injured: false };
          }
        }
        return {
          ...prev,
          health: Math.min(prev.maxHealth, prev.health + 38),
          inventory: remaining,
          survivorStates: nextSurvivors,
          logs: addLog(
            prev.logs,
            prev.elapsedSec,
            stabilizedName
              ? `Used Trauma Medkit (+38% Health) & stabilized ${stabilizedName}.`
              : 'Used Trauma Medkit (+38% Health).',
            'rescue'
          ),
        };
      }

      if (item.type === 'water') {
        soundFX.heal();
        return {
          ...prev,
          stamina: Math.min(prev.maxStamina, prev.stamina + 40),
          inventory: remaining,
          logs: addLog(
            prev.logs,
            prev.elapsedSec,
            `Used ${item.name} (+40% ${scenario.staminaLabel}).`,
            'item'
          ),
        };
      }

      if (item.type === 'flare') {
        soundFX.pickup();
        return {
          ...prev,
          flareTurnsRemainingSec: 18,
          cachesRevealed: true,
          inventory: remaining,
          logs: addLog(
            prev.logs,
            prev.elapsedSec,
            'Fired Emergency Flare — whiteout fog cleared for 18 seconds.',
            'info'
          ),
        };
      }

      return prev;
    });
  }, []);

  const handleQuickHeal = useCallback(() => {
    if (!run || run.outcome !== 'ongoing') return;
    const med = run.inventory.find((i) => i.type === 'medkit');
    if (med) {
      handleUseItem(med.id);
    }
  }, [run, handleUseItem]);

  const handleDropItem = useCallback((itemId: string) => {
    setRun((prev) => {
      if (!prev) return prev;
      const item = prev.inventory.find((i) => i.id === itemId);
      if (!item) return prev;
      return {
        ...prev,
        inventory: prev.inventory.filter((i) => i.id !== itemId),
        logs: addLog(prev.logs, prev.elapsedSec, `Dropped ${item.shortLabel}.`, 'info'),
      };
    });
  }, []);

  const handleTakeCacheItem = useCallback((cacheId: string, itemType: ItemType, idx: number) => {
    setRun((prev) => {
      if (!prev) return prev;
      const scenario = SCENARIOS[prev.scenarioId];
      const newItem = createItem(itemType, scenario, `item-${runtimeItemId++}`);

      soundFX.pickup();
      const curList = [...(prev.cacheRemainingItems[cacheId] || [])];
      curList.splice(idx, 1);

      return {
        ...prev,
        inventory: [...prev.inventory, newItem],
        cacheRemainingItems: { ...prev.cacheRemainingItems, [cacheId]: curList },
        itemsCollectedCount: prev.itemsCollectedCount + 1,
        logs: addLog(prev.logs, prev.elapsedSec, `Packed ${newItem.name}.`, 'item'),
      };
    });
  }, []);

  const handleTakeAllCacheItems = useCallback((cacheId: string) => {
    setRun((prev) => {
      if (!prev) return prev;
      const curList = prev.cacheRemainingItems[cacheId] || [];
      if (curList.length === 0) return prev;

      const scenario = SCENARIOS[prev.scenarioId];
      const newItems = curList.map((t) =>
        createItem(t, scenario, `item-${runtimeItemId++}`)
      );

      soundFX.pickup();
      return {
        ...prev,
        inventory: [...prev.inventory, ...newItems],
        cacheRemainingItems: { ...prev.cacheRemainingItems, [cacheId]: [] },
        itemsCollectedCount: prev.itemsCollectedCount + newItems.length,
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          `Packed all ${newItems.length} supplies from cache.`,
          'item'
        ),
      };
    });
  }, []);

  const handleEscortSurvivor = useCallback((survivorId: string) => {
    soundFX.rescue();
    setRun((prev) => {
      if (!prev) return prev;
      const target = prev.survivorStates[survivorId];
      if (!target) return prev;
      const medicBonus = prev.gameMode === 'field_medic' ? 15 : 0;
      return {
        ...prev,
        activeSurvivorId: null,
        health: Math.min(prev.maxHealth, prev.health + medicBonus),
        points: prev.points + 200,
        cachesRevealed: prev.cachesRevealed || target.perkId === 'scout_reveal',
        survivorStates: {
          ...prev.survivorStates,
          [survivorId]: { ...target, status: 'escorted' },
        },
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          medicBonus > 0
            ? `${target.name} joined your party (+15 HP · +200 pts).`
            : `${target.name} joined your party (${target.perkLabel} · +200 pts).`,
          'rescue'
        ),
      };
    });
  }, []);

  const handleSelfEvacSurvivor = useCallback((survivorId: string) => {
    soundFX.rescue();
    setRun((prev) => {
      if (!prev) return prev;
      const target = prev.survivorStates[survivorId];
      if (!target) return prev;
      const idx = prev.inventory.findIndex((i) => i.type === target.selfEvacItem);
      if (idx === -1) return prev;
      const given = prev.inventory[idx];
      const nextInv = [...prev.inventory];
      nextInv.splice(idx, 1);
      const medicBonus = prev.gameMode === 'field_medic' ? 15 : 0;
      return {
        ...prev,
        activeSurvivorId: null,
        health: Math.min(prev.maxHealth, prev.health + medicBonus),
        points: prev.points + 200,
        inventory: nextInv,
        survivorStates: {
          ...prev.survivorStates,
          [survivorId]: { ...target, status: 'self_evacuated' },
        },
        logs: addLog(
          prev.logs,
          prev.elapsedSec,
          medicBonus > 0
            ? `Gave ${given.emoji} ${given.shortLabel} to ${target.name} (+15 HP · +200 pts).`
            : `Gave ${given.emoji} ${given.shortLabel} to ${target.name} — safely heading out (+200 pts).`,
          'rescue'
        ),
      };
    });
  }, []);

  const handleLeaveSurvivor = useCallback((survivorId: string) => {
    setRun((prev) => {
      if (!prev) return prev;
      const target = prev.survivorStates[survivorId];
      if (!target) return prev;
      return {
        ...prev,
        activeSurvivorId: null,
        survivorStates: {
          ...prev.survivorStates,
          [survivorId]: { ...target, status: 'left_behind' },
        },
        logs: addLog(prev.logs, prev.elapsedSec, `Left ${target.name} behind.`, 'warning'),
      };
    });
  }, []);

  // Keyboard shortcuts for Interact (F), Map (M), View (V), Heal (H), Close Modals (Esc), and Skip Cutscene
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (showStats) {
          setShowStats(false);
          return;
        }
        if (run?.activeSign) {
          setRun((p) => (p ? { ...p, activeSign: null } : p));
          return;
        }
      }
      if (gameState !== 'PLAYING') return;
      if (cutsceneMode !== null && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
        e.preventDefault();
        handleCutsceneFinishOrSkip();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'm' && cutsceneMode === null) {
        setMapExpanded((m) => !m);
      } else if (k === 'v' && cutsceneMode === null) {
        handleToggleViewMode();
      } else if (k === 'h' && cutsceneMode === null) {
        handleQuickHeal();
      } else if (k === 'f' && cutsceneMode === null && nearbyPrompt && !nearbyPrompt.disabled && !mapExpanded) {
        handleInteractPrompt(nearbyPrompt);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    cutsceneMode,
    nearbyPrompt,
    mapExpanded,
    showSettings,
    showStats,
    run?.activeSign,
    handleInteractPrompt,
    handleCutsceneFinishOrSkip,
    handleToggleViewMode,
    handleQuickHeal,
  ]);

  const activeSurvivor = run?.activeSurvivorId
    ? run.survivorStates[run.activeSurvivorId] || null
    : null;

  let activeCache: CacheNode | null = null;
  if (run?.activeCacheId) {
    for (const ch of Object.values(run.chunks)) {
      const found = ch.caches.find((c) => c.id === run.activeCacheId);
      if (found) {
        activeCache = found;
        break;
      }
    }
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const unmuteAudio = useCallback(() => {
    if (muted) {
      soundFX.muted = false;
      setMuted(false);
    }
  }, [muted]);

  const persistentAudio = (
    <audio
      ref={audioRef}
      loop={musicLoop}
      preload="auto"
      onCanPlay={() => {
        const el = audioRef.current;
        if (el && pendingAutoPlayRef.current && el.paused) {
          attemptAudioPlay(el);
        }
      }}
      onPlay={() => {
        setMusicPlaying(true);
        setMusicError(null);
      }}
      onPause={() => setMusicPlaying(false)}
      onEnded={() => {
        if (!musicLoop) setMusicPlaying(false);
      }}
      onError={() => {
        pendingAutoPlayRef.current = false;
        setMusicPlaying(false);
        setMusicError('Could not decode audio file — try MP3, WAV, OGG, or M4A.');
      }}
      className="hidden"
    />
  );

  const persistentModals = (
    <>
      {showSettings && (
        <SettingsModal
          lang={language}
          graphicsQuality={graphicsQuality}
          viewMode={viewMode}
          theme={theme}
          muted={muted}
          sandboxUnlockAll={careerStats.sandboxUnlockAll}
          music={musicControls}
          onChangeLanguage={setLanguage}
          onChangeGraphics={setGraphicsQuality}
          onChangeViewMode={setViewMode}
          onToggleTheme={handleToggleTheme}
          onToggleMute={toggleMute}
          onToggleSandbox={handleToggleSandbox}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showStats && (
        <StatsAchievementsModal
          lang={language}
          careerStats={careerStats}
          onClose={() => setShowStats(false)}
        />
      )}
    </>
  );

  const rootDir = getLanguageDir(language);

  return (
    <div dir={rootDir} className="min-h-screen bg-[#0B111B] text-slate-100">
      {persistentAudio}

      {gameState === 'START_PAGE' ? (
        <>
          <TopBar
            gameState={gameState}
            lang={language}
            muted={muted}
            theme={theme}
            onToggleMute={toggleMute}
            onToggleTheme={handleToggleTheme}
            onGoStartPage={() => setGameState('START_PAGE')}
            onGoMenu={() => {
              setGameState('TITLE_MENU');
              setRun(null);
            }}
            onOpenStats={() => setShowStats(true)}
            onOpenSettings={() => setShowSettings(true)}
            onScrollSection={scrollToSection}
            onPrimaryAction={() => setGameState('TITLE_MENU')}
          />
          <StartPage
            selectedCharacter={selectedCharacter}
            customShirtHex={customShirtHex}
            viewMode={viewMode}
            totalCoins={totalCoins}
            lang={language}
            muted={muted}
            music={musicControls}
            onSelectCharacter={setSelectedCharacter}
            onSelectShirtHex={setCustomShirtHex}
            onSelectViewMode={setViewMode}
            onChangeLanguage={setLanguage}
            onUnmute={unmuteAudio}
            onOpenSettings={() => setShowSettings(true)}
            onEnterGame={() => setGameState('TITLE_MENU')}
          />
        </>
      ) : gameState === 'TITLE_MENU' || !run ? (
        <>
          <TopBar
            gameState={gameState}
            lang={language}
            muted={muted}
            theme={theme}
            onToggleMute={toggleMute}
            onToggleTheme={handleToggleTheme}
            onGoStartPage={() => setGameState('START_PAGE')}
            onGoMenu={() => {
              setGameState('TITLE_MENU');
              setRun(null);
            }}
            onOpenStats={() => setShowStats(true)}
            onOpenSettings={() => setShowSettings(true)}
            onScrollSection={scrollToSection}
            onPrimaryAction={() => startNewRun()}
          />
          <TitleMenu
            lang={language}
            selectedDisaster={selectedDisaster}
            difficulty={difficulty}
            selectedMode={selectedMode}
            selectedCharacter={selectedCharacter}
            viewMode={viewMode}
            enablePredators={enablePredators}
            enableGuns={enableGuns}
            totalCoins={totalCoins}
            bestPoints={bestPoints}
            purchasedItems={purchasedItems}
            careerStats={careerStats}
            muted={muted}
            music={musicControls}
            onSelectDisaster={setSelectedDisaster}
            onSelectDifficulty={setDifficulty}
            onSelectMode={handleSelectMode}
            onChangeCharacter={() => setGameState('START_PAGE')}
            onSelectViewMode={setViewMode}
            onTogglePredators={() => setEnablePredators((p) => !p)}
            onToggleGuns={() => setEnableGuns((g) => !g)}
            onBuyResource={handleBuyResource}
            onRefundResource={handleRefundResource}
            onUnmute={unmuteAudio}
            onOpenSettings={() => setShowSettings(true)}
            onOpenStats={() => setShowStats(true)}
            onStartRun={() => startNewRun()}
          />
        </>
      ) : (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0B111B] text-slate-100">
          <FirstPersonViewport
        key={runKey}
        run={run}
        viewMode={viewMode}
        theme={theme}
        graphicsQuality={graphicsQuality}
        joystickVecRef={joystickVecRef}
        yawOffsetRef={yawOffsetRef}
        jumpTriggerRef={jumpTriggerRef}
        shootTriggerRef={shootTriggerRef}
        sprintRef={sprintRef}
        cutsceneMode={cutsceneMode}
        onCutsceneProgress={setCutsceneProgress}
        onCutsceneEnd={handleCutsceneFinishOrSkip}
        onEnsureChunks={handleEnsureChunks}
        onCollectPickup={handleCollectPickup}
        onCollectPowerUp={handleCollectPowerUp}
        onCollectGun={handleCollectGun}
        onCollectCoin={handleCollectCoin}
        onKillPredator={handleKillPredator}
        onPredatorHitPlayer={handlePredatorHitPlayer}
        onTickSimulation={handleTickSimulation}
      />

      {cutsceneMode !== null ? (
        <CutsceneOverlay
          scenarioId={run.scenarioId}
          mode={cutsceneMode}
          progress={cutsceneProgress}
          onSkip={handleCutsceneFinishOrSkip}
        />
      ) : (
        <GameHUD
          run={run}
          lang={language}
          nearbyPrompt={nearbyPrompt}
          resourceArrow={resourceArrow}
          extractionDist={extractionDist}
          extractionAngleDeg={extractionAngleDeg}
          mapExpanded={mapExpanded}
          muted={muted}
          sprintActive={sprintActive}
          viewMode={viewMode}
          theme={theme}
          totalCoins={totalCoins}
          music={musicControls}
          onToggleMap={() => setMapExpanded((m) => !m)}
          onToggleMute={toggleMute}
          onToggleSprint={toggleSprint}
          onToggleViewMode={handleToggleViewMode}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setShowSettings(true)}
          onQuickHeal={handleQuickHeal}
          onJoystickChange={(vec) => {
            joystickVecRef.current = vec;
          }}
          onRotateCamera={(delta) => {
            yawOffsetRef.current += delta;
          }}
          onJump={() => {
            jumpTriggerRef.current += 1;
          }}
          onFireGun={handleFireGun}
          onInteractPrompt={handleInteractPrompt}
          onUseItem={handleUseItem}
          onDropItem={handleDropItem}
          onRestart={() =>
            startNewRun(
              run.scenarioId,
              run.difficulty,
              run.gameMode,
              run.enablePredators,
              run.enableGuns,
              run.characterId
            )
          }
          onExitMenu={() => {
            setGameState('TITLE_MENU');
            setRun(null);
          }}
        />
      )}

      {run.activeSign && (
        <SignModal
          sign={run.activeSign}
          lang={language}
          onClose={() => setRun((p) => (p ? { ...p, activeSign: null } : p))}
        />
      )}

      {activeSurvivor && (
        <RescueModal
          run={run}
          survivor={activeSurvivor}
          onEscort={handleEscortSurvivor}
          onSelfEvacuate={handleSelfEvacSurvivor}
          onLeaveBehind={handleLeaveSurvivor}
          onClose={() => setRun((p) => (p ? { ...p, activeSurvivorId: null } : p))}
        />
      )}

      {activeCache && (
        <CacheModal
          run={run}
          cache={activeCache}
          remainingItems={run.cacheRemainingItems[activeCache.id] ?? activeCache.items}
          onTakeItem={handleTakeCacheItem}
          onTakeAll={handleTakeAllCacheItems}
          onClose={() => setRun((p) => (p ? { ...p, activeCacheId: null } : p))}
        />
      )}

      {gameState === 'GAME_OVER' && (
        <EndReportModal
          run={run}
          bestPoints={bestPoints}
          lang={language}
          performanceEval={performanceEval}
          newlyUnlockedAchievements={newlyUnlockedAchievements}
          newlyUnlockedRegion={newlyUnlockedRegion}
          onPlayAgain={() =>
            startNewRun(
              run.scenarioId,
              run.difficulty,
              run.gameMode,
              run.enablePredators,
              run.enableGuns,
              run.characterId
            )
          }
          onChangeScenario={() => {
            setGameState('TITLE_MENU');
            setRun(null);
          }}
        />
      )}
        </div>
      )}

      {persistentModals}
    </div>
  );
}

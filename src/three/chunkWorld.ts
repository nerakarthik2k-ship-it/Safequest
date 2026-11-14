import { DIFFICULTIES } from '../data/achievements';
import { GUN_POOL } from '../data/guns';
import { POWER_UP_POOL } from '../data/powerUps';
import { SCENARIOS } from '../data/scenarios';
import {
  CacheNode,
  ChunkData,
  Difficulty,
  DisasterId,
  ExtractionPoint,
  GameMode,
  GroundCoin,
  GroundGun,
  GroundPickup,
  GroundPowerUp,
  HazardCell,
  ItemType,
  Predator,
  PredatorKind,
  RoomDef,
  RoomFloorType,
  RubbleBarrier,
  Survivor,
  WarningSign,
} from '../types/game';
import { buildRoomWallColliders } from '../utils/gameEngine';

export const CHUNK_SIZE = 24;

function hashCoords(seedStr: string, cx: number, cz: number): number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= cx * 374761393;
  h = Math.imul(h, 668265263);
  h ^= cz * 1274126177;
  h = Math.imul(h, 2246822519);
  return h >>> 0;
}

function createRng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROOM_TEMPLATES: Record<
  DisasterId,
  Array<{ name: string; floor: RoomFloorType; wallColor: number; isShelter: boolean }>
> = {
  wildfire: [
    { name: 'Ranger Outpost', floor: 'wood', wallColor: 0x7c5c43, isShelter: true },
    { name: 'Timber Clinic', floor: 'tile', wallColor: 0xd6d3cd, isShelter: false },
    { name: 'Pine Cabin', floor: 'wood', wallColor: 0x6e4e37, isShelter: false },
    { name: 'Firehouse Bay', floor: 'concrete', wallColor: 0x993d33, isShelter: true },
    { name: 'Lookout Hall', floor: 'lodge', wallColor: 0x8a6d52, isShelter: true },
  ],
  flood: [
    { name: 'Elevated Boathouse', floor: 'wood', wallColor: 0x4b6b82, isShelter: true },
    { name: 'Harbor Pharmacy', floor: 'tile', wallColor: 0xd0dce5, isShelter: false },
    { name: 'Canal Lockhouse', floor: 'concrete', wallColor: 0x6c7a89, isShelter: true },
    { name: 'Dam Control Room', floor: 'concrete', wallColor: 0x5c6f7e, isShelter: true },
    { name: 'Pier Office', floor: 'wood', wallColor: 0x5d7a8c, isShelter: false },
  ],
  earthquake: [
    { name: 'Hardware Depot', floor: 'concrete', wallColor: 0x7c746d, isShelter: false },
    { name: 'Transit Hall', floor: 'tile', wallColor: 0x8b8e94, isShelter: false },
    { name: 'First-Aid Wing', floor: 'tile', wallColor: 0xcbd2d9, isShelter: true },
    { name: 'Reinforced Bunker', floor: 'concrete', wallColor: 0x6b7280, isShelter: true },
    { name: 'Seismic Lab', floor: 'concrete', wallColor: 0x7c828c, isShelter: false },
  ],
  blizzard: [
    { name: 'Snowplow Garage', floor: 'concrete', wallColor: 0x64748b, isShelter: true },
    { name: 'Alpine Lodge', floor: 'lodge', wallColor: 0x7c583f, isShelter: true },
    { name: 'Ski Patrol Cabin', floor: 'wood', wallColor: 0x855e42, isShelter: true },
    { name: 'Weather Station', floor: 'tile', wallColor: 0x94a3b8, isShelter: true },
    { name: 'Pass Warden Hut', floor: 'wood', wallColor: 0x6f5440, isShelter: true },
  ],
  asteroid: [
    { name: 'Observatory Wing', floor: 'tile', wallColor: 0x6d5f68, isShelter: false },
    { name: 'Subsurface Vault', floor: 'concrete', wallColor: 0x57534e, isShelter: true },
    { name: 'Geodesic Lab', floor: 'tile', wallColor: 0x8b7e84, isShelter: false },
    { name: 'Deep Ore Vault', floor: 'concrete', wallColor: 0x4b4448, isShelter: true },
    { name: 'Basalt Shelter Bay', floor: 'concrete', wallColor: 0x6b5c58, isShelter: true },
  ],
  tsunami: [
    { name: 'Seawall Bunkhouse', floor: 'concrete', wallColor: 0x4e6b7c, isShelter: true },
    { name: 'Coastguard Upper Bay', floor: 'concrete', wallColor: 0x3f5e70, isShelter: true },
    { name: 'Harbor Dispensary', floor: 'tile', wallColor: 0xc2d4de, isShelter: false },
    { name: 'Tide Gauge Office', floor: 'wood', wallColor: 0x557180, isShelter: false },
    { name: 'Highground Annex', floor: 'concrete', wallColor: 0x647e8c, isShelter: true },
  ],
  tornado: [
    { name: 'Concrete Storm Cellar', floor: 'concrete', wallColor: 0x5c6458, isShelter: true },
    { name: 'Prairie Depot', floor: 'wood', wallColor: 0x7a6548, isShelter: false },
    { name: 'Radar Safe Room', floor: 'tile', wallColor: 0x8d948a, isShelter: true },
    { name: 'Grain Co-op Office', floor: 'wood', wallColor: 0x6e5d44, isShelter: false },
    { name: 'County Safe Room', floor: 'concrete', wallColor: 0x525b52, isShelter: true },
  ],
  thunderstorm: [
    { name: 'Grounded Substation', floor: 'concrete', wallColor: 0x475569, isShelter: true },
    { name: 'Transformer Hall', floor: 'concrete', wallColor: 0x5b6778, isShelter: false },
    { name: 'Highland Clinic', floor: 'tile', wallColor: 0xcbd5e1, isShelter: true },
    { name: 'Relay Bunker', floor: 'concrete', wallColor: 0x3b485c, isShelter: true },
    { name: 'Field Crew Cabin', floor: 'wood', wallColor: 0x6b5848, isShelter: false },
  ],
  cyclone: [
    { name: 'Cyclone Shelter Hall', floor: 'concrete', wallColor: 0x5b6f7c, isShelter: true },
    { name: 'Harbor Store', floor: 'wood', wallColor: 0x6e7b82, isShelter: false },
    { name: 'Reinforced Clinic', floor: 'tile', wallColor: 0xc8d8e0, isShelter: true },
    { name: 'Coast Guard Annex', floor: 'concrete', wallColor: 0x475d6e, isShelter: true },
  ],
  volcano: [
    { name: 'Ash-Sealed Vault', floor: 'concrete', wallColor: 0x544a48, isShelter: true },
    { name: 'Volcano Observatory', floor: 'tile', wallColor: 0x786e6c, isShelter: false },
    { name: 'Basalt Safe House', floor: 'concrete', wallColor: 0x4a3f3d, isShelter: true },
    { name: 'Supply Bunkhouse', floor: 'wood', wallColor: 0x6b584d, isShelter: false },
  ],
  landslide: [
    { name: 'Bedrock Ridge Station', floor: 'concrete', wallColor: 0x666d68, isShelter: true },
    { name: 'Canyon Ranger Hut', floor: 'wood', wallColor: 0x755d47, isShelter: false },
    { name: 'Retaining Wall Bunker', floor: 'concrete', wallColor: 0x5c625e, isShelter: true },
    { name: 'Roadside Depot', floor: 'tile', wallColor: 0x8f8a82, isShelter: false },
  ],
  avalanche: [
    { name: 'Patrol Ridge Bunker', floor: 'concrete', wallColor: 0x637282, isShelter: true },
    { name: 'Timber Chalet', floor: 'lodge', wallColor: 0x7a5740, isShelter: false },
    { name: 'Glacier Rescue Room', floor: 'concrete', wallColor: 0x56697a, isShelter: true },
    { name: 'Summit Infirmary', floor: 'tile', wallColor: 0xd0dde8, isShelter: true },
  ],
  heatwave: [
    { name: 'Civic Cooling Center', floor: 'tile', wallColor: 0xd4dde6, isShelter: true },
    { name: 'Shaded Atrium', floor: 'concrete', wallColor: 0x94a3b8, isShelter: true },
    { name: 'Corner Market', floor: 'tile', wallColor: 0xc2b29b, isShelter: false },
    { name: 'Hydration Hub', floor: 'concrete', wallColor: 0x7c8a99, isShelter: true },
  ],
  coldwave: [
    { name: 'District Warming Hall', floor: 'lodge', wallColor: 0x7c5a44, isShelter: true },
    { name: 'Insulated Transit Post', floor: 'concrete', wallColor: 0x64748b, isShelter: true },
    { name: 'Frozen Depot', floor: 'wood', wallColor: 0x5b6a78, isShelter: false },
    { name: 'Thermal Clinic', floor: 'tile', wallColor: 0xcbd5e1, isShelter: true },
  ],
  drought: [
    { name: 'Cistern Pump House', floor: 'concrete', wallColor: 0x8c7b62, isShelter: true },
    { name: 'County Store', floor: 'wood', wallColor: 0x947957, isShelter: false },
    { name: 'Relief Water Depot', floor: 'tile', wallColor: 0xc9bfa8, isShelter: true },
    { name: 'Ranch Office', floor: 'wood', wallColor: 0x80684d, isShelter: false },
  ],
  duststorm: [
    { name: 'Sealed Canyon Bunker', floor: 'concrete', wallColor: 0x7d654d, isShelter: true },
    { name: 'Desert Highway Stop', floor: 'wood', wallColor: 0x8c6d4f, isShelter: false },
    { name: 'Filtered Relay Hall', floor: 'concrete', wallColor: 0x6b5c4d, isShelter: true },
    { name: 'Basin Clinic', floor: 'tile', wallColor: 0xd4c3ab, isShelter: true },
  ],
  hailstorm: [
    { name: 'Steel-Roof Depot', floor: 'concrete', wallColor: 0x62707d, isShelter: true },
    { name: 'Co-op Warehouse', floor: 'concrete', wallColor: 0x55626e, isShelter: true },
    { name: 'Glasshouse Café', floor: 'tile', wallColor: 0xb0bec5, isShelter: false },
    { name: 'Farmhouse Shelter', floor: 'wood', wallColor: 0x756352, isShelter: true },
  ],
  storm_surge: [
    { name: 'Upper Causeway Tower', floor: 'concrete', wallColor: 0x4b687d, isShelter: true },
    { name: 'Dockside Shack', floor: 'wood', wallColor: 0x667885, isShelter: false },
    { name: 'Marine Rescue Post', floor: 'concrete', wallColor: 0x3f5b70, isShelter: true },
    { name: 'Island Pharmacy', floor: 'tile', wallColor: 0xc2d4e0, isShelter: false },
  ],
  heavy_snowfall: [
    { name: 'Municipal Stone Hall', floor: 'concrete', wallColor: 0x6e7b87, isShelter: true },
    { name: 'Mountain Bakery', floor: 'wood', wallColor: 0x7c5d43, isShelter: true },
    { name: 'Snowplow Barn', floor: 'concrete', wallColor: 0x596570, isShelter: true },
    { name: 'Timber Porch', floor: 'wood', wallColor: 0x6b513b, isShelter: false },
  ],
  windstorm: [
    { name: 'Masonry Coast Shelter', floor: 'concrete', wallColor: 0x5c6966, isShelter: true },
    { name: 'Timber Mill', floor: 'wood', wallColor: 0x705842, isShelter: false },
    { name: 'Concrete Ward', floor: 'tile', wallColor: 0xbec9c6, isShelter: true },
    { name: 'Park Gatehouse', floor: 'wood', wallColor: 0x615244, isShelter: false },
  ],
  glof: [
    { name: 'Upper Monastery Hall', floor: 'concrete', wallColor: 0x786e66, isShelter: true },
    { name: 'Riverbank Camp', floor: 'wood', wallColor: 0x6e5a47, isShelter: false },
    { name: 'Terrace Stone House', floor: 'concrete', wallColor: 0x687278, isShelter: true },
    { name: 'Hydrology Post', floor: 'tile', wallColor: 0xbecad1, isShelter: true },
  ],
  sinkhole: [
    { name: 'Granite Civic Center', floor: 'concrete', wallColor: 0x676b78, isShelter: true },
    { name: 'Suburban Garage', floor: 'concrete', wallColor: 0x7c7b82, isShelter: false },
    { name: 'Survey Safe Hall', floor: 'tile', wallColor: 0xc2c5d1, isShelter: true },
    { name: 'Utility Shed', floor: 'wood', wallColor: 0x6e6258, isShelter: false },
  ],
  severe_fog: [
    { name: 'Beacon Harbor Station', floor: 'concrete', wallColor: 0x5f6e7d, isShelter: true },
    { name: 'Estuary Boathouse', floor: 'wood', wallColor: 0x586875, isShelter: true },
    { name: 'Fogbound Tollhouse', floor: 'tile', wallColor: 0x9aa8b5, isShelter: false },
    { name: 'Coast Guard Cabin', floor: 'wood', wallColor: 0x667380, isShelter: true },
  ],
};

const SURVIVOR_ROSTER = [
  {
    name: 'Elena Vance',
    role: 'Clinic Nurse',
    injured: true,
    selfEvacItem: 'medkit' as ItemType,
    perkLabel: 'Reduces hazard damage by 35%',
    perkId: 'medic_aura' as const,
    shirtColor: 0x38bdf8,
  },
  {
    name: 'Capt. Marcus Hale',
    role: 'Fire Crew Lead',
    injured: false,
    selfEvacItem: 'water' as ItemType,
    perkLabel: 'Cuts stamina drain by 40%',
    perkId: 'hazard_resist' as const,
    shirtColor: 0xf59e0b,
  },
  {
    name: 'Maya & Leo Chen',
    role: 'Stranded Siblings',
    injured: false,
    selfEvacItem: 'gear' as ItemType,
    perkLabel: 'Reveals nearby supply caches',
    perkId: 'scout_reveal' as const,
    shirtColor: 0xec4899,
  },
  {
    name: 'Owen Mercer',
    role: 'Field Botanist',
    injured: true,
    selfEvacItem: 'tool' as ItemType,
    perkLabel: '+15% party movement speed',
    perkId: 'extra_speed' as const,
    shirtColor: 0x22c55e,
  },
  {
    name: 'Dr. Priya Nair',
    role: 'ER Surgeon',
    injured: true,
    selfEvacItem: 'medkit' as ItemType,
    perkLabel: 'Stabilizes party trauma',
    perkId: 'medic_aura' as const,
    shirtColor: 0x14b8a6,
  },
  {
    name: 'Linnea Berg',
    role: 'Pass Forecaster',
    injured: false,
    selfEvacItem: 'flare' as ItemType,
    perkLabel: 'Spots distant supply crates',
    perkId: 'scout_reveal' as const,
    shirtColor: 0x06b6d4,
  },
  {
    name: 'Devon Brooks',
    role: 'Transit Inspector',
    injured: false,
    selfEvacItem: 'gear' as ItemType,
    perkLabel: 'Reveals nearby room caches',
    perkId: 'scout_reveal' as const,
    shirtColor: 0xa855f7,
  },
  {
    name: 'Hana Takahashi',
    role: 'Structural Engineer',
    injured: false,
    selfEvacItem: 'water' as ItemType,
    perkLabel: 'Shields against environmental drain',
    perkId: 'hazard_resist' as const,
    shirtColor: 0x6366f1,
  },
];

const ITEM_POOL: ItemType[] = ['medkit', 'water', 'tool', 'flare', 'gear'];

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export interface ChunkSpawnOptions {
  enablePredators?: boolean;
  enableGuns?: boolean;
}

export function generateChunk(
  scenarioId: DisasterId,
  cx: number,
  cz: number,
  difficulty: Difficulty,
  currentWave: number,
  gameMode: GameMode = 'standard_escape',
  options: ChunkSpawnOptions = {}
): ChunkData {
  const enablePredators = options.enablePredators ?? false;
  const enableGuns = options.enableGuns ?? false;
  const key = chunkKey(cx, cz);
  const rng = createRng(hashCoords(scenarioId, cx, cz));
  const scenario = SCENARIOS[scenarioId];
  const diffDef = DIFFICULTIES[difficulty];
  const centerX = cx * CHUNK_SIZE;
  const centerZ = cz * CHUNK_SIZE;

  const roads = [
    { x: centerX, z: centerZ, w: CHUNK_SIZE, d: 4.4 },
    { x: centerX, z: centerZ, w: 4.4, d: CHUNK_SIZE },
  ];

  const rooms: RoomDef[] = [];
  const caches: CacheNode[] = [];
  const signs: WarningSign[] = [];
  const pickups: GroundPickup[] = [];
  const powerUps: GroundPowerUp[] = [];
  const guns: GroundGun[] = [];
  const coins: GroundCoin[] = [];
  const predators: Predator[] = [];
  const survivors: Survivor[] = [];
  const rubbles: RubbleBarrier[] = [];
  const hazards: HazardCell[] = [];

  const templates = ROOM_TEMPLATES[scenarioId];

  const quadrants = [
    { qx: -6.8, qz: -6.8, doorSide1: 'south' as const, doorSide2: 'east' as const },
    { qx: 6.8, qz: 6.8, doorSide1: 'north' as const, doorSide2: 'west' as const },
    { qx: 6.8, qz: -6.8, doorSide1: 'south' as const, doorSide2: 'west' as const },
    { qx: -6.8, qz: 6.8, doorSide1: 'north' as const, doorSide2: 'east' as const },
  ];

  const isStartChunk = cx === 0 && cz === 0;
  const distChunks = Math.abs(cx) + Math.abs(cz);
  const hasExtraction =
    !isStartChunk && distChunks >= 2 && (Math.abs(cx * 3 + cz * 5) % 4 === 0 || (cx === 0 && cz === -2));

  let extraction: ExtractionPoint | null = null;
  if (hasExtraction) {
    extraction = {
      id: `ext-${key}`,
      x: centerX + 6.8,
      z: centerZ - 6.8,
      name: scenario.extractionName,
    };
  }

  const roomSlots = hasExtraction
    ? [quadrants[1], quadrants[0]]
    : rng() > 0.5
    ? [quadrants[0], quadrants[1]]
    : [quadrants[2], quadrants[3]];

  roomSlots.forEach((slot, idx) => {
    if (hasExtraction && slot.qx > 0 && slot.qz < 0) return;

    const tpl = templates[Math.floor(rng() * templates.length)];
    const rw = 7.4 + Math.floor(rng() * 1.6);
    const rd = 7.4 + Math.floor(rng() * 1.6);
    const rx = centerX + slot.qx;
    const rz = centerZ + slot.qz;

    const furnType1 = rng() > 0.5 ? 'bed' : 'desk';
    const furnType2 =
      scenarioId === 'blizzard' || scenarioId === 'coldwave'
        ? 'heater'
        : rng() > 0.5
        ? 'workbench'
        : 'shelf';

    const room: RoomDef = {
      id: `room-${key}-${idx}`,
      name: `${tpl.name}`,
      x: rx,
      z: rz,
      w: rw,
      d: rd,
      wallHeight: 3.3,
      floorType: tpl.floor,
      wallColor: tpl.wallColor,
      isShelter: tpl.isShelter,
      doors: [
        { id: `door-${key}-${idx}-0`, side: slot.doorSide1, offset: 0, width: 2.6 },
        { id: `door-${key}-${idx}-1`, side: slot.doorSide2, offset: 0, width: 2.6 },
      ],
      windows: [
        {
          side: slot.doorSide1 === 'south' ? 'north' : 'south',
          offset: 0,
          width: 2.4,
        },
      ],
      furniture: [
        { type: furnType1, x: rx - rw * 0.28, z: rz - rd * 0.25, rotY: 0 },
        { type: furnType2, x: rx + rw * 0.28, z: rz + rd * 0.25, rotY: 0 },
      ],
    };
    rooms.push(room);

    const cacheChance =
      (gameMode === 'scavenger_blitz' || gameMode === 'supply_frenzy' ? 0.85 : 0.65) *
      diffDef.resourceScarcity;
    if ((isStartChunk && idx === 0) || rng() < cacheChance) {
      const item1 = ITEM_POOL[Math.floor(rng() * ITEM_POOL.length)];
      const item2 = ITEM_POOL[Math.floor(rng() * ITEM_POOL.length)];
      const item3 = ITEM_POOL[Math.floor(rng() * ITEM_POOL.length)];
      const locked =
        gameMode === 'supply_frenzy' ? false : !isStartChunk && rng() < 0.3;
      const items: ItemType[] =
        gameMode === 'scavenger_blitz' || gameMode === 'supply_frenzy'
          ? [item1, item2, item3]
          : rng() < 0.45 * diffDef.resourceScarcity
          ? [item1, item2, 'water']
          : [item1, item2];
      caches.push({
        id: `cache-${key}-${idx}`,
        x: rx + rw * 0.24,
        z: rz - rd * 0.22,
        label: `${tpl.name} Locker`,
        roomName: tpl.name,
        searched: false,
        locked,
        items,
      });
    }

    const survivorChance = gameMode === 'rescue_ops' ? 0.78 : 0.44;
    if ((isStartChunk && idx === 1) || (!isStartChunk && rng() < survivorChance)) {
      const profile = SURVIVOR_ROSTER[Math.floor(rng() * SURVIVOR_ROSTER.length)];
      const urgency = difficulty === 'expert' || difficulty === 'advanced' ? 24 : 38;
      const itemTplName =
        profile.selfEvacItem === 'medkit'
          ? 'First-Aid Kit'
          : profile.selfEvacItem === 'water'
          ? scenario.id === 'blizzard' || scenario.id === 'coldwave'
            ? 'Thermos & Rations'
            : 'Drinking Water'
          : profile.selfEvacItem === 'tool'
          ? scenario.toolName
          : profile.selfEvacItem === 'flare'
          ? 'Torch & Flare'
          : scenario.gearName;

      survivors.push({
        id: `surv-${key}-${idx}`,
        name: profile.name,
        role: profile.role,
        x: rx - rw * 0.22,
        z: rz + rd * 0.2,
        roomName: tpl.name,
        condition: `Sheltering inside ${tpl.name} as ${scenario.hazardLabel.toLowerCase()} builds.`,
        injured: profile.injured,
        urgencySeconds: urgency,
        maxUrgencySeconds: urgency,
        inHazard: false,
        status: 'stranded',
        selfEvacItem: profile.selfEvacItem,
        selfEvacText: `Provide ${itemTplName} to help them evacuate.`,
        escortSpeedPenalty: profile.injured ? 0.14 : 0,
        perkLabel: profile.perkLabel,
        perkId: profile.perkId,
        shirtColor: profile.shirtColor,
      });
    }
  });

  // Roadside Warning Signs so players read official context & hazard signs independently
  if (isStartChunk || rng() < 0.5) {
    signs.push({
      id: `sign-${key}`,
      x: isStartChunk ? 2.4 : centerX + 2.4,
      z: isStartChunk ? -2.2 : centerZ - 2.4,
      title: scenario.warningSignTitle,
      message: scenario.warningSignMessage,
      officialGuidance: scenario.officialGuidance,
    });
  }

  if (!isStartChunk && rng() < 0.46) {
    const onNorthRoad = rng() > 0.5;
    rubbles.push({
      id: `rub-${key}`,
      x: onNorthRoad ? centerX : centerX + 7.5,
      z: onNorthRoad ? centerZ - 7.5 : centerZ,
      w: onNorthRoad ? 4.0 : 2.2,
      d: onNorthRoad ? 2.2 : 4.0,
      cleared: false,
      label: 'Blocked Debris',
    });
  }

  if (!isStartChunk && rng() < 0.72) {
    const hx = centerX + (rng() - 0.5) * 14;
    const hz = centerZ + (rng() - 0.5) * 14;
    const level: 1 | 2 = rng() < 0.58 ? 2 : 1;
    const activationWave = currentWave + (rng() < 0.4 ? 0 : 1);
    hazards.push({
      id: `haz-${key}`,
      x: hx,
      z: hz,
      radius: 4.5 + rng() * 1.8,
      level,
      active: activationWave <= currentWave,
      activationWave,
    });
  }

  const isInsideAnyRoom = (px: number, pz: number) =>
    rooms.some(
      (rm) =>
        px >= rm.x - rm.w / 2 - 0.9 &&
        px <= rm.x + rm.w / 2 + 0.9 &&
        pz >= rm.z - rm.d / 2 - 0.9 &&
        pz <= rm.z + rm.d / 2 + 0.9
    );

  if (isStartChunk) {
    const starterDrops: Array<{ ox: number; oz: number; itemType: ItemType }> = [
      { ox: -1.4, oz: -1.6, itemType: 'water' },
      { ox: 1.5, oz: 0.4, itemType: 'medkit' },
      { ox: -1.2, oz: 8.6, itemType: 'flare' },
    ];
    starterDrops.forEach((drop, idx) => {
      pickups.push({
        id: `pk-${key}-start-${idx}`,
        x: centerX + drop.ox,
        z: centerZ + drop.oz,
        itemType: drop.itemType,
      });
    });
  } else {
    const baseDesired =
      gameMode === 'supply_frenzy'
        ? 5
        : gameMode === 'scavenger_blitz' || gameMode === 'alpine_sprint'
        ? 4
        : 2 + (rng() < 0.55 ? 1 : 0);
    const desiredCount = Math.max(1, Math.round(baseDesired * diffDef.resourceScarcity));

    for (let i = 0; i < desiredCount; i++) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const px = centerX + (rng() - 0.5) * 18;
        const pz = centerZ + (rng() - 0.5) * 18;
        if (!isInsideAnyRoom(px, pz)) {
          pickups.push({
            id: `pk-${key}-${i}`,
            x: px,
            z: pz,
            itemType: ITEM_POOL[Math.floor(rng() * ITEM_POOL.length)],
          });
          break;
        }
      }
    }
  }

  if (isStartChunk) {
    powerUps.push(
      { id: `pw-${key}-start-0`, x: centerX + 2.1, z: centerZ + 2.2, powerType: 'turbo_speed' },
      { id: `pw-${key}-start-1`, x: centerX - 2.1, z: centerZ + 2.2, powerType: 'super_jump' }
    );
  } else if (rng() < 0.65 * diffDef.resourceScarcity) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const pwx = centerX + (rng() - 0.5) * 16;
      const pwz = centerZ + (rng() - 0.5) * 16;
      if (!isInsideAnyRoom(pwx, pwz)) {
        powerUps.push({
          id: `pw-${key}-0`,
          x: pwx,
          z: pwz,
          powerType: POWER_UP_POOL[Math.floor(rng() * POWER_UP_POOL.length)],
        });
        break;
      }
    }
  }

  if (enableGuns) {
    if (isStartChunk) {
      guns.push(
        { id: `gun-${key}-start-0`, x: centerX + 0.2, z: centerZ + 1.2, gunType: 'tactical_rifle' },
        { id: `gun-${key}-start-1`, x: centerX - 2.4, z: centerZ + 6.4, gunType: 'shotgun' }
      );
    } else {
      const gunCount = gameMode === 'monster_hunt' ? 2 : rng() < 0.72 ? 1 : 0;
      for (let i = 0; i < gunCount; i++) {
        for (let attempt = 0; attempt < 6; attempt++) {
          const gx = centerX + (rng() - 0.5) * 16;
          const gz = centerZ + (rng() - 0.5) * 16;
          if (!isInsideAnyRoom(gx, gz)) {
            guns.push({
              id: `gun-${key}-${i}`,
              x: gx,
              z: gz,
              gunType: GUN_POOL[Math.floor(rng() * GUN_POOL.length)],
            });
            break;
          }
        }
      }
    }
  }

  if (enablePredators) {
    const makePredator = (id: string, px: number, pz: number, kind: PredatorKind): Predator => {
      const isApex = kind === 'apex_monster';
      const isBeast = kind === 'beast';
      const modeBoost = gameMode === 'monster_hunt' ? 1.05 : 1.0;
      return {
        id,
        kind,
        name: isApex ? 'Apex Monster' : isBeast ? 'Shadow Beast' : 'Feral Stalker',
        x: px,
        z: pz,
        hp: isApex ? 100 : isBeast ? 80 : 60,
        maxHp: isApex ? 100 : isBeast ? 80 : 60,
        speed: (isApex ? 3.35 : isBeast ? 3.0 : 2.6) * modeBoost,
        damage: isApex ? 22 : isBeast ? 16 : 12,
        radius: isApex ? 0.88 : 0.68,
        alive: true,
      };
    };

    if (isStartChunk) {
      predators.push(
        makePredator(
          `pred-${key}-start-0`,
          centerX + 9.2,
          centerZ - 9.8,
          gameMode === 'monster_hunt' ? 'apex_monster' : 'stalker'
        )
      );
      if (gameMode === 'monster_hunt') {
        predators.push(makePredator(`pred-${key}-start-1`, centerX - 9.8, centerZ - 8.5, 'beast'));
      }
    } else {
      const predCount =
        gameMode === 'monster_hunt' ? (rng() < 0.65 ? 3 : 2) : rng() < 0.8 ? 1 : 0;
      for (let i = 0; i < predCount; i++) {
        for (let attempt = 0; attempt < 6; attempt++) {
          const px = centerX + (rng() - 0.5) * 18;
          const pz = centerZ + (rng() - 0.5) * 18;
          if (!isInsideAnyRoom(px, pz)) {
            const rKind = rng();
            const kind: PredatorKind =
              gameMode === 'monster_hunt'
                ? rKind < 0.48
                  ? 'apex_monster'
                  : rKind < 0.82
                  ? 'beast'
                  : 'stalker'
                : rKind < 0.25
                ? 'apex_monster'
                : rKind < 0.65
                ? 'beast'
                : 'stalker';
            predators.push(makePredator(`pred-${key}-${i}`, px, pz, kind));
            break;
          }
        }
      }
    }
  }

  if (isStartChunk) {
    const starterCoins: Array<{ ox: number; oz: number }> = [
      { ox: 0.0, oz: 1.5 },
      { ox: 0.0, oz: -1.5 },
      { ox: -3.2, oz: 0.0 },
      { ox: 3.2, oz: 0.0 },
      { ox: 0.0, oz: -6.8 },
    ];
    starterCoins.forEach((sc, idx) => {
      coins.push({
        id: `coin-${key}-start-${idx}`,
        x: centerX + sc.ox,
        z: centerZ + sc.oz,
        value: 1,
      });
    });
  } else {
    const coinCount = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < coinCount; i++) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const cxCoin = centerX + (rng() - 0.5) * 19;
        const czCoin = centerZ + (rng() - 0.5) * 19;
        if (!isInsideAnyRoom(cxCoin, czCoin)) {
          coins.push({
            id: `coin-${key}-${i}`,
            x: cxCoin,
            z: czCoin,
            value: 1,
          });
          break;
        }
      }
    }
  }

  const colliders = rooms.flatMap((r) => buildRoomWallColliders(r));

  return {
    key,
    cx,
    cz,
    rooms,
    roads,
    rubbles,
    caches,
    signs,
    pickups,
    powerUps,
    guns,
    coins,
    predators,
    survivors,
    hazards,
    extraction,
    colliders,
  };
}

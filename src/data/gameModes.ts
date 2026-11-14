import { GameMode } from '../types/game';

export interface GameModeDefinition {
  id: GameMode;
  title: string;
  shortRule: string;
  description: string;
  waveMultiplier: number;
  speedMultiplier: number;
  jumpMultiplier: number;
  damageMultiplier: number;
  sprintCostMultiplier: number;
  pickupMagnetRadius: number;
  requiredRescues: number;
}

export const GAME_MODE_ORDER: GameMode[] = [
  'standard_escape',
  'rescue_ops',
  'endless_survival',
  'scavenger_blitz',
  'hardcore_ironman',
  'alpine_sprint',
  'field_medic',
  'supply_frenzy',
  'monster_hunt',
];

export const GAME_MODES: Record<GameMode, GameModeDefinition> = {
  standard_escape: {
    id: 'standard_escape',
    title: 'Standard Escape',
    shortRule: 'Reach any Extraction Pad',
    description:
      'Balanced disaster escape. Scavenge rooms and floating ground supplies, choose who to rescue, and extract at any pad.',
    waveMultiplier: 1,
    speedMultiplier: 1,
    jumpMultiplier: 1,
    damageMultiplier: 1,
    sprintCostMultiplier: 1,
    pickupMagnetRadius: 1.55,
    requiredRescues: 0,
  },
  rescue_ops: {
    id: 'rescue_ops',
    title: 'Rescue Ops',
    shortRule: 'Save 3+ civilians to extract',
    description:
      'Higher civilian presence across all sectors. Extraction Pads remain locked until you escort or evacuate at least 3 civilians.',
    waveMultiplier: 1.1,
    speedMultiplier: 1,
    jumpMultiplier: 1,
    damageMultiplier: 1,
    sprintCostMultiplier: 1,
    pickupMagnetRadius: 1.55,
    requiredRescues: 3,
  },
  endless_survival: {
    id: 'endless_survival',
    title: 'Endless Survival',
    shortRule: 'Endless escalating waves',
    description:
      'No final extraction. Survive across infinite hills as waves intensify; Extraction Pads act as one-time Field Resupply Drops.',
    waveMultiplier: 0.95,
    speedMultiplier: 1,
    jumpMultiplier: 1,
    damageMultiplier: 1,
    sprintCostMultiplier: 1,
    pickupMagnetRadius: 1.55,
    requiredRescues: 0,
  },
  scavenger_blitz: {
    id: 'scavenger_blitz',
    title: 'Scavenger Blitz',
    shortRule: '+20% speed · bonus loot · fast waves',
    description:
      'Start with extra Medkit & Flare supplies, sprint 20% faster, find packed caches, and outrun rapid disaster waves.',
    waveMultiplier: 0.72,
    speedMultiplier: 1.2,
    jumpMultiplier: 1.05,
    damageMultiplier: 1,
    sprintCostMultiplier: 0.8,
    pickupMagnetRadius: 1.85,
    requiredRescues: 0,
  },
  hardcore_ironman: {
    id: 'hardcore_ironman',
    title: 'Hardcore Ironman',
    shortRule: 'No starting gear · +40% hazard dmg',
    description:
      'Deploy empty-handed with zero starting supplies and +40% hazard damage. Scavenge ground drops and caches fast to survive.',
    waveMultiplier: 0.82,
    speedMultiplier: 1,
    jumpMultiplier: 1,
    damageMultiplier: 1.4,
    sprintCostMultiplier: 1.15,
    pickupMagnetRadius: 1.45,
    requiredRescues: 0,
  },
  alpine_sprint: {
    id: 'alpine_sprint',
    title: 'Hill Runner',
    shortRule: '+35% speed · +25% jump height',
    description:
      'Bound across rolling hills and low rubble with 35% faster speed, 25% higher jumps, and halved sprint stamina drain.',
    waveMultiplier: 0.95,
    speedMultiplier: 1.35,
    jumpMultiplier: 1.25,
    damageMultiplier: 1,
    sprintCostMultiplier: 0.5,
    pickupMagnetRadius: 1.85,
    requiredRescues: 0,
  },
  field_medic: {
    id: 'field_medic',
    title: 'Field Medic',
    shortRule: 'Start w/ 3 Medkits · +15 HP per rescue',
    description:
      'Deploy with 3 Medkits & 2 Water/Rations. Every civilian you rescue or evacuate restores +15% Health.',
    waveMultiplier: 1.05,
    speedMultiplier: 1.05,
    jumpMultiplier: 1,
    damageMultiplier: 0.9,
    sprintCostMultiplier: 0.9,
    pickupMagnetRadius: 1.65,
    requiredRescues: 0,
  },
  supply_frenzy: {
    id: 'supply_frenzy',
    title: 'Supply Frenzy',
    shortRule: '5 ground drops/sector · 2.6m magnet',
    description:
      'Every sector overflows with floating ground pickups and unlocked caches with a wide 2.6m auto-pickup magnet radius.',
    waveMultiplier: 0.9,
    speedMultiplier: 1.12,
    jumpMultiplier: 1.1,
    damageMultiplier: 1,
    sprintCostMultiplier: 0.75,
    pickupMagnetRadius: 2.6,
    requiredRescues: 0,
  },
  monster_hunt: {
    id: 'monster_hunt',
    title: 'Monster Mode',
    shortRule: 'Monsters & 30s guns enabled',
    description:
      'Dedicated combat mode with relentless apex monsters, fast stalkers, and 30-second ground guns across every sector (optional in other modes).',
    waveMultiplier: 0.9,
    speedMultiplier: 1.22,
    jumpMultiplier: 1.15,
    damageMultiplier: 1.15,
    sprintCostMultiplier: 0.75,
    pickupMagnetRadius: 2.0,
    requiredRescues: 0,
  },
};

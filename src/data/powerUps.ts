import { PowerUpType } from '../types/game';

export interface PowerUpDefinition {
  id: PowerUpType;
  name: string;
  emoji: string;
  durationSec: number;
  colorHex: string;
  colorNum: number;
  effectSummary: string;
}

export const POWER_UP_POOL: PowerUpType[] = [
  'turbo_speed',
  'super_jump',
  'hazard_shield',
  'regen_aura',
];

export const POWER_UPS: Record<PowerUpType, PowerUpDefinition> = {
  turbo_speed: {
    id: 'turbo_speed',
    name: 'Hyper Speed',
    emoji: '⚡',
    durationSec: 12,
    colorHex: '#facc15',
    colorNum: 0xfacc15,
    effectSummary: '+65% move & sprint speed · zero sprint stamina cost',
  },
  super_jump: {
    id: 'super_jump',
    name: 'Sky Leap',
    emoji: '🚀',
    durationSec: 14,
    colorHex: '#38bdf8',
    colorNum: 0x38bdf8,
    effectSummary: '+55% jump height to vault rubble, ridges & cabins',
  },
  hazard_shield: {
    id: 'hazard_shield',
    name: 'Disaster Shield',
    emoji: '🛡️',
    durationSec: 12,
    colorHex: '#a855f7',
    colorNum: 0xa855f7,
    effectSummary: 'Full immunity to all natural disaster damage',
  },
  regen_aura: {
    id: 'regen_aura',
    name: 'Miracle Regen',
    emoji: '💚',
    durationSec: 10,
    colorHex: '#34d399',
    colorNum: 0x34d399,
    effectSummary: 'Restores +8% Health & +12% Stamina every second',
  },
};

import { CharacterId } from '../types/game';

export type CharacterHatStyle = 'cap' | 'medic' | 'headband' | 'hardhat' | 'visor' | 'none';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  callsign: string;
  role: string;
  tagline: string;
  perkLabel: string;
  bonusHealth: number;
  bonusStamina: number;
  speedMultiplier: number;
  damageMultiplier: number;
  hatStyle: CharacterHatStyle;
  shirtHex: string;
  shirtColor: number;
  pantsHex: string;
  pantsColor: number;
  skinHex: string;
  skinColor: number;
  hairHex: string;
  hairColor: number;
  accentHex: string;
  accentColor: number;
}

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  alex_ranger: {
    id: 'alex_ranger',
    name: 'Alex Mercer',
    callsign: 'RANGER-01',
    role: 'Wilderness Ranger',
    tagline: 'Trained for long-range disaster evacuations across rough terrain.',
    perkLabel: '+10 Stamina · Balanced Survival',
    bonusHealth: 0,
    bonusStamina: 10,
    speedMultiplier: 1.0,
    damageMultiplier: 1.0,
    hatStyle: 'cap',
    shirtHex: '#2e7d32',
    shirtColor: 0x2e7d32,
    pantsHex: '#334155',
    pantsColor: 0x334155,
    skinHex: '#e0b090',
    skinColor: 0xe0b090,
    hairHex: '#3b2416',
    hairColor: 0x3b2416,
    accentHex: '#4ade80',
    accentColor: 0x4ade80,
  },
  maya_medic: {
    id: 'maya_medic',
    name: 'Dr. Maya Lin',
    callsign: 'MEDIC-04',
    role: 'Trauma Specialist',
    tagline: 'Carries field stabilization gear for critical emergency zones.',
    perkLabel: '+20 Max Health · Medical Resilience',
    bonusHealth: 20,
    bonusStamina: 0,
    speedMultiplier: 1.0,
    damageMultiplier: 0.94,
    hatStyle: 'medic',
    shirtHex: '#dc2626',
    shirtColor: 0xdc2626,
    pantsHex: '#1e293b',
    pantsColor: 0x1e293b,
    skinHex: '#e6bea0',
    skinColor: 0xe6bea0,
    hairHex: '#18181b',
    hairColor: 0x18181b,
    accentHex: '#f8fafc',
    accentColor: 0xf8fafc,
  },
  kai_sprinter: {
    id: 'kai_sprinter',
    name: 'Kai Vance',
    callsign: 'RUNNER-07',
    role: 'Urban Scout',
    tagline: 'Outruns collapsing corridors, flash floods, and pursuing threats.',
    perkLabel: '+12% Move Speed · +15 Stamina',
    bonusHealth: 0,
    bonusStamina: 15,
    speedMultiplier: 1.12,
    damageMultiplier: 1.0,
    hatStyle: 'headband',
    shirtHex: '#0284c7',
    shirtColor: 0x0284c7,
    pantsHex: '#1e3a5f',
    pantsColor: 0x1e3a5f,
    skinHex: '#c68d68',
    skinColor: 0xc68d68,
    hairHex: '#1c1917',
    hairColor: 0x1c1917,
    accentHex: '#38bdf8',
    accentColor: 0x38bdf8,
  },
  cole_engineer: {
    id: 'cole_engineer',
    name: 'Cole Reyes',
    callsign: 'FORGE-09',
    role: 'Hazmat Engineer',
    tagline: 'Armored hazard vest built to shrug off heat, debris, and storms.',
    perkLabel: '+15 Max Health · 15% Hazard Armor',
    bonusHealth: 15,
    bonusStamina: 0,
    speedMultiplier: 0.98,
    damageMultiplier: 0.85,
    hatStyle: 'hardhat',
    shirtHex: '#d97706',
    shirtColor: 0xd97706,
    pantsHex: '#27272a',
    pantsColor: 0x27272a,
    skinHex: '#b97d56',
    skinColor: 0xb97d56,
    hairHex: '#271a12',
    hairColor: 0x271a12,
    accentHex: '#facc15',
    accentColor: 0xfacc15,
  },
  zara_hunter: {
    id: 'zara_hunter',
    name: 'Zara Kael',
    callsign: 'APEX-11',
    role: 'Sector Tracker',
    tagline: 'Night-ops tactical visor built for Monster Mode pursuit encounters.',
    perkLabel: '+8% Speed · +10% Armor',
    bonusHealth: 10,
    bonusStamina: 10,
    speedMultiplier: 1.08,
    damageMultiplier: 0.9,
    hatStyle: 'visor',
    shirtHex: '#7f1d1d',
    shirtColor: 0x7f1d1d,
    pantsHex: '#0f172a',
    pantsColor: 0x0f172a,
    skinHex: '#d49a79',
    skinColor: 0xd49a79,
    hairHex: '#3f1d2b',
    hairColor: 0x3f1d2b,
    accentHex: '#f43f5e',
    accentColor: 0xf43f5e,
  },
  steve_classic: {
    id: 'steve_classic',
    name: 'Blocky Pioneer',
    callsign: 'VOXEL-64',
    role: 'Classic Builder',
    tagline: 'Iconic overworld survivor tuned for balanced crafting and extraction.',
    perkLabel: '+10 Health · +10 Stamina · +5% Speed',
    bonusHealth: 10,
    bonusStamina: 10,
    speedMultiplier: 1.05,
    damageMultiplier: 0.96,
    hatStyle: 'none',
    shirtHex: '#06b6d4',
    shirtColor: 0x06b6d4,
    pantsHex: '#3730a3',
    pantsColor: 0x3730a3,
    skinHex: '#cf9873',
    skinColor: 0xcf9873,
    hairHex: '#432818',
    hairColor: 0x432818,
    accentHex: '#22d3ee',
    accentColor: 0x22d3ee,
  },
};

export const CHARACTER_ORDER: CharacterId[] = [
  'alex_ranger',
  'maya_medic',
  'kai_sprinter',
  'cole_engineer',
  'zara_hunter',
  'steve_classic',
];

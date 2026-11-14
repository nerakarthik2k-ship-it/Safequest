import { InventoryItem, ItemType, ScenarioDefinition } from '../types/game';

export function createItem(type: ItemType, scenario: ScenarioDefinition, uid: string): InventoryItem {
  switch (type) {
    case 'medkit':
      return {
        id: uid,
        type,
        emoji: '🩹',
        name: 'First-Aid Kit',
        shortLabel: 'First-Aid',
        description: 'Portable medical pouch containing bandages, antiseptic, and trauma gauze.',
        weight: 1,
      };
    case 'water':
      return {
        id: uid,
        type,
        emoji: scenario.id === 'blizzard' || scenario.id === 'coldwave' ? '🍲' : '💧',
        name:
          scenario.id === 'blizzard' || scenario.id === 'coldwave'
            ? 'Thermos & Rations'
            : 'Drinking Water',
        shortLabel:
          scenario.id === 'blizzard' || scenario.id === 'coldwave' ? 'Rations' : 'Water',
        description: 'Sealed emergency hydration bottle and calorie ration bar.',
        weight: 1,
      };
    case 'tool':
      return {
        id: uid,
        type,
        emoji:
          scenario.id === 'wildfire'
            ? '🪓'
            : scenario.id === 'flood' || scenario.id === 'tsunami' || scenario.id === 'storm_surge'
            ? '🪢'
            : scenario.id === 'thunderstorm'
            ? '⚡'
            : '🛠️',
        name: scenario.toolName,
        shortLabel: scenario.toolName,
        description: 'Heavy-duty utility tool built for clearing blocked routes and jammed doors.',
        weight: 1,
      };
    case 'flare':
      return {
        id: uid,
        type,
        emoji: '🔦',
        name: 'Torch & Signal Flare',
        shortLabel: 'Torch / Flare',
        description: 'High-lumen emergency torch and signal flare canister.',
        weight: 1,
      };
    case 'gear':
      return {
        id: uid,
        type,
        emoji:
          scenario.id === 'wildfire' || scenario.id === 'volcano' || scenario.id === 'duststorm'
            ? '😷'
            : scenario.id === 'flood' || scenario.id === 'tsunami' || scenario.id === 'storm_surge'
            ? '🦺'
            : '⛑️',
        name: scenario.gearName,
        shortLabel: scenario.gearName,
        description: 'Specialized personal protective equipment.',
        weight: 1,
      };
  }
}

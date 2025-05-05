
import { Swords, Wand2, Crosshair, Hand, Shield, Hammer, Zap, Footprints, ChevronsRight, Bomb, EyeOff } from 'lucide-react';
import type { HeroOption, HeroAbility } from '@/types/game'; // Import shared type

// Define abilities with icons
const guerrierAbilities: HeroAbility[] = [
    { label: 'Force Extrême', icon: Hammer },
    { label: 'Maîtrise Épée/Bouclier', icon: Shield }, // Combine sword/shield mastery
];

const magicienAbilities: HeroAbility[] = [
    { label: 'Sorts d\'Arcane', icon: Wand2 },
    { label: 'Contrôle Élémentaire', icon: Zap },
];

const archerAbilities: HeroAbility[] = [
    { label: 'Attaques à Distance', icon: Crosshair },
    { label: 'Rapidité et Agilité', icon: Footprints }, // Use Footprints for agility/speed
];

const voleurAbilities: HeroAbility[] = [
    { label: 'Discrétion et Furtivité', icon: EyeOff }, // Use EyeOff for stealth
    { label: 'Création de Pièges', icon: Bomb },
];


export const heroOptions: HeroOption[] = [
  {
    value: 'Guerrier',
    label: 'Guerrier',
    // Updated description
    description: 'Fort et courageux, excelle au combat rapproché avec force et défense.',
    icon: Swords, // Keep main icon as Swords
    abilities: guerrierAbilities // Updated abilities
  },
  {
    value: 'Magicien',
    label: 'Magicien',
    // Updated description for clarity
    description: 'Maîtrise les arcanes et lance des sorts élémentaires puissants.',
    icon: Wand2,
    abilities: magicienAbilities // Abilities remain the same
  },
  {
    value: 'Archer',
    label: 'Archer',
     // Updated description
    description: 'Précis à distance, rapide et agile pour se déplacer.',
    icon: Crosshair, // Use Crosshair icon instead of Bow
    abilities: archerAbilities // Updated abilities
  },
  {
    value: 'Voleur',
    label: 'Voleur',
     // Updated description
    description: 'Maître de la discrétion, utilise la furtivité et des pièges astucieux.',
    icon: Hand, // Keep Hand icon for Thief
    abilities: voleurAbilities // Updated abilities
  },
];

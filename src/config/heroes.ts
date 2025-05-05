
import { Swords, Wand2, Crosshair, Hand, Shield, Hammer, Zap, Footprints, ChevronsRight, Bomb, EyeOff } from 'lucide-react'; // Replaced Trap with Bomb, added EyeOff
import type { HeroOption, HeroAbility } from '@/types/game'; // Import shared type

// Define abilities with icons
const guerrierAbilities: HeroAbility[] = [
    { label: 'Force Extrême', icon: Hammer },
    { label: 'Maîtrise Épée', icon: Swords },
    { label: 'Maîtrise Bouclier', icon: Shield },
];

const magicienAbilities: HeroAbility[] = [
    { label: 'Sorts d\'Arcane', icon: Wand2 },
    { label: 'Contrôle Élémentaire', icon: Zap },
];

const archerAbilities: HeroAbility[] = [
    { label: 'Tir Précis', icon: Crosshair },
    { label: 'Rapidité', icon: ChevronsRight },
    { label: 'Agilité', icon: Footprints },
];

const voleurAbilities: HeroAbility[] = [
    { label: 'Furtivité', icon: Footprints },
    { label: 'Création de Pièges', icon: Bomb }, // Use Bomb icon instead of Trap
    { label: 'Discrétion', icon: EyeOff }, // Use EyeOff for Discrétion
];


export const heroOptions: HeroOption[] = [
  {
    value: 'Guerrier',
    label: 'Guerrier',
    description: 'Fort et courageux, expert au combat rapproché (Force Extrême, Épée, Bouclier).',
    icon: Swords,
    abilities: guerrierAbilities
  },
  {
    value: 'Magicien',
    label: 'Magicien',
    description: 'Maîtrise les arcanes et lance des sorts puissants (Sorts, Contrôle Élémentaire).',
    icon: Wand2,
    abilities: magicienAbilities
  },
  {
    value: 'Archer',
    label: 'Archer',
    description: 'Agile et précis, excelle dans le combat à distance (Tir Précis, Rapidité, Agilité).',
    icon: Crosshair, // Use Crosshair icon instead of Bow
    abilities: archerAbilities
  },
  {
    value: 'Voleur',
    label: 'Voleur',
    description: 'Furtif et astucieux, expert en discrétion et en création de pièges (Furtivité, Pièges, Discrétion).',
    icon: Hand, // Using Hand as a placeholder, consider a better icon if available
    abilities: voleurAbilities
  },
];

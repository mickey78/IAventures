import { Swords, Wand2, Crosshair, Hand, Shield, Hammer, Zap, Footprints, EyeOff, Bomb } from 'lucide-react';
import type { HeroOption, HeroAbility } from '@/types/game'; // Import HeroAbility type

// Define abilities with icons
const guerrierAbilities: HeroAbility[] = [
    { label: 'Force Extrême', icon: Hammer },
    { label: 'Maîtrise Épée/Bouclier', icon: Shield },
];

const magicienAbilities: HeroAbility[] = [
    { label: 'Sorts d\'Arcane', icon: Wand2 },
    { label: 'Contrôle Élémentaire', icon: Zap },
];

const archerAbilities: HeroAbility[] = [
    { label: 'Attaques à Distance', icon: Crosshair },
    { label: 'Rapidité et Agilité', icon: Footprints },
];

const voleurAbilities: HeroAbility[] = [
    { label: 'Discrétion et Furtivité', icon: EyeOff },
    { label: 'Création de Pièges', icon: Bomb },
];


export const heroOptions: HeroOption[] = [
  {
    value: 'Guerrier',
    label: 'Guerrier',
    description: 'Fort et courageux, excelle au combat rapproché avec force et défense.',
    icon: Swords,
    abilities: guerrierAbilities,
    appearance: "Un guerrier ou une guerrière robuste, souvent équipé(e) d'une armure de plaques ou de mailles, portant une épée longue ou une hache, et un bouclier solide. Peut avoir des cicatrices de batailles passées. Coiffure simple et pratique, regard déterminé.",
  },
  {
    value: 'Magicien',
    label: 'Magicien',
    description: 'Maîtrise les arcanes et lance des sorts élémentaires puissants.',
    icon: Wand2,
    abilities: magicienAbilities,
    appearance: "Un magicien ou une magicienne portant souvent des robes amples et colorées, parfois avec un chapeau pointu. Tient un bâton ou une baguette magique. Peut avoir des symboles mystiques brodés sur ses vêtements. Regard perçant et sage.",
  },
  {
    value: 'Archer',
    label: 'Archer',
    description: 'Précis à distance, rapide et agile pour se déplacer.',
    icon: Crosshair,
    abilities: archerAbilities,
    appearance: "Un archer ou une archère vêtu(e) de cuir léger et de couleurs de camouflage (vert, brun). Porte un arc long ou court et un carquois rempli de flèches. Coiffure souvent attachée pour ne pas gêner la visée. Agile et alerte.",
  },
  {
    value: 'Voleur',
    label: 'Voleur',
    description: 'Maître de la discrétion, utilise la furtivité et des pièges astucieux.',
    icon: Hand,
    abilities: voleurAbilities,
    appearance: "Un voleur ou une voleuse habillé(e) de vêtements sombres et ajustés pour faciliter le mouvement silencieux. Porte souvent une capuche ou un masque pour cacher son visage. Peut avoir des dagues ou des outils de crochetage à sa ceinture. Expression rusée.",
  },
];
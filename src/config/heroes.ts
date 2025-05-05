
import { Swords, Wand2, Crosshair, Hand } from 'lucide-react'; // Replaced Bow with Crosshair
import type { HeroOption } from '@/types/game'; // Import shared type

export const heroOptions: HeroOption[] = [
  {
    value: 'Guerrier',
    label: 'Guerrier',
    description: 'Possède une force extrême, manie l\'épée et le bouclier avec expertise.',
    icon: Swords,
  },
  {
    value: 'Magicien',
    label: 'Magicien',
    description: 'Maîtrise les éléments et lance de puissants sorts d\'arcane.',
    icon: Wand2,
  },
  {
    value: 'Archer',
    label: 'Archer',
    description: 'Rapide et agile, excelle dans le combat à distance précis.',
    icon: Crosshair, // Use Crosshair icon instead of Bow
  },
  {
    value: 'Voleur',
    label: 'Voleur',
    description: 'Furtif et astucieux, expert en discrétion et en création de pièges.',
    icon: Hand, // Using Hand as a placeholder, consider a better icon if available
  },
];


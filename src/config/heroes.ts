
import { Swords, Wand2, Bow, Hand } from 'lucide-react';
import type { HeroOption } from '@/types/game'; // Import shared type

export const heroOptions: HeroOption[] = [
  {
    value: 'Guerrier',
    label: 'Guerrier',
    description: 'Fort et courageux, expert au combat rapproché.',
    icon: Swords,
  },
  {
    value: 'Magicien',
    label: 'Magicien',
    description: 'Maîtrise les arcanes et lance des sorts puissants.',
    icon: Wand2,
  },
  {
    value: 'Archer',
    label: 'Archer',
    description: 'Agile et précis, excelle dans le combat à distance.',
    icon: Bow,
  },
  {
    value: 'Voleur',
    label: 'Voleur',
    description: 'Furtif et astucieux, expert en discrétion et en pièges.',
    icon: Hand, // Using Hand as a placeholder, consider a better icon if available
  },
];

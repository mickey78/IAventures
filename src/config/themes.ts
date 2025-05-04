
import { ScrollText, Rocket, Anchor, Sun, Search, Sparkles, Heart, Gamepad2, ShieldAlert } from 'lucide-react';
import type { Theme } from '@/types/game'; // Import shared type

export const themes: Theme[] = [
  { value: 'Fantasy Médiévale', label: 'Fantasy Médiévale', prompt: 'Enquête de disparition mystère', icon: ScrollText },
  { value: 'Exploration Spatiale', label: 'Exploration Spatiale', prompt: 'Mission de sauvetage sur une planète inconnue', icon: Rocket },
  { value: 'Pirates des Caraïbes', label: 'Pirates des Caraïbes', prompt: 'Chasse au trésor légendaire', icon: Anchor },
  { value: 'Western et Cowboys', label: 'Western et Cowboys', prompt: 'Confrontation avec un hors-la-loi', icon: Sun },
  { value: 'Mystère et Enquête', label: 'Mystère et Enquête', prompt: 'Résous une énigme ou retrouve un objet perdu.', icon: Search },
  { value: 'École des Super-Héros', label: 'École des Super-Héros', prompt: 'Apprends à maîtriser tes pouvoirs et sauve la situation !', icon: Sparkles },
  { value: 'Histoire d\'Amour', label: 'Histoire d\'Amour', prompt: 'Rencontre inattendue et romance naissante', icon: Heart },
  { value: 'Piégé dans le Jeu', label: 'Piégé dans le Jeu', prompt: 'Évasion d\'un jeu vidéo immersif', icon: Gamepad2 },
  { value: 'Survie Post-Apocalyptique', label: 'Survie Post-Apocalyptique', prompt: 'Recherche de ressources dans un monde dévasté', icon: ShieldAlert },
];

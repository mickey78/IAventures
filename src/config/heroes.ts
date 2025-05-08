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
    value: 'Guerrier/Guerrière',
    label: 'Guerrier/Guerrière',
    description: 'Fort et courageux, excelle au combat rapproché avec force et défense.',
    icon: Swords,
    abilities: guerrierAbilities,
    appearance: "Un guerrier robuste aux cheveux bruns courts et yeux bleus perçants. Sa peau claire est souvent marquée de petites cicatrices de combat. Il porte une armure de plaques en acier brillant et un bouclier rond en bois orné d'un emblème de loup. Il manie une épée longue solide.",
  },
  {
    value: 'Magicien/Magicienne',
    label: 'Magicien/Magicienne',
    description: 'Maîtrise les arcanes et lance des sorts élémentaires puissants.',
    icon: Wand2,
    abilities: magicienAbilities,
    appearance: "Une magicienne aux longs cheveux noirs tressés, parsemés de quelques fils d'argent, et aux yeux verts émeraudes. Sa peau est mate. Elle est vêtue d'une robe ample de couleur bleu nuit, brodée d'étoiles argentées scintillantes. Elle tient un bâton en bois de chêne noueux, surmonté d'un cristal qui pulse d'une douce lumière.",
  },
  {
    value: 'Archer/Archère',
    label: 'Archer/Archère',
    description: 'Précis à distance, rapide et agile pour se déplacer.',
    icon: Crosshair,
    abilities: archerAbilities,
    appearance: "Un archer agile aux cheveux blonds mi-longs, généralement attachés en queue de cheval pour ne pas gêner sa vision. Ses yeux noisette sont vifs et perçants. Sa peau est tannée par le soleil. Il porte une tunique en cuir souple de couleur vert forêt, un pantalon ajusté et des bottes robustes. Un carquois rempli de flèches à plumes blanches est sanglé dans son dos, et il tient un arc en if poli par l'usage.",
  },
  {
    value: 'Voleur/Voleuse',
    label: 'Voleur/Voleuse',
    description: 'Maître de la discrétion, utilise la furtivité et des pièges astucieux.',
    icon: Hand,
    abilities: voleurAbilities,
    appearance: "Un voleur discret aux cheveux noirs corbeau, coupés courts et souvent en désordre, tombant sur son front. Ses yeux sombres sont furtifs et observateurs. Sa peau est olivâtre. Il est vêtu d'une cape à capuche sombre qui masque une partie de son visage, et d'une tenue en cuir noir ajustée pour faciliter les mouvements silencieux. Plusieurs dagues et outils de crochetage sont visibles à sa ceinture.",
  },
];

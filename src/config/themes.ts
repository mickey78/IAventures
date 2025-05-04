
import { ScrollText, Rocket, Anchor, Sun, Search, Sparkles, Heart, Gamepad2, ShieldAlert } from 'lucide-react';
import type { Theme } from '@/types/game'; // Import shared type

export const themes: Theme[] = [
  {
    value: 'Fantasy Médiévale', label: 'Fantasy Médiévale', description: 'Explorez des châteaux, combattez des dragons et découvrez des trésors.', icon: ScrollText,
    subThemes: [
      { value: 'Quête Artefact', label: 'La Quête de l\'Artefact Perdu', prompt: 'Tu commences dans une vieille bibliothèque poussiéreuse, découvrant une carte énigmatique menant à un artefact ancien et puissant gardé dans un donjon oublié.' },
      { value: 'Village Endormi', label: 'Le Mystère du Village Endormi', prompt: 'Tu arrives dans un village où tous les habitants sont plongés dans un sommeil magique par un sortilège inconnu. Tu dois trouver la source de la malédiction.' },
      { value: 'Escorte Marchand', label: 'L\'Escorte du Marchand', prompt: 'Tu es engagé(e) pour protéger un marchand et sa précieuse cargaison lors de la traversée d\'une forêt réputée hantée par des créatures étranges et des bandits.' },
    ]
  },
  {
    value: 'Exploration Spatiale', label: 'Exploration Spatiale', description: 'Voyagez à travers les galaxies, rencontrez des aliens et explorez des planètes inconnues.', icon: Rocket,
    subThemes: [
      { value: 'Planète Inconnue', label: 'Atterrissage Forcé', prompt: 'Votre vaisseau s\'écrase sur une planète luxuriante inconnue. Vous devez réparer le vaisseau tout en explorant cet environnement étrange et potentiellement hostile.' },
      { value: 'Station Fantôme', label: 'Station Spatiale Abandonnée', prompt: 'Vous découvrez une station spatiale à la dérive, apparemment vide. Vous décidez d\'explorer pour trouver des ressources, mais des bruits étranges résonnent dans les couloirs.' },
      { value: 'Message Alien', label: 'Premier Contact', prompt: 'Vous captez un mystérieux signal d\'origine inconnue provenant d\'une nébuleuse proche. Vous décidez d\'enquêter, espérant établir le premier contact avec une civilisation extraterrestre.' },
    ]
  },
  {
    value: 'Pirates des Caraïbes', label: 'Pirates des Caraïbes', description: 'Naviguez sur les mers, cherchez des trésors enfouis et affrontez d\'autres pirates.', icon: Anchor,
    subThemes: [
      { value: 'Île au Trésor', label: 'La Carte du Capitaine', prompt: 'Vous trouvez une vieille carte au trésor dans une bouteille échouée sur une plage. Elle semble mener à un trésor légendaire caché sur une île volcanique dangereuse.' },
      { value: 'Mutinerie à Bord', label: 'Mutinerie !', prompt: 'Une mutinerie éclate sur votre navire ! Vous devez choisir votre camp et essayer de reprendre le contrôle du bateau ou de vous échapper sur une île déserte.' },
      { value: 'Port Maudit', label: 'Le Port des Âmes Perdues', prompt: 'Votre navire accoste dans un port brumeux réputé maudit. Les habitants semblent étranges et des disparitions suspectes ont lieu. Vous devez enquêter.' },
    ]
  },
  {
    value: 'Western et Cowboys', label: 'Western et Cowboys', description: 'Chevauchez dans le Far West, arrêtez des bandits et participez à des duels.', icon: Sun,
    subThemes: [
      { value: 'Attaque Diligence', label: 'L\'Attaque de la Diligence', prompt: 'Vous voyagez en diligence lorsque celle-ci est attaquée par des bandits masqués. Vous devez protéger les passagers et la cargaison d\'or.' },
      { value: 'Ville Fantôme', label: 'Le Secret de la Ville Fantôme', prompt: 'Vous découvrez une ville minière abandonnée dans le désert. Des rumeurs parlent d\'un trésor caché, mais aussi d\'un fantôme qui le protège.' },
      { value: 'Nouveau Shérif', label: 'Shérif d\'un Jour', prompt: 'Vous arrivez dans une petite ville sans loi où le shérif vient de disparaître. Les habitants vous demandent de prendre temporairement sa place pour rétablir l\'ordre.' },
    ]
  },
  {
    value: 'Mystère et Enquête', label: 'Mystère et Enquête', description: 'Résolvez des énigmes, trouvez des indices et démasquez des coupables.', icon: Search,
    subThemes: [
      { value: 'Manoir Hanté', label: 'Le Secret du Manoir Blackwood', prompt: 'Vous êtes invité(e) dans un vieux manoir isolé où des phénomènes étranges se produisent. Vous devez découvrir le secret qui hante ses murs.' },
      { value: 'Vol au Musée', label: 'Le Vol du Diamant Bleu', prompt: 'Un célèbre diamant a été volé dans le musée local juste avant une grande exposition. En tant que jeune détective, vous devez interroger les suspects et trouver le voleur.' },
      { value: 'Message Codé', label: 'L\'Énigme du Libraire', prompt: 'Vous trouvez un message codé laissé par le vieux libraire de la ville avant sa disparition mystérieuse. Vous devez déchiffrer le code pour le retrouver.' },
    ]
  },
  {
    value: 'École des Super-Héros', label: 'École des Super-Héros', description: 'Apprenez à maîtriser vos pouvoirs, combattez des super-vilains et sauvez le monde.', icon: Sparkles,
    subThemes: [
      { value: 'Premier Jour', label: 'Bienvenue à l\'Académie Zénith', prompt: 'C\'est votre premier jour à l\'Académie Zénith pour jeunes super-héros ! Vous découvrez vos pouvoirs lors d\'une simulation d\'entraînement qui tourne mal.' },
      { value: 'Super-Vilain Mystère', label: 'L\'Ombre sur la Ville', prompt: 'Un mystérieux super-vilain sème le chaos en ville avec des gadgets high-tech. Vous et vos amis devez découvrir son identité et l\'arrêter.' },
      { value: 'Pouvoirs Incontrôlables', label: 'Pouvoirs en Folie', prompt: 'Vos super-pouvoirs deviennent soudainement incontrôlables et provoquent des situations embarrassantes. Vous devez apprendre à les maîtriser avant le grand examen.' },
    ]
  },
  {
    value: 'Histoire d\'Amour', label: 'Histoire d\'Amour', description: 'Vivez une romance, rencontrez l\'âme sœur et surmontez les obstacles.', icon: Heart,
    subThemes: [
      { value: 'Bal Masqué', label: 'Le Bal Masqué Enchanté', prompt: 'Vous participez à un magnifique bal masqué dans un château. Vous dansez avec un(e) inconnu(e) mystérieux(se) derrière un masque. Qui est-ce ?' },
      { value: 'Lettre Perdue', label: 'La Lettre d\'Amour Oubliée', prompt: 'Vous trouvez une vieille lettre d\'amour non envoyée cachée dans un livre. Vous décidez de retrouver son destinataire pour lui remettre.' },
      { value: 'Ami Secret', label: 'Un Admirateur Secret', prompt: 'Vous recevez des cadeaux et des messages anonymes d\'un admirateur secret. Vous essayez de découvrir qui se cache derrière ces attentions.' },
    ]
  },
  {
    value: 'Piégé dans le Jeu', label: 'Piégé dans le Jeu', description: 'Explorez un monde virtuel, accomplissez des quêtes et trouvez un moyen de sortir.', icon: Gamepad2,
    subThemes: [
      { value: 'Nouveau Joueur', label: 'Niveau 1 : Tutoriel Inattendu', prompt: 'Vous lancez votre jeu vidéo préféré, mais vous êtes soudainement aspiré(e) à l\'intérieur ! Vous devez comprendre les règles de ce monde pour survivre.' },
      { value: 'Bug dans la Matrice', label: 'Le Glitch Incontrôlable', prompt: 'Le jeu vidéo dans lequel vous êtes piégé(e) commence à avoir des bugs étranges et dangereux. Vous devez trouver la sortie avant que tout ne s\'effondre.' },
      { value: 'PNJ Éveillé', label: 'L\'IA qui voulait être Libre', prompt: 'Un personnage non-joueur (PNJ) du jeu prend conscience de sa condition et vous demande de l\'aide pour s\'échapper avec vous dans le monde réel.' },
    ]
  },
  {
    value: 'Survie Post-Apocalyptique', label: 'Survie Post-Apocalyptique', description: 'Cherchez des ressources, construisez un abri et survivez dans un monde dévasté.', icon: ShieldAlert,
    subThemes: [
      { value: 'Le Dernier Abri', label: 'À la Recherche de l\'Oasis', prompt: 'Votre petit groupe de survivants manque d\'eau. Vous partez explorer les ruines d\'une ville à la recherche d\'une source d\'eau potable ou d\'un abri sûr.' },
      { value: 'Message Radio', label: 'L\'Appel à l\'Aide', prompt: 'Vous captez un faible message radio parlant d\'une communauté de survivants dans les montagnes. Vous décidez de tenter le dangereux voyage pour les rejoindre.' },
      { value: 'La Nature Reprend ses Droits', label: 'La Forêt Mutante', prompt: 'Vous devez traverser une forêt où la nature a muté après la catastrophe. Les plantes et les animaux sont étranges et potentiellement dangereux.' },
    ]
  },
];

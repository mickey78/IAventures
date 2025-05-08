import {
    Swords, Wand2, Crosshair, Hand, Shield, Hammer, Zap, Footprints, EyeOff, Bomb,
    Rocket, BrainCircuit, Wrench, Telescope, Gem, // Exploration Spatiale (Gem ajoutée ici)
    Ship, Compass, Anchor, Skull, // Pirates
    Lasso, Target, Star, Pickaxe, // Western (Gun -> Target, SheriffBadge -> Star)
    Search, Key, Puzzle, Fingerprint, // Mystère (utilisé Fingerprint)
    Sparkles, ShieldCheck, Zap as SuperZap, BookOpen, // Super-Héros (SuperZap est un alias pour Zap)
    Heart, Users, MessageSquare, Gift, // Amour
    Gamepad2, Code, Bug, Brain, // Piégé dans le Jeu
    Home, Axe, Radio, MapPinned // Survie (utilisé MapPinned)
} from 'lucide-react';
import type { ThemedHeroOptions, HeroOption, HeroAbility, HeroClass, ThemeValue } from '@/types/game';

// --- FANTASY MÉDIÉVALE ---
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

const fantasyHeroes: HeroOption[] = [
  {
    value: 'Guerrier/Guerrière',
    label: 'Guerrier/Guerrière',
    description: 'Fort et courageux, excelle au combat rapproché avec force et défense.',
    icon: Swords,
    abilities: guerrierAbilities,
    appearance: "Un guerrier robuste aux cheveux bruns courts et yeux bleus perçants. Sa peau claire est souvent marquée de petites cicatrices de combat. Il porte une armure de plaques en acier brillant et un bouclier rond en bois orné d'un emblème de loup. Il manie une épée longue solide.",
    startingInventory: [
      { name: "Potion de soin mineure", quantity: 1, description: "Restaure quelques points de vie." },
      { name: "Pierre à aiguiser", quantity: 1, description: "Pour garder l'épée tranchante." }
    ],
  },
  {
    value: 'Magicien/Magicienne',
    label: 'Magicien/Magicienne',
    description: 'Maîtrise les arcanes et lance des sorts élémentaires puissants.',
    icon: Wand2,
    abilities: magicienAbilities,
    appearance: "Une magicienne aux longs cheveux noirs tressés, parsemés de quelques fils d'argent, et aux yeux verts émeraudes. Sa peau est mate. Elle est vêtue d'une robe ample de couleur bleu nuit, brodée d'étoiles argentées scintillantes. Elle tient un bâton en bois de chêne noueux, surmonté d'un cristal qui pulse d'une douce lumière.",
    startingInventory: [
      { name: "Parchemin vierge", quantity: 1, description: "Pour noter des sorts ou des indices." },
      { name: "Cristal d'énergie faible", quantity: 1, description: "Peut amplifier un petit sort une fois." }
    ],
  },
  {
    value: 'Archer/Archère',
    label: 'Archer/Archère',
    description: 'Précis à distance, rapide et agile pour se déplacer.',
    icon: Crosshair,
    abilities: archerAbilities,
    appearance: "Un archer agile aux cheveux blonds mi-longs, généralement attachés en queue de cheval pour ne pas gêner sa vision. Ses yeux noisette sont vifs et perçants. Sa peau est tannée par le soleil. Il porte une tunique en cuir souple de couleur vert forêt, un pantalon ajusté et des bottes robustes. Un carquois rempli de flèches à plumes blanches est sanglé dans son dos, et il tient un arc en if poli par l'usage.",
    startingInventory: [
      { name: "Corde solide (5m)", quantity: 1, description: "Utile pour grimper ou attacher des choses." },
      { name: "Jumelles", quantity: 1, description: "Pour bien voir au loin." }
    ],
  },
  {
    value: 'Voleur/Voleuse',
    label: 'Voleur/Voleuse',
    description: 'Maître de la discrétion, utilise la furtivité et des pièges astucieux.',
    icon: Hand, // Note: l'icône principale était Hand, je la conserve.
    abilities: voleurAbilities,
    appearance: "Un voleur discret aux cheveux noirs corbeau, coupés courts et souvent en désordre, tombant sur son front. Ses yeux sombres sont furtifs et observateurs. Sa peau est olivâtre. Il est vêtu d'une cape à capuche sombre qui masque une partie de son visage, et d'une tenue en cuir noir ajustée pour faciliter les mouvements silencieux. Plusieurs dagues et outils de crochetage sont visibles à sa ceinture.",
    startingInventory: [
      { name: "Crochet simple", quantity: 1, description: "Pour les serrures peu complexes." },
      { name: "Bombe fumigène", quantity: 1, description: "Crée un écran de fumée pour s'échapper." }
    ],
  },
];

// --- EXPLORATION SPATIALE ---
const piloteAbilities: HeroAbility[] = [ { label: 'Manœuvres Évasives', icon: Zap }, { label: 'Canons Laser Améliorés', icon: Crosshair } ];
const xenoAbilities: HeroAbility[] = [ { label: 'Analyse Biologique', icon: BrainCircuit }, { label: 'Communication Interspécifique', icon: MessageSquare } ];
const ingenieurAbilities: HeroAbility[] = [ { label: 'Réparation d\'Urgence', icon: Wrench }, { label: 'Optimisation des Boucliers', icon: Shield } ];
const explorateurAbilities: HeroAbility[] = [ { label: 'Survie Planétaire', icon: Telescope }, { label: 'Découverte d\'Artefacts', icon: Gem } ]; // Gem était déjà importé

const spatialHeroes: HeroOption[] = [
    {
        value: 'PiloteStellaire',
        label: 'Pilote de Chasse Stellaire',
        description: 'As du pilotage, capable de manœuvres audacieuses et de tirs précis.',
        icon: Rocket,
        abilities: piloteAbilities,
        appearance: 'Combinaison de vol high-tech, casque avec visière réfléchissante, allure confiante.',
        startingInventory: [
            { name: "Kit de réparation rapide", quantity: 1, description: "Pour les petites avaries de vaisseau." },
            { name: "Stimulant de réflexes", quantity: 1, description: "Améliore la vitesse de réaction temporairement." }
        ]
    },
    {
        value: 'XenoBiologiste',
        label: 'Xéno-biologiste',
        description: 'Scientifique spécialisé dans l\'étude des formes de vie extraterrestres.',
        icon: BrainCircuit,
        abilities: xenoAbilities,
        appearance: 'Blouse de laboratoire avec des outils d\'analyse, regard curieux, porte souvent un PADD.',
        startingInventory: [
            { name: "Scanner biologique portatif", quantity: 1, description: "Analyse la composition des formes de vie." },
            { name: "Kit de prélèvement stérile", quantity: 1, description: "Pour collecter des échantillons en toute sécurité." }
        ]
    },
    {
        value: 'IngenieurVaisseau',
        label: 'Ingénieur/Ingénieure de Vaisseau',
        description: 'Génie mécanique capable de réparer et d\'améliorer n\'importe quel système.',
        icon: Wrench,
        abilities: ingenieurAbilities,
        appearance: 'Tenue de travail couverte de taches d\'huile, outils à la ceinture, air pragmatique.',
        startingInventory: [
            { name: "Multi-outil sonique", quantity: 1, description: "Outil polyvalent pour la mécanique et l'électronique." },
            { name: "Bobine d'énergie de secours", quantity: 1, description: "Fournit une petite quantité d'énergie en cas d'urgence." }
        ]
    },
    {
        value: 'ExplorateurGalactique',
        label: 'Explorateur/Exploratrice Galactique',
        description: 'Aventurier intrépide, cartographe des mondes inconnus.',
        icon: Telescope,
        abilities: explorateurAbilities,
        appearance: 'Équipement d\'exploration robuste, boussole stellaire, sac à dos rempli de matériel.',
        startingInventory: [
            { name: "Balise de détresse", quantity: 1, description: "Émet un signal de secours longue portée." },
            { name: "Ration de survie concentrée", quantity: 1, description: "Nourriture compacte pour une journée." }
        ]
    },
];

// --- PIRATES DES CARAÏBES ---
const capitaineAbilities: HeroAbility[] = [ { label: 'Commandement Naval', icon: Anchor }, { label: 'Duel à l\'Épée', icon: Swords } ];
const cartographeAbilities: HeroAbility[] = [ { label: 'Navigation Experte', icon: Compass }, { label: 'Découverte de Criques Secrètes', icon: MapPinned } ];
const canonnierAbilities: HeroAbility[] = [ { label: 'Tir de Canon Précis', icon: Bomb }, { label: 'Rechargement Rapide', icon: Zap } ];
const filibustierAbilities: HeroAbility[] = [ { label: 'Abordage Furtif', icon: Footprints }, { label: 'Pillage Effréné', icon: Skull } ];

const pirateHeroes: HeroOption[] = [
    {
        value: 'CapitainePirate',
        label: 'Capitaine Pirate',
        description: 'Meneur charismatique, expert en combat naval et en duel.',
        icon: Ship,
        abilities: capitaineAbilities,
        appearance: 'Long manteau de capitaine, tricorne à plumes, regard perçant et un crochet poli à la place d\'une main.',
        startingInventory: [
            { name: "Longue-vue", quantity: 1, description: "Pour scruter l'horizon." },
            { name: "Rhum de mauvaise qualité", quantity: 1, description: "Pour se donner du courage (ou oublier)." }
        ]
    },
    {
        value: 'CartographeMysterieux',
        label: 'Cartographe Mystérieux/Mystérieuse',
        description: 'Connaît les cartes des trésors et les routes maritimes secrètes.',
        icon: Compass,
        abilities: cartographeAbilities,
        appearance: 'Vêtements simples, rouleaux de cartes sous le bras, un air savant et des yeux qui ont vu l\'horizon.',
        startingInventory: [
            { name: "Boussole fiable", quantity: 1, description: "Indique toujours le nord." },
            { name: "Encre et plume", quantity: 1, description: "Pour dessiner des cartes ou écrire." }
        ]
    },
    {
        value: 'CanonnierExperimente',
        label: 'Canonnier/Canonnière Expérimenté(e)',
        description: 'Maître des canons, capable de semer la destruction à distance.',
        icon: Bomb,
        abilities: canonnierAbilities,
        appearance: 'Musculature développée, bandeau sur un œil, toujours une mèche à la main.',
        startingInventory: [
            { name: "Poudre à canon (petite charge)", quantity: 1, description: "Pour un tir de canon." },
            { name: "Mèche lente", quantity: 1, description: "Se consume doucement." }
        ]
    },
    {
        value: 'FilibustierAudacieux',
        label: 'Filibustier/Filibustière Audacieux/Audacieuse',
        description: 'Spécialiste des abordages rapides et du pillage.',
        icon: Skull,
        abilities: filibustierAbilities,
        appearance: 'Tenue légère pour l\'agilité, un coutelas à la ceinture et un sourire malicieux.',
        startingInventory: [
            { name: "Grappin", quantity: 1, description: "Pour monter à bord ou escalader." },
            { name: "Passe-partout", quantity: 1, description: "Ouvre les serrures simples." }
        ]
    },
];

// --- WESTERN ET COWBOYS ---
const cowboyAbilities: HeroAbility[] = [ { label: 'Tir Rapide au Revolver', icon: Target }, { label: 'Dressage de Chevaux', icon: Lasso } ]; // Lasso était déjà importé
const sherifAbilities: HeroAbility[] = [ { label: 'Maintien de l\'Ordre', icon: Star }, { label: 'Pistage de Bandits', icon: Footprints } ];
const chercheurOrAbilities: HeroAbility[] = [ { label: 'Prospection Minière', icon: Pickaxe }, { label: 'Chance du Débutant', icon: Gem } ];
const horsLaLoiAbilities: HeroAbility[] = [ { label: 'Attaque de Diligence', icon: Bomb }, { label: 'Discrétion dans le Désert', icon: EyeOff } ];

const westernHeroes: HeroOption[] = [
    {
        value: 'CowboySolitaire',
        label: 'Cowboy Solitaire',
        description: 'As de la gâchette, habile cavalier et survivant du désert.',
        icon: Lasso,
        abilities: cowboyAbilities,
        appearance: 'Chapeau de cowboy usé, poncho, bottes à éperons, regard déterminé.',
        startingInventory: [
            { name: "Lasso usé", quantity: 1, description: "Pour attraper le bétail ou autre chose." },
            { name: "Sachet de café moulu", quantity: 1, description: "Pour se réveiller près du feu de camp." }
        ]
    },
    {
        value: 'SherifIntegre',
        label: 'Shérif Intègre',
        description: 'Gardien de la loi, déterminé à protéger les innocents.',
        icon: Star,
        abilities: sherifAbilities,
        appearance: 'Étoile de shérif brillante, moustache soignée, attitude calme mais ferme.',
        startingInventory: [
            { name: "Menottes", quantity: 1, description: "Pour arrêter les bandits." },
            { name: "Mandat d'arrêt vierge", quantity: 1, description: "Prêt à être rempli." }
        ]
    },
    {
        value: 'ChercheurOrReveur',
        label: 'Chercheur/Chercheuse d\'Or Rêveur/Rêveuse',
        description: 'À la poursuite de la fortune, espérant trouver la pépite légendaire.',
        icon: Pickaxe,
        abilities: chercheurOrAbilities,
        appearance: 'Vêtements sales, pioche sur l\'épaule, un air optimiste malgré les difficultés.',
        startingInventory: [
            { name: "Tamis", quantity: 1, description: "Pour chercher de l'or dans les rivières." },
            { name: "Petite pépite", quantity: 1, description: "Un porte-bonheur ou un début de fortune ?" }
        ]
    },
    {
        value: 'HorsLaLoiMysterieux',
        label: 'Hors-la-Loi Mystérieux/Mystérieuse',
        description: 'Insaisissable et rusé, vit en marge de la société.',
        icon: Target,
        abilities: horsLaLoiAbilities,
        appearance: 'Foulard sur le visage, vêtements sombres, se déplace comme une ombre.',
        startingInventory: [
            { name: "Bâton de dynamite", quantity: 1, description: "À utiliser avec précaution !" },
            { name: "Masque noir", quantity: 1, description: "Pour cacher son identité." }
        ]
    },
];

// --- MYSTÈRE ET ENQUÊTE ---
const detectiveAbilities: HeroAbility[] = [ { label: 'Analyse d\'Indices', icon: Search }, { label: 'Interrogatoire Persuasif', icon: Users } ];
const journalisteAbilities: HeroAbility[] = [ { label: 'Recherche d\'Informations', icon: BookOpen }, { label: 'Publication Révélatrice', icon: MessageSquare } ];
const profilerAbilities: HeroAbility[] = [ { label: 'Psychologie Criminelle', icon: Brain }, { label: 'Anticipation des Actions', icon: Fingerprint } ];
const enigmatologueAbilities: HeroAbility[] = [ { label: 'Résolution de Puzzles Complexes', icon: Puzzle }, { label: 'Déchiffrage de Codes', icon: Key } ];

const mystereHeroes: HeroOption[] = [
    {
        value: 'DetectivePrive',
        label: 'Détective Privé(e)',
        description: 'Observe les détails que personne ne voit et résout les affaires complexes.',
        icon: Search,
        abilities: detectiveAbilities,
        appearance: 'Trench-coat, chapeau fedora, loupe à la main, air pensif.',
        startingInventory: [
            { name: "Loupe", quantity: 1, description: "Pour examiner les indices de près." },
            { name: "Carnet de notes", quantity: 1, description: "Pour ne rien oublier." }
        ]
    },
    {
        value: 'JournalisteInvestigateur',
        label: 'Journaliste d\'Investigation',
        description: 'Cherche la vérité et n\'hésite pas à poser les questions difficiles.',
        icon: BookOpen,
        abilities: journalisteAbilities,
        appearance: 'Carnet et stylo toujours prêts, appareil photo en bandoulière, regard curieux.',
        startingInventory: [
            { name: "Dictaphone", quantity: 1, description: "Pour enregistrer les témoignages." },
            { name: "Carte de presse", quantity: 1, description: "Ouvre quelques portes." }
        ]
    },
    {
        value: 'ProfilerIntuitif',
        label: 'Profiler/Profileuse Intuitif/Intuitive',
        description: 'Comprend l\'esprit des criminels pour anticiper leurs mouvements.',
        icon: Brain,
        abilities: profilerAbilities,
        appearance: 'Tenue sobre, regard intense, capable de lire entre les lignes.',
        startingInventory: [
            { name: "Livre de psychologie", quantity: 1, description: "Pour mieux comprendre les motivations." },
            { name: "Gants en latex", quantity: 1, description: "Pour ne pas laisser d'empreintes." }
        ]
    },
    {
        value: 'EnigmatologueAstucieux',
        label: 'Énigmatologue Astucieux/Astucieuse',
        description: 'Adore les énigmes, les codes et les mystères à déchiffrer.',
        icon: Puzzle,
        abilities: enigmatologueAbilities,
        appearance: 'Lunettes rondes, cheveux en désordre, toujours un livre de casse-têtes à portée de main.',
        startingInventory: [
            { name: "Cryptex simple", quantity: 1, description: "Un petit casse-tête à combinaison." },
            { name: "Stylo à encre invisible", quantity: 1, description: "Pour écrire des messages secrets." }
        ]
    },
];

// --- ÉCOLE DES SUPER-HÉROS ---
const prodigeAbilities: HeroAbility[] = [ { label: 'Contrôle de l\'Énergie', icon: SuperZap }, { label: 'Vol Supersonique', icon: Rocket } ];
const protecteurAbilities: HeroAbility[] = [ { label: 'Champ de Force', icon: ShieldCheck }, { label: 'Force Surhumaine', icon: Hammer } ];
const telepateAbilities: HeroAbility[] = [ { label: 'Lecture des Pensées', icon: BrainCircuit }, { label: 'Manipulation Mentale', icon: EyeOff } ];
const inventeurAbilities: HeroAbility[] = [ { label: 'Gadgets High-Tech', icon: Wrench }, { label: 'Armure Technologique', icon: Sparkles } ];

const superHeroes: HeroOption[] = [
    {
        value: 'ProdigeEnergetique',
        label: 'Prodige Énergétique',
        description: 'Manipule de puissantes énergies et peut voler à grande vitesse.',
        icon: SuperZap,
        abilities: prodigeAbilities,
        appearance: 'Costume moulant aux couleurs vives, cheveux flottants d\'énergie, yeux brillants.',
        startingInventory: [
            { name: "Batterie énergétique portable", quantity: 1, description: "Recharge un petit appareil ou un pouvoir." },
            { name: "Lunettes de visée", quantity: 1, description: "Améliore la précision des tirs d'énergie." }
        ]
    },
    {
        value: 'ProtecteurInvincible',
        label: 'Protecteur/Protectrice Invincible',
        description: 'Doté(e) d\'une force incroyable et capable de créer des boucliers.',
        icon: ShieldCheck,
        abilities: protecteurAbilities,
        appearance: 'Cape flottante, symbole d\'espoir sur la poitrine, posture héroïque.',
        startingInventory: [
            { name: "Kit de premiers secours avancé", quantity: 1, description: "Soigne rapidement les blessures." },
            { name: "Communicateur d'équipe", quantity: 1, description: "Pour rester en contact avec les alliés." }
        ]
    },
    {
        value: 'TelepatheDiscret',
        label: 'Télépathe Discret/Discrète',
        description: 'Peut lire dans les esprits et influencer subtilement les autres.',
        icon: BrainCircuit,
        abilities: telepateAbilities,
        appearance: 'Vêtements sombres, regard pénétrant, se fond dans la foule.',
        startingInventory: [
            { name: "Amplificateur psionique (faible)", quantity: 1, description: "Augmente légèrement la portée télépathique." },
            { name: "Cache-yeux pour concentration", quantity: 1, description: "Aide à bloquer les distractions mentales." }
        ]
    },
    {
        value: 'InventeurGenial',
        label: 'Inventeur/Inventrice Génial(e)',
        description: 'Crée des gadgets et des armures à la pointe de la technologie.',
        icon: Sparkles,
        abilities: inventeurAbilities,
        appearance: 'Lunettes de protection, blouse de laboratoire, toujours en train de bricoler quelque chose.',
        startingInventory: [
            { name: "Tournevis sonique", quantity: 1, description: "Ouvre presque tout (sauf le bois)." },
            { name: "Mini-drone de reconnaissance", quantity: 1, description: "Petit drone volant pour l'observation." }
        ]
    },
];

// --- HISTOIRE D'AMOUR ---
const romantiqueAbilities: HeroAbility[] = [ { label: 'Charme Naturel', icon: Heart }, { label: 'Grands Gestes Romantiques', icon: Gift } ];
const confidentAbilities: HeroAbility[] = [ { label: 'Écoute Attentive', icon: Users }, { label: 'Conseils Avisés', icon: MessageSquare } ];
const artisteAbilities: HeroAbility[] = [ { label: 'Expression Créative', icon: Wand2 }, { label: 'Sensibilité Émotionnelle', icon: Brain } ]; // Wand2 pour la créativité
const entremetteurAbilities: HeroAbility[] = [ { label: 'Connexions Sociales', icon: Users }, { label: 'Organisation d\'Événements', icon: Sparkles } ];

const amourHeroes: HeroOption[] = [
    {
        value: 'RomantiqueImpulsif',
        label: 'Romantique Impulsif/Impulsive',
        description: 'Croit au coup de foudre et n\'hésite pas à déclarer sa flamme.',
        icon: Heart,
        abilities: romantiqueAbilities,
        appearance: 'Sourire charmeur, des fleurs à la main, toujours prêt(e) pour une sérénade.',
        startingInventory: [
            { name: "Rose unique", quantity: 1, description: "Une fleur parfaite pour offrir." },
            { name: "Poème écrit à la main", quantity: 1, description: "Une déclaration d'amour un peu maladroite." }
        ]
    },
    {
        value: 'ConfidentSincere',
        label: 'Confident/Confidente Sincère',
        description: 'L\'ami(e) idéal(e) à qui l\'on peut tout dire, toujours de bon conseil.',
        icon: Users,
        abilities: confidentAbilities,
        appearance: 'Regard doux, attitude bienveillante, une épaule sur laquelle se reposer.',
        startingInventory: [
            { name: "Boîte de mouchoirs", quantity: 1, description: "Pour les larmes de joie ou de tristesse." },
            { name: "Tablette de chocolat", quantity: 1, description: "Le réconfort universel." }
        ]
    },
    {
        value: 'ArtistePassionne',
        label: 'Artiste Passionné(e)',
        description: 'Exprime ses sentiments à travers l\'art, que ce soit la musique, la peinture ou l\'écriture.',
        icon: Wand2,
        abilities: artisteAbilities,
        appearance: 'Vêtements bohèmes, carnet de croquis ou instrument de musique, inspiration dans les yeux.',
        startingInventory: [
            { name: "Carnet de croquis", quantity: 1, description: "Pour capturer l'inspiration." },
            { name: "Harmonica", quantity: 1, description: "Pour jouer une mélodie improvisée." }
        ]
    },
    {
        value: 'EntremetteurSocial',
        label: 'Entremetteur/Entremetteuse Social(e)',
        description: 'Adore connecter les gens et créer des couples heureux.',
        icon: Gift,
        abilities: entremetteurAbilities,
        appearance: 'Toujours au courant des derniers potins, agenda rempli, expert(e) en organisation de fêtes.',
        startingInventory: [
            { name: "Carnet d'adresses", quantity: 1, description: "Contient des contacts utiles." },
            { name: "Invitation vierge élégante", quantity: 1, description: "Pour organiser une rencontre." }
        ]
    },
];

// --- PIÉGÉ DANS LE JEU ---
const joueurAbilities: HeroAbility[] = [ { label: 'Maîtrise des Mécaniques de Jeu', icon: Gamepad2 }, { label: 'Adaptabilité Rapide', icon: Zap } ];
const codeurAbilities: HeroAbility[] = [ { label: 'Manipulation du Code Source', icon: Code }, { label: 'Détection de Failles', icon: Bug } ];
const stratègeAbilities: HeroAbility[] = [ { label: 'Planification de Quêtes', icon: MapPinned }, { label: 'Gestion d\'Équipe Virtuelle', icon: Users } ];
const explorateurVirtuelAbilities: HeroAbility[] = [ { label: 'Découverte de Zones Secrètes', icon: Key }, { label: 'Interaction avec les PNJ', icon: MessageSquare } ];

const piegeJeuHeroes: HeroOption[] = [
    {
        value: 'JoueurPolyvalent',
        label: 'Joueur/Joueuse Polyvalent(e)',
        description: 'S\'adapte à tous les types de jeux et apprend vite les règles.',
        icon: Gamepad2,
        abilities: joueurAbilities,
        appearance: 'Casque VR, manette à la main, regard concentré sur l\'écran (imaginaire).',
        startingInventory: [
            { name: "Potion de mana (virtuelle)", quantity: 1, description: "Restaure l'énergie pour les compétences." },
            { name: "Cheat code (usage unique)", quantity: 1, description: "Permet de tricher... une fois." }
        ]
    },
    {
        value: 'CodeurRebelle',
        label: 'Codeur/Codeuse Rebelle',
        description: 'Cherche à exploiter les bugs et à modifier le jeu de l\'intérieur.',
        icon: Code,
        abilities: codeurAbilities,
        appearance: 'Sweat à capuche, lunettes anti-lumière bleue, lignes de code défilant dans ses yeux.',
        startingInventory: [
            { name: "Débogueur de poche", quantity: 1, description: "Aide à analyser le code environnant." },
            { name: "Clé USB suspecte", quantity: 1, description: "Contient peut-être un virus... ou un outil." }
        ]
    },
    {
        value: 'StrategeMethodique',
        label: 'Stratège Méthodique',
        description: 'Analyse chaque situation et planifie les actions pour optimiser les chances de succès.',
        icon: Brain,
        abilities: stratègeAbilities,
        appearance: 'Tablette avec des plans, air sérieux, calcule toutes les possibilités.',
        startingInventory: [
            { name: "Carte tactique du niveau", quantity: 1, description: "Montre la disposition générale." },
            { name: "Manuel du jeu (partiel)", quantity: 1, description: "Contient des informations utiles mais incomplètes." }
        ]
    },
    {
        value: 'ExplorateurVirtuelCurieux',
        label: 'Explorateur/Exploratrice Virtuel(le) Curieux/Curieuse',
        description: 'Fouille chaque recoin du jeu à la recherche de secrets et d\'easter eggs.',
        icon: Search,
        abilities: explorateurVirtuelAbilities,
        appearance: 'Sac à dos virtuel rempli d\'objets, carte du monde ouverte, toujours en quête de nouveauté.',
        startingInventory: [
            { name: "Clé de donjon générique", quantity: 1, description: "Ouvre une porte verrouillée standard." },
            { name: "Parchemin de téléportation (aléatoire)", quantity: 1, description: "Téléporte à un endroit inconnu..." }
        ]
    },
];

// --- SURVIE POST-APOCALYPTIQUE ---
const survivantAbilities: HeroAbility[] = [ { label: 'Fabrication d\'Outils', icon: Axe }, { label: 'Pistage et Chasse', icon: Footprints } ];
const medecinAbilities: HeroAbility[] = [ { label: 'Soins d\'Urgence', icon: Heart }, { label: 'Connaissance des Plantes Médicinales', icon: Sparkles } ]; // Sparkles pour la découverte
const ingenieurRecupAbilities: HeroAbility[] = [ { label: 'Récupération et Recyclage', icon: Wrench }, { label: 'Fortification d\'Abri', icon: Home } ];
const éclaireurAbilities: HeroAbility[] = [ { label: 'Reconnaissance Discrète', icon: EyeOff }, { label: 'Communication Radio', icon: Radio } ];

const survieHeroes: HeroOption[] = [
    {
        value: 'SurvivantDebrouillard',
        label: 'Survivant/Survivante Débrouillard(e)',
        description: 'Capable de trouver des ressources et de se défendre avec presque rien.',
        icon: Axe,
        abilities: survivantAbilities,
        appearance: 'Vêtements rapiécés, couteau de survie à la ceinture, regard alerte.',
        startingInventory: [
            { name: "Couteau de survie", quantity: 1, description: "Outil polyvalent et arme de dernier recours." },
            { name: "Silex et amadou", quantity: 1, description: "Pour faire du feu." }
        ]
    },
    {
        value: 'MedecinDeTerrain',
        label: 'Médecin de Terrain',
        description: 'Soigne les blessures et les maladies avec les moyens du bord.',
        icon: Heart,
        abilities: medecinAbilities,
        appearance: 'Sacoche médicale usée, air calme et rassurant, mains habiles.',
        startingInventory: [
            { name: "Bandages stériles", quantity: 1, description: "Pour panser les plaies." },
            { name: "Antiseptique", quantity: 1, description: "Pour nettoyer les blessures." }
        ]
    },
    {
        value: 'IngenieurRecuperateur',
        label: 'Ingénieur/Ingénieure Récupérateur/Récupératrice',
        description: 'Transforme les débris en objets utiles et construit des abris sûrs.',
        icon: Wrench,
        abilities: ingenieurRecupAbilities,
        appearance: 'Boîte à outils improvisée, lunettes de protection, toujours à la recherche de matériaux.',
        startingInventory: [
            { name: "Ruban adhésif toilé", quantity: 1, description: "Répare presque tout." },
            { name: "Pinces multiprises", quantity: 1, description: "Outil robuste et polyvalent." }
        ]
    },
    {
        value: 'EclaireurSilencieux',
        label: 'Éclaireur/Éclaireuse Silencieux/Silencieuse',
        description: 'Explore les environs dangereux pour trouver des passages sûrs et des informations.',
        icon: Radio,
        abilities: éclaireurAbilities,
        appearance: 'Tenue de camouflage, jumelles, se déplace sans un bruit.',
        startingInventory: [
            { name: "Jumelles", quantity: 1, description: "Pour observer de loin." },
            { name: "Carte approximative de la zone", quantity: 1, description: "Donne une idée générale des environs." }
        ]
    },
];


export const themedHeroOptions: ThemedHeroOptions = {
  'Fantasy Médiévale': fantasyHeroes,
  'Exploration Spatiale': spatialHeroes,
  'Pirates des Caraïbes': pirateHeroes,
  'Western et Cowboys': westernHeroes,
  'Mystère et Enquête': mystereHeroes,
  'École des Super-Héros': superHeroes,
  'Histoire d\'Amour': amourHeroes,
  'Piégé dans le Jeu': piegeJeuHeroes,
  'Survie Post-Apocalyptique': survieHeroes,
};

// Pourrait être utile si un thème n'a pas de héros spécifiques,
// ou pour une option "générique" si jamais c'est nécessaire.
export const defaultHeroOptions: HeroOption[] = fantasyHeroes;

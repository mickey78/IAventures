
import {
    ScrollText, Rocket, Anchor, Sun, Search, Sparkles, Heart, Gamepad2, ShieldAlert, Castle, Drama,
    Map, Gem, Moon, Bed, Truck, Shield, Trophy, Swords, Egg, Flame, Trees, Globe, MilkyWay, Ghost,
    Building2, Signal, Target, Crosshair, Waves, Fish, Clock, Hourglass, TreasureChest, // Replaced Alien with Signal
    ShipWheel, Skull, CloudFog, Ship, PersonStanding, Package, EyeOff, Bomb, Building, Star, Badge,
    Mountain, Footprints, TrainTrack, Mail, Pickaxe, Home, Landmark, Diamond, Key, FileLock, Tent, // Replaced Cow with Mountain
    Puzzle, Dog, FlaskConical, AlertTriangle, GraduationCap, Bug, Zap, AlertCircle, History, // Removed Mask
    PawPrint, Rabbit, Plane, Users, HeartCrack, UserCheck, HeartHandshake, UserPlus, Gamepad, Bot,
    BrainCircuit, Goal, Flag, Code, Binary, LocateFixed, Radio, Sprout, Leaf, DoorClosed, Biohazard
 } from 'lucide-react';
import type { Theme } from '@/types/game'; // Import shared type

export const themes: Theme[] = [
  {
    value: 'Fantasy Médiévale', label: 'Fantasy Médiévale', description: 'Explorez des châteaux, combattez des dragons et découvrez des trésors.', icon: Castle,
    subThemes: [
      { value: 'Quête Artefact', label: 'La Quête de l\'Artefact Perdu', prompt: 'Tu commences dans une vieille bibliothèque poussiéreuse, découvrant une carte énigmatique menant à un artefact ancien et puissant gardé dans un donjon oublié.', icon: Map }, // Changed icon
      { value: 'Village Endormi', label: 'Le Mystère du Village Endormi', prompt: 'Tu arrives dans un village où tous les habitants sont plongés dans un sommeil magique par un sortilège inconnu. Tu dois trouver la source de la malédiction.', icon: Moon }, // Changed icon
      { value: 'Escorte Marchand', label: 'L\'Escorte du Marchand', prompt: 'Tu es engagé(e) pour protéger un marchand et sa précieuse cargaison lors de la traversée d\'une forêt réputée hantée par des créatures étranges et des bandits.', icon: Truck }, // Changed icon
      { value: 'Tournoi Chevalier', label: 'Le Grand Tournoi du Royaume', prompt: 'Tu participes au grand tournoi de chevalerie du royaume. Prépare-toi pour les joutes, les mêlées et peut-être une intrigue à déjouer dans les coulisses.', icon: Swords }, // Changed icon
      { value: 'Dragon Apprivoisé', label: 'L\'Œuf de Dragon', prompt: 'Tu découvres un œuf de dragon abandonné dans une grotte secrète. Décideras-tu de le protéger et d\'essayer d\'élever un jeune dragon, ou de le rapporter au roi ?', icon: Flame }, // Changed icon
      { value: 'Forêt Enchantée', label: 'Le Secret de la Forêt Murmurante', prompt: 'La forêt près de ton village est devenue étrangement silencieuse. Les animaux ont disparu et des lueurs étranges apparaissent la nuit. Tu pars enquêter sur ce mystère.', icon: Trees },
    ]
  },
  {
    value: 'Exploration Spatiale', label: 'Exploration Spatiale', description: 'Voyagez à travers les galaxies, rencontrez des aliens et explorez des planètes inconnues.', icon: Rocket,
    subThemes: [
      { value: 'Planète Inconnue', label: 'Atterrissage Forcé', prompt: 'Votre vaisseau s\'écrase sur une planète luxuriante inconnue. Vous devez réparer le vaisseau tout en explorant cet environnement étrange et potentiellement hostile.', icon: Globe },
      { value: 'Station Fantôme', label: 'Station Spatiale Abandonnée', prompt: 'Vous découvrez une station spatiale à la dérive, apparemment vide. Vous décidez d\'explorer pour trouver des ressources, mais des bruits étranges résonnent dans les couloirs.', icon: Ghost }, // Changed icon
      { value: 'Message Alien', label: 'Premier Contact', prompt: 'Vous captez un mystérieux signal d\'origine inconnue provenant d\'une nébuleuse proche. Vous décidez d\'enquêter, espérant établir le premier contact avec une civilisation extraterrestre.', icon: Signal }, // Changed icon from Alien
      { value: 'Chasseur Prime', label: 'Le Contrat du Chasseur de Primes', prompt: 'Tu es un jeune chasseur de primes et tu viens d\'accepter un contrat pour retrouver un vaisseau volé. Ta cible se cache dans une ceinture d\'astéroïdes dangereuse.', icon: Target }, // Changed icon
      { value: 'Planète Océan', label: 'Les Profondeurs de Xylos', prompt: 'Ta mission est d\'explorer les océans violets de la planète Xylos à bord d\'un mini-sous-marin. Que découvriras-tu sous les vagues scintillantes ?', icon: Fish }, // Changed icon
      { value: 'Anomalie Temporelle', label: 'Le Trou de Ver Instable', prompt: 'Ton vaisseau est aspiré par une anomalie spatio-temporelle ! Tu te retrouves dans un secteur inconnu de la galaxie, peut-être même à une autre époque.', icon: Clock }, // Changed icon
    ]
  },
  {
    value: 'Pirates des Caraïbes', label: 'Pirates des Caraïbes', description: 'Naviguez sur les mers, cherchez des trésors enfouis et affrontez d\'autres pirates.', icon: Anchor,
    subThemes: [
      { value: 'Île au Trésor', label: 'La Carte du Capitaine', prompt: 'Vous trouvez une vieille carte au trésor dans une bouteille échouée sur une plage. Elle semble mener à un trésor légendaire caché sur une île volcanique dangereuse.', icon: TreasureChest }, // Changed icon
      { value: 'Mutinerie à Bord', label: 'Mutinerie !', prompt: 'Une mutinerie éclate sur votre navire ! Vous devez choisir votre camp et essayer de reprendre le contrôle du bateau ou de vous échapper sur une île déserte.', icon: Skull },
      { value: 'Port Maudit', label: 'Le Port des Âmes Perdues', prompt: 'Votre navire accoste dans un port brumeux réputé maudit. Les habitants semblent étranges et des disparitions suspectes ont lieu. Vous devez enquêter.', icon: CloudFog },
      { value: 'Vaisseau Fantôme', label: 'La Légende du Hollandais Volant', prompt: 'Par une nuit sans lune, tu aperçois le légendaire vaisseau fantôme, le Hollandais Volant. Oseras-tu l\'aborder pour découvrir ses secrets ?', icon: Ship }, // Changed icon
      { value: 'Sirène Mystérieuse', label: 'Le Chant de la Sirène', prompt: 'Tu entends un chant mélodieux venant d\'un récif isolé. Les marins disent que c\'est une sirène. Est-ce un piège ou un appel à l\'aide ?', icon: Waves }, // Changed icon
      { value: 'Contrebandiers', label: 'La Crique des Contrebandiers', prompt: 'Tu découvres une crique secrète utilisée par des contrebandiers. Tu peux essayer de les rejoindre, de voler leur butin, ou de les dénoncer aux autorités.', icon: EyeOff }, // Changed icon
    ]
  },
  {
    value: 'Western et Cowboys', label: 'Western et Cowboys', description: 'Chevauchez dans le Far West, arrêtez des bandits et participez à des duels.', icon: Sun,
    subThemes: [
      { value: 'Attaque Diligence', label: 'L\'Attaque de la Diligence', prompt: 'Vous voyagez en diligence lorsque celle-ci est attaquée par des bandits masqués. Vous devez protéger les passagers et la cargaison d\'or.', icon: Bomb }, // Changed icon
      { value: 'Ville Fantôme', label: 'Le Secret de la Ville Fantôme', prompt: 'Vous découvrez une ville minière abandonnée dans le désert. Des rumeurs parlent d\'un trésor caché, mais aussi d\'un fantôme qui le protège.', icon: Building }, // Changed icon
      { value: 'Nouveau Shérif', label: 'Shérif d\'un Jour', prompt: 'Vous arrivez dans une petite ville sans loi où le shérif vient de disparaître. Les habitants vous demandent de prendre temporairement sa place pour rétablir l\'ordre.', icon: Star }, // Changed icon
      { value: 'Troupeau Perdu', label: 'La Ruée vers le Nord', prompt: 'Tu dois aider un vieux fermier à conduire son troupeau de bétail à travers des plaines dangereuses jusqu\'à la ville la plus proche, en évitant les voleurs et les coyotes.', icon: Mountain }, // Replaced Cow with Mountain
      { value: 'Train Postal', label: 'Le Vol du Train Postal', prompt: 'Tu es à bord du train postal quand il est attaqué par des hors-la-loi. Choisiras-tu de les affronter ou de te cacher avec les autres passagers ?', icon: TrainTrack },
      { value: 'Mine d\'Or', label: 'La Fièvre de l\'Or', prompt: 'Tu découvres une carte indiquant l\'emplacement d\'une mine d\'or oubliée dans les montagnes. Mais d\'autres chercheurs d\'or sont aussi sur la piste...', icon: Diamond }, // Changed icon
    ]
  },
  {
    value: 'Mystère et Enquête', label: 'Mystère et Enquête', description: 'Résolvez des énigmes, trouvez des indices et démasquez des coupables.', icon: Search,
    subThemes: [
      { value: 'Manoir Hanté', label: 'Le Secret du Manoir Blackwood', prompt: 'Vous êtes invité(e) dans un vieux manoir isolé où des phénomènes étranges se produisent. Vous devez découvrir le secret qui hante ses murs.', icon: Home }, // Changed icon
      { value: 'Vol au Musée', label: 'Le Vol du Diamant Bleu', prompt: 'Un célèbre diamant a été volé dans le musée local juste avant une grande exposition. En tant que jeune détective, vous devez interroger les suspects et trouver le voleur.', icon: Key }, // Changed icon
      { value: 'Message Codé', label: 'L\'Énigme du Libraire', prompt: 'Vous trouvez un message codé laissé par le vieux libraire de la ville avant sa disparition mystérieuse. Vous devez déchiffrer le code pour le retrouver.', icon: FileLock },
      { value: 'Cirque Etrange', label: 'Le Mystère du Cirque Itinérant', prompt: 'Un cirque étrange arrive en ville. Peu après, des objets disparaissent mystérieusement. Tu décides d\'infiltrer le cirque pour enquêter.', icon: Tent },
      { value: 'Chien Disparu', label: 'Où est Passé Patapouf ?', prompt: 'Le chien adoré de ta voisine a disparu ! Tu suis ses traces pour le retrouver, découvrant des indices surprenants en chemin.', icon: Dog }, // Changed icon
      { value: 'Sabotage Scolaire', label: 'Sabotage à l\'École', prompt: 'Quelqu\'un sabote les expériences scientifiques de l\'école avant le grand concours. Tu dois découvrir qui est le coupable avant qu\'il ne soit trop tard.', icon: FlaskConical },
    ]
  },
  {
    value: 'École des Super-Héros', label: 'École des Super-Héros', description: 'Apprenez à maîtriser vos pouvoirs, combattez des super-vilains et sauvez le monde.', icon: Sparkles,
    subThemes: [
      { value: 'Premier Jour', label: 'Bienvenue à l\'Académie Zénith', prompt: 'C\'est votre premier jour à l\'Académie Zénith pour jeunes super-héros ! Vous découvrez vos pouvoirs lors d\'une simulation d\'entraînement qui tourne mal.', icon: GraduationCap },
      { value: 'Super-Vilain Mystère', label: 'L\'Ombre sur la Ville', prompt: 'Un mystérieux super-vilain sème le chaos en ville avec des gadgets high-tech. Vous et vos amis devez découvrir son identité et l\'arrêter.', icon: Skull }, // Changed icon from Mask to Skull
      { value: 'Pouvoirs Incontrôlables', label: 'Pouvoirs en Folie', prompt: 'Vos super-pouvoirs deviennent soudainement incontrôlables et provoquent des situations embarrassantes. Vous devez apprendre à les maîtriser avant le grand examen.', icon: AlertCircle }, // Changed icon
      { value: 'Voyage Temporel', label: 'Erreur Temporelle', prompt: 'Lors d\'une expérience, tu actives accidentellement une machine à voyager dans le temps et te retrouves coincé(e) dans le passé (ou le futur !). Comment vas-tu rentrer ?', icon: History },
      { value: 'Animal de Compagnie', label: 'Un Animal de Compagnie Pas Comme les Autres', prompt: 'Tu trouves un animal étrange avec des pouvoirs surprenants. Tu décides de le garder secret, mais il attire bientôt l\'attention d\'une organisation mystérieuse.', icon: PawPrint }, // Changed icon
      { value: 'Compétition Inter-écoles', label: 'Le Défi des Héros', prompt: 'Ton école participe à une compétition amicale contre une autre académie de super-héros. Mais quelqu\'un semble tricher pour gagner...', icon: Trophy }, // Changed icon
    ]
  },
   {
     value: 'Histoire d\'Amour', label: 'Histoire d\'Amour', description: 'Vivez une romance, rencontrez l\'âme sœur et surmontez les obstacles.', icon: Heart, // Changed Icon
     subThemes: [
       { value: 'Bal Masqué', label: 'Le Bal Masqué Enchanté', prompt: 'Vous participez à un magnifique bal masqué dans un château. Vous dansez avec un(e) inconnu(e) mystérieux(se) derrière un masque. Qui est-ce ?', icon: Drama }, // Changed icon
       { value: 'Lettre Perdue', label: 'La Lettre d\'Amour Oubliée', prompt: 'Vous trouvez une vieille lettre d\'amour non envoyée cachée dans un livre. Vous décidez de retrouver son destinataire pour lui remettre.', icon: Mail },
       { value: 'Ami Secret', label: 'Un Admirateur Secret', prompt: 'Vous recevez des cadeaux et des messages anonymes d\'un admirateur secret. Vous essayez de découvrir qui se cache derrière ces attentions.', icon: UserPlus },
       { value: 'Voyage Scolaire', label: 'Amour en Voyage Scolaire', prompt: 'Lors d\'un voyage scolaire dans une ville romantique (comme Paris ou Venise), tu te rapproches de quelqu\'un de spécial, mais un malentendu menace votre relation naissante.', icon: Plane },
       { value: 'Rivalité Amoureuse', label: 'Deux Prétendants', prompt: 'Deux personnes sympathiques semblent intéressées par toi. Comment vas-tu gérer cette situation délicate sans blesser personne ?', icon: HeartCrack },
       { value: 'Amis d\'Enfance', label: 'Plus que des Amis ?', prompt: 'Tu réalises que tu as des sentiments pour ton/ta meilleur(e) ami(e) d\'enfance. Vas-tu lui avouer ou garder le secret pour préserver votre amitié ?', icon: UserCheck }, // Changed icon
     ]
   },
   {
     value: 'Piégé dans le Jeu', label: 'Piégé dans le Jeu', description: 'Explorez un monde virtuel, accomplissez des quêtes et trouvez un moyen de sortir.', icon: Gamepad2,
     subThemes: [
       { value: 'Nouveau Joueur', label: 'Niveau 1 : Tutoriel Inattendu', prompt: 'Vous lancez votre jeu vidéo préféré, mais vous êtes soudainement aspiré(e) à l\'intérieur ! Vous devez comprendre les règles de ce monde pour survivre.', icon: Gamepad },
       { value: 'Bug dans la Matrice', label: 'Le Glitch Incontrôlable', prompt: 'Le jeu vidéo dans lequel vous êtes piégé(e) commence à avoir des bugs étranges et dangereux. Vous devez trouver la sortie avant que tout ne s\'effondre.', icon: Bug },
       { value: 'PNJ Éveillé', label: 'L\'IA qui voulait être Libre', prompt: 'Un personnage non-joueur (PNJ) du jeu prend conscience de sa condition et vous demande de l\'aide pour s\'échapper avec vous dans le monde réel.', icon: Bot }, // Changed icon
       { value: 'Quête Principale', label: 'La Quête du Dernier Boss', prompt: 'Pour sortir du jeu, on dit qu\'il faut vaincre le dernier boss légendaire. Tu te lances dans cette quête épique, rencontrant d\'autres joueurs piégés en chemin.', icon: Goal },
       { value: 'Mode Difficile', label: 'Mode Survie Activé', prompt: 'Tu te retrouves dans une version "hardcore" du jeu où les ressources sont rares et les monstres plus forts. La coopération avec d\'autres joueurs est essentielle.', icon: Flag },
       { value: 'Code Source', label: 'Accès au Code Source', prompt: 'Tu découvres un moyen d\'accéder au code source du jeu. Peux-tu l\'utiliser pour tricher, aider les autres, ou trouver la sortie ? Attention aux administrateurs !', icon: Binary }, // Changed icon
     ]
   },
  {
    value: 'Survie Post-Apocalyptique', label: 'Survie Post-Apocalyptique', description: 'Cherchez des ressources, construisez un abri et survivez dans un monde dévasté.', icon: ShieldAlert,
    subThemes: [
      { value: 'Le Dernier Abri', label: 'À la Recherche de l\'Oasis', prompt: 'Votre petit groupe de survivants manque d\'eau. Vous partez explorer les ruines d\'une ville à la recherche d\'une source d\'eau potable ou d\'un abri sûr.', icon: LocateFixed }, // Changed icon
      { value: 'Message Radio', label: 'L\'Appel à l\'Aide', prompt: 'Vous captez un faible message radio parlant d\'une communauté de survivants dans les montagnes. Vous décidez de tenter le dangereux voyage pour les rejoindre.', icon: Radio },
      { value: 'La Nature Reprend ses Droits', label: 'La Forêt Mutante', prompt: 'Vous devez traverser une forêt où la nature a muté après la catastrophe. Les plantes et les animaux sont étranges et potentiellement dangereux.', icon: Sprout },
      { value: 'Ville Souterraine', label: 'Les Secrets du Bunker', prompt: 'Tu découvres l\'entrée d\'un ancien bunker gouvernemental. Est-il sûr ? Contient-il des ressources vitales ou de nouveaux dangers ?', icon: DoorClosed },
      { value: 'Groupe Rival', label: 'Conflit de Territoire', prompt: 'Tu rencontres un autre groupe de survivants qui revendique le même territoire riche en ressources. Vas-tu négocier, te battre, ou chercher ailleurs ?', icon: Users },
      { value: 'Attaque Zombie', label: 'L\'Attaque Zombie', prompt: 'Les morts-vivants attaquent votre campement de fortune ! Vous devez rapidement organiser une défense avec les maigres ressources disponibles ou trouver un moyen de fuir.', icon: Biohazard },
    ]
  },
];


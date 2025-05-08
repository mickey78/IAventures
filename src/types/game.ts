import type { LucideIcon } from 'lucide-react';

export type ThemeValue = string;
export type HeroClass = string;

export type GameView =
  | 'menu'
  | 'theme_selection'
  | 'sub_theme_selection'
  | 'hero_selection'
  | 'name_input'
  | 'loading_game'
  | 'game_active'
  | 'game_ended';

export type Choice = string; // Utilisé par ActionInput comme string[]

export interface StorySegment {
  id: number; // Modifié en number pour correspondre à generatingSegmentId
  type: 'text' | 'image' | 'actionResult' | 'narration' | 'dialogue' | 'event';
  speaker?: 'player' | 'narrator'; // Type plus spécifique
  content: string;
  imageUrl?: string | null;
  imagePrompt?: string;
  isGeneratingImage?: boolean;
  imageError?: boolean;
  choices?: Choice[]; // Peut être utilisé si les choix sont liés au segment
  timestamp?: string; // Ajouté pour potentiellement trier ou afficher l'heure
}

export interface Theme {
  value: ThemeValue;
  label: string;
  description: string;
  icon: LucideIcon;
  subThemes: SubTheme[];
}

export interface SubTheme {
  value: string;
  label: string;
  prompt: string;
  icon: LucideIcon;
}

export interface HeroAbility {
  label: string;
  icon: LucideIcon;
}

export interface HeroOption {
  value: HeroClass;
  label: string;
  description: string;
  icon: LucideIcon;
  abilities: HeroAbility[];
  appearance: string;
}

export type ThemedHeroOptions = {
  [themeValue in ThemeValue]?: HeroOption[];
};

// Structure pour currentGameState utilisé dans page.tsx
export interface InventoryItem {
  name: string;
  quantity: number;
  description?: string;
  icon?: LucideIcon;
}

export interface CurrentGameState {
  playerName: string | null;
  location: string;
  inventory: InventoryItem[]; // Utilisation de InventoryItem[]
  relationships: Record<string, any>; // Peut être affiné plus tard
  emotions: string[]; // Peut être un type plus spécifique
  events: string[]; // Peut être un type plus spécifique
}

// Type pour l'état du jeu après analyse JSON, utilisé dans gameStateUtils et flows
export interface ParsedGameState {
  playerName: string | null;
  location: string;
  inventory: InventoryItem[];
  relationships: Record<string, any>;
  emotions: string[];
  events: string[];
  [key: string]: any; // Permet des champs supplémentaires potentiels venant de l'IA
}


// GameState aligné avec l'utilisation dans page.tsx
export interface GameState {
  story: StorySegment[];
  choices: Choice[];
  currentGameState: CurrentGameState;
  theme: ThemeValue | null;
  subTheme: string | null; // La valeur du sous-thème
  selectedHero: HeroClass | null;
  playerName: string | null; // Présent à la racine et dans currentGameState.playerName dans page.tsx
  playerGender: 'male' | 'female' | null;
  isLoading: boolean;
  error: string | null;
  playerChoicesHistory: string[]; // Historique des actions/choix du joueur
  currentView: GameView;
  maxTurns: number;
  currentTurn: number;
  generatingSegmentId: number | null; // Modifié en number | null
  initialPromptDebug: string | null; // Pour le débogage du prompt initial

  // Champs optionnels qui étaient dans ma version précédente de GameState,
  // et qui pourraient être utiles. Pour l'instant, je les garde commentés
  // pour éviter des erreurs si page.tsx ne les initialise pas.
  // heroAppearance?: string | null;
  // isGeneratingImage?: boolean; // différent de isLoading, spécifique à l'image
  // currentImage?: string | null; // URL de l'image actuellement affichée en grand format par exemple
  // playerHealth?: number;
  // playerMaxHealth?: number;
  // playerEnergy?: number; // Ou mana, endurance, etc.
  // playerMaxEnergy?: number;
  // activeEffects?: Array<{ name:string; duration: number; description?: string }>;
  // npcs?: Array<{name: string; relationship: string; description?: string}>;
  // quests?: Array<{title: string; description: string; status: 'active' | 'completed' | 'failed'; objectives: Array<{text: string; completed: boolean}> }>;
  // worldState?: Record<string, any>; // Pour les changements dynamiques dans le monde du jeu
  // lastPlayerAction?: string | null; // Pour donner plus de contexte à l'IA
  // gameId?: string | null; // Pour la sauvegarde et le chargement
  // createdAt?: Date | null; // Date de création de la partie
  // updatedAt?: Date | null; // Date de la dernière sauvegarde
}

export interface SaveSlot {
  id: string;
  name: string;
  timestamp: number;
  heroName?: string;
  heroClass?: string;
  themeLabel?: string;
  previewImage?: string;
}

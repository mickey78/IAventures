

import type { LucideIcon } from 'lucide-react';

// Represents a single segment in the story conversation
export interface StorySegment {
  id: number;
  text: string;
  speaker: 'player' | 'narrator'; // Identify the speaker
  storyImageUrl?: string | null; // Optional URL for the generated image
  imageIsLoading?: boolean | null; // Flag to indicate image is being generated
  imageError?: boolean | null; // Flag to indicate image generation failed
  imageGenerationPrompt?: string | null; // Store the prompt used for generation (for debugging/consistency)
}

// Represents the structured game state *after* parsing the JSON string from the AI
export interface ParsedGameState {
    inventory: string[];
    playerName: string | null; // Can be null initially
    location?: string; // Current location
    relationships?: Record<string, string>; // Example: { "Gobelin": "ennemi", "Marchand": "neutre" }
    emotions?: string[]; // Example: ["curieux", "prudent", "effrayé"]
    events?: string[]; // Example: ["trouvé clé", "échappé grotte", "rencontré gobelin"]
    [key: string]: any; // Allow for other dynamic properties
}


// Represents the main application state
export interface GameState {
  story: StorySegment[];
  choices: string[];
  currentGameState: ParsedGameState; // Use the parsed object, not the string
  theme: string | null;
  subTheme: string | null; // Added subTheme field
  playerName: string | null;
  isLoading: boolean; // Overall loading state (e.g., waiting for AI)
  error: string | null;
  playerChoicesHistory: string[];
  currentView: GameView;
  maxTurns: number;
  currentTurn: number;
  generatingSegmentId: number | null; // ID of segment currently generating image, or null
  selectedHero: string | null; // Added selectedHero field
  initialPromptDebug: string | null; // Store the initial prompt string for debugging
}

// Represents the different views/screens of the application
export type GameView = 'menu' | 'theme_selection' | 'sub_theme_selection' | 'hero_selection' | 'name_input' | 'loading_game' | 'game_active' | 'game_ended'; // Added hero_selection view

// Represents a sub-theme option
export interface SubTheme {
    value: string; // Unique value for the sub-theme (can be same as label)
    label: string; // Display name for the sub-theme
    prompt: string; // Specific starting scenario prompt for the AI
    icon: LucideIcon; // Icon for the sub-theme card
}

// Represents a theme option for the game
export interface Theme {
    value: string; // The value sent to the AI (main theme identifier)
    label: string; // Display name for the user
    description: string; // Short general description of the theme
    icon: LucideIcon; // Icon component from lucide-react
    subThemes: SubTheme[]; // Array of specific sub-themes/scenarios
}

// Represents a hero's ability
export interface HeroAbility {
    label: string; // Description of the ability
    icon: LucideIcon; // Icon for the ability
}

// Represents a hero option
export interface HeroOption {
    value: string; // Unique value for the hero class (e.g., 'Warrior')
    label: string; // Display name for the user (e.g., 'Warrior')
    description: string; // Short description of the hero class
    icon: LucideIcon; // Icon component from lucide-react
    abilities: HeroAbility[]; // Array of hero abilities
}

// Represents the selected hero class (could be extended with abilities)
export type HeroClass = string;




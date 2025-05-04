
import type { LucideIcon } from 'lucide-react';

// Represents a single segment in the story conversation
export interface StorySegment {
  id: number;
  text: string;
  speaker: 'player' | 'narrator'; // Identify the speaker
  storyImageUrl?: string | null; // Optional URL for the generated image
  imageIsLoading?: boolean; // Flag to indicate image is being generated
  imageError?: boolean; // Flag to indicate image generation failed
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
  playerName: string | null;
  isLoading: boolean; // Overall loading state (e.g., waiting for AI)
  error: string | null;
  playerChoicesHistory: string[];
  currentView: GameView;
  maxTurns: number;
  currentTurn: number;
  generatingSegmentId: number | null; // ID of segment currently generating image, or null
}

// Represents the different views/screens of the application
export type GameView = 'menu' | 'theme_selection' | 'name_input' | 'loading_game' | 'game_active' | 'game_ended';

// Represents a theme option for the game
export interface Theme {
    value: string; // The value sent to the AI
    label: string; // Display name for the user
    prompt: string; // Short description/prompt for the theme
    icon: LucideIcon; // Icon component from lucide-react
}


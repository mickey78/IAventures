// src/lib/saveLoadUtils.ts
'use client'; // Mark as client component because it uses localStorage

import type { StorySegment } from '@/app/page'; // Adjust the import path as needed

// Define the structure of the data to be saved
export interface GameStateToSave {
  theme: string;
  playerName: string; // Added player name
  story: Omit<StorySegment, 'imageIsLoading' | 'imageError' | 'imageGenerationPrompt'>[]; // Exclude transient image states and prompt
  choices: string[];
  currentGameState: string; // Stored as JSON string (contains location, inventory, etc.)
  playerChoicesHistory: string[];
  timestamp: number;
  saveName: string;
  maxTurns: number; // Added max turns
  currentTurn: number; // Added current turn
}

const SAVE_GAME_KEY = 'adventureCraftSaves_v1'; // Use a versioned key

/**
 * Retrieves all saved games from localStorage.
 * Handles potential JSON parsing errors and validates structure.
 * @returns An array of saved game states.
 */
export function listSaveGames(): GameStateToSave[] {
  if (typeof window === 'undefined') {
    return []; // Cannot access localStorage on server
  }
  try {
    const savedGamesJson = localStorage.getItem(SAVE_GAME_KEY);
    if (!savedGamesJson) {
      return [];
    }
    let savedGames = JSON.parse(savedGamesJson) as GameStateToSave[]; // Use let for potential modification
    // Basic validation - check if it's an array
    if (!Array.isArray(savedGames)) {
        console.error("Invalid save data found in localStorage. Expected an array.");
        localStorage.removeItem(SAVE_GAME_KEY); // Clear invalid data
        return [];
    }
     // Further validation for essential fields and inner gameState structure
     savedGames = savedGames.map(save => { // Use map to return a new array with validated saves
        let currentGameStateObj: any = {};
        try {
            currentGameStateObj = JSON.parse(save.currentGameState || '{}');
            if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) throw new Error("Not an object");
        } catch (e) {
            console.warn(`Save game "${save.saveName}" has invalid JSON in currentGameState. Resetting gameState.`);
            currentGameStateObj = { // Reset to a basic valid structure
                playerName: save.playerName || 'Joueur Inconnu',
                location: 'Lieu Inconnu',
                inventory: []
            };
            save.currentGameState = JSON.stringify(currentGameStateObj); // Update the save object itself for consistency
        }

        if (typeof save.playerName !== 'string' || !save.playerName.trim()) {
             console.warn(`Save game "${save.saveName}" missing or invalid player name. Defaulting.`);
            save.playerName = 'Joueur Inconnu'; // Assign a default if needed
             if (!currentGameStateObj.playerName) currentGameStateObj.playerName = save.playerName; // Sync with inner state
        }
        if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) {
            console.warn(`Save game "${save.saveName}" missing or invalid location in gameState. Defaulting.`);
            currentGameStateObj.location = 'Lieu Indéterminé';
        }
        if (!Array.isArray(currentGameStateObj.inventory)) {
            console.warn(`Save game "${save.saveName}" missing or invalid inventory in gameState. Defaulting.`);
            currentGameStateObj.inventory = [];
        }
        // Ensure inventory items are strings
        currentGameStateObj.inventory = currentGameStateObj.inventory.filter((item: any) => typeof item === 'string');


        // Validate turn numbers (assign defaults if missing)
        if (typeof save.maxTurns !== 'number' || save.maxTurns <= 0) {
            console.warn(`Save game "${save.saveName}" missing or invalid maxTurns. Defaulting to 15.`);
            save.maxTurns = 15;
        }
        if (typeof save.currentTurn !== 'number' || save.currentTurn <= 0) {
            console.warn(`Save game "${save.saveName}" missing or invalid currentTurn. Defaulting to 1.`);
            save.currentTurn = 1;
        }
        // Ensure current turn doesn't exceed max turns (could happen with manual edits)
        if (save.currentTurn > save.maxTurns + 1) { // Allow one over for "ended" state
             console.warn(`Save game "${save.saveName}" has currentTurn exceeding maxTurns. Clamping.`);
             save.currentTurn = save.maxTurns + 1;
        }
         // Validate story segments (basic checks)
         if (!Array.isArray(save.story)) {
            console.warn(`Save game "${save.saveName}" has invalid story format. Resetting story.`);
            save.story = [];
         } else {
            // Ensure storyImageUrl is string or null/undefined and remove transient/debug states
            save.story = save.story.map(seg => {
                if (seg.storyImageUrl !== undefined && seg.storyImageUrl !== null && typeof seg.storyImageUrl !== 'string') {
                    console.warn(`Invalid storyImageUrl found in save "${save.saveName}". Setting to null.`);
                    seg.storyImageUrl = null;
                }
                // Remove transient/debug states if they somehow got saved
                const { imageIsLoading, imageError, imageGenerationPrompt, ...rest } = seg as any;
                return rest;
            });
         }


        // Re-stringify the potentially corrected inner gameState
        save.currentGameState = JSON.stringify(currentGameStateObj);

        return save; // Return the validated/corrected save object
     });

    // Sort by timestamp descending (most recent first)
    return savedGames.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error loading save games from localStorage:', error);
    // Optionally clear corrupted data
    // localStorage.removeItem(SAVE_GAME_KEY);
    return [];
  }
}

/**
 * Saves the current game state to localStorage.
 * Finds an existing save with the same name or adds a new one.
 * Expects gameState.currentGameState to be a valid JSON string containing location.
 * Omits transient image states (imageIsLoading, imageError, imageGenerationPrompt) from story segments.
 * @param saveName The name/identifier for the save slot.
 * @param gameState The game state to save (including playerName, stringified currentGameState with location, and turn info).
 * @returns True if save was successful, false otherwise.
 */
export function saveGame(saveName: string, gameState: Omit<GameStateToSave, 'timestamp' | 'saveName'>): boolean {
   if (typeof window === 'undefined') {
    console.error('Cannot save game on the server.');
    return false;
  }
  if (!gameState.playerName) {
      console.error('Cannot save game without a player name.');
      return false;
  }
   // Validate that currentGameState is a string before saving
   if (typeof gameState.currentGameState !== 'string') {
        console.error('Error saving: currentGameState must be a stringified JSON.');
        return false;
   }
    // Validate the JSON structure within the string *before* saving
    let parsedState: any;
    try {
         parsedState = JSON.parse(gameState.currentGameState);
         if (typeof parsedState !== 'object' || parsedState === null || !parsedState.playerName || !Array.isArray(parsedState.inventory) || typeof parsedState.location !== 'string' || !parsedState.location.trim()) { // Added location check
            throw new Error("Invalid structure or missing fields (playerName, location, inventory) in currentGameState JSON");
         }
    } catch (e) {
        console.error('Error saving: Invalid JSON structure or missing fields in currentGameState string.', e, gameState.currentGameState);
        return false;
    }
    // Validate turns before saving
    if (typeof gameState.maxTurns !== 'number' || gameState.maxTurns <= 0 || typeof gameState.currentTurn !== 'number' || gameState.currentTurn <= 0) {
        console.error('Error saving: Invalid turn data provided.');
        return false;
    }


  try {
    const saves = listSaveGames(); // Gets validated saves
    const now = Date.now();

    // Prepare story state for saving (remove transient/debug flags)
    const storyToSave = gameState.story.map(seg => {
        const { imageIsLoading, imageError, imageGenerationPrompt, ...rest } = seg;
        return rest;
    });


    const newState: GameStateToSave = {
        ...gameState, // Includes stringified currentGameState with location and turn info
        story: storyToSave, // Use the cleaned story array
        saveName: saveName,
        timestamp: now,
    }

    const existingIndex = saves.findIndex(s => s.saveName === saveName);

    if (existingIndex > -1) {
        saves[existingIndex] = newState;
    } else {
        saves.push(newState);
    }

    saves.sort((a, b) => b.timestamp - a.timestamp);

    localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saves));
    console.log(`Game saved as "${saveName}" for player "${gameState.playerName}" at turn ${gameState.currentTurn}/${gameState.maxTurns} in location "${parsedState.location}"`); // Log location
    return true;
  } catch (error) {
    console.error('Error saving game to localStorage:', error);
    return false;
  }
}

/**
 * Loads a specific game state from localStorage by save name.
 * Adds default transient image states (imageIsLoading: false, imageError: false) to story segments.
 * @param saveName The name of the save slot to load.
 * @returns The loaded game state (with currentGameState as a string containing location and turn info) or null if not found or error occurs.
 */
export function loadGame(saveName: string): GameStateToSave | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    // listSaveGames already validates structure, JSON validity, and turn numbers
    const saves = listSaveGames();
    const save = saves.find(s => s.saveName === saveName);
    if (!save) {
        console.warn(`Save game "${saveName}" not found.`);
        return null;
    }

    // The save object returned by listSaveGames should be valid
    let locationInfo = 'lieu inconnu'; // Default location text
     try {
         const parsedState = JSON.parse(save.currentGameState);
         locationInfo = parsedState.location || locationInfo;
     } catch (e) {
         console.warn(`Could not parse location from saved game "${saveName}".`);
     }

     // Rehydrate story segments with default transient states
     const storyWithTransientState = save.story.map(seg => ({
        ...seg,
        imageIsLoading: false,
        imageError: false,
        imageGenerationPrompt: undefined, // Ensure prompt is not loaded
     }));


    console.log(`Game "${saveName}" loaded for player "${save.playerName}" at turn ${save.currentTurn}/${save.maxTurns} in location "${locationInfo}".`);
    return { ...save, story: storyWithTransientState }; // Return the object with enriched story state
  } catch (error) {
    console.error(`Error loading game "${saveName}" from localStorage:`, error);
    return null;
  }
}

/**
 * Deletes a specific save game from localStorage by save name.
 * @param saveName The name of the save slot to delete.
 * @returns True if deletion was successful or save didn't exist, false on error.
 */
export function deleteSaveGame(saveName: string): boolean {
   if (typeof window === 'undefined') {
    console.error('Cannot delete game on the server.');
    return false;
  }
  try {
    let saves = listSaveGames();
    const initialLength = saves.length;
    saves = saves.filter(s => s.saveName !== saveName);

    if (saves.length === initialLength) {
        console.warn(`Save game "${saveName}" not found for deletion.`);
    }

    if (saves.length === 0) {
        localStorage.removeItem(SAVE_GAME_KEY);
    } else {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saves));
    }
    console.log(`Save game "${saveName}" deleted.`);
    return true;
  } catch (error) {
    console.error(`Error deleting game "${saveName}" from localStorage:`, error);
    return false;
  }
}

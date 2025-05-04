// src/lib/saveLoadUtils.ts
'use client'; // Mark as client component because it uses localStorage

import type { StorySegment } from '@/app/page'; // Adjust the import path as needed

// Define the structure of the data to be saved
export interface GameStateToSave {
  theme: string;
  playerName: string; // Added player name
  story: StorySegment[];
  choices: string[];
  currentGameState: string; // Stored as JSON string
  playerChoicesHistory: string[];
  timestamp: number;
  saveName: string;
}

const SAVE_GAME_KEY = 'adventureCraftSaves_v1'; // Use a versioned key

/**
 * Retrieves all saved games from localStorage.
 * Handles potential JSON parsing errors.
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
    const savedGames = JSON.parse(savedGamesJson) as GameStateToSave[];
    // Basic validation - check if it's an array
    if (!Array.isArray(savedGames)) {
        console.error("Invalid save data found in localStorage. Expected an array.");
        localStorage.removeItem(SAVE_GAME_KEY); // Clear invalid data
        return [];
    }
     // Further validation for playerName and ensure currentGameState is string
     savedGames.forEach(save => {
        if (typeof save.playerName !== 'string') {
             console.warn(`Save game "${save.saveName}" missing player name. Defaulting to 'Joueur'.`);
            save.playerName = 'Joueur'; // Assign a default if needed
        }
        if (typeof save.currentGameState !== 'string') {
            console.warn(`Save game "${save.saveName}" has invalid currentGameState format. Attempting to stringify.`);
            // Try to stringify if it's somehow an object, default to '{}' on error
            try {
                save.currentGameState = JSON.stringify(save.currentGameState || {});
            } catch (e) {
                console.error(`Failed to stringify gameState for save "${save.saveName}". Resetting to '{}'.`);
                save.currentGameState = '{}';
            }
        }
        // Validate JSON within currentGameState string
        try {
            const parsedState = JSON.parse(save.currentGameState);
            if (typeof parsedState !== 'object' || parsedState === null) throw new Error("Not an object");
             if (!Array.isArray(parsedState.inventory)) parsedState.inventory = []; // Ensure inventory array exists
        } catch (e) {
            console.warn(`Save game "${save.saveName}" has invalid JSON in currentGameState. Resetting gameState to basic structure.`);
            save.currentGameState = JSON.stringify({ playerName: save.playerName, inventory: [] });
        }
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
 * Expects gameState.currentGameState to be a valid JSON string.
 * @param saveName The name/identifier for the save slot.
 * @param gameState The game state to save (including playerName and stringified currentGameState).
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
    try {
         const parsedState = JSON.parse(gameState.currentGameState);
         if (typeof parsedState !== 'object' || parsedState === null || !parsedState.playerName || !Array.isArray(parsedState.inventory)) {
            throw new Error("Invalid structure in currentGameState JSON");
         }
    } catch (e) {
        console.error('Error saving: Invalid JSON structure in currentGameState string.', e, gameState.currentGameState);
        return false;
    }


  try {
    const saves = listSaveGames(); // Gets validated saves
    const now = Date.now();
    const newState: GameStateToSave = {
        ...gameState, // gameState already has stringified currentGameState
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
    console.log(`Game saved as "${saveName}" for player "${gameState.playerName}"`);
    return true;
  } catch (error) {
    console.error('Error saving game to localStorage:', error);
    return false;
  }
}

/**
 * Loads a specific game state from localStorage by save name.
 * @param saveName The name of the save slot to load.
 * @returns The loaded game state (with currentGameState as a string) or null if not found or error occurs.
 */
export function loadGame(saveName: string): GameStateToSave | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    // listSaveGames already validates structure and basic JSON validity
    const saves = listSaveGames();
    const save = saves.find(s => s.saveName === saveName);
    if (!save) {
        console.warn(`Save game "${saveName}" not found.`);
        return null;
    }

    // The save object returned by listSaveGames should be valid
    console.log(`Game "${saveName}" loaded for player "${save.playerName}".`);
    return save; // Return the object with currentGameState as a string
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

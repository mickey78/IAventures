// src/lib/saveLoadUtils.ts
'use client'; // Mark as client component because it uses localStorage

import type { StorySegment } from '@/app/page'; // Adjust the import path as needed

// Define the structure of the data to be saved
export interface GameStateToSave {
  theme: string;
  playerName: string; // Added player name
  story: StorySegment[];
  choices: string[];
  currentGameState: string;
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
     // Further validation for playerName (optional but good practice)
     savedGames.forEach(save => {
        if (typeof save.playerName !== 'string') {
            // Handle saves from older versions? Or log warning.
             console.warn(`Save game "${save.saveName}" missing player name. Defaulting to 'Joueur'.`);
            save.playerName = 'Joueur'; // Assign a default if needed
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
 * @param saveName The name/identifier for the save slot.
 * @param gameState The game state to save (including playerName).
 * @returns True if save was successful, false otherwise.
 */
export function saveGame(saveName: string, gameState: Omit<GameStateToSave, 'timestamp' | 'saveName'>): boolean {
   if (typeof window === 'undefined') {
    console.error('Cannot save game on the server.');
    return false;
  }
  if (!gameState.playerName) {
      console.error('Cannot save game without a player name.');
      return false; // Ensure player name exists before saving
  }
  try {
    const saves = listSaveGames();
    const now = Date.now();
    const newState: GameStateToSave = {
        ...gameState,
        saveName: saveName,
        timestamp: now,
    }

    const existingIndex = saves.findIndex(s => s.saveName === saveName);

    if (existingIndex > -1) {
        // Overwrite existing save
        saves[existingIndex] = newState;
    } else {
        // Add new save
        saves.push(newState);
    }

    // Sort before saving (optional, but keeps it consistent)
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
 * @returns The loaded game state or null if not found or error occurs.
 */
export function loadGame(saveName: string): GameStateToSave | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const saves = listSaveGames(); // listSaveGames now handles basic validation and default player name
    const save = saves.find(s => s.saveName === saveName);
    if (!save) {
        console.warn(`Save game "${saveName}" not found.`);
        return null;
    }
     // More specific validation for the loaded save object
     if (typeof save !== 'object' || save === null || !save.theme || !Array.isArray(save.story) || typeof save.playerName !== 'string') {
        console.error(`Invalid data structure for save game "${saveName}".`);
        // Optionally delete the corrupted save
        // deleteSaveGame(saveName);
        return null;
    }
    console.log(`Game "${saveName}" loaded for player "${save.playerName}".`);
    return save;
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
        // Still return true as the state reflects the desired outcome (save is gone)
    }

    if (saves.length === 0) {
        // If no saves left, remove the key entirely
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

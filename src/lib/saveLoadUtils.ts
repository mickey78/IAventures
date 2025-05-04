
'use client'; // Mark as client component because it uses localStorage

import type { StorySegment } from '@/app/page'; // Adjust the import path as needed

// Define the structure of the data to be saved
export interface GameStateToSave {
  theme: string;
  playerName: string; // Added player name
  story: Omit<StorySegment, 'imageIsLoading' | 'imageError' | 'imageGenerationPrompt' | 'storyImageUrl'>[]; // Explicitly exclude storyImageUrl from the saved type
  choices: string[];
  currentGameState: string; // Stored as JSON string (contains location, inventory, etc.)
  playerChoicesHistory: string[];
  timestamp: number;
  saveName: string;
  maxTurns: number; // Added max turns
  currentTurn: number; // Added current turn
}

// Define the structure loaded from storage, which might temporarily include storyImageUrl before cleaning
interface LoadedGameState extends Omit<GameStateToSave, 'story'> {
    story: Omit<StorySegment, 'imageIsLoading' | 'imageError' | 'imageGenerationPrompt'>[]; // Story segments as loaded
}


const SAVE_GAME_KEY = 'adventureCraftSaves_v1'; // Use a versioned key
const LOCAL_STORAGE_LIMIT_WARN_BYTES = 4.5 * 1024 * 1024; // ~4.5MB warning threshold

/**
 * Retrieves all saved games from localStorage.
 * Handles potential JSON parsing errors and validates structure.
 * @returns An array of saved game states.
 */
export function listSaveGames(): LoadedGameState[] {
  if (typeof window === 'undefined') {
    return []; // Cannot access localStorage on server
  }
  try {
    const savedGamesJson = localStorage.getItem(SAVE_GAME_KEY);
    if (!savedGamesJson) {
      return [];
    }
    let savedGames = JSON.parse(savedGamesJson) as LoadedGameState[]; // Use let for potential modification
    // Basic validation - check if it's an array
    if (!Array.isArray(savedGames)) {
        console.error("Invalid save data found in localStorage. Expected an array. Clearing invalid data.");
        localStorage.removeItem(SAVE_GAME_KEY); // Clear invalid data
        return [];
    }
     // Further validation for essential fields and inner gameState structure
     let validatedSaves = savedGames.reduce((acc: LoadedGameState[], save) => { // Use reduce to filter out invalid saves
        try { // Outer try block for validating a single save object
            let isValid = true;
            let currentGameStateObj: any = {};

            // Validate top-level required fields first
             if (typeof save.saveName !== 'string' || !save.saveName.trim()) {
                 console.warn(`Skipping save with invalid or missing saveName.`);
                 isValid = false;
             }
             if (typeof save.theme !== 'string' || !save.theme.trim()) {
                  console.warn(`Save game "${save.saveName || 'UNKNOWN'}" missing or invalid theme. Skipping.`);
                 isValid = false;
             }
             if (typeof save.playerName !== 'string' || !save.playerName.trim()) {
                console.warn(`Save game "${save.saveName || 'UNKNOWN'}" missing or invalid player name. Assigning default.`);
                save.playerName = 'Joueur Inconnu'; // Assign a default but allow save
            }
             if (typeof save.timestamp !== 'number' || save.timestamp <= 0) {
                 console.warn(`Save game "${save.saveName || 'UNKNOWN'}" missing or invalid timestamp. Skipping.`);
                 isValid = false;
             }

             // Validate currentGameState JSON string and its structure
            try { // Nested try-catch for JSON parsing specifically
                if (typeof save.currentGameState !== 'string') throw new Error("currentGameState is not a string.");
                currentGameStateObj = JSON.parse(save.currentGameState);
                if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) throw new Error("Parsed gameState is not an object.");
                 // Sync player name if needed
                 if (!currentGameStateObj.playerName || typeof currentGameStateObj.playerName !== 'string') currentGameStateObj.playerName = save.playerName;
                 // Ensure location exists and is a string
                 if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Lieu Indéterminé';
                 // Ensure inventory is an array of strings
                 if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
                 currentGameStateObj.inventory = currentGameStateObj.inventory.filter((item: any) => typeof item === 'string');
                 // Optionally check for other expected fields like relationships, emotions, events if critical
                 if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];
                 if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
                 if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];

            } catch (e: any) {
                console.warn(`Save game "${save.saveName || 'UNKNOWN'}" has invalid JSON or structure in currentGameState: ${e.message}. Skipping.`);
                isValid = false;
            }

            // Validate turn numbers
            if (typeof save.maxTurns !== 'number' || save.maxTurns <= 0) {
                console.warn(`Save game "${save.saveName || 'UNKNOWN'}" missing or invalid maxTurns. Defaulting to 15.`);
                save.maxTurns = 15; // Assign default but allow save if otherwise valid
            }
            if (typeof save.currentTurn !== 'number' || save.currentTurn <= 0) {
                console.warn(`Save game "${save.saveName || 'UNKNOWN'}" missing or invalid currentTurn. Defaulting to 1.`);
                save.currentTurn = 1; // Assign default but allow save if otherwise valid
            }
            // Clamp currentTurn (allow one over for ended state)
            if (save.currentTurn > save.maxTurns + 1) {
                console.warn(`Save game "${save.saveName || 'UNKNOWN'}" has currentTurn (${save.currentTurn}) exceeding maxTurns (${save.maxTurns}). Clamping.`);
                save.currentTurn = save.maxTurns + 1;
            }

             // Validate story segments (basic checks)
             if (!Array.isArray(save.story)) {
                console.warn(`Save game "${save.saveName || 'UNKNOWN'}" has invalid story format. Resetting story.`);
                save.story = []; // Allow save but with empty story
             } else {
                // Ensure storyImageUrl is EXCLUDED during validation/listing
                save.story = save.story.map(seg => {
                    const { storyImageUrl, imageIsLoading, imageError, imageGenerationPrompt, ...rest } = seg as any;
                    // Validate the basic structure we keep
                    if (typeof rest.id !== 'number' || typeof rest.text !== 'string' || (rest.speaker !== 'player' && rest.speaker !== 'narrator')) {
                        console.warn(`Invalid story segment structure found in save "${save.saveName}". Returning minimal.`);
                        return { id: rest.id || 0, text: rest.text || '?', speaker: rest.speaker || 'narrator' };
                    }
                    return rest; // Return segment without image url/transient states
                });
             }

             // Validate choices array
              if (!Array.isArray(save.choices)) {
                  console.warn(`Save game "${save.saveName || 'UNKNOWN'}" missing or invalid choices array. Resetting.`);
                  save.choices = [];
              } else {
                  // Ensure choices are strings
                  save.choices = save.choices.filter(choice => typeof choice === 'string');
              }

             // Validate playerChoicesHistory array
             if (!Array.isArray(save.playerChoicesHistory)) {
                 console.warn(`Save game "${save.saveName || 'UNKNOWN'}" missing or invalid playerChoicesHistory array. Resetting.`);
                 save.playerChoicesHistory = [];
             } else {
                 // Ensure history items are strings
                 save.playerChoicesHistory = save.playerChoicesHistory.filter(hist => typeof hist === 'string');
             }

            // Re-stringify the potentially corrected inner gameState
            save.currentGameState = JSON.stringify(currentGameStateObj);

            if (isValid) {
                acc.push(save); // Add the validated/corrected save object to the result
            }
        } catch (error) { // Catch errors during the overall validation of a single save
            console.error(`Unexpected error validating save "${save?.saveName || 'UNKNOWN'}". Skipping.`, error);
        }
        return acc; // Return the accumulator
     }, []); // End of reduce


    // Sort by timestamp descending (most recent first)
    return validatedSaves.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error loading save games from localStorage:', error);
    // Optionally clear corrupted data if parsing fails fundamentally
    // localStorage.removeItem(SAVE_GAME_KEY);
    return [];
  }
}

/**
 * Saves the current game state to localStorage.
 * Finds an existing save with the same name or adds a new one.
 * Expects gameState.currentGameState to be a valid JSON string containing location.
 * **Crucially, omits the `storyImageUrl` from story segments before saving to prevent storage issues.**
 * @param saveName The name/identifier for the save slot.
 * @param gameState The game state to save (including playerName, stringified currentGameState with location, and turn info).
 * @returns True if save was successful, false otherwise.
 */
export function saveGame(saveName: string, gameState: Omit<GameStateToSave, 'timestamp' | 'saveName'> & { story: StorySegment[] }): boolean { // Expect full StorySegment[] temporarily
   if (typeof window === 'undefined') {
    console.error('Cannot save game on the server.');
    return false;
  }
  if (!gameState.playerName || typeof gameState.playerName !== 'string' || !gameState.playerName.trim()) {
      console.error('Cannot save game without a valid player name.');
      return false;
  }
   if (!gameState.theme || typeof gameState.theme !== 'string' || !gameState.theme.trim()) {
      console.error('Cannot save game without a valid theme.');
      return false;
  }
   if (typeof gameState.maxTurns !== 'number' || gameState.maxTurns <= 0 || typeof gameState.currentTurn !== 'number' || gameState.currentTurn <= 0) {
        console.error('Error saving: Invalid turn data provided.', { maxTurns: gameState.maxTurns, currentTurn: gameState.currentTurn });
        return false;
    }
    if (!Array.isArray(gameState.story)) {
        console.error('Error saving: gameState.story is not an array.');
        return false;
    }
    if (!Array.isArray(gameState.choices)) {
        console.error('Error saving: gameState.choices is not an array.');
        return false;
    }
     if (!Array.isArray(gameState.playerChoicesHistory)) {
        console.error('Error saving: gameState.playerChoicesHistory is not an array.');
        return false;
    }

   // Validate currentGameState string and its content *before* attempting save
    let parsedStateForSave: any;
    try {
        if (typeof gameState.currentGameState !== 'string') {
            throw new Error("currentGameState is not a string.");
        }
        parsedStateForSave = JSON.parse(gameState.currentGameState);
        if (typeof parsedStateForSave !== 'object' || parsedStateForSave === null) {
            throw new Error("Parsed currentGameState is not an object.");
        }
        if (typeof parsedStateForSave.playerName !== 'string' || !parsedStateForSave.playerName.trim()) {
            console.warn("Player name missing in currentGameState JSON, adding from top level.");
            parsedStateForSave.playerName = gameState.playerName;
        }
        if (!Array.isArray(parsedStateForSave.inventory)) {
            throw new Error("Missing or invalid 'inventory' array in currentGameState JSON.");
        }
        if (typeof parsedStateForSave.location !== 'string' || !parsedStateForSave.location.trim()) {
            throw new Error("Missing or invalid 'location' string in currentGameState JSON.");
        }
        // Ensure inventory items are strings
        parsedStateForSave.inventory = parsedStateForSave.inventory.filter((item: any) => typeof item === 'string');
        // Ensure other optional fields are correct type if they exist
        if (parsedStateForSave.relationships && (typeof parsedStateForSave.relationships !== 'object' || parsedStateForSave.relationships === null)) parsedStateForSave.relationships = {};
        if (parsedStateForSave.emotions && !Array.isArray(parsedStateForSave.emotions)) parsedStateForSave.emotions = [];
        if (parsedStateForSave.events && !Array.isArray(parsedStateForSave.events)) parsedStateForSave.events = [];


    } catch (e: any) {
        console.error('Error saving: Invalid JSON or structure in currentGameState string.', e.message, gameState.currentGameState);
        return false; // Prevent saving invalid state
    }
    // Use the validated and potentially corrected parsed state string for saving
    const validatedGameStateString = JSON.stringify(parsedStateForSave);


  try {
    const saves = listSaveGames(); // Gets validated saves (without images)
    const now = Date.now();

    // Prepare story state for saving: **Remove storyImageUrl** and transient/debug flags
    const storyToSave = gameState.story.map(seg => {
        const { storyImageUrl, // Explicitly destructure to remove
                imageIsLoading,
                imageError,
                imageGenerationPrompt,
                ...rest // Keep the rest of the segment data
              } = seg;

        // Basic validation of the remaining segment structure
        if (typeof rest.id !== 'number' || typeof rest.text !== 'string' || (rest.speaker !== 'player' && rest.speaker !== 'narrator')) {
            console.warn("Invalid story segment structure found during save preparation:", rest);
            // Decide how to handle - skip segment? return minimal? Here, we return a minimal valid version.
            return { id: rest.id || 0, text: rest.text || '?', speaker: rest.speaker || 'narrator' };
        }
        return rest; // Return the segment without the image URL and transient states
    });


    const newState: GameStateToSave = {
        theme: gameState.theme,
        playerName: gameState.playerName,
        story: storyToSave, // Use the story array WITHOUT image URLs
        choices: gameState.choices.filter(c => typeof c === 'string'), // Ensure choices are strings
        currentGameState: validatedGameStateString, // Use the validated string
        playerChoicesHistory: gameState.playerChoicesHistory.filter(h => typeof h === 'string'), // Ensure history items are strings
        maxTurns: gameState.maxTurns,
        currentTurn: gameState.currentTurn,
        saveName: saveName,
        timestamp: now,
    }

    const existingIndex = saves.findIndex(s => s.saveName === saveName);
    let updatedSaves: GameStateToSave[]; // Use the correct type here

    if (existingIndex > -1) {
        // Ensure we are comparing compatible types
        const savesToUpdate = listSaveGames(); // Re-fetch full list
        savesToUpdate[existingIndex] = newState;
        updatedSaves = savesToUpdate;
    } else {
         // Add new state to the list (already sorted by timestamp effectively)
        updatedSaves = [newState, ...listSaveGames()];
    }

    // Check potential size before saving
    const saveDataString = JSON.stringify(updatedSaves);
    const saveDataSize = new Blob([saveDataString]).size;
    console.log(`Estimated size of save data (images excluded): ${(saveDataSize / 1024 / 1024).toFixed(2)} MB`);
    if (saveDataSize > LOCAL_STORAGE_LIMIT_WARN_BYTES) {
        console.warn(`LocalStorage save data size is approaching limits (${(saveDataSize / 1024 / 1024).toFixed(2)} MB). Oldest saves might be pruned or saving could fail.`);
        // Implement pruning logic here if desired (e.g., keep only the 10 most recent saves)
    }

    // Attempt to save
    localStorage.setItem(SAVE_GAME_KEY, saveDataString);
    console.log(`Game saved as "${saveName}" for player "${gameState.playerName}" at turn ${gameState.currentTurn}/${gameState.maxTurns} in location "${parsedStateForSave.location}".`);
    return true;

  } catch (error: any) {
    console.error('Error saving game to localStorage:', error);
    if (error.name === 'QuotaExceededError') {
         console.error("LocalStorage quota exceeded! Cannot save game. This usually happens if the save data is too large.");
         alert("Erreur de Sauvegarde : L'espace de stockage est plein ! Impossible de sauvegarder la partie. Les images ne sont pas sauvegardées pour économiser de l'espace.");
    } else {
         alert(`Erreur de Sauvegarde : Impossible de sauvegarder la partie. Détails : ${error.message}`);
    }
    return false;
  }
}

/**
 * Loads a specific game state from localStorage by save name.
 * Adds default transient image states (imageIsLoading: false, imageError: false, storyImageUrl: null) to story segments.
 * @param saveName The name of the save slot to load.
 * @returns The loaded game state (with currentGameState as a string containing location and turn info) or null if not found or error occurs.
 */
export function loadGame(saveName: string): (LoadedGameState & { story: StorySegment[] }) | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    // listSaveGames already validates structure, JSON validity, and turn numbers
    const saves = listSaveGames(); // This returns saves without image URLs
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

     // Rehydrate story segments with default transient states and null image URL
     const storyWithTransientState: StorySegment[] = save.story.map(seg => ({
        ...seg,
        storyImageUrl: null, // Images are not saved, so start with null
        imageIsLoading: false,
        imageError: false,
        imageGenerationPrompt: undefined, // Ensure prompt is not loaded
     }));


    console.log(`Game "${saveName}" loaded for player "${save.playerName}" at turn ${save.currentTurn}/${save.maxTurns} in location "${locationInfo}".`);
    // Cast the result to the expected type including the rehydrated story
    return { ...save, story: storyWithTransientState } as (LoadedGameState & { story: StorySegment[] });
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
        // Return true because the desired state (save not existing) is achieved
        return true;
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

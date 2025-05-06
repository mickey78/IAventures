
'use client'; 

import type { StorySegment, ParsedGameState } from '@/types/game'; 
import { themes } from '@/config/themes'; 
import { heroOptions } from '@/config/heroes'; 
import { logToFile } from '@/services/loggingService';

export interface GameStateToSave {
  theme: string;
  subTheme: string | null; 
  selectedHero: string; 
  playerName: string; 
  playerGender: 'male' | 'female'; // Added playerGender
  story: Omit<StorySegment, 'imageIsLoading' | 'imageError' | 'imageGenerationPrompt' | 'storyImageUrl'>[]; 
  choices: string[];
  currentGameState: string; 
  playerChoicesHistory: string[];
  timestamp: number;
  saveName: string;
  maxTurns: number; 
  currentTurn: number; 
}

interface LoadedGameState extends Omit<GameStateToSave, 'story'> {
    story: Omit<StorySegment, 'imageIsLoading' | 'imageError' | 'imageGenerationPrompt'>[]; 
}


const SAVE_GAME_KEY = 'iaventuresSaves_v6'; // Incremented version for gender addition
const LOCAL_STORAGE_LIMIT_WARN_BYTES = 4.5 * 1024 * 1024; 

export function listSaveGames(): LoadedGameState[] {
  if (typeof window === 'undefined') {
    return []; 
  }
  try {
    const savedGamesJson = localStorage.getItem(SAVE_GAME_KEY);
    if (!savedGamesJson) {
      return [];
    }
    let savedGames = JSON.parse(savedGamesJson) as LoadedGameState[]; 
    if (!Array.isArray(savedGames)) {
        logToFile({ level: "warn", message: "[SAVE_LOAD_VALIDATION] Invalid save data found in localStorage. Expected array. Deleting invalid data."});
        localStorage.removeItem(SAVE_GAME_KEY); 
        return [];
    }
     let validatedSaves = savedGames.reduce((acc: LoadedGameState[], save) => { 
        try { 
            let isValid = true;
            let currentGameStateObj: any = {};
            const saveIdentifier = `Sauvegarde "${save?.saveName || 'INCONNU'}"`;


             if (typeof save.saveName !== 'string' || !save.saveName.trim()) {
                 logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: Invalid or missing saveName`, payload: {saveName: save?.saveName } });
                 isValid = false;
             }
             if (typeof save.theme !== 'string' || !save.theme.trim()) {
                  logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: Invalid or missing theme`, payload: {saveName: save?.saveName, theme: save?.theme } });
                 isValid = false;
             }
             if (save.playerGender !== 'male' && save.playerGender !== 'female') {
                 logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: Invalid or missing playerGender`, payload: {saveName: save?.saveName, playerGender: save?.playerGender } });
                 isValid = false;
             }
             if (save.subTheme !== null && (typeof save.subTheme !== 'string' || !save.subTheme.trim())) {
                 logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: Invalid subTheme (must be string or null)`, payload: {saveName: save?.saveName, subTheme: save?.subTheme } });
                 isValid = false;
             } else if (save.subTheme) { 
                 const mainTheme = themes.find(t => t.value === save.theme);
                 const subThemeExists = mainTheme?.subThemes.some(st => st.value === save.subTheme);
                 if (!subThemeExists) {
                     logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: subTheme "${save.subTheme}" does not exist for theme "${save.theme}"`, payload: {saveName: save?.saveName, theme: save.theme, subTheme: save.subTheme } });
                     isValid = false;
                 }
             }

             if (typeof save.selectedHero !== 'string' || !save.selectedHero.trim() || !heroOptions.some(h => h.value === save.selectedHero)) {
                 logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: Invalid, missing, or non-existent selectedHero`, payload: {saveName: save?.saveName, selectedHero: save?.selectedHero } });
                 isValid = false;
             }


             if (typeof save.playerName !== 'string' || !save.playerName.trim()) {
                logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Invalid or missing playerName. Defaulting.`, payload: {saveName: save?.saveName, playerName: save?.playerName } });
                save.playerName = 'Joueur Inconnu'; 
            }
             if (typeof save.timestamp !== 'number' || save.timestamp <= 0) {
                 logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: Invalid or missing timestamp`, payload: {saveName: save?.saveName, timestamp: save?.timestamp } });
                 isValid = false;
             }

            try { 
                if (typeof save.currentGameState !== 'string') throw new Error("currentGameState is not a string.");
                currentGameStateObj = JSON.parse(save.currentGameState);
                if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) throw new Error("Parsed gameState is not an object.");
                 if (!currentGameStateObj.playerName || typeof currentGameStateObj.playerName !== 'string') currentGameStateObj.playerName = save.playerName;
                 if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Lieu Indéterminé';
                 if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
                 currentGameStateObj.inventory = currentGameStateObj.inventory.filter((item: any) => typeof item === 'string');
                 if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
                 if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
                 currentGameStateObj.emotions = currentGameStateObj.emotions.filter((e: any) => typeof e === 'string');
                 if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];
                 currentGameStateObj.events = currentGameStateObj.events.filter((e: any) => typeof e === 'string');


            } catch (e: any) {
                logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Skipping save: Invalid JSON or structure in currentGameState: ${e.message}`, payload: {saveName: save?.saveName, currentGameState: save?.currentGameState } });
                isValid = false;
            }

            if (typeof save.maxTurns !== 'number' || save.maxTurns <= 0) {
                logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Invalid or missing maxTurns. Defaulting to 15.`, payload: {saveName: save?.saveName, maxTurns: save?.maxTurns } });
                save.maxTurns = 15; 
            }
            if (typeof save.currentTurn !== 'number' || save.currentTurn <= 0) {
                logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Invalid or missing currentTurn. Defaulting to 1.`, payload: {saveName: save?.saveName, currentTurn: save?.currentTurn } });
                save.currentTurn = 1; 
            }
            if (save.currentTurn > save.maxTurns + 1) {
                logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] currentTurn (${save.currentTurn}) exceeds maxTurns (${save.maxTurns}). Clamping.`, payload: {saveName: save?.saveName, currentTurn: save.currentTurn, maxTurns: save.maxTurns } });
                save.currentTurn = save.maxTurns + 1;
            }

             if (!Array.isArray(save.story)) {
                logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Invalid story format. Resetting story.`, payload: {saveName: save?.saveName } });
                save.story = []; 
             } else {
                save.story = save.story.map(seg => {
                    const { storyImageUrl, imageIsLoading, imageError, imageGenerationPrompt, ...rest } = seg as any;
                    if (typeof rest.id !== 'number' || typeof rest.text !== 'string' || (rest.speaker !== 'player' && rest.speaker !== 'narrator')) {
                        logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Invalid story segment structure found. Minimal fallback.`, payload: {saveName: save?.saveName, segment: rest } });
                        return { id: rest.id || 0, text: rest.text || '?', speaker: rest.speaker || 'narrator' };
                    }
                    return rest; 
                });
             }

              if (!Array.isArray(save.choices)) {
                  logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Missing or invalid choices array. Resetting.`, payload: {saveName: save?.saveName } });
                  save.choices = [];
              } else {
                  save.choices = save.choices.filter(choice => typeof choice === 'string');
              }

             if (!Array.isArray(save.playerChoicesHistory)) {
                 logToFile({ level: "warn", message: `[SAVE_LOAD_VALIDATION] Missing or invalid playerChoicesHistory array. Resetting.`, payload: {saveName: save?.saveName } });
                 save.playerChoicesHistory = [];
             } else {
                 save.playerChoicesHistory = save.playerChoicesHistory.filter(hist => typeof hist === 'string');
             }

            save.currentGameState = JSON.stringify(currentGameStateObj);

            if (isValid) {
                acc.push(save); 
            }
        } catch (error) { 
            logToFile({ level: "error", message: `[SAVE_LOAD_VALIDATION] Unexpected error while validating save "${save?.saveName || 'INCONNU'}". Skipping.`, payload: {error} });
        }
        return acc; 
     }, []); 


    return validatedSaves.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logToFile({ level: "error", message: '[SAVE_LOAD_ERROR] Error loading saved games from localStorage', payload: { error } });
    return [];
  }
}

export function saveGame(saveName: string, gameState: Omit<GameStateToSave, 'timestamp' | 'saveName'> & { story: StorySegment[] }): boolean { 
   if (typeof window === 'undefined') {
    logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Cannot save game server-side.' });
    return false;
  }
  if (!gameState.playerName || typeof gameState.playerName !== 'string' || !gameState.playerName.trim()) {
      logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Cannot save game without a valid player name.', payload: { playerName: gameState.playerName } });
      return false;
  }
   if (!gameState.theme || typeof gameState.theme !== 'string' || !gameState.theme.trim()) {
      logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Cannot save game without a valid theme.', payload: { theme: gameState.theme } });
      return false;
  }
   if (gameState.playerGender !== 'male' && gameState.playerGender !== 'female') { // Check for playerGender
       logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Invalid or missing player gender.', payload: { playerGender: gameState.playerGender } });
       return false;
   }
   if (gameState.subTheme !== null && (typeof gameState.subTheme !== 'string' || !gameState.subTheme.trim())) {
       logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Invalid subTheme provided. Must be a string or null.', payload: { subTheme: gameState.subTheme } });
       return false;
   }
    if (!gameState.selectedHero || typeof gameState.selectedHero !== 'string' || !gameState.selectedHero.trim() || !heroOptions.some(h => h.value === gameState.selectedHero)) {
        logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Invalid or missing selectedHero.', payload: { selectedHero: gameState.selectedHero } });
        return false;
    }
   if (typeof gameState.maxTurns !== 'number' || gameState.maxTurns <= 0 || typeof gameState.currentTurn !== 'number' || gameState.currentTurn <= 0) {
        logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Invalid turn data provided.', payload: { maxTurns: gameState.maxTurns, currentTurn: gameState.currentTurn } });
        return false;
    }
    if (!Array.isArray(gameState.story)) {
        logToFile({ level: "error", message: '[SAVE_GAME_ERROR] gameState.story is not an array.' });
        return false;
    }
    if (!Array.isArray(gameState.choices)) {
        logToFile({ level: "error", message: '[SAVE_GAME_ERROR] gameState.choices is not an array.' });
        return false;
    }
     if (!Array.isArray(gameState.playerChoicesHistory)) {
        logToFile({ level: "error", message: '[SAVE_GAME_ERROR] gameState.playerChoicesHistory is not an array.' });
        return false;
    }

    let parsedStateForSave: ParsedGameState;
    try {
        if (typeof gameState.currentGameState !== 'string') {
            throw new Error("currentGameState is not a string.");
        }
        parsedStateForSave = JSON.parse(gameState.currentGameState);
        if (typeof parsedStateForSave !== 'object' || parsedStateForSave === null) {
            throw new Error("Parsed currentGameState is not an object.");
        }
        if (typeof parsedStateForSave.playerName !== 'string' || !parsedStateForSave.playerName.trim()) {
            logToFile({ level: "warn", message: "[SAVE_GAME_WARN] Player name missing in currentGameState JSON, adding from top level.", payload: { playerNameFromGameState: parsedStateForSave.playerName, playerNameFromTop: gameState.playerName } });
            parsedStateForSave.playerName = gameState.playerName;
        }
        if (!Array.isArray(parsedStateForSave.inventory)) {
            throw new Error("'inventory' array missing or invalid in currentGameState JSON.");
        }
        if (typeof parsedStateForSave.location !== 'string' || !parsedStateForSave.location.trim()) {
            throw new Error("'location' string missing or invalid in currentGameState JSON.");
        }
        parsedStateForSave.inventory = parsedStateForSave.inventory.filter((item: any) => typeof item === 'string');
        if (typeof parsedStateForSave.relationships !== 'object' || parsedStateForSave.relationships === null) parsedStateForSave.relationships = {};
        if (!Array.isArray(parsedStateForSave.emotions)) parsedStateForSave.emotions = [];
        parsedStateForSave.emotions = parsedStateForSave.emotions.filter((e: any) => typeof e === 'string');
        if (!Array.isArray(parsedStateForSave.events)) parsedStateForSave.events = [];
        parsedStateForSave.events = parsedStateForSave.events.filter((e: any) => typeof e === 'string');


    } catch (e: any) {
        logToFile({ level: "error", message: '[SAVE_GAME_ERROR] Invalid JSON or structure in currentGameState string.', payload: { error: e.message, currentGameStateString: gameState.currentGameState } });
        return false; 
    }
    const validatedGameStateString = JSON.stringify(parsedStateForSave);


  try {
    const saves = listSaveGames(); 
    const now = Date.now();

    const storyToSave = gameState.story.map(seg => {
        const { storyImageUrl, 
                imageIsLoading,
                imageError,
                imageGenerationPrompt,
                ...rest 
              } = seg;

        if (typeof rest.id !== 'number' || typeof rest.text !== 'string' || (rest.speaker !== 'player' && rest.speaker !== 'narrator')) {
            logToFile({ level: "warn", message: "[SAVE_GAME_WARN] Invalid story segment structure found during save preparation.", payload: { segment: rest } });
            return { id: rest.id || 0, text: rest.text || '?', speaker: rest.speaker || 'narrator' };
        }
        return rest; 
    });


    const newState: GameStateToSave = {
        theme: gameState.theme,
        subTheme: gameState.subTheme, 
        selectedHero: gameState.selectedHero, 
        playerName: gameState.playerName,
        playerGender: gameState.playerGender, // Save playerGender
        story: storyToSave, 
        choices: gameState.choices.filter(c => typeof c === 'string'), 
        currentGameState: validatedGameStateString, 
        playerChoicesHistory: gameState.playerChoicesHistory.filter(h => typeof h === 'string'), 
        maxTurns: gameState.maxTurns,
        currentTurn: gameState.currentTurn,
        saveName: saveName,
        timestamp: now,
    }

    const existingIndex = saves.findIndex(s => s.saveName === saveName);
    let updatedSaves: GameStateToSave[]; 

    if (existingIndex > -1) {
        const savesToUpdate = listSaveGames(); 
        savesToUpdate[existingIndex] = newState;
        updatedSaves = savesToUpdate;
    } else {
        updatedSaves = [newState, ...listSaveGames()];
    }

    const saveDataString = JSON.stringify(updatedSaves);
    const saveDataSize = new Blob([saveDataString]).size;
    logToFile({ level: "info", message: `[SAVE_GAME_INFO] Estimated save data size (excluding images): ${(saveDataSize / 1024 / 1024).toFixed(2)} MB` });
    if (saveDataSize > LOCAL_STORAGE_LIMIT_WARN_BYTES) {
        logToFile({ level: "warn", message: `[SAVE_GAME_WARN] localStorage save data size approaching limits (${(saveDataSize / 1024 / 1024).toFixed(2)} MB). Oldest saves might be pruned or save might fail.` });
    }

    localStorage.setItem(SAVE_GAME_KEY, saveDataString);
    logToFile({ level: "info", message: `[SAVE_GAME_SUCCESS] Game saved as "${saveName}" for player "${gameState.playerName}" (${gameState.selectedHero}, ${gameState.playerGender}) (Theme: ${gameState.theme}, Scenario: ${gameState.subTheme || 'N/A'}) at turn ${gameState.currentTurn}/${gameState.maxTurns} in location "${parsedStateForSave.location}".` });
    return true;

  } catch (error: any) {
    logToFile({ level: "error", message: '[SAVE_GAME_CRITICAL_ERROR] Error saving game to localStorage', payload: { error } });
    if (error.name === 'QuotaExceededError') {
         logToFile({ level: "error", message: "[SAVE_GAME_CRITICAL_ERROR] localStorage quota exceeded! Cannot save game. This usually happens if save data is too large." });
         alert("Erreur de Sauvegarde : L'espace de stockage est plein ! Impossible de sauvegarder la partie. Les images ne sont pas sauvegardées pour économiser de l'espace.");
    } else {
         alert(`Erreur de Sauvegarde : Impossible de sauvegarder la partie. Détails : ${error.message}`);
    }
    return false;
  }
}

export function loadGame(saveName: string): (LoadedGameState & { story: StorySegment[] }) | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const saves = listSaveGames(); 
    const save = saves.find(s => s.saveName === saveName);
    if (!save) {
        logToFile({ level: "warn", message: `[LOAD_GAME_WARN] Save file "${saveName}" not found.` });
        return null;
    }

    let locationInfo = 'lieu inconnu'; 
    let parsedState: ParsedGameState | null = null;
     try {
         parsedState = JSON.parse(save.currentGameState); 
         locationInfo = parsedState?.location || locationInfo;
     } catch (e) {
         logToFile({ level: "warn", message: `[LOAD_GAME_WARN] Could not parse gameState from saved game "${saveName}".`, payload: { error: e } });
     }

     const storyWithTransientState: StorySegment[] = save.story.map(seg => ({
        ...seg,
        storyImageUrl: null, 
        imageIsLoading: false,
        imageError: false,
        imageGenerationPrompt: undefined, 
     }));


    logToFile({ level: "info", message: `[LOAD_GAME_SUCCESS] Game "${saveName}" loaded for player "${save.playerName}" (${save.selectedHero}, ${save.playerGender}) (Theme: ${save.theme}, Scenario: ${save.subTheme || 'N/A'}) at turn ${save.currentTurn}/${save.maxTurns} in location "${locationInfo}". Relationships: ${JSON.stringify(parsedState?.relationships)}, Emotions: ${JSON.stringify(parsedState?.emotions)}` });
    return { ...save, story: storyWithTransientState } as (LoadedGameState & { story: StorySegment[] });
  } catch (error) {
    logToFile({ level: "error", message: `[LOAD_GAME_ERROR] Error loading game "${saveName}" from localStorage`, payload: { error } });
    return null;
  }
}

export function deleteSaveGame(saveName: string): boolean {
   if (typeof window === 'undefined') {
    logToFile({ level: "error", message: '[DELETE_GAME_ERROR] Cannot delete game server-side.' });
    return false;
  }
  try {
    let saves = listSaveGames();
    const initialLength = saves.length;
    saves = saves.filter(s => s.saveName !== saveName);

    if (saves.length === initialLength) {
        logToFile({ level: "warn", message: `[DELETE_GAME_WARN] Save file "${saveName}" not found for deletion.` });
        return true;
    }

    if (saves.length === 0) {
        localStorage.removeItem(SAVE_GAME_KEY);
    } else {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saves));
    }
    logToFile({ level: "info", message: `[DELETE_GAME_SUCCESS] Save file "${saveName}" deleted.` });
    return true;
  } catch (error) {
    logToFile({ level: "error", message: `[DELETE_GAME_ERROR] Error deleting game "${saveName}" from localStorage`, payload: { error } });
    return false;
  }
}

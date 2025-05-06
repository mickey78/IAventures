
'use client'; 

import type { StorySegment, ParsedGameState } from '@/types/game'; 
import { themes } from '@/config/themes'; 
import { heroOptions } from '@/config/heroes'; 

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


const SAVE_GAME_KEY = 'iaventuresSaves_v5'; // Incremented version for gender addition
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
        console.error("Données de sauvegarde invalides trouvées dans localStorage. Attendu un tableau. Suppression des données invalides.");
        localStorage.removeItem(SAVE_GAME_KEY); 
        return [];
    }
     let validatedSaves = savedGames.reduce((acc: LoadedGameState[], save) => { 
        try { 
            let isValid = true;
            let currentGameStateObj: any = {};
            const saveIdentifier = `Sauvegarde "${save?.saveName || 'INCONNU'}"`;


             if (typeof save.saveName !== 'string' || !save.saveName.trim()) {
                 console.warn(`${saveIdentifier}: saveName invalide ou manquant. Ignorer.`);
                 isValid = false;
             }
             if (typeof save.theme !== 'string' || !save.theme.trim()) {
                  console.warn(`${saveIdentifier}: thème manquant ou invalide. Ignorer.`);
                 isValid = false;
             }
             if (save.playerGender !== 'male' && save.playerGender !== 'female') {
                 console.warn(`${saveIdentifier}: genre du joueur manquant ou invalide. Ignorer.`);
                 isValid = false;
             }
             if (save.subTheme !== null && (typeof save.subTheme !== 'string' || !save.subTheme.trim())) {
                 console.warn(`${saveIdentifier}: sous-thème invalide (doit être une chaîne ou null). Ignorer.`);
                 isValid = false;
             } else if (save.subTheme) { 
                 const mainTheme = themes.find(t => t.value === save.theme);
                 const subThemeExists = mainTheme?.subThemes.some(st => st.value === save.subTheme);
                 if (!subThemeExists) {
                     console.warn(`${saveIdentifier}: sous-thème "${save.subTheme}" n'existe pas pour le thème "${save.theme}". Ignorer.`);
                     isValid = false;
                 }
             } else if (save.subTheme === null && isValid) {
                 console.warn(`${saveIdentifier} a subTheme=null.`);
             }

             if (typeof save.selectedHero !== 'string' || !save.selectedHero.trim() || !heroOptions.some(h => h.value === save.selectedHero)) {
                 console.warn(`${saveIdentifier}: héros sélectionné manquant, invalide, ou n'existant plus. Ignorer.`);
                 isValid = false;
             }


             if (typeof save.playerName !== 'string' || !save.playerName.trim()) {
                console.warn(`${saveIdentifier}: nom de joueur manquant ou invalide. Attribution par défaut.`);
                save.playerName = 'Joueur Inconnu'; 
            }
             if (typeof save.timestamp !== 'number' || save.timestamp <= 0) {
                 console.warn(`${saveIdentifier}: timestamp manquant ou invalide. Ignorer.`);
                 isValid = false;
             }

            try { 
                if (typeof save.currentGameState !== 'string') throw new Error("currentGameState n'est pas une chaîne.");
                currentGameStateObj = JSON.parse(save.currentGameState);
                if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) throw new Error("gameState analysé n'est pas un objet.");
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
                console.warn(`${saveIdentifier} a un JSON ou une structure invalide dans currentGameState: ${e.message}. Ignorer.`);
                isValid = false;
            }

            if (typeof save.maxTurns !== 'number' || save.maxTurns <= 0) {
                console.warn(`${saveIdentifier}: maxTurns manquant ou invalide. Par défaut à 15.`);
                save.maxTurns = 15; 
            }
            if (typeof save.currentTurn !== 'number' || save.currentTurn <= 0) {
                console.warn(`${saveIdentifier}: currentTurn manquant ou invalide. Par défaut à 1.`);
                save.currentTurn = 1; 
            }
            if (save.currentTurn > save.maxTurns + 1) {
                console.warn(`${saveIdentifier} a currentTurn (${save.currentTurn}) dépassant maxTurns (${save.maxTurns}). Limitation.`);
                save.currentTurn = save.maxTurns + 1;
            }

             if (!Array.isArray(save.story)) {
                console.warn(`${saveIdentifier}: format d'histoire invalide. Réinitialisation de l'histoire.`);
                save.story = []; 
             } else {
                save.story = save.story.map(seg => {
                    const { storyImageUrl, imageIsLoading, imageError, imageGenerationPrompt, ...rest } = seg as any;
                    if (typeof rest.id !== 'number' || typeof rest.text !== 'string' || (rest.speaker !== 'player' && rest.speaker !== 'narrator')) {
                        console.warn(`Structure de segment d'histoire invalide trouvée dans ${saveIdentifier}. Retour minimal.`);
                        return { id: rest.id || 0, text: rest.text || '?', speaker: rest.speaker || 'narrator' };
                    }
                    return rest; 
                });
             }

              if (!Array.isArray(save.choices)) {
                  console.warn(`${saveIdentifier}: tableau de choices manquant ou invalide. Réinitialisation.`);
                  save.choices = [];
              } else {
                  save.choices = save.choices.filter(choice => typeof choice === 'string');
              }

             if (!Array.isArray(save.playerChoicesHistory)) {
                 console.warn(`${saveIdentifier}: tableau playerChoicesHistory manquant ou invalide. Réinitialisation.`);
                 save.playerChoicesHistory = [];
             } else {
                 save.playerChoicesHistory = save.playerChoicesHistory.filter(hist => typeof hist === 'string');
             }

            save.currentGameState = JSON.stringify(currentGameStateObj);

            if (isValid) {
                acc.push(save); 
            }
        } catch (error) { 
            console.error(`Erreur inattendue lors de la validation de la sauvegarde "${save?.saveName || 'INCONNU'}". Ignorer.`, error);
        }
        return acc; 
     }, []); 


    return validatedSaves.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Erreur lors du chargement des parties sauvegardées depuis localStorage:', error);
    return [];
  }
}

export function saveGame(saveName: string, gameState: Omit<GameStateToSave, 'timestamp' | 'saveName'> & { story: StorySegment[] }): boolean { 
   if (typeof window === 'undefined') {
    console.error('Impossible de sauvegarder la partie côté serveur.');
    return false;
  }
  if (!gameState.playerName || typeof gameState.playerName !== 'string' || !gameState.playerName.trim()) {
      console.error('Impossible de sauvegarder la partie sans un nom de joueur valide.');
      return false;
  }
   if (!gameState.theme || typeof gameState.theme !== 'string' || !gameState.theme.trim()) {
      console.error('Impossible de sauvegarder la partie sans un thème valide.');
      return false;
  }
   if (gameState.playerGender !== 'male' && gameState.playerGender !== 'female') {
       console.error('Erreur sauvegarde: Genre du joueur invalide ou manquant.');
       return false;
   }
   if (gameState.subTheme !== null && (typeof gameState.subTheme !== 'string' || !gameState.subTheme.trim())) {
       console.error('Erreur sauvegarde: Sous-thème invalide fourni. Doit être une chaîne ou null.', gameState.subTheme);
       return false;
   }
    if (!gameState.selectedHero || typeof gameState.selectedHero !== 'string' || !gameState.selectedHero.trim() || !heroOptions.some(h => h.value === gameState.selectedHero)) {
        console.error('Erreur sauvegarde: Héros sélectionné invalide ou manquant.', gameState.selectedHero);
        return false;
    }
   if (typeof gameState.maxTurns !== 'number' || gameState.maxTurns <= 0 || typeof gameState.currentTurn !== 'number' || gameState.currentTurn <= 0) {
        console.error('Erreur sauvegarde: Données de tour invalides fournies.', { maxTurns: gameState.maxTurns, currentTurn: gameState.currentTurn });
        return false;
    }
    if (!Array.isArray(gameState.story)) {
        console.error('Erreur sauvegarde: gameState.story n\'est pas un tableau.');
        return false;
    }
    if (!Array.isArray(gameState.choices)) {
        console.error('Erreur sauvegarde: gameState.choices n\'est pas un tableau.');
        return false;
    }
     if (!Array.isArray(gameState.playerChoicesHistory)) {
        console.error('Erreur sauvegarde: gameState.playerChoicesHistory n\'est pas un tableau.');
        return false;
    }

    let parsedStateForSave: ParsedGameState;
    try {
        if (typeof gameState.currentGameState !== 'string') {
            throw new Error("currentGameState n'est pas une chaîne.");
        }
        parsedStateForSave = JSON.parse(gameState.currentGameState);
        if (typeof parsedStateForSave !== 'object' || parsedStateForSave === null) {
            throw new Error("currentGameState analysé n'est pas un objet.");
        }
        if (typeof parsedStateForSave.playerName !== 'string' || !parsedStateForSave.playerName.trim()) {
            console.warn("Nom du joueur manquant dans le JSON currentGameState, ajout depuis le niveau supérieur.");
            parsedStateForSave.playerName = gameState.playerName;
        }
        if (!Array.isArray(parsedStateForSave.inventory)) {
            throw new Error("Tableau 'inventory' manquant ou invalide dans le JSON currentGameState.");
        }
        if (typeof parsedStateForSave.location !== 'string' || !parsedStateForSave.location.trim()) {
            throw new Error("Chaîne 'location' manquante ou invalide dans le JSON currentGameState.");
        }
        parsedStateForSave.inventory = parsedStateForSave.inventory.filter((item: any) => typeof item === 'string');
        if (typeof parsedStateForSave.relationships !== 'object' || parsedStateForSave.relationships === null) parsedStateForSave.relationships = {};
        if (!Array.isArray(parsedStateForSave.emotions)) parsedStateForSave.emotions = [];
        parsedStateForSave.emotions = parsedStateForSave.emotions.filter((e: any) => typeof e === 'string');
        if (!Array.isArray(parsedStateForSave.events)) parsedStateForSave.events = [];
        parsedStateForSave.events = parsedStateForSave.events.filter((e: any) => typeof e === 'string');


    } catch (e: any) {
        console.error('Erreur sauvegarde: JSON ou structure invalide dans la chaîne currentGameState.', e.message, gameState.currentGameState);
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
            console.warn("Structure de segment d'histoire invalide trouvée lors de la préparation de la sauvegarde:", rest);
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
    console.log(`Taille estimée des données de sauvegarde (images exclues): ${(saveDataSize / 1024 / 1024).toFixed(2)} Mo`);
    if (saveDataSize > LOCAL_STORAGE_LIMIT_WARN_BYTES) {
        console.warn(`La taille des données de sauvegarde localStorage approche les limites (${(saveDataSize / 1024 / 1024).toFixed(2)} Mo). Les sauvegardes les plus anciennes pourraient être élaguées ou la sauvegarde pourrait échouer.`);
    }

    localStorage.setItem(SAVE_GAME_KEY, saveDataString);
    console.log(`Partie sauvegardée sous "${saveName}" pour le joueur "${gameState.playerName}" (${gameState.selectedHero}, ${gameState.playerGender}) (Thème: ${gameState.theme}, Scénario: ${gameState.subTheme || 'N/A'}) au tour ${gameState.currentTurn}/${gameState.maxTurns} au lieu "${parsedStateForSave.location}".`);
    return true;

  } catch (error: any) {
    console.error('Erreur lors de la sauvegarde de la partie dans localStorage:', error);
    if (error.name === 'QuotaExceededError') {
         console.error("Quota localStorage dépassé ! Impossible de sauvegarder la partie. Cela se produit généralement si les données de sauvegarde sont trop volumineuses.");
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
        console.warn(`Sauvegarde "${saveName}" non trouvée.`);
        return null;
    }

    let locationInfo = 'lieu inconnu'; 
    let parsedState: ParsedGameState | null = null;
     try {
         parsedState = JSON.parse(save.currentGameState); 
         locationInfo = parsedState?.location || locationInfo;
     } catch (e) {
         console.warn(`Impossible d'analyser le gameState depuis la partie sauvegardée "${saveName}".`);
     }

     const storyWithTransientState: StorySegment[] = save.story.map(seg => ({
        ...seg,
        storyImageUrl: null, 
        imageIsLoading: false,
        imageError: false,
        imageGenerationPrompt: undefined, 
     }));


    console.log(`Partie "${saveName}" chargée pour le joueur "${save.playerName}" (${save.selectedHero}, ${save.playerGender}) (Thème: ${save.theme}, Scénario: ${save.subTheme || 'N/A'}) au tour ${save.currentTurn}/${save.maxTurns} au lieu "${locationInfo}". Relations: ${JSON.stringify(parsedState?.relationships)}, Émotions: ${JSON.stringify(parsedState?.emotions)}`);
    return { ...save, story: storyWithTransientState } as (LoadedGameState & { story: StorySegment[] });
  } catch (error) {
    console.error(`Erreur lors du chargement de la partie "${saveName}" depuis localStorage:`, error);
    return null;
  }
}

export function deleteSaveGame(saveName: string): boolean {
   if (typeof window === 'undefined') {
    console.error('Impossible de supprimer la partie côté serveur.');
    return false;
  }
  try {
    let saves = listSaveGames();
    const initialLength = saves.length;
    saves = saves.filter(s => s.saveName !== saveName);

    if (saves.length === initialLength) {
        console.warn(`Sauvegarde "${saveName}" non trouvée pour suppression.`);
        return true;
    }

    if (saves.length === 0) {
        localStorage.removeItem(SAVE_GAME_KEY);
    } else {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saves));
    }
    console.log(`Sauvegarde "${saveName}" supprimée.`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression de la partie "${saveName}" de localStorage:`, error);
    return false;
  }
}

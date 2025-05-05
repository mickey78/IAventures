
'use client'; // Marquer comme composant client car il utilise localStorage

import type { StorySegment, ParsedGameState } from '@/types/game'; // Importer les types partagés depuis leur nouvel emplacement
import { themes } from '@/config/themes'; // Importer les thèmes pour la validation
import { heroOptions } from '@/config/heroes'; // Import hero options for validation

// Définir la structure des données à sauvegarder
export interface GameStateToSave {
  theme: string;
  subTheme: string | null; // Champ sous-thème ajouté
  selectedHero: string; // Champ héros ajouté
  playerName: string; // Nom du joueur ajouté
  story: Omit<StorySegment, 'imageIsLoading' | 'imageError' | 'imageGenerationPrompt' | 'storyImageUrl'>[]; // Exclure explicitement storyImageUrl du type sauvegardé
  choices: string[];
  currentGameState: string; // Stocké sous forme de chaîne JSON (contient lieu, inventaire, relations, émotions, etc.)
  playerChoicesHistory: string[];
  timestamp: number;
  saveName: string;
  maxTurns: number; // Nombre maximum de tours ajouté
  currentTurn: number; // Tour actuel ajouté
}

// Définir la structure chargée depuis le stockage, qui pourrait temporairement inclure storyImageUrl avant nettoyage
// et inclut maintenant subTheme et selectedHero
interface LoadedGameState extends Omit<GameStateToSave, 'story'> {
    story: Omit<StorySegment, 'imageIsLoading' | 'imageError' | 'imageGenerationPrompt'>[]; // Segments d'histoire tels que chargés
}


const SAVE_GAME_KEY = 'iaventuresSaves_v4'; // Mettre à jour la clé de version pour le changement de schéma (ajout de hero)
const LOCAL_STORAGE_LIMIT_WARN_BYTES = 4.5 * 1024 * 1024; // Seuil d'avertissement ~4.5Mo

/**
 * Récupère toutes les parties sauvegardées depuis localStorage.
 * Gère les erreurs potentielles d'analyse JSON et valide la structure.
 * Inclut désormais la validation pour `subTheme` et `selectedHero`.
 * @returns Un tableau des états de jeu sauvegardés.
 */
export function listSaveGames(): LoadedGameState[] {
  if (typeof window === 'undefined') {
    return []; // Ne peut pas accéder à localStorage côté serveur
  }
  try {
    const savedGamesJson = localStorage.getItem(SAVE_GAME_KEY);
    if (!savedGamesJson) {
      return [];
    }
    let savedGames = JSON.parse(savedGamesJson) as LoadedGameState[]; // Utiliser let pour modification potentielle
    // Validation de base - vérifier si c'est un tableau
    if (!Array.isArray(savedGames)) {
        console.error("Données de sauvegarde invalides trouvées dans localStorage. Attendu un tableau. Suppression des données invalides.");
        localStorage.removeItem(SAVE_GAME_KEY); // Supprimer les données invalides
        return [];
    }
     // Validation plus poussée pour les champs essentiels et la structure interne de gameState
     let validatedSaves = savedGames.reduce((acc: LoadedGameState[], save) => { // Utiliser reduce pour filtrer les sauvegardes invalides
        try { // Bloc try externe pour valider un objet de sauvegarde unique
            let isValid = true;
            let currentGameStateObj: any = {};

            // Valider d'abord les champs requis de niveau supérieur
             if (typeof save.saveName !== 'string' || !save.saveName.trim()) {
                 console.warn(`Ignorer la sauvegarde avec saveName invalide ou manquant.`);
                 isValid = false;
             }
             if (typeof save.theme !== 'string' || !save.theme.trim()) {
                  console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" thème manquant ou invalide. Ignorer.`);
                 isValid = false;
             }
             // Valider subTheme (peut être null, mais doit être une chaîne si présent)
             if (save.subTheme !== null && (typeof save.subTheme !== 'string' || !save.subTheme.trim())) {
                 console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" sous-thème invalide (doit être une chaîne ou null). Ignorer.`);
                 isValid = false;
             } else if (save.subTheme) { // Valider que le sous-thème existe pour le thème principal
                 const mainTheme = themes.find(t => t.value === save.theme);
                 const subThemeExists = mainTheme?.subThemes.some(st => st.value === save.subTheme);
                 if (!subThemeExists) {
                     console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" sous-thème "${save.subTheme}" n'existe pas pour le thème "${save.theme}". Ignorer.`);
                     isValid = false;
                 }
             } else if (save.subTheme === null && isValid) {
                 // Permettre subTheme d'être null (pourrait être une ancienne sauvegarde, bien que la version de la clé devrait empêcher cela)
                 console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" a subTheme=null.`);
             }

             // Valider selectedHero
             if (typeof save.selectedHero !== 'string' || !save.selectedHero.trim() || !heroOptions.some(h => h.value === save.selectedHero)) {
                 console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" héros sélectionné manquant, invalide, ou n'existant plus. Ignorer.`);
                 isValid = false;
             }


             if (typeof save.playerName !== 'string' || !save.playerName.trim()) {
                console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" nom de joueur manquant ou invalide. Attribution par défaut.`);
                save.playerName = 'Joueur Inconnu'; // Attribuer une valeur par défaut mais autoriser la sauvegarde
            }
             if (typeof save.timestamp !== 'number' || save.timestamp <= 0) {
                 console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" timestamp manquant ou invalide. Ignorer.`);
                 isValid = false;
             }

             // Valider la chaîne JSON currentGameState et sa structure
            try { // try-catch imbriqué spécifiquement pour l'analyse JSON
                if (typeof save.currentGameState !== 'string') throw new Error("currentGameState n'est pas une chaîne.");
                currentGameStateObj = JSON.parse(save.currentGameState);
                if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) throw new Error("gameState analysé n'est pas un objet.");
                 // Synchroniser le nom du joueur si nécessaire
                 if (!currentGameStateObj.playerName || typeof currentGameStateObj.playerName !== 'string') currentGameStateObj.playerName = save.playerName;
                 // Assurer que le lieu existe et est une chaîne
                 if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Lieu Indéterminé';
                 // Assurer que l'inventaire est un tableau de chaînes
                 if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
                 currentGameStateObj.inventory = currentGameStateObj.inventory.filter((item: any) => typeof item === 'string');
                 // Vérifier les champs relationships, emotions, events
                 if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
                 if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
                 currentGameStateObj.emotions = currentGameStateObj.emotions.filter((e: any) => typeof e === 'string');
                 if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];
                 currentGameStateObj.events = currentGameStateObj.events.filter((e: any) => typeof e === 'string');


            } catch (e: any) {
                console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" a un JSON ou une structure invalide dans currentGameState: ${e.message}. Ignorer.`);
                isValid = false;
            }

            // Valider les numéros de tour
            if (typeof save.maxTurns !== 'number' || save.maxTurns <= 0) {
                console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" maxTurns manquant ou invalide. Par défaut à 15.`);
                save.maxTurns = 15; // Attribuer une valeur par défaut mais autoriser la sauvegarde si autrement valide
            }
            if (typeof save.currentTurn !== 'number' || save.currentTurn <= 0) {
                console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" currentTurn manquant ou invalide. Par défaut à 1.`);
                save.currentTurn = 1; // Attribuer une valeur par défaut mais autoriser la sauvegarde si autrement valide
            }
            // Limiter currentTurn (autoriser un de plus pour l'état terminé)
            if (save.currentTurn > save.maxTurns + 1) {
                console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" a currentTurn (${save.currentTurn}) dépassant maxTurns (${save.maxTurns}). Limitation.`);
                save.currentTurn = save.maxTurns + 1;
            }

             // Valider les segments d'histoire (vérifications de base)
             if (!Array.isArray(save.story)) {
                console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" a un format d'histoire invalide. Réinitialisation de l'histoire.`);
                save.story = []; // Autoriser la sauvegarde mais avec une histoire vide
             } else {
                // Assurer que storyImageUrl est EXCLU lors de la validation/liste
                save.story = save.story.map(seg => {
                    const { storyImageUrl, imageIsLoading, imageError, imageGenerationPrompt, ...rest } = seg as any;
                    // Valider la structure de base que nous conservons
                    if (typeof rest.id !== 'number' || typeof rest.text !== 'string' || (rest.speaker !== 'player' && rest.speaker !== 'narrator')) {
                        console.warn(`Structure de segment d'histoire invalide trouvée dans la sauvegarde "${save.saveName}". Retour minimal.`);
                        return { id: rest.id || 0, text: rest.text || '?', speaker: rest.speaker || 'narrator' };
                    }
                    return rest; // Retourner le segment sans url d'image/états transitoires
                });
             }

             // Valider le tableau de choix
              if (!Array.isArray(save.choices)) {
                  console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" tableau de choices manquant ou invalide. Réinitialisation.`);
                  save.choices = [];
              } else {
                  // Assurer que les choix sont des chaînes
                  save.choices = save.choices.filter(choice => typeof choice === 'string');
              }

             // Valider le tableau playerChoicesHistory
             if (!Array.isArray(save.playerChoicesHistory)) {
                 console.warn(`Sauvegarde "${save.saveName || 'INCONNU'}" tableau playerChoicesHistory manquant ou invalide. Réinitialisation.`);
                 save.playerChoicesHistory = [];
             } else {
                 // Assurer que les éléments de l'historique sont des chaînes
                 save.playerChoicesHistory = save.playerChoicesHistory.filter(hist => typeof hist === 'string');
             }

            // Re-convertir en chaîne le gameState interne potentiellement corrigé
            save.currentGameState = JSON.stringify(currentGameStateObj);

            if (isValid) {
                acc.push(save); // Ajouter l'objet de sauvegarde validé/corrigé au résultat
            }
        } catch (error) { // Intercepter les erreurs lors de la validation globale d'une sauvegarde unique
            console.error(`Erreur inattendue lors de la validation de la sauvegarde "${save?.saveName || 'INCONNU'}". Ignorer.`, error);
        }
        return acc; // Retourner l'accumulateur
     }, []); // Fin de reduce


    // Trier par timestamp descendant (le plus récent en premier)
    return validatedSaves.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Erreur lors du chargement des parties sauvegardées depuis localStorage:', error);
    // Optionnellement supprimer les données corrompues si l'analyse échoue fondamentalement
    // localStorage.removeItem(SAVE_GAME_KEY);
    return [];
  }
}

/**
 * Sauvegarde l'état actuel du jeu dans localStorage.
 * Trouve une sauvegarde existante avec le même nom ou en ajoute une nouvelle.
 * Attend que gameState.currentGameState soit une chaîne JSON valide contenant le lieu.
 * **Crucialement, omet `storyImageUrl` des segments d'histoire avant de sauvegarder pour éviter les problèmes de stockage.**
 * Inclut désormais `subTheme` et `selectedHero` dans la sauvegarde.
 * @param saveName Le nom/identifiant de l'emplacement de sauvegarde.
 * @param gameState L'état du jeu à sauvegarder (incluant playerName, subTheme, selectedHero, currentGameState converti en chaîne avec lieu, relations, émotions et infos de tour).
 * @returns True si la sauvegarde a réussi, false sinon.
 */
export function saveGame(saveName: string, gameState: Omit<GameStateToSave, 'timestamp' | 'saveName'> & { story: StorySegment[] }): boolean { // Attend temporairement le StorySegment[] complet
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
  // Valider subTheme avant la sauvegarde (doit être une chaîne non vide ou null)
   if (gameState.subTheme !== null && (typeof gameState.subTheme !== 'string' || !gameState.subTheme.trim())) {
       console.error('Erreur sauvegarde: Sous-thème invalide fourni. Doit être une chaîne ou null.', gameState.subTheme);
       return false;
   }
    // Valider selectedHero avant la sauvegarde
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

   // Valider la chaîne currentGameState et son contenu *avant* de tenter la sauvegarde
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
        // Assurer que les éléments de l'inventaire sont des chaînes
        parsedStateForSave.inventory = parsedStateForSave.inventory.filter((item: any) => typeof item === 'string');
        // Assurer que les autres champs optionnels ont le bon type s'ils existent
        if (typeof parsedStateForSave.relationships !== 'object' || parsedStateForSave.relationships === null) parsedStateForSave.relationships = {};
        if (!Array.isArray(parsedStateForSave.emotions)) parsedStateForSave.emotions = [];
        parsedStateForSave.emotions = parsedStateForSave.emotions.filter((e: any) => typeof e === 'string');
        if (!Array.isArray(parsedStateForSave.events)) parsedStateForSave.events = [];
        parsedStateForSave.events = parsedStateForSave.events.filter((e: any) => typeof e === 'string');


    } catch (e: any) {
        console.error('Erreur sauvegarde: JSON ou structure invalide dans la chaîne currentGameState.', e.message, gameState.currentGameState);
        return false; // Empêcher la sauvegarde d'un état invalide
    }
    // Utiliser la chaîne d'état validée et potentiellement corrigée pour la sauvegarde
    const validatedGameStateString = JSON.stringify(parsedStateForSave);


  try {
    const saves = listSaveGames(); // Obtient les sauvegardes validées (sans images)
    const now = Date.now();

    // Préparer l'état de l'histoire pour la sauvegarde: **Supprimer storyImageUrl** et les drapeaux transitoires/debug
    const storyToSave = gameState.story.map(seg => {
        const { storyImageUrl, // Déstructurer explicitement pour supprimer
                imageIsLoading,
                imageError,
                imageGenerationPrompt,
                ...rest // Conserver le reste des données du segment
              } = seg;

        // Validation de base de la structure du segment restant
        if (typeof rest.id !== 'number' || typeof rest.text !== 'string' || (rest.speaker !== 'player' && rest.speaker !== 'narrator')) {
            console.warn("Structure de segment d'histoire invalide trouvée lors de la préparation de la sauvegarde:", rest);
            // Décider comment gérer - ignorer le segment ? retourner un minimum ? Ici, nous retournons une version minimale valide.
            return { id: rest.id || 0, text: rest.text || '?', speaker: rest.speaker || 'narrator' };
        }
        return rest; // Retourner le segment sans l'URL de l'image et les états transitoires
    });


    const newState: GameStateToSave = {
        theme: gameState.theme,
        subTheme: gameState.subTheme, // Inclure subTheme dans la sauvegarde
        selectedHero: gameState.selectedHero, // Inclure le héros sélectionné
        playerName: gameState.playerName,
        story: storyToSave, // Utiliser le tableau d'histoire SANS URL d'image
        choices: gameState.choices.filter(c => typeof c === 'string'), // Assurer que les choix sont des chaînes
        currentGameState: validatedGameStateString, // Utiliser la chaîne validée
        playerChoicesHistory: gameState.playerChoicesHistory.filter(h => typeof h === 'string'), // Assurer que les éléments de l'historique sont des chaînes
        maxTurns: gameState.maxTurns,
        currentTurn: gameState.currentTurn,
        saveName: saveName,
        timestamp: now,
    }

    const existingIndex = saves.findIndex(s => s.saveName === saveName);
    let updatedSaves: GameStateToSave[]; // Utiliser le type correct ici

    if (existingIndex > -1) {
        // Assurer que nous comparons des types compatibles
        const savesToUpdate = listSaveGames(); // Récupérer à nouveau la liste complète
        savesToUpdate[existingIndex] = newState;
        updatedSaves = savesToUpdate;
    } else {
         // Ajouter le nouvel état à la liste (déjà triée par timestamp effectivement)
        updatedSaves = [newState, ...listSaveGames()];
    }

    // Vérifier la taille potentielle avant de sauvegarder
    const saveDataString = JSON.stringify(updatedSaves);
    const saveDataSize = new Blob([saveDataString]).size;
    console.log(`Taille estimée des données de sauvegarde (images exclues): ${(saveDataSize / 1024 / 1024).toFixed(2)} Mo`);
    if (saveDataSize > LOCAL_STORAGE_LIMIT_WARN_BYTES) {
        console.warn(`La taille des données de sauvegarde localStorage approche les limites (${(saveDataSize / 1024 / 1024).toFixed(2)} Mo). Les sauvegardes les plus anciennes pourraient être élaguées ou la sauvegarde pourrait échouer.`);
        // Implémenter la logique d'élagage ici si désiré (ex: conserver seulement les 10 sauvegardes les plus récentes)
    }

    // Tenter de sauvegarder
    localStorage.setItem(SAVE_GAME_KEY, saveDataString);
    console.log(`Partie sauvegardée sous "${saveName}" pour le joueur "${gameState.playerName}" (${gameState.selectedHero}) (Thème: ${gameState.theme}, Scénario: ${gameState.subTheme || 'N/A'}) au tour ${gameState.currentTurn}/${gameState.maxTurns} au lieu "${parsedStateForSave.location}".`);
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

/**
 * Charge un état de jeu spécifique depuis localStorage par nom de sauvegarde.
 * Ajoute des états d'image transitoires par défaut (imageIsLoading: false, imageError: false, storyImageUrl: null) aux segments d'histoire.
 * Inclut désormais le chargement de `subTheme` et `selectedHero`.
 * @param saveName Le nom de l'emplacement de sauvegarde à charger.
 * @returns L'état de jeu chargé (incluant subTheme et selectedHero, avec currentGameState comme chaîne contenant lieu, relations, émotions et infos de tour) ou null si non trouvé ou en cas d'erreur.
 */
export function loadGame(saveName: string): (LoadedGameState & { story: StorySegment[] }) | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    // listSaveGames valide déjà la structure, la validité JSON et les numéros de tour, et l'existence de subTheme/hero
    const saves = listSaveGames(); // Ceci retourne les sauvegardes sans URL d'image, mais avec subTheme/hero
    const save = saves.find(s => s.saveName === saveName);
    if (!save) {
        console.warn(`Sauvegarde "${saveName}" non trouvée.`);
        return null;
    }

    // L'objet save retourné par listSaveGames devrait être valide
    let locationInfo = 'lieu inconnu'; // Texte de lieu par défaut
    let parsedState: ParsedGameState | null = null;
     try {
         parsedState = JSON.parse(save.currentGameState); // Analyse une fois
         locationInfo = parsedState?.location || locationInfo;
     } catch (e) {
         console.warn(`Impossible d'analyser le gameState depuis la partie sauvegardée "${saveName}".`);
     }

     // Réhydrater les segments d'histoire avec les états transitoires par défaut et une URL d'image nulle
     const storyWithTransientState: StorySegment[] = save.story.map(seg => ({
        ...seg,
        storyImageUrl: null, // Les images ne sont pas sauvegardées, donc commencer avec null
        imageIsLoading: false,
        imageError: false,
        imageGenerationPrompt: undefined, // Assurer que le prompt n'est pas chargé
     }));


    console.log(`Partie "${saveName}" chargée pour le joueur "${save.playerName}" (${save.selectedHero}) (Thème: ${save.theme}, Scénario: ${save.subTheme || 'N/A'}) au tour ${save.currentTurn}/${save.maxTurns} au lieu "${locationInfo}". Relations: ${JSON.stringify(parsedState?.relationships)}, Émotions: ${JSON.stringify(parsedState?.emotions)}`);
    // Caster le résultat vers le type attendu incluant l'histoire réhydratée
    return { ...save, story: storyWithTransientState } as (LoadedGameState & { story: StorySegment[] });
  } catch (error) {
    console.error(`Erreur lors du chargement de la partie "${saveName}" depuis localStorage:`, error);
    return null;
  }
}

/**
 * Supprime une sauvegarde de jeu spécifique de localStorage par nom de sauvegarde.
 * @param saveName Le nom de l'emplacement de sauvegarde à supprimer.
 * @returns True si la suppression a réussi ou si la sauvegarde n'existait pas, false en cas d'erreur.
 */
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
        // Retourner true car l'état désiré (sauvegarde inexistante) est atteint
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

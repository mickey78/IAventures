
import type { ParsedGameState } from '@/types/game'; // Importer le type partagé

/**
 * Analyse en toute sécurité une chaîne JSON représentant l'état du jeu.
 * Fournit des valeurs par défaut et assure une structure de base.
 * @param stateString La chaîne JSON à analyser.
 * @param playerNameFallback Le nom du joueur à utiliser s'il manque dans les données analysées.
 * @returns Un objet ParsedGameState.
 */
export const parseGameState = (stateString: string | undefined | null, playerNameFallback: string | null = 'Joueur'): ParsedGameState => {
    const defaultState: ParsedGameState = {
        inventory: [],
        location: 'Lieu Inconnu',
        playerName: playerNameFallback || 'Joueur Inconnu', // Assure que le nom du joueur existe
        relationships: {}, // Default empty relationships
        emotions: [], // Default empty emotions
        events: [],
    };

    if (!stateString) {
        return { ...defaultState }; // Retourne un nouvel objet par défaut
    }

    try {
        const parsed = JSON.parse(stateString);
        if (typeof parsed !== 'object' || parsed === null) {
            console.warn("L'état du jeu analysé n'est pas un objet, retour aux valeurs par défaut.");
            return { ...defaultState };
        }

        // Assurer que les propriétés principales existent et ont le bon type
        const inventory = Array.isArray(parsed.inventory)
            ? parsed.inventory.filter((item: any): item is string => typeof item === 'string')
            : defaultState.inventory;
        const playerName = typeof parsed.playerName === 'string' && parsed.playerName.trim() ? parsed.playerName.trim() : defaultState.playerName;
        const location = typeof parsed.location === 'string' && parsed.location.trim() ? parsed.location.trim() : defaultState.location;
        const relationships = typeof parsed.relationships === 'object' && parsed.relationships !== null ? parsed.relationships : defaultState.relationships;
        const emotions = Array.isArray(parsed.emotions)
            ? parsed.emotions.filter((e: any): e is string => typeof e === 'string')
            : defaultState.emotions;
        const events = Array.isArray(parsed.events)
            ? parsed.events.filter((e: any): e is string => typeof e === 'string')
            : defaultState.events;


        // Retourne un objet bien structuré incluant d'autres propriétés de l'analyse
        return {
            ...parsed, // Conserve toutes les autres propriétés que l'IA aurait pu ajouter
            inventory,
            playerName,
            location,
            relationships,
            emotions,
            events,
        };
    } catch (error) {
        console.error("Erreur lors de l'analyse du JSON de l'état du jeu :", error, "La chaîne était :", stateString);
        return { ...defaultState }; // Retourne un nouvel objet par défaut en cas d'erreur
    }
};


/**
 * Convertit en chaîne JSON un objet d'état de jeu en toute sécurité.
 * @param gameStateObject L'objet ParsedGameState à convertir en chaîne.
 * @returns Une représentation en chaîne JSON, ou '{}' si la conversion échoue.
 */
export const safeJsonStringify = (gameStateObject: ParsedGameState | object): string => {
  try {
    // Assure que les champs essentiels sont présents avant la conversion en chaîne, en utilisant des valeurs par défaut si nécessaire
    const stateToSave: ParsedGameState = {
      playerName: gameStateObject.playerName || 'Joueur Inconnu',
      location: gameStateObject.location || 'Lieu Indéterminé',
      inventory: Array.isArray(gameStateObject.inventory) ? gameStateObject.inventory : [],
      relationships: typeof gameStateObject.relationships === 'object' && gameStateObject.relationships !== null ? gameStateObject.relationships : {},
      emotions: Array.isArray(gameStateObject.emotions) ? gameStateObject.emotions : [],
      events: Array.isArray(gameStateObject.events) ? gameStateObject.events : [],
      ...gameStateObject, // Étale le reste des propriétés
    };
    return JSON.stringify(stateToSave);
  } catch (e) {
    console.error("Échec de la conversion en chaîne de l'objet d'état du jeu :", gameStateObject, e);
    // Retourne une chaîne JSON minimale valide comme solution de secours
    return JSON.stringify({
        playerName: gameStateObject.playerName || 'Erreur État',
        location: gameStateObject.location || 'Erreur',
        inventory: [],
        relationships: {},
        emotions: [],
        events: ['erreur_conversion_etat'],
    });
  }
}

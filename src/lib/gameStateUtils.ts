
import type { ParsedGameState } from '@/types/game'; // Import shared type

/**
 * Safely parses a JSON string representing the game state.
 * Provides default values and ensures basic structure.
 * @param stateString The JSON string to parse.
 * @param playerNameFallback The player name to use if missing in the parsed data.
 * @returns A ParsedGameState object.
 */
export const parseGameState = (stateString: string | undefined | null, playerNameFallback: string | null = 'Joueur'): ParsedGameState => {
    const defaultState: ParsedGameState = {
        inventory: [],
        location: 'Lieu Inconnu',
        playerName: playerNameFallback || 'Joueur Inconnu', // Ensure player name exists
        relationships: {},
        emotions: [],
        events: [],
    };

    if (!stateString) {
        return { ...defaultState }; // Return a fresh default object
    }

    try {
        const parsed = JSON.parse(stateString);
        if (typeof parsed !== 'object' || parsed === null) {
            console.warn("Parsed game state is not an object, returning default.");
            return { ...defaultState };
        }

        // Ensure core properties exist and have the correct type
        const inventory = Array.isArray(parsed.inventory)
            ? parsed.inventory.filter((item: any): item is string => typeof item === 'string')
            : [];
        const playerName = typeof parsed.playerName === 'string' && parsed.playerName.trim() ? parsed.playerName.trim() : defaultState.playerName;
        const location = typeof parsed.location === 'string' && parsed.location.trim() ? parsed.location.trim() : defaultState.location;
        const relationships = typeof parsed.relationships === 'object' && parsed.relationships !== null ? parsed.relationships : defaultState.relationships;
        const emotions = Array.isArray(parsed.emotions)
            ? parsed.emotions.filter((e: any): e is string => typeof e === 'string')
            : defaultState.emotions;
        const events = Array.isArray(parsed.events)
            ? parsed.events.filter((e: any): e is string => typeof e === 'string')
            : defaultState.events;


        // Return a well-structured object including other properties from parsed
        return {
            ...parsed, // Keep any other properties the AI might have added
            inventory,
            playerName,
            location,
            relationships,
            emotions,
            events,
        };
    } catch (error) {
        console.error("Error parsing game state JSON:", error, "String was:", stateString);
        return { ...defaultState }; // Return a fresh default object on error
    }
};


/**
 * Safely stringifies a game state object.
 * @param gameStateObject The ParsedGameState object to stringify.
 * @returns A JSON string representation, or '{}' if stringification fails.
 */
export const safeJsonStringify = (gameStateObject: ParsedGameState | object): string => {
  try {
    // Ensure essential fields are present before stringifying, using defaults if needed
    const stateToSave = {
      playerName: gameStateObject.playerName || 'Joueur Inconnu',
      location: gameStateObject.location || 'Lieu Indéterminé',
      inventory: Array.isArray(gameStateObject.inventory) ? gameStateObject.inventory : [],
      relationships: typeof gameStateObject.relationships === 'object' && gameStateObject.relationships !== null ? gameStateObject.relationships : {},
      emotions: Array.isArray(gameStateObject.emotions) ? gameStateObject.emotions : [],
      events: Array.isArray(gameStateObject.events) ? gameStateObject.events : [],
      ...gameStateObject, // Spread the rest of the properties
    };
    return JSON.stringify(stateToSave);
  } catch (e) {
    console.error("Failed to stringify game state object:", gameStateObject, e);
    // Return a minimal valid JSON string as a fallback
    return JSON.stringify({
        playerName: gameStateObject.playerName || 'Erreur État',
        location: gameStateObject.location || 'Erreur',
        inventory: [],
        relationships: {},
        emotions: [],
        events: ['error_stringifying_state'],
    });
  }
}

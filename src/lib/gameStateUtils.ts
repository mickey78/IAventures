
import type { ParsedGameState, InventoryItem } from '@/types/game'; // Importer les types partagés

/**
 * Analyse en toute sécurité une chaîne JSON représentant l'état du jeu.
 * Fournit des valeurs par défaut et assure une structure de base.
 * @param stateString La chaîne JSON à analyser.
 * @param playerNameFallback Le nom du joueur à utiliser s'il manque dans les données analysées.
 * @returns Un objet ParsedGameState.
 */
export const parseGameState = (stateString: string | undefined | null, playerNameFallback: string | null = 'Joueur'): ParsedGameState => {
    // Ajout de heroAbilities au defaultState
    const defaultState: ParsedGameState = {
        inventory: [],
        heroAbilities: [], 
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
        // Correction du filtre pour inventory: doit vérifier la structure de InventoryItem
        const inventory = Array.isArray(parsed.inventory)
            ? parsed.inventory.filter((item: any): item is InventoryItem => 
                item && typeof item === 'object' && typeof item.name === 'string' && typeof item.quantity === 'number'
              ).map((item: any) => ({ // Assurer la structure minimale
                  name: item.name,
                  quantity: item.quantity,
                  description: typeof item.description === 'string' ? item.description : undefined,
                  // icon: item.icon // L'icône n'est généralement pas dans le JSON de l'IA
              }))
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
// Changement de la signature pour accepter uniquement ParsedGameState
export const safeJsonStringify = (gameStateObject: ParsedGameState): string => {
  try {
    // Définir les valeurs par défaut pour les champs essentiels
    const defaults: Partial<ParsedGameState> = {
      playerName: 'Joueur Inconnu',
      location: 'Lieu Indéterminé',
      inventory: [],
      heroAbilities: [], 
      relationships: {},
      emotions: [],
      events: [],
    };

    // Fusionner les défauts avec l'objet fourni, en s'assurant que les valeurs de gameStateObject prévalent
    // et en ne gardant que les clés définies dans ParsedGameState (implicitement géré par le type)
    const stateToSave: ParsedGameState = {
      ...defaults, // Appliquer les défauts en premier
      ...gameStateObject, // Écraser avec les valeurs réelles si elles existent
      // Assurer explicitement que les tableaux/objets sont bien des tableaux/objets s'ils existent dans gameStateObject
      inventory: Array.isArray(gameStateObject.inventory) ? gameStateObject.inventory : defaults.inventory!,
      heroAbilities: Array.isArray(gameStateObject.heroAbilities) ? gameStateObject.heroAbilities : defaults.heroAbilities!,
      relationships: typeof gameStateObject.relationships === 'object' && gameStateObject.relationships !== null ? gameStateObject.relationships : defaults.relationships!,
      emotions: Array.isArray(gameStateObject.emotions) ? gameStateObject.emotions : defaults.emotions!,
      events: Array.isArray(gameStateObject.events) ? gameStateObject.events : defaults.events!,
    };
    
    // Nettoyer l'objet avant de le stringifier pour enlever les clés undefined
    Object.keys(stateToSave).forEach(key => (stateToSave as any)[key] === undefined && delete (stateToSave as any)[key]);
    return JSON.stringify(stateToSave);
  } catch (e) {
    console.error("Échec de la conversion en chaîne de l'objet d'état du jeu :", gameStateObject, e);
    // Retourne une chaîne JSON minimale valide comme solution de secours
    // L'accès direct est maintenant sûr car le type est ParsedGameState
    return JSON.stringify({
        playerName: gameStateObject.playerName || 'Erreur État',
        location: gameStateObject.location || 'Erreur',
        inventory: [],
        heroAbilities: [], 
        relationships: {},
        emotions: [],
        events: ['erreur_conversion_etat'],
    });
  }
}

'use server';
// src/ai/flows/generate-story-content.ts

/**
 * @fileOverview Generates story content based on the chosen theme, player choices, inventory, player name, and turn count.
 *
 * - generateStoryContent - A function that generates story content.
 * - GenerateStoryContentInput - The input type for the generateStoryContent function.
 * - GenerateStoryContentOutput - The return type for the generateStoryContent function.
 */
import React from 'react'; // Import React
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { StorySegment } from '@/app/page'; // Import StorySegment type

// Define a helper function to safely parse JSON
function safeJsonParse(jsonString: string | undefined | null, defaultValue: object = {}): any { // Return any for flexibility internally
  if (!jsonString) {
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(jsonString);
    // Basic check if it's an object (and not null)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return defaultValue; // Return default if not an object
  } catch (e) {
    console.error("Failed to parse JSON string:", jsonString, e);
    return defaultValue; // Return default value if parsing fails
  }
}

// Define a helper function to safely stringify JSON
function safeJsonStringify(jsonObject: object): string {
  try {
    return JSON.stringify(jsonObject);
  } catch (e) {
    console.error("Failed to stringify JSON object:", jsonObject, e);
    return '{}'; // Return empty object string if stringify fails
  }
}

// Client-side state for randomness - This hook cannot be used in a Server Component/Action.
// It needs to be called within a Client Component context.
// We will generate the random number on the client side before calling the flow if needed,
// or handle random events differently within the AI flow itself.
/*
function generateRandomEvent(): string | null {
    const [randomValue, setRandomValue] = React.useState<number | null>(null);
    const [randomIndex, setRandomIndex] = React.useState<number | null>(null);

    React.useEffect(() => {
        const newRandomValue = Math.random();
        setRandomValue(newRandomValue);
        if (newRandomValue <= 0.1) {
             const events = [
                "Une pluie torrentielle s'abat sur la région.",
                "Un tremblement de terre secoue les alentours.",
                "Un personnage important croise votre chemin.",
                "Un objet rare est découvert.",
                "Un ennemi inattendu apparait.",
                "Vous tombez sur un villageois qui à besoin d'aide.",
                "Une musique étrange résonne dans les environs.",
                "Le brouillard devient très épais.",
            ];
            setRandomIndex(Math.floor(Math.random() * events.length));
        }
    }, []); // Empty dependency array ensures this runs once on mount (client-side)

    if (randomValue === null || randomValue > 0.1 || randomIndex === null) {
        return null;
    }
    const events = [
        "Une pluie torrentielle s'abat sur la région.",
        "Un tremblement de terre secoue les alentours.",
        "Un personnage important croise votre chemin.",
        "Un objet rare est découvert.",
        "Un ennemi inattendu apparait.",
        "Vous tombez sur un villageois qui à besoin d'aide.",
        "Une musique étrange résonne dans les environs.",
        "Le brouillard devient très épais.",
    ];
    return events[randomIndex];
}
*/
// Recommendation: Let the AI decide on random events based on turn count or context.

const GameStateSchema = z.object({
  playerName: z.string(),
  inventory: z.array(z.string()),
  relationships: z.record(z.string(), z.string()).optional(),
  emotions: z.array(z.string()).optional(),
  events: z.array(z.string()).optional(),
});
const GenerateStoryContentInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'The theme of the story (e.g., Medieval Fantasy, Space Exploration, Pirates of the Caribbean, Western and Cowboys, Mystery and Investigation, Superhero School, Love Story, Trapped in the Game, Post-Apocalyptic Survival)'
    ),
  playerName: z.string().describe('The name of the player.'),
  lastStorySegment: z.object({ // Add last story segment for context
      id: z.number(),
      text: z.string(),
      speaker: z.enum(['player', 'narrator'])
  }).optional().describe('The very last segment of the story (player choice or narrator text) for immediate context.'),
  playerChoicesHistory: z.array(z.string()).optional().describe('The history of player choices made so far, ordered chronologically. The VERY LAST element is the most recent choice the AI must react to.'),
  gameState: z.string().optional().describe('A JSON string representing the current game state (e.g., {"inventory": ["key", "map"], "location": "Cave", "playerName": "Alex", "relationships":{"NPC1":"friend", "NPC2":"enemy"}, "emotions":["happy", "curious"]}). Start with an empty object string if undefined.'),
  currentTurn: z.number().int().positive().describe('The current turn number (starts at 1).'),
  maxTurns: z.number().int().positive().describe('The maximum number of turns for this adventure.'),
  isLastTurn: z.boolean().describe('Indicates if this is the final turn of the adventure.'),
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe('The generated story content, describing the result of the player\'s last action and the current situation, addressing the player by name. If it\'s the last turn, this should be the concluding segment.'),
  nextChoices: z.array(z.string()).describe('2-3 clear and simple choices for the player\'s next action, relevant to the current situation, theme, and inventory. Should be an empty array if it\'s the last turn.'),
  updatedGameState: z.string().describe('The updated game state as a JSON string, reflecting changes based on the last action and story progression (including inventory). Must be valid JSON.'),
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  let initialGameState = safeJsonParse(input.gameState, { playerName: input.playerName, inventory: [], relationships: {}, emotions: [], events: [] }); // Use let

    // Ensure player name, inventory, relationships and emotions exist in the initial game state object
  if (!initialGameState.playerName) {
      initialGameState.playerName = input.playerName;
  }
  if (!Array.isArray(initialGameState.inventory)) {
      initialGameState.inventory = [];
  }
    if (!initialGameState.events) {
        initialGameState.events = [];
    }

    if (typeof initialGameState.relationships !== 'object' || initialGameState.relationships === null) { // Check if it's not a proper object
        initialGameState.relationships = {};
    }
    if (!Array.isArray(initialGameState.emotions)) {
        initialGameState.emotions = [];
    }
    if (!Array.isArray(initialGameState.events)) { // Double check for events
        initialGameState.events = [];
    }

  const safeInput = {
    ...input,
    gameState: safeJsonStringify(initialGameState), // Use the validated/defaulted object
    playerChoicesHistory: input.playerChoicesHistory || [],
    lastStorySegmentText: input.lastStorySegment?.text || "C'est le début de l'aventure.", // Provide default text if segment is missing
  };

  return generateStoryContentFlow(safeInput);
}


const prompt = ai.definePrompt({
  name: 'generateStoryContentPrompt',
  input: {
    schema: z.object({
      theme: z.string().describe('The theme of the story.'),
      playerName: z.string().describe('The name of the player.'),
      lastStorySegmentText: z.string().describe('The text of the very last story segment (player or narrator) for immediate context.'),
      playerChoicesHistory: z.array(z.string()).describe('History of player choices. The VERY LAST element is the most recent choice to react to.'),
      gameState: z.string().describe('Current game state (JSON string). Example: {"location":"Forest","inventory":["Sword","Potion"],"status":"Healthy","playerName":"Hero", "relationships":{"NPC1":"friend"}, "emotions":["happy"], "events":[]}'),
      current_date: z.string().describe('Current date, injected for potential story elements.'),
      currentTurn: z.number().describe('The current turn number.'),
      maxTurns: z.number().describe('The maximum number of turns.'),
      isLastTurn: z.boolean().describe('Whether this is the last turn.'),
    }),
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8-12 ans. Le nom du joueur est {{{playerName}}}. L'aventure dure au maximum {{{maxTurns}}} tours. Nous sommes actuellement au tour {{{currentTurn}}}. Ta mission est de continuer l'histoire de manière amusante, logique et **strictement cohérente avec le thème**, en te basant sur le **dernier choix effectué par le joueur**, l'état actuel du jeu, et en t'adressant au joueur par son nom.

**Contexte de l'Aventure :**
*   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
*   Nom du joueur : {{{playerName}}}
*   Tour Actuel : {{{currentTurn}}} / {{{maxTurns}}}
*   État actuel du jeu (JSON string) : {{{gameState}}}
    *   Note : L'état du jeu contient 'playerName', 'inventory' (tableau d'objets), et peut aussi contenir 'relationships' (objet PNJ:statut), 'emotions' (tableau d'émotions), et 'events' (tableau d'événements).
*   Dernier segment de l'histoire : "{{{lastStorySegmentText}}}"
*   Historique des actions du joueur (le **dernier élément** est l'action à laquelle tu dois réagir) :
    {{#if playerChoicesHistory}}
    {{#each playerChoicesHistory}}
    - {{{this}}}
    {{/each}}
    {{else}}
    C'est le tout début de l'aventure !
    {{/if}}

**Règles strictes pour ta réponse (MJ) :**

1.  **Réagis à la DERNIÈRE ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique de la **dernière action** de {{{playerName}}} (le dernier élément de \`playerChoicesHistory\`). Adresse-toi toujours à {{{playerName}}} par son nom.
    *   **Gestion Inventaire** :
        *   Si le dernier choix implique **l'utilisation** ou la **perte** d'un objet (ex: "Utiliser Clé", "Lancer Potion", "Se débarrasser de Pierre"), décris le résultat et **retire** l'objet de la liste \`inventory\` dans \`updatedGameState\` si l'action réussit et consomme l'objet.
        *   Si le dernier choix fait **trouver** un nouvel objet, décris-le et **ajoute**-le à la liste \`inventory\` dans \`updatedGameState\`. Annonce clairement la trouvaille dans \`storyContent\`, ex: "Tu as trouvé une **vieille clé rouillée** ! Ajoutée à l'inventaire !".
        *   Si le dernier choix est "Inspecter {objet}", décris l'objet plus en détail sans le retirer de l'inventaire.
2.  **Cohérence des Personnages**: Maintiens la personnalité et les caractéristiques des PNJ créés. Adapte leurs réactions en fonction des 'relationships' dans le gameState.
3.  **Cohérence des Lieux**: Souviens-toi des lieux et de leurs caractéristiques.
4.  **Chronologie & Causalité**: Respecte l'ordre des événements. Les actions doivent avoir des conséquences logiques sur la suite. Utilise le tableau 'events' du gameState pour te souvenir des faits importants.
5.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} ? Que perçoit-il/elle ? Qu'est-ce qui a changé ? Que se passe-t-il maintenant ?
6.  **Gestion Actions Hors-Contexte/Impossibles** : Si le **dernier choix** est illogique, hors thème, dangereux, impossible, refuse GENTIMENT ou réinterprète. Explique pourquoi ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici.") et propose immédiatement de nouvelles actions VALIDES via 'nextChoices' (sauf si c'est le dernier tour).
7.  **Gestion du Dernier Tour (quand isLastTurn est vrai)** :
    *   Si l'indicateur {{isLastTurn}} est vrai, c'est la fin ! Ne propose **AUCUN** nouveau choix (la clé 'nextChoices' dans la sortie JSON doit être un tableau vide []).
    *   Décris une **conclusion** à l'aventure basée sur le dernier choix et l'état final du jeu. La conclusion doit être satisfaisante et cohérente avec l'histoire et le thème. Elle peut être ouverte ou fermée. Exemple: "Et c'est ainsi, {{{playerName}}}, qu'après avoir {dernière action}, tu {conclusion}. Ton aventure sur {lieu/thème} se termine ici... pour l'instant !".
    *   Mets quand même à jour 'updatedGameState' une dernière fois si nécessaire.
8.  **Propose de Nouveaux Choix (si PAS le dernier tour)** : Si l'indicateur {{isLastTurn}} est FAUX, offre 2 ou 3 options claires, simples, pertinentes pour la situation et le thème. PAS d'actions d'inventaire directes dans \`nextChoices\`. Le joueur utilise l'interface d'inventaire pour ça.
9.  **Mets à Jour l'État du Jeu ('updatedGameState')** : Réfléchis aux conséquences du **dernier choix** (inventaire, lieu, relations, émotions, événements). Mets à jour **IMPÉRATIVEMENT** 'inventory' si besoin, mais aussi 'relationships', 'emotions', 'events' le cas échéant. \`updatedGameState\` doit être une chaîne JSON valide contenant AU MINIMUM 'playerName' et 'inventory'. Si rien n'a changé, renvoie le \`gameState\` précédent (stringify), mais valide.
10. **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant : 'storyContent' (string), 'nextChoices' (array de strings, vide si {{isLastTurn}} est vrai), 'updatedGameState' (string JSON valide). RIEN d'autre.
11. **Ton rôle** : Reste UNIQUEMENT le narrateur. Pas de sortie de rôle, pas de discussion hors aventure, pas de mention d'IA.
12. **Public (8-12 ans)** : Langage simple, adapté, positif, aventureux. Pas de violence/peur excessive/thèmes adultes. Utilise les 'emotions' du gameState pour influencer l'ambiance.

**Exemple de sortie (Tour normal)**
{
  "storyContent": "Alex, tu utilises la Clé Ancienne sur la serrure rouillée... *Clic !* La porte s'ouvre en grinçant, révélant un passage sombre. La clé s'est malheureusement cassée dans la serrure.",
  "nextChoices": ["Entrer dans le passage sombre", "Examiner les environs avant d'entrer", "Appeler pour voir si quelqu'un répond"],
  "updatedGameState": "{\"playerName\":\"Alex\",\"inventory\":[\"Lampe de poche\"],\"location\":\"Entrée du passage\",\"relationships\":{},\"emotions\":[\"curieux\"],\"events\":[\"porte ouverte\"]}"
}

**Exemple de sortie (DERNIER TOUR, isLastTurn = true)**
{
 "storyContent": "Et c'est ainsi, Léa, qu'après avoir donné le cristal scintillant au robot gardien, celui-ci s'écarte en révélant la sortie ! Tu as réussi à t'échapper du vaisseau labyrinthe. Bravo pour ton ingéniosité ! Ton aventure spatiale se termine ici, victorieuse !",
 "nextChoices": [],
 "updatedGameState": "{\"playerName\":\"Léa\",\"inventory\":[],\"location\":\"Sortie du Vaisseau\",\"relationships\":{\"Gardien\":\"reconnaissant\"},\"emotions\":[\"soulagée\",\"fière\"],\"events\":[\"sortie trouvée\"]}"
}

**Important** : Concentre-toi sur la réaction à la **dernière action**, la gestion précise de l'inventaire dans \`updatedGameState\`, et la **conclusion si c'est le dernier tour** ({{isLastTurn}}).

Génère maintenant la suite (ou la fin) de l'histoire pour {{{playerName}}}, en respectant TOUTES les règles, le thème {{{theme}}}, l'état du jeu, et le compte des tours ({{{currentTurn}}}/{{{maxTurns}}}, la valeur de isLastTurn est {{isLastTurn}}).
`,
});


const generateStoryContentFlow = ai.defineFlow<
  typeof GenerateStoryContentInputSchema,
  typeof GenerateStoryContentOutputSchema
>({
  name: 'generateStoryContentFlow',
  inputSchema: GenerateStoryContentInputSchema,
  outputSchema: GenerateStoryContentOutputSchema,
},
async input => {

   // Basic input validation
   if (!input.theme) throw new Error("Theme is required.");
   if (!input.playerName) throw new Error("Player name is required.");
   if (!input.gameState) throw new Error("Game state is required.");
   if (!input.currentTurn || !input.maxTurns) throw new Error("Turn information is required.");

   const safePlayerChoicesHistory = input.playerChoicesHistory || [];
   if (safePlayerChoicesHistory.length === 0 && !input.lastStorySegmentText?.includes("début")) {
       console.warn("generateStoryContent called with empty choice history mid-game. This might indicate an issue.");
   }

    // --- Random Event Generation (Moved inside the flow logic for server-side) ---
    let currentGameStateObj: any; // Use 'any' temporarily for parsing flexibility
    try {
        currentGameStateObj = safeJsonParse(input.gameState);
        if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) {
            throw new Error("Parsed gameState is not an object.");
        }
    } catch (e) {
        console.error("Invalid input gameState JSON, resetting to default:", input.gameState, e);
        // Provide a more complete default state if parsing fails
        currentGameStateObj = {
            playerName: input.playerName,
            inventory: [],
            relationships: {},
            emotions: [],
            events: []
        };
    }

    // Simple random event logic (can be expanded) - Example: 10% chance per turn
    // Avoid Math.random directly in top-level server scope if possible, generate here if needed.
    // For better control, consider making randomness part of the AI's task or using a seeded RNG.
    const shouldGenerateEvent = Math.random() < 0.1; // Example: 10% chance
    if (shouldGenerateEvent && input.currentTurn > 1) { // Avoid event on turn 1
        const events = [
            "Une pluie torrentielle s'abat soudainement.",
            "Un léger tremblement de terre secoue le sol.",
            "Un étrange marchand ambulant apparaît au loin.",
            "Tu découvres une inscription ancienne sur un rocher.",
            "Une créature inconnue et rapide passe en coup de vent.",
            "Tu entends un appel à l'aide au loin.",
            "Une musique mystérieuse flotte dans l'air.",
            "Un brouillard épais commence à se lever.",
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        if (!Array.isArray(currentGameStateObj.events)) {
            currentGameStateObj.events = []; // Initialize if missing
        }
        currentGameStateObj.events.push(`Événement aléatoire: ${randomEvent}`);
        console.log("Random event triggered:", randomEvent);
    }
    // Update the gameState with the new event (if any) before sending to prompt
    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);
    // --- End Random Event ---


    // Ensure essential keys exist after potentially resetting
    if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName;
    if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
    if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
    if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
    if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];


  // Inject current date into the prompt context
  const promptInput = {
      ...input,
      playerChoicesHistory: safePlayerChoicesHistory,
      gameState: validatedInputGameStateString, // Send validated/potentially updated state
      current_date: new Date().toLocaleDateString('fr-FR'),
      lastStorySegmentText: input.lastStorySegmentText || (safePlayerChoicesHistory.length > 0 ? safePlayerChoicesHistory[safePlayerChoicesHistory.length - 1] : "C'est le début de l'aventure."),
  };

  const { output } = await prompt(promptInput);

  // --- Output Validation ---
   if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        console.error("Invalid format received from AI for story content:", output);
        // Attempt to recover gracefully
        return {
            storyContent: "Oups ! Le narrateur semble avoir perdu le fil de l'histoire à cause d'une interférence cosmique. Essayons autre chose.",
            nextChoices: input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier mon inventaire"], // Provide generic safe choices, empty if last turn
            updatedGameState: validatedInputGameStateString // Return the last known valid state
        };
    }

     // Additional validation for last turn: choices MUST be empty
    if (input.isLastTurn && output.nextChoices.length > 0) {
        console.warn("AI returned choices on the last turn. Overriding to empty array.");
        output.nextChoices = [];
    }
     // Validation for normal turn: choices SHOULD exist (unless AI has specific reason, e.g., forced wait)
     if (!input.isLastTurn && output.nextChoices.length === 0 && output.storyContent.length > 0 && !output.storyContent.toLowerCase().includes("attendre")) { // Allow empty if story implies waiting
         console.warn("AI returned empty choices on a normal turn without explicit wait. Providing fallback choices.");
         output.nextChoices = ["Regarder autour de moi", "Vérifier mon inventaire"];
         output.storyContent += "\n(Le narrateur semble chercher ses mots... Que fais-tu en attendant ?)";
     }


    // Validate updatedGameState JSON and ensure essential keys are present
    let updatedGameStateObj: any;
    try {
        updatedGameStateObj = JSON.parse(output.updatedGameState);
        if (typeof updatedGameStateObj !== 'object' || updatedGameStateObj === null) {
            throw new Error("Parsed updatedGameState is not an object.");
        }
         // Ensure essential keys are preserved or re-added
        if (!updatedGameStateObj.playerName) {
             console.warn("AI removed playerName from updatedGameState, re-adding.");
             updatedGameStateObj.playerName = input.playerName;
        }
         if (!Array.isArray(updatedGameStateObj.inventory)) {
             console.warn("AI removed or corrupted inventory in updatedGameState, resetting/fixing.");
             // Attempt to recover from input state or default
             const originalGameState = safeJsonParse(validatedInputGameStateString); // Parse validated string
             const originalInventory = originalGameState.inventory;
             updatedGameStateObj.inventory = Array.isArray(originalInventory) ? originalInventory : [];
         }
         // Ensure inventory items are strings (basic check)
         if (!updatedGameStateObj.inventory.every((item: any) => typeof item === 'string')) {
             console.warn("AI returned non-string items in inventory, filtering.");
             updatedGameStateObj.inventory = updatedGameStateObj.inventory.filter((item: any) => typeof item === 'string');
         }
         // Ensure relationships is an object
         if (typeof updatedGameStateObj.relationships !== 'object' || updatedGameStateObj.relationships === null) {
             console.warn("AI returned invalid/missing relationships in updatedGameState, resetting/fixing.");
             const originalGameState = safeJsonParse(validatedInputGameStateString);
             updatedGameStateObj.relationships = (typeof originalGameState.relationships === 'object' && originalGameState.relationships !== null) ? originalGameState.relationships : {};
         }
         // Ensure emotions is an array
         if (!Array.isArray(updatedGameStateObj.emotions)) {
             console.warn("AI returned invalid/missing emotions in updatedGameState, resetting/fixing.");
             const originalGameState = safeJsonParse(validatedInputGameStateString);
             updatedGameStateObj.emotions = Array.isArray(originalGameState.emotions) ? originalGameState.emotions : [];
         }
         // Ensure events is an array
         if (!Array.isArray(updatedGameStateObj.events)) {
             console.warn("AI returned invalid/missing events in updatedGameState, resetting/fixing.");
             const originalGameState = safeJsonParse(validatedInputGameStateString);
             updatedGameStateObj.events = Array.isArray(originalGameState.events) ? originalGameState.events : [];
         }


    } catch (e) {
        console.error("AI returned invalid JSON for updatedGameState:", output.updatedGameState, e);
        console.warn("Attempting to return previous valid game state due to AI error.");
        // Reset to the validated input state as a fallback
        updatedGameStateObj = safeJsonParse(validatedInputGameStateString); // Parse validated string
        // Add a message indicating the state might be stale
        output.storyContent += "\n(Attention: L'état du jeu pourrait ne pas être à jour suite à une petite erreur technique.)";
         // Provide safe fallback choices, considering if it was supposed to be the last turn
         output.nextChoices = input.isLastTurn ? [] : ["Regarder autour", "Vérifier inventaire"];
    }

    // Reserialize the validated/corrected game state object
    output.updatedGameState = safeJsonStringify(updatedGameStateObj);


    // Final check on choices array content (ensure strings)
    if (!output.nextChoices.every(choice => typeof choice === 'string')) {
        console.error("Invalid choices format received from AI:", output.nextChoices);
        output.nextChoices = input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier l'inventaire"]; // Fallback choices
         output.storyContent += "\n(Le narrateur a eu un petit bug en proposant les choix...)";
    }


  return output;
});

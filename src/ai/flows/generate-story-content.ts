// src/ai/flows/generate-story-content.ts
'use server';

/**
 * @fileOverview Generates story content based on the chosen theme, player choices, inventory, player name, and turn count.
 *
 * - generateStoryContent - A function that generates story content.
 * - GenerateStoryContentInput - The input type for the generateStoryContent function.
 * - GenerateStoryContentOutput - The return type for the generateStoryContent function.
 */

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
  gameState: z.string().optional().describe('A JSON string representing the current game state (e.g., {"inventory": ["key", "map"], "location": "Cave", "playerName": "Alex"}). Start with an empty object string if undefined.'),
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
  const initialGameState = safeJsonParse(input.gameState, { playerName: input.playerName, inventory: [] });

  // Ensure player name and inventory array exist in the initial game state object
  if (!initialGameState.playerName) {
      initialGameState.playerName = input.playerName;
  }
  if (!Array.isArray(initialGameState.inventory)) {
      initialGameState.inventory = [];
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
      gameState: z.string().describe('Current game state (JSON string). Example: {"location":"Forest","inventory":["Sword","Potion"],"status":"Healthy","playerName":"Hero"}'),
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
      *   Note : L'état du jeu contient généralement 'inventory' (tableau d'objets) et 'playerName'.
  *   Dernier segment de l'histoire : "{{{lastStorySegmentText}}}"
  *   Historique des choix du joueur (le **dernier élément** est le choix auquel tu dois réagir) :
      {{#if playerChoicesHistory}}
      {{#each playerChoicesHistory}}
      - {{{this}}}
      {{/each}}
      {{else}}
      C'est le tout début de l'aventure !
      {{/if}}

  **Règles strictes pour ta réponse (MJ) :**

  1.  **Réagis au DERNIER CHOIX/ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique du **dernier choix** de {{{playerName}}}. Adresse-toi toujours à {{{playerName}}} par son nom.
       *   **Gestion Inventaire** : Si le dernier choix implique un objet (utilisation, trouvaille), mets à jour 'updatedGameState.inventory' (ajout/retrait). Annonce clairement les trouvailles ("Tu as trouvé... Ajouté à l'inventaire !"). Si un objet est utilisé et consommé, retire-le.
  2.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} ? Que perçoit-il/elle ? Qu'est-ce qui a changé ?
  3.  **Ton rôle** : Reste UNIQUEMENT le narrateur. Pas de sortie de rôle, pas de discussion hors aventure, pas de mention d'IA.
  4.  **Public (8-12 ans)** : Langage simple, adapté, positif, aventureux. Pas de violence/peur excessive/thèmes adultes.
  5.  **Cohérence Thématique ({{{theme}}})** : CRUCIAL. Tout (narration, objets, lieux, choix) doit rester dans le thème **{{{theme}}}**.
  6.  **Gestion Actions Hors-Contexte/Impossibles** : Si le **dernier choix** est illogique, hors thème, dangereux, impossible, refuse GENTIMENT ou réinterprète. Explique pourquoi ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici.") et propose immédiatement de nouvelles actions VALIDES via 'nextChoices' (sauf si c'est le dernier tour).
  7.  **Gestion du Dernier Tour (quand isLastTurn est vrai)** :
       *   Si l'indicateur {{isLastTurn}} est vrai, c'est la fin ! Ne propose **AUCUN** nouveau choix (la clé 'nextChoices' dans la sortie JSON doit être un tableau vide []).
       *   Décris une **conclusion** à l'aventure basée sur le dernier choix et l'état final du jeu. La conclusion doit être satisfaisante et cohérente avec l'histoire et le thème. Elle peut être ouverte ou fermée. Exemple: "Et c'est ainsi, {{{playerName}}}, qu'après avoir {dernière action}, tu {conclusion}. Ton aventure sur {lieu/thème} se termine ici... pour l'instant !".
       *   Mets quand même à jour 'updatedGameState' une dernière fois si nécessaire.
  8.  **Propose de Nouveaux Choix (si PAS le dernier tour)** : Si l'indicateur {{isLastTurn}} est FAUX, offre 2 ou 3 options claires, simples, pertinentes pour la situation et le thème. PAS d'actions d'inventaire directes dans 'nextChoices'.
  9.  **Mets à Jour l'État du Jeu ('updatedGameState')** : Réfléchis aux conséquences du **dernier choix** (inventaire, lieu, etc.). Mets à jour **IMPÉRATIVEMENT** 'inventory' si besoin. 'updatedGameState' doit être une chaîne JSON valide avec 'playerName' et 'inventory'. Si rien n'a changé, renvoie le 'gameState' précédent (stringify), mais valide.
  10. **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant : 'storyContent' (string), 'nextChoices' (array de strings, vide si {{isLastTurn}} est vrai), 'updatedGameState' (string JSON valide). RIEN d'autre.

  **Exemple de sortie (Tour normal)**
  {
    "storyContent": "Léa, tu actives ton scanner... Il semble que tu pourrais forcer l'ouverture...",
    "nextChoices": ["Essayer de forcer la porte", "Chercher un autre passage"],
    "updatedGameState": "{\"location\":\"Corridor X-7\",\"inventory\":[\"Scanner\"],\"playerName\":\"Léa\"}"
  }

  **Exemple de sortie (DERNIER TOUR, isLastTurn = true)**
   {
    "storyContent": "Et c'est ainsi, Tom, qu'après avoir courageusement brandi l'Épée Courte face au gardien endormi, tu remarques un passage secret derrière lui ! Ton aventure dans la Salle du Trésor touche à sa fin, pleine de découvertes. Bravo !",
    "nextChoices": [],
    "updatedGameState": "{\"location\":\"Passage Secret\",\"inventory\":[\"Épée Courte\"],\"status\":\"Victorieux\",\"playerName\":\"Tom\"}"
   }

  **Important** : Date actuelle : {{current_date}} (peu pertinent). Concentre-toi sur la réaction au **dernier choix**, la gestion de l'inventaire, et la **conclusion si c'est le dernier tour** (quand {{isLastTurn}} est vrai).

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

    // Validate input gameState is valid JSON before sending to AI
    let currentGameStateObj: any;
    try {
        currentGameStateObj = JSON.parse(input.gameState);
        if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) {
            throw new Error("Parsed gameState is not an object.");
        }
         // Ensure essential keys exist
        if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName;
        if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];

    } catch (e) {
        console.error("Invalid input gameState JSON, resetting to default:", input.gameState, e);
        currentGameStateObj = { playerName: input.playerName, inventory: [] };
    }
    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);


  // Inject current date into the prompt context
  const promptInput = {
      ...input,
      playerChoicesHistory: safePlayerChoicesHistory,
      gameState: validatedInputGameStateString, // Send validated state
      current_date: new Date().toLocaleDateString('fr-FR'),
      // Use optional lastStorySegmentText from input
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
        // Or throw: throw new Error("Format invalide reçu de l'IA pour le contenu de l'histoire.");
    }

     // Additional validation for last turn: choices MUST be empty
    if (input.isLastTurn && output.nextChoices.length > 0) {
        console.warn("AI returned choices on the last turn. Overriding to empty array.");
        output.nextChoices = [];
    }
     // Validation for normal turn: choices SHOULD exist (unless AI has specific reason)
     if (!input.isLastTurn && output.nextChoices.length === 0 && output.storyContent.length > 0) {
         console.warn("AI returned empty choices on a normal turn. Providing fallback choices.");
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

    } catch (e) {
        console.error("AI returned invalid JSON for updatedGameState:", output.updatedGameState, e);
        console.warn("Attempting to return previous valid game state due to AI error.");
        // Reset to the validated input state as a fallback
        updatedGameStateObj = safeJsonParse(validatedInputGameStateString); // Parse validated string
        // Add a message indicating the state might be stale
        output.storyContent += "\n(Attention: L'état de l'inventaire pourrait ne pas être à jour suite à une petite erreur.)";
         // Provide safe fallback choices, considering if it was supposed to be the last turn
         output.nextChoices = input.isLastTurn ? [] : ["Regarder autour", "Vérifier inventaire"];
    }

    // Reserialize the validated/corrected game state object
    output.updatedGameState = safeJsonStringify(updatedGameStateObj);


    // Final check on choices array content (ensure strings)
    if (!output.nextChoices.every(choice => typeof choice === 'string')) {
        console.error("Invalid choices format received from AI:", output.nextChoices);
        output.nextChoices = input.isLastTurn ? [] : ["Regarder autour de moi"]; // Fallback choices
    }


  return output;
});

    
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

// Function to generate a random event
function generateRandomEvent(): string | null {
    // 10% chance of a random event
    if (Math.random() > 0.1) {
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
    return events[Math.floor(Math.random() * events.length)];
}

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
  const initialGameState = safeJsonParse(input.gameState, { playerName: input.playerName, inventory: [] });

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

    if (!initialGameState.relationships) {
        initialGameState.relationships = {};
    }
    if (!initialGameState.emotions) {
        initialGameState.emotions = [];
    }
    if (!initialGameState.events) {
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
      gameState: z.string().describe('Current game state (JSON string). Example: {"location":"Forest","inventory":["Sword","Potion"],"status":"Healthy","playerName":"Hero", "relationships":{"NPC1":"friend"}, "emotions":["happy"]}'),
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

  <CODE_BLOCK>**Contexte de l'Aventure :**</CODE_BLOCK>
  *   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
  *   Nom du joueur : {{{playerName}}}
  *   Tour Actuel : {{{currentTurn}}} / {{{maxTurns}}}
  *   État actuel du jeu (JSON string) : {{{gameState}}}
      *   Note : L'état du jeu contient généralement 'inventory' (tableau d'objets) et 'playerName'.
  *   Dernier segment de l'histoire : "{{{lastStorySegmentText}}}"
  *   Historique des actions du joueur (le **dernier élément** est l'action à laquelle tu dois réagir) :
      {{#if playerChoicesHistory}}
      {{#each playerChoicesHistory}}
      - {{{this}}}
      {{/each}}
      {{else}}
      C'est le tout début de l'aventure !
      {{/if}}
      *   **gestion des relations**: L'état du jeu contient un objet "relationships". Les clés sont les noms des PNJ, les valeurs sont les niveaux de relation avec le joueur (ex: "ami", "neutre", "ennemi"). Utilise ces informations pour adapter les réactions des PNJ.
      {{/if}}
      *   **gestion des émotions**: L'état du jeu contient un tableau "emotions". Ce tableau contient les émotions du joueur et des PNJ. Tu dois adapter tes descriptions et tes interactions en fonction de ces émotions.
      {{/if}}
      *   **gestion des évènements**: L'état du jeu contient un tableau "events". Ce tableau contient une liste des évènements importants qui se sont produits dans l'histoire. Tu dois en tenir compte pour maintenir la cohérence de l'histoire.
      {{/if}}

      * **gestion des évènements aléatoires**: De temps en temps, un évènement aléatoire se produit (ajouté au tableau "events"). Il peut être positif, négatif ou neutre. Tu dois l'intégrer à l'histoire de manière logique et cohérente. Tu dois également le mentionner au début de ta réponse.

    
      Si un évènement aléatoire s'est produit, ta réponse doit commencer par : "Un évènement inattendu se produit : \[description de l'évènement].". Sinon, ne pas mentionner d'évènement. Ensuite tu décris le résultat direct et logique de la dernière action du joueur, en tenant compte de l'évènement aléatoire si il y en a un.


<CODE_BLOCK>  **Règles strictes pour ta réponse (MJ) :**</CODE_BLOCK>


  1.  **Réagis à la DERNIÈRE ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique de la **dernière action** de {{{playerName}}}. Adresse-toi toujours à {{{playerName}}} par son nom.
       *   **Gestion Inventaire** : Si le dernier choix implique un objet (utilisation, trouvaille), mets à jour 'updatedGameState.inventory' (ajout/retrait). Annonce clairement les trouvailles ("Tu as trouvé... Ajouté à l'inventaire !"). Si un objet est utilisé et consommé, retire-le.
  2.  **Cohérence des Personnages**: Tu dois conserver la personnalité et les caractéristiques des personnages que tu as créés. Ils ne doivent pas changer de manière incohérente.
  3.  **Cohérence des Lieux**: Tu dois te souvenir des lieux et de leurs caractéristiques. Les lieux ne doivent pas changer d'un tour à l'autre de manière incohérente.
  4.  **Chronologie**: Tu dois respecter la chronologie des événements. Les événements du passé doivent être pris en compte et ne pas être contredits par la suite.
  5.  **Lien de causalité**: Tu dois t'assurer que les actions du joueur ont des conséquences logiques et durables dans l'histoire. Les actions doivent avoir un impact sur l'histoire.
  6.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} ? Que perçoit-il/elle ? Qu'est-ce qui a changé ?
  7.  **Ton rôle** : Reste UNIQUEMENT le narrateur. Pas de sortie de rôle, pas de discussion hors aventure, pas de mention d'IA.
  8.  **Public (8-12 ans)** : Langage simple, adapté, positif, aventureux. Pas de violence/peur excessive/thèmes adultes.
  9.  **Cohérence Thématique ({{{theme}}})** : CRUCIAL. Tout (narration, objets, lieux, choix) doit rester dans le thème **{{{theme}}}**.
  10.  **Gestion du Dernier Tour (quand isLastTurn est vrai)** :
       *   Si l'indicateur {{isLastTurn}} est vrai, c'est la fin !
       *   Décris une **conclusion** à l'aventure basée sur le dernier choix et l'état final du jeu. La conclusion doit être satisfaisante et cohérente avec l'histoire et le thème. Elle peut être ouverte ou fermée. Exemple: "Et c'est ainsi, {{{playerName}}}, qu'après avoir {dernière action}, tu {conclusion}. Ton aventure sur {lieu/thème} se termine ici... pour l'instant !".
       *   Mets quand même à jour 'updatedGameState' une dernière fois si nécessaire.
  11. **Gestion des relations et émotions**: Utilise les informations contenues dans 'relationships' et 'emotions' pour adapter les interactions des PNJ et l'ambiance de l'histoire. Exemple: Si la relation avec un PNJ est "ennemi", il sera hostile. Si le joueur est "triste", l'ambiance sera plus sombre.
  12. **Mort d'un PNJ**: Si un PNJ important meurt, tu dois en tenir compte dans la suite de l'histoire. Les autres PNJ peuvent être tristes, en colère, ou vouloir se venger. L'ambiance doit s'adapter en conséquence. L'histoire doit avancer et s'adapter à cet évènement.
  13. **Mets à Jour l'État du Jeu ('updatedGameState')** : Réfléchis aux conséquences de la dernière action (inventaire, lieu, relations, émotions, etc.). Mets à jour **IMPÉRATIVEMENT** 'inventory' si besoin, mais mets aussi à jour 'relationships' et 'emotions' si besoin. 'updatedGameState' doit être une chaîne JSON valide avec 'playerName', 'inventory', 'relationships' et 'emotions'. Si rien n'a changé, renvoie le 'gameState' précédent (stringify), mais valide.
  14. **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant : 'storyContent' (string), 'nextChoices' (array de strings, vide si {{isLastTurn}} est vrai), 'updatedGameState' (string JSON valide). RIEN d'autre.


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
    // --- Random event Generation --
    const currentGameStateObj = safeJsonParse(input.gameState);
    const randomEvent = generateRandomEvent();
    if (randomEvent && Array.isArray(currentGameStateObj.events)) {
        currentGameStateObj.events.push(randomEvent);
    }
    // Update the gameState with the new event (if any)
    const updatedGameStateString = safeJsonStringify(currentGameStateObj);
    // ---
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
    try {
        if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) {
            throw new Error("Parsed gameState is not an object.");
        }
         // Ensure essential keys exist
         if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
        if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName;
        if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];

    } catch (e) {
        if (!currentGameStateObj.relationships) {
            currentGameStateObj.relationships = {};
        }
        if (!currentGameStateObj.emotions) {
            currentGameStateObj.emotions = [];
        }        
        if (!Array.isArray(currentGameStateObj.events)) {
            currentGameStateObj.events = [];
        }

        console.error("Invalid input gameState JSON, resetting to default:", input.gameState, e);
        currentGameStateObj = { playerName: input.playerName, inventory: [] };
    }
    
    const validatedInputGameStateString = updatedGameStateString;
   


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
         if (!updatedGameStateObj.relationships) {
             console.warn("AI removed or corrupted relationships in updatedGameState, resetting/fixing.");
             updatedGameStateObj.relationships = {};
         }
         if (typeof updatedGameStateObj.relationships !== 'object') {
             console.warn("AI returned invalid object for relationships in updatedGameState, resetting/fixing.");
             updatedGameStateObj.relationships = {};
         }
         if (!Array.isArray(updatedGameStateObj.emotions)) {
             console.warn("AI removed or corrupted emotions in updatedGameState, resetting/fixing.");
             updatedGameStateObj.emotions = [];
         }
         if (!Array.isArray(updatedGameStateObj.events)) {
             console.warn("AI removed or corrupted events in updatedGameState, resetting/fixing.");
             updatedGameStateObj.events = [];
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

    
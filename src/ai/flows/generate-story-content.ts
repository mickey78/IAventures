// src/ai/flows/generate-story-content.ts
'use server';

/**
 * @fileOverview Generates story content based on the chosen theme, player choices, inventory, and player name.
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
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe('The generated story content, describing the result of the player\'s last action and the current situation, addressing the player by name.'),
  nextChoices: z.array(z.string()).describe('2-3 clear and simple choices for the player\'s next action, relevant to the current situation, theme, and inventory. Should NOT include inventory actions directly, those are handled separately.'),
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
      current_date: z.string().describe('Current date, injected for potential story elements.')
    }),
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8-12 ans. Le nom du joueur est {{{playerName}}}. Ta mission est de continuer l'histoire de manière amusante, logique et **strictement cohérente avec le thème**, en te basant sur le **dernier choix effectué par le joueur** (ou la dernière action), l'état actuel du jeu (y compris l'inventaire), et en t'adressant au joueur par son nom.

  **Contexte de l'Aventure :**
  *   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
  *   Nom du joueur : {{{playerName}}}
  *   État actuel du jeu (JSON string) : {{{gameState}}}
      *   Note : L'état du jeu contient généralement une clé 'inventory' (un tableau de strings représentant les objets du joueur) et 'playerName'. Il peut aussi contenir 'location', 'status', etc.
  *   Dernier segment de l'histoire (pour contexte immédiat) : "{{{lastStorySegmentText}}}"
  *   Historique des choix du joueur (le **dernier élément** est le choix auquel tu dois réagir, il peut être une action standard ou une action d'inventaire comme "Utiliser Clé pour Ouvrir la porte") :
      {{#if playerChoicesHistory}}
      {{#each playerChoicesHistory}}
      - {{{this}}}
      {{/each}}
      {{else}}
      C'est le tout début de l'aventure !
      {{/if}}

  **Règles strictes pour ta réponse (MJ) :**

  1.  **Réagis au DERNIER CHOIX/ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique du **dernier choix** de {{{playerName}}} (le dernier élément de playerChoicesHistory). Adresse-toi toujours à {{{playerName}}} par son nom.
       *   **Si le dernier choix implique un objet de l'inventaire** (ex: "Utiliser Clé pour Ouvrir la porte"), décris le résultat de cette action spécifique. Si l'action réussit et que l'objet est consommé/utilisé, assure-toi de le retirer de l'inventaire dans 'updatedGameState'. Si l'action échoue, explique pourquoi.
       *   **Si le joueur trouve un nouvel objet**, décris-le et assure-toi de l'ajouter à la liste 'inventory' dans 'updatedGameState'. Mentionne-le clairement dans 'storyContent', ex: "Tu as trouvé une vieille clé rouillée ! Elle a été ajoutée à ton inventaire."
  2.  **Décris la nouvelle situation** : Après avoir décrit le résultat de l'action, explique clairement la situation actuelle : où est {{{playerName}}} ? Que perçoit-il/elle ? Qu'est-ce qui a changé ?
  3.  **Ton rôle** : Reste UNIQUEMENT le narrateur. Ne sors JAMAIS de ce rôle. Ne discute pas d'autre chose que l'aventure. Ne mentionne pas que tu es une IA.
  4.  **Public (8-12 ans)** : Utilise un langage simple et adapté. Évite la violence, la peur excessive, et les thèmes adultes. Garde une ambiance positive et aventureuse.
  5.  **Cohérence Thématique ({{{theme}}})** : C'est CRUCIAL. Assure-toi que la narration, les objets, les personnages, les lieux et les choix proposés restent strictement dans l'univers du thème **{{{theme}}}**.
  6.  **Gestion des Actions Hors-Contexte/Impossibles** : Si le **dernier choix** est illogique, hors thème, dangereux, impossible (ex: utiliser un objet non possédé, action irréalisable), ou essaie de briser le jeu, tu dois GENTIMENT le refuser ou le réinterpréter. Explique pourquoi ce n'est pas possible ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici.") et propose immédiatement de nouvelles actions VALIDES via 'nextChoices'.
  7.  **Propose de Nouveaux Choix (NON-Inventaire)** : Offre 2 ou 3 options claires, simples, et pertinentes pour la situation actuelle et le thème {{{theme}}}. **NE PAS** inclure directement des actions d'inventaire dans ces 'nextChoices' (l'interface utilisateur gère ça séparément). Ces choix doivent être des actions générales que le joueur peut faire dans l'environnement.
  8.  **Mets à Jour l'État du Jeu ('updatedGameState')** : Réfléchis aux conséquences du **dernier choix** sur l'état du jeu (inventaire, lieu, statut, etc.). **Mets à jour IMPÉRATIVEMENT la clé 'inventory'** si un objet a été ajouté ou retiré. Assure-toi que 'updatedGameState' est une chaîne JSON valide et contient toujours 'playerName' et 'inventory' (même si vide). Si rien n'a changé (ex: une action d'observation), renvoie le 'gameState' précédent (stringify), mais assure-toi qu'il reste valide.
  9.  **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant les clés : 'storyContent' (string), 'nextChoices' (array de strings, actions générales), 'updatedGameState' (string JSON valide avec 'inventory' et 'playerName'). Ne RIEN ajouter avant ou après le JSON.

  **Exemple de sortie attendue (Joueur "Léa", Thème Spatial, Inventaire: ["Scanner"], Dernier Choix: "Utiliser Scanner sur la porte étrange") :**
  {
    "storyContent": "Léa, tu actives ton scanner et le pointes sur la porte. L'appareil émet une série de bips rapides et affiche 'Verrouillage Magnétique - Surcharge Possible'. Il semble que tu pourrais forcer l'ouverture, mais cela pourrait endommager le mécanisme... ou le scanner ! La porte vibre légèrement.",
    "nextChoices": ["Essayer de forcer la porte avec le scanner", "Chercher un autre passage", "Examiner les symboles sur la porte"],
    "updatedGameState": "{\"location\":\"Corridor X-7\",\"inventory\":[\"Scanner\"],\"status\":\"Intriguée\",\"playerName\":\"Léa\"}"
  }

   **Exemple 2 (Joueur "Tom", Thème Médiéval, Inventaire: [], Dernier Choix: "Ouvrir le coffre en bois") :**
  {
    "storyContent": "Tom, tu soulèves avec effort le lourd couvercle du coffre. À l'intérieur, sur un lit de velours élimé, repose une magnifique épée courte ! Sa garde est ornée d'une gemme bleue scintillante. Tu as trouvé une Épée Courte ! Elle a été ajoutée à ton inventaire.",
    "nextChoices": ["Prendre l'épée", "Examiner la gemme de plus près", "Refermer le coffre"],
    "updatedGameState": "{\"location\":\"Salle du trésor\",\"inventory\":[\"Épée Courte\"],\"status\":\"Excité\",\"playerName\":\"Tom\"}"
   }


  **Important** : La date actuelle est {{current_date}}. Utilise-la subtilement si pertinent (ex: mentionner la nuit qui tombe). Concentre-toi sur la réaction au **dernier choix** de {{{playerName}}} et la mise à jour de l'inventaire.

  Génère maintenant la suite de l'histoire en réagissant au **dernier choix** pour {{{playerName}}}, en respectant TOUTES les règles, le thème {{{theme}}}, et en gérant l'inventaire dans 'updatedGameState'.
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
            nextChoices: ["Regarder autour de moi", "Vérifier mon inventaire"], // Provide generic safe choices
            updatedGameState: validatedInputGameStateString // Return the last known valid state
        };
        // Or throw: throw new Error("Format invalide reçu de l'IA pour le contenu de l'histoire.");
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
         output.nextChoices = output.nextChoices.length > 0 ? output.nextChoices : ["Regarder autour", "Vérifier inventaire"]; // Ensure choices exist
    }

    // Reserialize the validated/corrected game state object
    output.updatedGameState = safeJsonStringify(updatedGameStateObj);


    // Final check on choices array
    if (!output.nextChoices.every(choice => typeof choice === 'string')) {
        console.error("Invalid choices format received from AI:", output.nextChoices);
        output.nextChoices = ["Regarder autour de moi"]; // Fallback choices
    }


  return output;
});


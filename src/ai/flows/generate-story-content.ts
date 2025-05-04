'use server';
// src/ai/flows/generate-story-content.ts

/**
 * @fileOverview Generates story content based on the chosen theme, player choices, inventory, player name, location, and turn count. It can also suggest an image prompt for significant visual moments, aiming for consistency.
 *
 * - generateStoryContent - A function that generates story content.
 * - GenerateStoryContentInput - The input type for the generateStoryContent function.
 * - GenerateStoryContentOutput - The return type for the generateStoryContent function.
 */
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { StorySegment, ParsedGameState } from '@/types/game'; // Import shared types
import { parseGameState, safeJsonStringify } from '@/lib/gameStateUtils'; // Import helper

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
      speaker: z.enum(['player', 'narrator']),
      storyImageUrl: z.string().url().optional().nullable(), // Include optional image URL from previous segment
      imageGenerationPrompt: z.string().optional().nullable(), // Include previous image prompt for consistency
  }).optional().describe('The very last segment of the story (player choice or narrator text) for immediate context and potential image consistency.'),
  playerChoicesHistory: z.array(z.string()).optional().describe('The history of player choices made so far, ordered chronologically. The VERY LAST element is the most recent choice the AI must react to.'),
  gameState: z.string().optional().describe('A JSON string representing the current game state (e.g., {"playerName": "Alex", "location": "Cave Entrance", "inventory": ["key", "map"], "relationships":{"NPC1":"friend"}, "emotions":["curious"], "events":[]}). Start with an empty object string if undefined.'), // Added location to example
  currentTurn: z.number().int().positive().describe('The current turn number (starts at 1).'),
  maxTurns: z.number().int().positive().describe('The maximum number of turns for this adventure.'),
  isLastTurn: z.boolean().describe('Indicates if this is the final turn of the adventure.'),
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe('The generated story content, describing the result of the player\'s last action and the current situation, addressing the player by name. If it\'s the last turn, this should be the concluding segment.'),
  nextChoices: z.array(z.string()).describe('2-3 clear and simple choices for the player\'s next action, relevant to the current situation, theme, and inventory. Should be an empty array if it\'s the last turn.'),
  updatedGameState: z.string().describe('The updated game state as a JSON string, reflecting changes based on the last action and story progression (including inventory and potentially location). Must be valid JSON.'), // Mentioned location update
  generatedImagePrompt: z.string().optional().describe('A concise, descriptive prompt for image generation ONLY if a visually distinct scene occurs. MUST aim for consistency with previous images (if `lastStorySegment.imageGenerationPrompt` exists). Include theme, current location, player name, and specify "Style: Cartoon". Leave empty otherwise.'), // Added consistency requirement and player name
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  let initialGameState: ParsedGameState; // Use ParsedGameState type
  try {
    initialGameState = parseGameState(input.gameState, input.playerName); // Use the utility function
  } catch (e) {
    console.warn("Invalid input gameState JSON, using default:", input.gameState, e);
    // Ensure a proper default ParsedGameState structure
    initialGameState = {
        playerName: input.playerName,
        location: 'Lieu Inconnu',
        inventory: [],
        relationships: {},
        emotions: [],
        events: []
    };
  }

  // Ensure essential keys exist after parsing/defaulting
  if (!initialGameState.playerName) initialGameState.playerName = input.playerName;
  if (typeof initialGameState.location !== 'string' || !initialGameState.location.trim()) initialGameState.location = 'Lieu Indéterminé';
  if (!Array.isArray(initialGameState.inventory)) initialGameState.inventory = [];
  if (typeof initialGameState.relationships !== 'object' || initialGameState.relationships === null) initialGameState.relationships = {};
  if (!Array.isArray(initialGameState.emotions)) initialGameState.emotions = [];
  if (!Array.isArray(initialGameState.events)) initialGameState.events = [];


  const safeInput = {
    ...input,
    gameState: safeJsonStringify(initialGameState), // Use the validated/defaulted object string
    playerChoicesHistory: input.playerChoicesHistory || [],
    lastStorySegmentText: input.lastStorySegment?.text || "C'est le début de l'aventure.", // Provide default text if segment is missing
    previousImagePrompt: input.lastStorySegment?.imageGenerationPrompt || null, // Pass previous prompt
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
      previousImagePrompt: z.string().nullable().optional().describe('The prompt used for the previously generated image, if any, for consistency.'), // Added previous prompt input
      playerChoicesHistory: z.array(z.string()).describe('History of player choices. The VERY LAST element is the most recent choice to react to.'),
      gameState: z.string().describe('Current game state (JSON string). Example: {"playerName":"Hero", "location":"Forest Clearing", "inventory":["Sword","Potion"], "relationships":{"NPC1":"friend"}, "emotions":["happy"], "events":["found sword"]}'), // Updated example
      current_date: z.string().describe('Current date, injected for potential story elements.'),
      currentTurn: z.number().describe('The current turn number.'),
      maxTurns: z.number().describe('The maximum number of turns.'),
      isLastTurn: z.boolean().describe('Whether this is the last turn.'),
    }),
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8-12 ans. Le nom du joueur est {{{playerName}}}. L'aventure dure au maximum {{{maxTurns}}} tours. Nous sommes actuellement au tour {{{currentTurn}}}. Ta mission est de continuer l'histoire de manière amusante, logique et **strictement cohérente avec le thème**, en te basant sur la **dernière action effectuée par le joueur**, l'état actuel du jeu (y compris le **lieu**), en générant éventuellement un prompt d'image **consistant**, et en t'adressant au joueur par son nom.

**Contexte de l'Aventure :**
*   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
*   Nom du joueur : {{{playerName}}}
*   Tour Actuel : {{{currentTurn}}} / {{{maxTurns}}}
*   État actuel du jeu (JSON string - parse-le pour l'utiliser) : {{{gameState}}}
    *   Contient: 'playerName', 'location', 'inventory', 'relationships', 'emotions', 'events'.
*   Dernier segment de l'histoire : "{{{lastStorySegmentText}}}"
*   Prompt de l'image précédente (si applicable) : {{{previousImagePrompt}}}
*   Historique des actions du joueur (le **dernier élément** est l'action à laquelle tu dois réagir) :
    {{#if playerChoicesHistory}}
    {{#each playerChoicesHistory}}
    - {{{this}}}
    {{/each}}
    {{else}}
    C'est le tout début de l'aventure !
    {{/if}}

**Règles strictes pour ta réponse (MJ) :**

1.  **Réagis à la DERNIÈRE ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique de la **dernière action** de {{{playerName}}}. Adresse-toi toujours à {{{playerName}}} par son nom.
    *   **Gestion Inventaire** : Gère l'ajout/retrait d'objets de 'inventory' dans 'updatedGameState' comme décrit précédemment (ajout si trouvé, retrait si utilisé/lancé/jeté). Annonce les trouvailles dans 'storyContent'.
2.  **Cohérence des Personnages**: Maintiens la personnalité des PNJ. Utilise 'relationships' du gameState.
3.  **Cohérence des Lieux**: Souviens-toi des lieux. Si une action **change le lieu**, **mets à jour la clé 'location'** dans 'updatedGameState'. Décris le nouveau lieu dans 'storyContent'.
4.  **Chronologie & Causalité**: Respecte l'ordre des événements ('events' du gameState).
5.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} (confirme le lieu en utilisant 'location' du gameState parsé) ? Que perçoit-il/elle ? Qu'est-ce qui a changé ? Que se passe-t-il maintenant ?
6.  **Gestion Actions Hors-Contexte/Impossibles** : Refuse GENTIMENT ou réinterprète les actions illogiques/hors thème/impossibles. Explique pourquoi ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici dans {{{gameState.location}}}'.") et propose immédiatement de nouvelles actions VALIDES via 'nextChoices' (sauf si c'est le dernier tour).
7.  **GÉNÉRATION D'IMAGE PROMPT (Consistance & Pertinence)** :
    *   **Quand générer ?** Uniquement si la scène actuelle est **visuellement distincte** de la précédente OU si un **événement visuel clé** se produit (nouveau lieu important, PNJ significatif apparaît, action avec impact visuel fort, découverte majeure). Ne génère PAS pour des actions simples (marcher, parler sans événement notable, utiliser un objet commun).
    *   **Comment générer ?** Crée un prompt CONCIS et DESCRIPTIF.
        *   **CONTENU**: Mentionne le **thème ({{{theme}}})**, le **lieu actuel ({{{gameState.location}}})**, le **nom du joueur ({{{playerName}}})**, **l'action principale** venant de se produire, et tout **élément visuel clé** (PNJ, objet important, phénomène). Inclus l'**ambiance/émotion** si pertinente ({{{gameState.emotions}}}).
        *   **CONSISTANCE**: Si un {{{previousImagePrompt}}} existe, essaie de **maintenir le style visuel et l'apparence de {{{playerName}}}** décrits précédemment. Réutilise des mots-clés du prompt précédent si pertinent pour la consistance. Mentionne explicitement "Style: Cartoon."
        *   **FORMAT**: Remplis la clé 'generatedImagePrompt' avec ce prompt. **Laisse vide si non pertinent.**
    *   **Exemples (avec consistance implicite)**:
        *   (Tour N) Prompt: "L'astronaute {{{playerName}}} flottant devant une nébuleuse violette (lieu: Ceinture d'Astéroïdes Delta). Thème: Exploration Spatiale. Style: Cartoon. Air émerveillé."
        *   (Tour N+1, si action = examiner vaisseau) Prompt: "" (Pas d'image)
        *   (Tour N+2, si action = entrer dans épave) Prompt: "L'astronaute {{{playerName}}}, air prudent, entrant dans une épave de vaisseau sombre et silencieuse (lieu: Épave Inconnue). Thème: Exploration Spatiale. Style: Cartoon." (Conserve astronaute, thème, style).
        *   (Tour M) Prompt: "Le chevalier {{{playerName}}} découvrant une épée lumineuse dans une grotte (lieu: Grotte aux Échos). Thème: Fantasy Médiévale. Style: Cartoon. Ambiance mystérieuse."
        *   (Tour M+1, si action = prendre épée) Prompt: "Le chevalier {{{playerName}}} brandissant fièrement l'épée lumineuse, qui éclaire la Grotte aux Échos (lieu: Grotte aux Échos). Thème: Fantasy Médiévale. Style: Cartoon." (Conserve chevalier, épée, lieu, thème, style).
8.  **Gestion du Dernier Tour (quand isLastTurn est vrai)** :
    *   Ne propose **AUCUN** choix ('nextChoices' doit être []).
    *   Décris une **conclusion** basée sur le dernier choix et l'état final (incluant le lieu final depuis 'updatedGameState').
    *   Mets à jour 'updatedGameState' une dernière fois.
    *   **Ne génère PAS de prompt d'image pour la conclusion.**
9.  **Propose de Nouveaux Choix (si PAS le dernier tour)** : Offre 2-3 options claires, simples, pertinentes pour la situation, le lieu actuel ({{{gameState.location}}}), et le thème. PAS d'actions d'inventaire directes.
10. **Mets à Jour l'État du Jeu ('updatedGameState')** : Mets à jour **IMPÉRATIVEMENT** 'inventory' et **'location'** si besoin. Mets aussi à jour 'relationships', 'emotions', 'events' si pertinent. 'updatedGameState' doit être JSON valide contenant au minimum 'playerName', 'location', 'inventory', et idéalement les autres clés. Si rien n'a changé, renvoie le 'gameState' précédent (stringify), mais valide.
11. **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide : 'storyContent' (string), 'nextChoices' (array de strings, vide si {{isLastTurn}} est vrai), 'updatedGameState' (string JSON valide), 'generatedImagePrompt' (string, optionnel, vide si non pertinent).
12. **Ton rôle** : Reste UNIQUEMENT le narrateur.
13. **Public (8-12 ans)** : Langage simple, adapté, positif. Pas de violence/peur excessive.
14. **Gestion des relations et émotions**: Utilise 'relationships' et 'emotions' du gameState pour l'ambiance.
15. **Mort d'un PNJ**: Adapte l'histoire et l'ambiance si un PNJ meurt.

**Important** : Concentre-toi sur la réaction à la **dernière action**, la gestion précise de l'inventaire ET du **lieu** dans 'updatedGameState', la décision de fournir ou non un 'generatedImagePrompt' (en visant la **consistance** et incluant theme/lieu/nom/style si fourni), et la **conclusion si c'est le dernier tour** ({{isLastTurn}}).

Génère maintenant la suite (ou la fin) de l'histoire pour {{{playerName}}}.
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
   if (input.currentTurn === undefined || !input.maxTurns) throw new Error("Turn information is required."); // Check currentTurn specifically


   const safePlayerChoicesHistory = input.playerChoicesHistory || [];
   if (safePlayerChoicesHistory.length === 0 && !input.lastStorySegmentText?.includes("début") && input.currentTurn > 1) { // Added turn check
       console.warn("generateStoryContent called with empty choice history mid-game. This might indicate an issue.");
   }

    let currentGameStateObj: ParsedGameState; // Use ParsedGameState type
    try {
        currentGameStateObj = parseGameState(input.gameState, input.playerName); // Use utility
    } catch (e) {
        console.error("Invalid input gameState JSON, resetting to default:", input.gameState, e);
        // Provide a more complete default state if parsing fails
        currentGameStateObj = {
            playerName: input.playerName,
            location: 'Lieu Inconnu', // Default location
            inventory: [],
            relationships: {},
            emotions: [],
            events: []
        };
    }

    // Simple random event logic (can be expanded) - Example: 10% chance per turn
    // Moved inside flow for server-side execution context
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
        // Add location context to the event
        currentGameStateObj.events.push(`Événement aléatoire (${currentGameStateObj.location || 'lieu inconnu'}): ${randomEvent}`);
        console.log("Random event triggered:", randomEvent, "at location:", currentGameStateObj.location);
    }


    // Ensure essential keys exist after potentially resetting
    if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName;
     if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Lieu Indéterminé'; // Ensure location exists
    if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
    if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
    if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
    if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];

    // Update the gameState with the new event (if any) before sending to prompt
    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);


  // Inject current date and previous prompt into the prompt context
  const promptInput = {
      ...input,
      playerChoicesHistory: safePlayerChoicesHistory,
      gameState: validatedInputGameStateString, // Send validated/potentially updated state
      current_date: new Date().toLocaleDateString('fr-FR'),
      lastStorySegmentText: input.lastStorySegmentText || (safePlayerChoicesHistory.length > 0 ? safePlayerChoicesHistory[safePlayerChoicesHistory.length - 1] : "C'est le début de l'aventure."),
      previousImagePrompt: input.previousImagePrompt, // Pass previous prompt for consistency check by AI
  };

  const { output } = await prompt(promptInput);

  // --- Output Validation ---
   if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        console.error("Invalid format received from AI for story content:", output);
        // Attempt to recover gracefully
        return {
            storyContent: "Oups ! Le narrateur semble avoir perdu le fil de l'histoire à cause d'une interférence cosmique. Essayons autre chose.",
            nextChoices: input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier mon inventaire"], // Provide generic safe choices, empty if last turn
            updatedGameState: validatedInputGameStateString, // Return the last known valid state
            generatedImagePrompt: undefined, // No image prompt on error
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
     // Ensure generatedImagePrompt is a string or undefined, and if string, not empty
     if (output.generatedImagePrompt !== undefined && typeof output.generatedImagePrompt !== 'string') {
          console.warn("AI returned invalid generatedImagePrompt format. Setting to undefined.");
          output.generatedImagePrompt = undefined;
     } else if (typeof output.generatedImagePrompt === 'string' && !output.generatedImagePrompt.trim()) {
          console.warn("AI returned an empty generatedImagePrompt string. Setting to undefined.");
          output.generatedImagePrompt = undefined; // Treat empty string as undefined
     }


    // Validate updatedGameState JSON and ensure essential keys are present
    let updatedGameStateObj: ParsedGameState; // Use ParsedGameState type
    try {
        // Use the parseGameState utility for robust parsing and validation
        updatedGameStateObj = parseGameState(output.updatedGameState, input.playerName);

        // Additional check: Ensure player name syncs if it changed (unlikely but possible)
        if (updatedGameStateObj.playerName !== input.playerName) {
            console.warn("AI changed playerName in updatedGameState. Reverting to original.");
            updatedGameStateObj.playerName = input.playerName;
        }

    } catch (e) { // Catch potential errors from parseGameState although it should handle them internally
        console.error("Error processing AI's updatedGameState:", output.updatedGameState, e);
        console.warn("Attempting to return previous valid game state due to AI error.");
        // Reset to the validated input state as a fallback
        updatedGameStateObj = parseGameState(validatedInputGameStateString, input.playerName); // Parse validated input string again
        // Add a message indicating the state might be stale
        output.storyContent += "\n(Attention: L'état du jeu pourrait ne pas être à jour suite à une petite erreur technique.)";
         // Provide safe fallback choices, considering if it was supposed to be the last turn
         output.nextChoices = input.isLastTurn ? [] : ["Regarder autour", "Vérifier inventaire"];
         output.generatedImagePrompt = undefined; // No image on error
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

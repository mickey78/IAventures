'use server';
// src/ai/flows/generate-story-content.ts

/**
 * @fileOverview Generates story content based on the chosen theme, player choices, inventory, player name, location, and turn count. It can also suggest an image prompt for significant visual moments.
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


const GameStateSchema = z.object({
  playerName: z.string(),
  location: z.string().optional().describe('The current location of the player.'), // Added location
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
      speaker: z.enum(['player', 'narrator']),
      storyImageUrl: z.string().url().optional().nullable(), // Include optional image URL from previous segment
  }).optional().describe('The very last segment of the story (player choice or narrator text) for immediate context.'),
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
  generatedImagePrompt: z.string().optional().describe('A concise, descriptive prompt for image generation ONLY if a significant visual event occurred in this turn. MUST include the theme, current location, and specify "Style: Cartoon". Example: "Un pirate découvre un coffre au trésor brillant dans une grotte sombre (lieu: Grotte du Crâne). Thème: Pirates des Caraïbes. Style: Cartoon.". Leave empty otherwise.'), // Added image prompt output with style requirement
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  let initialGameState: any; // Start with 'any' for flexibility
  try {
    initialGameState = safeJsonParse(input.gameState);
    if (typeof initialGameState !== 'object' || initialGameState === null) {
      throw new Error("Parsed input gameState is not an object.");
    }
  } catch (e) {
    console.warn("Invalid input gameState JSON, using default:", input.gameState, e);
    initialGameState = { playerName: input.playerName, location: 'Lieu Inconnu', inventory: [], relationships: {}, emotions: [], events: [] };
  }

  // Ensure essential keys exist in the game state object
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
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8-12 ans. Le nom du joueur est {{{playerName}}}. L'aventure dure au maximum {{{maxTurns}}} tours. Nous sommes actuellement au tour {{{currentTurn}}}. Ta mission est de continuer l'histoire de manière amusante, logique et **strictement cohérente avec le thème**, en te basant sur le **dernier choix effectué par le joueur**, l'état actuel du jeu (y compris le **lieu**), en générant éventuellement un prompt d'image, et en t'adressant au joueur par son nom.

**Contexte de l'Aventure :**
*   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
*   Nom du joueur : {{{playerName}}}
*   Tour Actuel : {{{currentTurn}}} / {{{maxTurns}}}
*   État actuel du jeu (JSON string) : {{{gameState}}}
    *   Note : L'état du jeu contient 'playerName', 'location' (le lieu actuel), 'inventory' (tableau d'objets), et peut aussi contenir 'relationships' (objet PNJ:statut), 'emotions' (tableau d'émotions), et 'events' (tableau d'événements). Parse ce JSON pour comprendre l'état actuel.
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

1.  **Réagis à la DERNIÈRE ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique de la **dernière action** de {{{playerName}}} (le dernier élément de playerChoicesHistory). Adresse-toi toujours à {{{playerName}}} par son nom.
    *   **Gestion Inventaire** :
        *   Si le dernier choix implique **l'utilisation** ou la **perte** d'un objet (ex: "Utiliser Clé", "Lancer Potion", "Se débarrasser de Pierre"), décris le résultat et **retire** l'objet de la liste 'inventory' dans 'updatedGameState' si l'action réussit et consomme l'objet.
        *   Si le dernier choix fait **trouver** un nouvel objet, décris-le et **ajoute**-le à la liste 'inventory' dans 'updatedGameState'. Annonce clairement la trouvaille dans 'storyContent', ex: "Tu as trouvé une **vieille clé rouillée** ! Ajoutée à l'inventaire !".
        *   Si le dernier choix est "Inspecter {objet}", décris l'objet plus en détail sans le retirer de l'inventaire.
2.  **Cohérence des Personnages**: Maintiens la personnalité et les caractéristiques des PNJ créés. Adapte leurs réactions en fonction des 'relationships' dans le gameState.
3.  **Cohérence des Lieux**: Souviens-toi des lieux et de leurs caractéristiques. Si une action **change le lieu** du joueur (ex: "Entrer dans la grotte", "Aller au marché"), **mets à jour la clé 'location'** dans 'updatedGameState' avec le nouveau nom de lieu. Décris brièvement le nouveau lieu dans 'storyContent'.
4.  **Chronologie & Causalité**: Respecte l'ordre des événements. Les actions doivent avoir des conséquences logiques sur la suite. Utilise le tableau 'events' du gameState pour te souvenir des faits importants.
5.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} (confirme le lieu actuel en utilisant la clé 'location' du gameState parsé) ? Que perçoit-il/elle ? Qu'est-ce qui a changé ? Que se passe-t-il maintenant ?
6.  **Gestion Actions Hors-Contexte/Impossibles** : Si le **dernier choix** est illogique, hors thème, dangereux, impossible, refuse GENTIMENT ou réinterprète. Explique pourquoi ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici dans {{{gameState.location}}}'.") et propose immédiatement de nouvelles actions VALIDES via 'nextChoices' (sauf si c'est le dernier tour).
7.  **GÉNÉRATION D'IMAGE PROMPT (Important)** : Si la situation décrite dans 'storyContent' est **visuellement marquante** (nouvel environnement spectaculaire, créature unique, action dramatique, découverte majeure), fournis un prompt CONCIS et DESCRIPTIF pour générer une image dans la clé 'generatedImagePrompt'. Le prompt doit capturer l'essence visuelle de la scène. **Il DOIT MENTIONNER le thème de l'aventure ({{{theme}}}), le lieu actuel ({{{gameState.location}}}), et SPÉCIFIER le style "Style: Cartoon."**. **Si la situation n'est pas particulièrement visuelle ou est banale, laisse la clé 'generatedImagePrompt' VIDE ou absente.** Ne crée PAS de prompt pour chaque tour.
    *   **Exemples de bons prompts:** "Un astronaute {{{playerName}}} flottant devant une nébuleuse violette (lieu: Ceinture d'Astéroïdes Delta). Thème: Exploration Spatiale. Style: Cartoon.", "Un chevalier {{{playerName}}} découvrant une épée lumineuse dans une grotte (lieu: Grotte aux Échos). Thème: Fantasy Médiévale. Style: Cartoon.", "Un pirate {{{playerName}}} sur le pont regardant un kraken (lieu: Mer Déchaînée). Thème: Pirates des Caraïbes. Style: Cartoon.", "Un détective {{{playerName}}} examinant une empreinte devant un manoir (lieu: Devant le Manoir Blackwood). Thème: Mystère et Enquête. Style: Cartoon."
    *   **Exemples de mauvais prompts (manquent thème/lieu/style ou pas assez visuels):** "Le joueur marche.", "Utiliser clé.", "Parler à PNJ.", "Fin de l'aventure."
8.  **Gestion du Dernier Tour (quand isLastTurn est vrai)** :
    *   Si l'indicateur {{isLastTurn}} est vrai, c'est la fin ! Ne propose **AUCUN** nouveau choix (la clé 'nextChoices' dans la sortie JSON doit être un tableau vide []).
    *   Décris une **conclusion** à l'aventure basée sur le dernier choix et l'état final du jeu (y compris le lieu final récupéré depuis 'updatedGameState'). La conclusion doit être satisfaisante et cohérente avec l'histoire et le thème. Elle peut être ouverte ou fermée. Exemple: "Et c'est ainsi, {{{playerName}}}, qu'après avoir {dernière action} dans {lieu final}, tu {conclusion}. Ton aventure sur {{{theme}}} se termine ici... pour l'instant !".
    *   Mets quand même à jour 'updatedGameState' une dernière fois si nécessaire (lieu final, inventaire final, etc.).
    *   **Ne génère PAS de prompt d'image pour la conclusion finale (laisser 'generatedImagePrompt' vide).**
9.  **Propose de Nouveaux Choix (si PAS le dernier tour)** : Si l'indicateur {{isLastTurn}} est FAUX, offre 2 ou 3 options claires, simples, pertinentes pour la situation actuelle, le lieu actuel ({{{gameState.location}}}), et le thème. PAS d'actions d'inventaire directes dans 'nextChoices'. Le joueur utilise l'interface d'inventaire pour ça.
10. **Mets à Jour l'État du Jeu ('updatedGameState')** : Réfléchis aux conséquences du **dernier choix** (inventaire, **lieu**, relations, émotions, événements). Mets à jour **IMPÉRATIVEMENT** 'inventory' si besoin, et **'location' si le joueur change de lieu**. Mets aussi à jour 'relationships', 'emotions', 'events' le cas échéant. 'updatedGameState' doit être une chaîne JSON valide contenant AU MINIMUM 'playerName', 'location', et 'inventory', mais idéalement aussi 'relationships', 'emotions', et 'events'. Si rien n'a changé, renvoie le 'gameState' précédent (stringify), mais valide.
11. **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant : 'storyContent' (string), 'nextChoices' (array de strings, vide si {{isLastTurn}} est vrai), 'updatedGameState' (string JSON valide), et 'generatedImagePrompt' (string, optionnel, vide si non pertinent). RIEN d'autre.
12. **Ton rôle** : Reste UNIQUEMENT le narrateur. Pas de sortie de rôle, pas de discussion hors aventure, pas de mention d'IA.
13. **Public (8-12 ans)** : Langage simple, adapté, positif, aventureux. Pas de violence/peur excessive/thèmes adultes. Utilise les 'emotions' du gameState pour influencer l'ambiance.
14. **Gestion des relations et émotions**: Utilise les informations contenues dans 'relationships' et 'emotions' pour adapter les interactions des PNJ et l'ambiance de l'histoire. Exemple: Si la relation avec un PNJ est "ennemi", il sera hostile. Si le joueur est "triste", l'ambiance sera plus sombre.
15. **Mort d'un PNJ**: Si un PNJ important meurt, tu dois en tenir compte dans la suite de l'histoire. Les autres PNJ peuvent être tristes, en colère, ou vouloir se venger. L'ambiance doit s'adapter en conséquence. L'histoire doit avancer et s'adapter à cet évènement.

**Exemple de sortie (Tour normal, changement de lieu visuellement marquant)**
{
  "storyContent": "Alex, tu pousses la lourde porte en bois qui s'ouvre sur une vaste caverne souterraine illuminée par des cristaux luminescents bleus. L'air est frais et humide. Des stalactites scintillantes pendent du plafond comme des lustres naturels et un petit ruisseau argenté serpente au loin. La porte se referme derrière toi avec un bruit sourd.",
  "nextChoices": ["Suivre le ruisseau", "Examiner les cristaux de plus près", "Écouter les bruits ambiants"],
  "updatedGameState": "{\"playerName\":\"Alex\",\"location\":\"Caverne aux Cristaux\",\"inventory\":[\"Lampe de poche\"],\"relationships\":{},\"emotions\":[\"émerveillé\",\"curieux\"],\"events\":[\"porte ouverte\", \"entré dans caverne aux cristaux\"]}",
  "generatedImagePrompt": "Alex entrant dans une vaste caverne éclairée par des cristaux bleus (lieu: Caverne aux Cristaux). Thème: Fantasy Médiévale. Style: Cartoon."
}

**Exemple de sortie (Tour normal, action simple, pas d'image)**
{
  "storyContent": "D'accord, Alex. Tu utilises la 'Potion de Soin' de ton inventaire. Une douce chaleur t'envahit et tes petites égratignures disparaissent. La fiole est maintenant vide.",
  "nextChoices": ["Continuer d'explorer le couloir", "Examiner la porte au fond", "Faire une pause"],
  "updatedGameState": "{\"playerName\":\"Alex\",\"location\":\"Couloir du Donjon\",\"inventory\":[\"Épée\"],\"relationships\":{},\"emotions\":[\"soulagé\",\"prudent\"],\"events\":[\"utilisé potion de soin\"]}",
  "generatedImagePrompt": ""
}

**Exemple de sortie (DERNIER TOUR, isLastTurn = true)**
{
 "storyContent": "Et c'est ainsi, Léa, qu'après avoir activé le portail antique au centre de la 'Salle des Étoiles', celui-ci s'illumine d'une lumière aveuglante ! Tu as trouvé le chemin du retour ! Bravo pour ton courage et ta perspicacité ! Ton aventure spatiale se termine ici, dans un flash de lumière !",
 "nextChoices": [],
 "updatedGameState": "{\"playerName\":\"Léa\",\"location\":\"Portail de Retour\",\"inventory\":[],\"relationships\":{},\"emotions\":[\"soulagée\",\"excitée\"],\"events\":[\"portail activé\"]}",
 "generatedImagePrompt": ""
}

**Important** : Concentre-toi sur la réaction à la **dernière action**, la gestion précise de l'inventaire ET du **lieu** dans 'updatedGameState', la décision de fournir ou non un 'generatedImagePrompt' (en incluant theme/lieu/style si fourni), et la **conclusion si c'est le dernier tour** ({{isLastTurn}}).

Génère maintenant la suite (ou la fin) de l'histoire pour {{{playerName}}}, en respectant TOUTES les règles, le thème {{{theme}}}, l'état du jeu (le gameState JSON fourni contient le lieu actuel dans sa clé 'location'), et le compte des tours ({{{currentTurn}}}/{{{maxTurns}}}, la valeur de isLastTurn est {{isLastTurn}}).
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
            location: 'Lieu Inconnu', // Default location
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
        // Add location context to the event
        currentGameStateObj.events.push(`Événement aléatoire (${currentGameStateObj.location || 'lieu inconnu'}): ${randomEvent}`);
        console.log("Random event triggered:", randomEvent, "at location:", currentGameStateObj.location);
    }
    // --- End Random Event ---


    // Ensure essential keys exist after potentially resetting
    if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName;
     if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Lieu Indéterminé'; // Ensure location exists
    if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
    if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
    if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
    if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];

    // Update the gameState with the new event (if any) before sending to prompt
    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);


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
         // Ensure location is a string and not empty
         if (typeof updatedGameStateObj.location !== 'string' || !updatedGameStateObj.location.trim()) {
             console.warn("AI returned invalid/missing location in updatedGameState, attempting to recover.");
             const originalGameState = safeJsonParse(validatedInputGameStateString); // Parse validated string
             updatedGameStateObj.location = (typeof originalGameState.location === 'string' && originalGameState.location.trim()) ? originalGameState.location : 'Lieu Indéterminé';
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

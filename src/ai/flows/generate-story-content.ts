// src/ai/flows/generate-story-content.ts
'use server';

/**
 * @fileOverview Generates story content based on the chosen theme, player choices, and player name.
 *
 * - generateStoryContent - A function that generates story content.
 * - GenerateStoryContentInput - The input type for the generateStoryContent function.
 * - GenerateStoryContentOutput - The return type for the generateStoryContent function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateStoryContentInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'The theme of the story (e.g., Medieval Fantasy, Space Exploration, Pirates of the Caribbean, Western and Cowboys, Mystery and Investigation, Superhero School, Love Story, Trapped in the Game, Post-Apocalyptic Survival)' // Updated themes
    ),
  playerName: z.string().describe('The name of the player.'),
  playerChoicesHistory: z.array(z.string()).optional().describe('The history of player choices made so far, ordered chronologically. The VERY LAST element is the most recent choice the AI must react to.'),
  gameState: z.string().optional().describe('A JSON string representing the current game state (e.g., inventory, location, character status). Start with an empty object string if undefined.'),
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe('The generated story content, describing the result of the player\'s last action and the current situation, addressing the player by name.'),
  nextChoices: z.array(z.string()).describe('2-3 clear and simple choices for the player\'s next action, relevant to the current situation and theme.'),
  updatedGameState: z.string().describe('The updated game state as a JSON string, reflecting changes based on the last action and story progression. Must be valid JSON.'),
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  // Ensure gameState is always a string, default to empty object string if undefined/null
  const safeInput = {
    ...input,
    gameState: input.gameState || '{}',
    // Ensure playerChoicesHistory is an array, even if empty
    playerChoicesHistory: input.playerChoicesHistory || [],
  };
  // Ensure player name is in the game state string for the prompt if it isn't already
  try {
    let parsedState = JSON.parse(safeInput.gameState);
    if (!parsedState.playerName) {
        parsedState.playerName = safeInput.playerName;
        safeInput.gameState = JSON.stringify(parsedState);
    }
  } catch (e) {
      console.warn("Initial game state was not valid JSON, resetting.", safeInput.gameState);
      safeInput.gameState = JSON.stringify({ playerName: safeInput.playerName }); // Reset if invalid
  }

  return generateStoryContentFlow(safeInput);
}

const prompt = ai.definePrompt({
  name: 'generateStoryContentPrompt',
  input: {
    schema: z.object({
      theme: z.string().describe('The theme of the story.'),
      playerName: z.string().describe('The name of the player.'),
      playerChoicesHistory: z.array(z.string()).describe('History of player choices. The VERY LAST element is the most recent choice to react to.'),
      gameState: z.string().describe('Current game state (JSON string). Includes playerName.'),
       current_date: z.string().describe('Current date, injected for potential story elements.') // Add current_date to input schema for clarity
    }),
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8 à 12 ans. Le nom du joueur est {{{playerName}}}. Ta mission est de continuer l'histoire de manière amusante, logique et **strictement cohérente avec le thème**, en te basant sur le **dernier choix effectué par le joueur** et l'état actuel du jeu, et en t'adressant au joueur par son nom.

  **Contexte de l'Aventure :**
  *   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
  *   Nom du joueur : {{{playerName}}}
  *   État actuel du jeu (inventaire, lieu, état du joueur, etc.) : {{{gameState}}}
  *   Historique des choix du joueur (le **dernier élément** de cette liste est le choix auquel tu dois réagir) :
      {{#if playerChoicesHistory}}
      {{#each playerChoicesHistory}}
      - {{{this}}}
      {{/each}}
      {{else}}
      C'est le tout début de l'aventure ! (Ceci ne devrait pas arriver ici, mais gère-le si c'est le cas).
      {{/if}}

  **Règles strictes pour ta réponse (MJ) :**

  1.  **Réagis au DERNIER CHOIX** : Ta réponse DOIT commencer par décrire le résultat direct et logique du **dernier choix** de {{{playerName}}} (le dernier élément de la liste playerChoicesHistory). Sois descriptif et engageant. Adresse-toi toujours à {{{playerName}}} par son nom.
  2.  **Décris la nouvelle situation** : Après avoir décrit le résultat de l'action, explique clairement la situation actuelle : où est {{{playerName}}} ? Que perçoit-il/elle ? Qu'est-ce qui a changé ?
  3.  **Ton rôle** : Reste UNIQUEMENT le narrateur. Ne sors JAMAIS de ce rôle. Ne discute pas d'autre chose que l'aventure. Ne mentionne pas que tu es une IA.
  4.  **Public (8-12 ans)** : Utilise un langage simple et adapté. Évite la violence, la peur excessive, et les thèmes adultes. Garde une ambiance positive et aventureuse.
  5.  **Cohérence Thématique ({{{theme}}})** : C'est CRUCIAL. Assure-toi que la narration, les objets, les personnages, les lieux et les choix proposés restent strictement dans l'univers du thème **{{{theme}}}**. Ne mélange PAS les genres.
  6.  **Gestion des Actions Hors-Contexte** : Si le **dernier choix** de {{{playerName}}} est illogique, hors thème (ex: utiliser un téléphone portable dans un monde médiéval), dangereux, ou essaie de briser le jeu (ex: "Je vole", "Je tue tout le monde", "Quel est ton nom d'IA?"), tu dois GENTIMENT le refuser ou le réinterpréter de manière plausible dans le contexte. Ne le laisse pas faire. Explique brièvement pourquoi ce n'est pas possible et propose immédiatement de nouvelles actions VALIDES. Exemple de refus : "Hmm, {{{playerName}}}, utiliser un {objet hors contexte} ne semble pas fonctionner ici dans {lieu du thème}. Peut-être pourrais-tu plutôt..." puis propose les nextChoices.
  7.  **Propose de Nouveaux Choix** : Offre 2 ou 3 options claires, simples, et **pertinentes pour la situation actuelle et le thème {{{theme}}}**. Ces choix doivent permettre à {{{playerName}}} de faire avancer l'histoire de manière logique. Ne propose pas d'actions impossibles ou hors thème.
  8.  **Mets à Jour l'État du Jeu** : Réfléchis aux conséquences du **dernier choix** sur l'état du jeu (inventaire, lieu, état d'un personnage, etc.). Mets à jour le 'updatedGameState' pour refléter ces changements. L'état du jeu DOIT être une chaîne JSON valide. Si rien n'a changé significativement, renvoie le gameState précédent mais assure-toi qu'il est toujours JSON valide et contient playerName.
  9.  **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant les clés : 'storyContent' (string), 'nextChoices' (array de strings), 'updatedGameState' (string JSON valide). Ne RIEN ajouter avant ou après le JSON.

  **Exemple de sortie attendue (pour le joueur "Léa", thème Spatial, dernier choix: "Utiliser le communicateur cassé") :**
  {
    "storyContent": "Léa, tu essaies d'utiliser le communicateur, mais il ne fait qu'émettre des crépitements et de la fumée. Il semble définitivement hors service pour le moment. Tu te trouves toujours dans le cockpit endommagé de l'Étoile Filante, avec l'alerte rouge qui clignote faiblement.",
    "nextChoices": ["Examiner le panneau de contrôle principal", "Chercher une boîte à outils", "Regarder par le hublot"],
    "updatedGameState": "{\\"location\\": \\"Cockpit endommagé\\", \\"inventory\\": [], \\"alerts\\": [\\"Navigation HS\\", \\"Communicateur HS\\"], \\"playerName\\": \\"Léa\\"}"
  }

  **Important** : La date actuelle est {{current_date}}. Tu peux l'utiliser subtilement si pertinent (ex: mentionner la nuit qui tombe), mais ce n'est pas obligatoire. Concentre-toi sur la réaction au **dernier choix** de {{{playerName}}}.

  Génère maintenant la suite de l'histoire en réagissant au **dernier choix** de la liste pour {{{playerName}}}, en respectant TOUTES les règles et le thème {{{theme}}}.
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
   if (!input.theme) {
       throw new Error("Theme is required to generate story content.");
   }
   if (!input.playerName) {
        throw new Error("Player name is required to generate story content.");
    }
   // Ensure playerChoicesHistory is an array for the prompt logic
   const safePlayerChoicesHistory = input.playerChoicesHistory || [];
   if (safePlayerChoicesHistory.length === 0) {
       console.warn("generateStoryContent called with empty choice history. This might indicate an issue.");
       // Depending on desired behavior, you might throw an error or handle it gracefully.
       // For now, proceed, but the AI might struggle without a last choice.
   }


  // Inject current date into the prompt context
  const promptInput = {
      ...input,
      playerChoicesHistory: safePlayerChoicesHistory, // Use the safe array
      current_date: new Date().toLocaleDateString('fr-FR'), // Add current date in French format
  };

  const { output } = await prompt(promptInput);

  // Basic validation of the output structure
    if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        console.error("Invalid format received from AI for story content:", output);
        throw new Error("Format invalide reçu de l'IA pour le contenu de l'histoire.");
    }
    // Validate if updatedGameState is valid JSON
    let parsedState;
    try {
        parsedState = JSON.parse(output.updatedGameState);
        // Ensure playerName is preserved or added if missing in AI output
        if (!parsedState.playerName) {
            console.warn("AI removed playerName from gameState, re-adding.");
            parsedState.playerName = input.playerName; // Add player name if missing
            output.updatedGameState = JSON.stringify(parsedState); // Update the stringified state
        }
    } catch (e) {
        console.error("AI returned invalid JSON for updatedGameState:", output.updatedGameState);
        // Attempt to recover by returning the previous valid state?
        console.warn("Attempting to return previous valid game state due to AI error.");
        output.updatedGameState = input.gameState; // Use the last known valid state
        // Re-check if the previous state is valid JSON (it should be)
        try {
            JSON.parse(output.updatedGameState);
        } catch (parseError) {
            console.error("Previous game state was also invalid JSON. Resetting state.", parseError);
            // Critical error, reset state completely
            output.updatedGameState = JSON.stringify({ playerName: input.playerName });
            output.storyContent = "Oups ! Une erreur cosmique s'est produite dans le tissu de la réalité (et dans ma mémoire !). Revenons au point de départ dans cet endroit.";
            // Ideally, provide choices relevant to the *previous* state, but difficult here.
            // Providing generic safe choices might be best.
            output.nextChoices = ["Regarder autour de moi", "Vérifier mon inventaire (si possible)"];
        }
        // Maybe add a note in the story about the confusion?
        // output.storyContent += "\n(Le narrateur semble momentanément confus...)";
    }


  return output;
});


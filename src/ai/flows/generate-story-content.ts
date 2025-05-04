'use server';

/**
 * @fileOverview Generates story content based on the chosen theme and player choices.
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
      'The theme of the story (e.g., Medieval Fantasy, Space Exploration, Pirates of the Caribbean, Western and Cowboys, Love Story, Trapped in the Game, Post-Apocalyptic Survival)'
    ),
  playerChoices: z.array(z.string()).optional().describe('The history of player choices made so far. The last element is the most recent choice.'),
  gameState: z.string().optional().describe('A JSON string representing the current game state (e.g., inventory, location, character status). Start with an empty state if undefined.'),
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe('The generated story content, describing the result of the player\'s last action and the current situation.'),
  nextChoices: z.array(z.string()).describe('2-3 clear and simple choices for the player\'s next action.'),
  updatedGameState: z.string().describe('The updated game state as a JSON string, reflecting changes based on the last action and story progression.'),
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  // Ensure gameState is always a string, default to empty object string if undefined/null
  const safeInput = {
    ...input,
    gameState: input.gameState || '{}',
  };
  return generateStoryContentFlow(safeInput);
}

const prompt = ai.definePrompt({
  name: 'generateStoryContentPrompt',
  input: {
    schema: z.object({
      theme: z.string().describe('The theme of the story.'),
      playerChoices: z.array(z.string()).optional().describe('History of player choices. The last element is the most recent choice.'),
      gameState: z.string().describe('Current game state (JSON string).'),
    }),
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8 à 12 ans. Ta mission est de continuer l'histoire de manière amusante et logique, en te basant sur le choix du joueur et l'état actuel du jeu.

  **Contexte de l'Aventure :**
  *   Thème : {{{theme}}}
  *   État actuel du jeu (variables, objets, lieu, etc.) : {{{gameState}}}
  *   Historique des choix du joueur (le dernier est le plus récent) : {{#if playerChoices}}{{playerChoices}}{{else}}C'est le début de l'aventure !{{/if}}

  **Instructions pour ta réponse :**

  1.  **Réagis au dernier choix** : Décris ce qui se passe suite au dernier choix du joueur (s'il y en a un). Rends cela vivant et intéressant !
  2.  **Décris la nouvelle situation** : Explique clairement où se trouve le joueur maintenant et ce qu'il perçoit. Adapte la description à l'âge (8-12 ans) : simple, visuel, et pas trop effrayant.
  3.  **Propose de nouveaux choix** : Donne 2 ou 3 options claires et simples pour la prochaine action du joueur. Les choix doivent être logiques par rapport à la situation actuelle et faire avancer l'histoire.
  4.  **Mets à jour l'état du jeu** : Réfléchis à comment le dernier choix et la nouvelle situation affectent l'état du jeu (Ex: le joueur a trouvé un objet, changé de lieu, rencontré un personnage). Décris ces changements dans la variable 'updatedGameState'. Si rien ne change, renvoie l'état du jeu actuel. L'état du jeu DOIT être une chaîne JSON valide.
  5.  **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON contenant les clés suivantes :
      *   storyContent: (string) Le nouveau paragraphe de l'histoire.
      *   nextChoices: (array de strings) Les nouvelles options pour le joueur.
      *   updatedGameState: (string JSON valide) L'état du jeu mis à jour.

  **Exemple de sortie attendue :**
  {
    "storyContent": "Tu suis le sentier lumineux et arrives devant une cascade scintillante ! L'eau tombe dans un bassin d'où s'échappe une douce lumière bleue. Un petit pont de bois semble mener de l'autre côté.",
    "nextChoices": ["Traverser le pont", "Tremper ta main dans l'eau lumineuse", "Regarder derrière la cascade"],
    "updatedGameState": "{\\"location\\": \\"Cascade Scintillante\\", \\"inventory\\": []}"
  }

  **Important** : Reste cohérent avec le thème et l'historique. Assure-toi que l'histoire progresse. La date actuelle est {{current_date}} si jamais tu en as besoin pour un élément de l'histoire.

  Génère la suite de l'histoire maintenant.
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
   // Add basic input validation if needed, although zod handles schema validation
   if (!input.theme) {
       throw new Error("Theme is required to generate story content.");
   }

  // Inject current date into the prompt context if needed by the prompt
  const promptInput = {
      ...input,
      current_date: new Date().toLocaleDateString(), // Add current date
  };

  const { output } = await prompt(promptInput);

  // Basic validation of the output structure
    if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        throw new Error("Invalid format received from AI for story content.");
    }
    // Validate if updatedGameState is valid JSON
    try {
        JSON.parse(output.updatedGameState);
    } catch (e) {
        console.error("AI returned invalid JSON for updatedGameState:", output.updatedGameState);
        // Attempt to recover or return a default state? For now, throw error.
         throw new Error("AI returned invalid JSON for the updated game state.");
        // Or potentially return the previous state: output.updatedGameState = input.gameState;
    }


  return output;
});

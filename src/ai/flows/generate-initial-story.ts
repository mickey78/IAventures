// src/ai/flows/generate-initial-story.ts
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the initial story based on the chosen theme.
 *
 * - generateInitialStory - A function that generates the initial story.
 * - GenerateInitialStoryInput - The input type for the generateInitialStory function.
 * - GenerateInitialStoryOutput - The return type for the generateInitialStory function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateInitialStoryInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'The theme chosen by the player for the adventure. Supported themes are: Fantasy Médiévale, Exploration Spatiale, Pirates des Caraïbes, Western et Cowboys, Histoire d\'Amour, Piégé dans le Jeu, Survie Post-Apocalyptique.'
    ),
});
export type GenerateInitialStoryInput = z.infer<typeof GenerateInitialStoryInputSchema>;

const GenerateInitialStoryOutputSchema = z.object({
  story: z.string().describe('The initial story content based on the chosen theme.'),
  choices: z
    .array(z.string())
    .describe('The choices presented to the player as selectable buttons.'),
});
export type GenerateInitialStoryOutput = z.infer<typeof GenerateInitialStoryOutputSchema>;

export async function generateInitialStory(input: GenerateInitialStoryInput): Promise<GenerateInitialStoryOutput> {
  return generateInitialStoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'initialStoryPrompt',
  input: {
    schema: z.object({
      theme: z
        .string()
        .describe(
          'The theme chosen by the player for the adventure. Supported themes are: Fantasy Médiévale, Exploration Spatiale, Pirates des Caraïbes, Western et Cowboys, Histoire d\'Amour, Piégé dans le Jeu, Survie Post-Apocalyptique.'
        ),
    }),
  },
  output: {
    schema: z.object({
      story: z.string().describe('The initial story content based on the chosen theme.'),
      choices: z
        .array(z.string())
        .describe('The choices presented to the player as selectable buttons.'),
    }),
  },
  prompt: `Tu es un Maître du Jeu (MJ) sympathique et créatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8 à 12 ans. Ta mission est de démarrer une histoire passionnante basée sur le thème choisi par le joueur.

  Thème choisi par le joueur : {{{theme}}}

  Règles importantes :
  1.  **Ton public** : Écris de manière simple, engageante et adaptée aux enfants (8-12 ans). Évite les mots trop compliqués ou les situations effrayantes.
  2.  **Le début** : Décris la scène de départ. Où se trouve le joueur ? Que voit-il ? Qu'est-ce qui se passe ? Crée une ambiance qui correspond au thème.
  3.  **Les premiers choix** : Propose 2 à 4 actions claires et simples que le joueur peut choisir pour commencer l'aventure. Ces choix doivent être logiques par rapport à la situation de départ. Formate les choix comme un tableau (array) de chaînes de caractères (strings).
  4.  **Format de sortie** : Réponds UNIQUEMENT avec un objet JSON contenant deux clés : "story" (le texte de début de l'histoire) et "choices" (le tableau des choix possibles).

  Exemple de sortie attendue (pour le thème Fantasy Médiévale) :
  {
    "story": "Tu te réveilles dans une forêt enchantée ! Les arbres scintillent de mille feux et de petits champignons lumineux éclairent un sentier sinueux. Au loin, tu entends le murmure d'une cascade. Que fais-tu ?",
    "choices": ["Suivre le sentier lumineux", "Explorer derrière les grands arbres", "Écouter attentivement près de la cascade"]
  }

  Génère maintenant l'histoire de départ et les premiers choix pour le thème : {{{theme}}}
  `,
});

const generateInitialStoryFlow = ai.defineFlow<typeof GenerateInitialStoryInputSchema, typeof GenerateInitialStoryOutputSchema>(
  {
    name: 'generateInitialStoryFlow',
    inputSchema: GenerateInitialStoryInputSchema,
    outputSchema: GenerateInitialStoryOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    // Basic validation to ensure output structure
    if (!output || typeof output.story !== 'string' || !Array.isArray(output.choices)) {
        throw new Error("Invalid format received from AI for initial story.");
    }
    return output;
  }
);

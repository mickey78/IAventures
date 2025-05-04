'use server';
/**
 * @fileOverview Flux Genkit pour générer des images basées sur une invite textuelle en utilisant Gemini 2.0 Flash expérimental.
 *
 * - generateImage - Fonction qui gère la génération d'image.
 * - GenerateImageInput - Type d'entrée pour la fonction generateImage.
 * - GenerateImageOutput - Type de retour pour la fonction generateImage.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe("L'invite textuelle à partir de laquelle générer une image."),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().url().describe("L'image générée sous forme de chaîne URI de données (encodée en Base64)."),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow<
  typeof GenerateImageInputSchema,
  typeof GenerateImageOutputSchema
>(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
     try {
        console.log(`Génération d'image avec le prompt : "${input.prompt}"`);
        const { media } = await ai.generate({
          // IMPORTANT: SEUL le modèle googleai/gemini-2.0-flash-exp peut générer des images.
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: input.prompt,
          config: {
            responseModalities: ['TEXT', 'IMAGE'], // DOIT fournir TEXT et IMAGE
          },
        });

        if (!media?.url) {
            throw new Error("Échec de la génération d'image : Aucune URL de média retournée.");
        }

        console.log("Image générée avec succès (URI de données) :", media.url.substring(0, 50) + "..."); // Log début de l'URI de données

        return { imageUrl: media.url };
      } catch (error) {
        console.error("Erreur pendant le flux de génération d'image :", error);
        // Selon l'erreur, vous pourriez vouloir retourner une URL d'image par défaut ou relancer l'erreur
        throw new Error(`Échec de la génération de l'image : ${error instanceof Error ? error.message : String(error)}`);
     }
  }
);

// Enregistrer le flux dans dev.ts si nécessaire pour tester via l'UI Genkit
// import '@/ai/flows/generate-image';

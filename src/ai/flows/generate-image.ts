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
import { logToFile } from '@/services/loggingService'; // Corrected import path

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
        await logToFile({ level: 'info', message: `[IMAGE_GEN_FLOW_START] Generating image with prompt: "${input.prompt}"` });
        const { media } = await ai.generate({
          // IMPORTANT: SEUL le modèle googleai/gemini-2.0-flash-exp peut générer des images.
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: input.prompt,
          config: {
            responseModalities: ['TEXT', 'IMAGE'], // DOIT fournir TEXT et IMAGE
          },
        });

        if (!media?.url) {
            await logToFile({ level: 'error', message: "[IMAGE_GEN_FLOW_ERROR] Image generation failed: No media URL returned.", payload: { prompt: input.prompt } });
            throw new Error("Échec de la génération d'image : Aucune URL de média retournée.");
        }

        await logToFile({ level: 'info', message: "[IMAGE_GEN_FLOW_SUCCESS] Image generated successfully (data URI):", payload: { prompt: input.prompt, imageUrlStart: media.url.substring(0, 50) + "..." } });

        return { imageUrl: media.url };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logToFile({ level: 'error', message: `[IMAGE_GEN_FLOW_CRITICAL_ERROR] During image generation flow: ${errorMessage}`, payload: { prompt: input.prompt, errorDetails: error } });
        throw new Error(`Échec de la génération de l'image : ${errorMessage}`);
     }
  }
);

// Enregistrer le flux dans dev.ts si nécessaire pour tester via l'UI Genkit
// import '@/ai/flows/generate-image';

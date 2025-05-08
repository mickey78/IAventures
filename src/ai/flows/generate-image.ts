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
import { logToFile } from '@/services/loggingService'; 

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

const MAX_RETRIES = 2; // Nombre total de tentatives (1 initiale + 1 nouvelle tentative)

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await logToFile({
          level: 'info',
          message: `[IMAGE_GEN_FLOW_ATTEMPT_${attempt}/${MAX_RETRIES}] Generating image with prompt: "${input.prompt}"`,
          excludeMedia: true,
        });

        const { media } = await ai.generate({
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: input.prompt,
          config: {
            responseModalities: ['TEXT', 'IMAGE'], // Retour à la structure originale
          },
        });

        if (media?.url) {
          await logToFile({
            level: 'info',
            message: `[IMAGE_GEN_FLOW_SUCCESS][Attempt ${attempt}/${MAX_RETRIES}] Image generated successfully.`,
            payload: { prompt: input.prompt },
            excludeMedia: true,
          });
          return { imageUrl: media.url };
        } else {
          lastError = new Error("Aucune URL de média retournée.");
          await logToFile({
            level: 'warn',
            message: `[IMAGE_GEN_FLOW_WARN][Attempt ${attempt}/${MAX_RETRIES}] Image generation failed: No media URL returned.`,
            payload: { prompt: input.prompt },
            excludeMedia: true,
          });
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await logToFile({
          level: 'warn',
          message: `[IMAGE_GEN_FLOW_ERROR][Attempt ${attempt}/${MAX_RETRIES}] Error during image generation: ${lastError.message}`,
          payload: { prompt: input.prompt, errorDetails: lastError },
          excludeMedia: true,
        });
      }

      if (attempt < MAX_RETRIES) {
        await logToFile({
          level: 'info',
          message: `[IMAGE_GEN_FLOW_RETRYING][Attempt ${attempt}/${MAX_RETRIES}] Retrying image generation...`,
          excludeMedia: true
        });
        // Optionnel: ajouter un délai avant la nouvelle tentative si nécessaire
        // await new Promise(resolve => setTimeout(resolve, 1000)); // Délai de 1 seconde
      }
    }

    // Si toutes les tentatives échouent
    const finalErrorMessage = `Échec de la génération de l'image après ${MAX_RETRIES} tentatives. Dernière erreur: ${lastError?.message || 'Erreur inconnue'}`;
    await logToFile({
      level: 'error',
      message: `[IMAGE_GEN_FLOW_CRITICAL_FAILURE] ${finalErrorMessage}`,
      payload: { prompt: input.prompt, lastErrorDetails: lastError },
      excludeMedia: true,
    });
    throw new Error(finalErrorMessage);
  }
);

// Enregistrer le flux dans dev.ts si nécessaire pour tester via l'UI Genkit
// import '@/ai/flows/generate-image';

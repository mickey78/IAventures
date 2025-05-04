'use server';
/**
 * @fileOverview A flow to generate images based on a text prompt using Gemini 2.0 Flash experimental.
 *
 * - generateImage - A function that handles image generation.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('The generated image as a data URI string (Base64 encoded).'),
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
        console.log(`Generating image with prompt: "${input.prompt}"`);
        const { media } = await ai.generate({
          // IMPORTANT: ONLY the googleai/gemini-2.0-flash-exp model is able to generate images.
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: input.prompt,
          config: {
            responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE
          },
        });

        if (!media?.url) {
            throw new Error('Image generation failed: No media URL returned.');
        }

        console.log("Image generated successfully (data URI):", media.url.substring(0, 50) + "..."); // Log start of data URI

        return { imageUrl: media.url };
      } catch (error) {
        console.error('Error during image generation flow:', error);
        // Depending on the error, you might want to return a default image URL or rethrow
        throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
     }
  }
);

// Register the flow in dev.ts if needed for testing via Genkit UI
// import '@/ai/flows/generate-image';

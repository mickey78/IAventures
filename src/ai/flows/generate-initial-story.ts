'use server';

/**
 * @fileOverview Ce fichier définit le flux Genkit pour générer l'histoire initiale basée sur le thème choisi, le prompt du sous-thème optionnel, le nom du joueur et la classe du héros. Il génère également un prompt d'image initial détaillé pour la cohérence visuelle.
 *
 * - generateInitialStory - Fonction qui génère l'histoire initiale, le lieu et le prompt d'image.
 * - GenerateInitialStoryInput - Type d'entrée pour la fonction generateInitialStory.
 * - GenerateInitialStoryOutput - Type de retour pour la fonction generateInitialStory.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { heroOptions } from '@/config/heroes'; // Import hero options to get hero label and description
import { logToFile, logAdventureStart } from '@/services/loggingService'; 
import { readPromptFile } from '@/lib/prompt-utils'; 

const promptTemplatePromise = readPromptFile('initialStoryPrompt.prompt'); // Charger le template depuis le fichier

const GenerateInitialStoryInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'Le thème principal choisi par le joueur (ex: Fantasy Médiévale, Exploration Spatiale...).'
    ),
  subThemePrompt: z.string().optional().describe("Le prompt de scénario spécifique pour le sous-thème choisi par le joueur, ou un prompt générique si aucun sous-thème n'est choisi."),
  playerName: z.string().describe('Le nom du joueur.'),
  selectedHeroValue: z.string().describe("La valeur de la classe de héros choisie par le joueur (ex: 'Guerrier')."),
  heroDescription: z.string().describe("La description et les habiletés du héros choisi."), 
  maxTurns: z.number().int().positive().describe("Le nombre maximum de tours pour cette aventure."), // Added maxTurns
});
export type GenerateInitialStoryInput = z.infer<typeof GenerateInitialStoryInputSchema>;

const GenerateInitialStoryOutputSchema = z.object({
  story: z.string().describe("Le contenu initial de l'histoire basé sur le thème et le sous-thème choisi (ou générique), s'adressant au joueur par son nom."),
  choices: z
    .array(z.string())
    .describe('Les choix présentés au joueur sous forme de boutons sélectionnables.'),
  location: z.string().describe("Le lieu/cadre initial de l'histoire."),
  generatedImagePrompt: z.string().optional().describe("Un prompt concis mais VIVID pour générer une image représentant la scène initiale. DOIT inclure le thème, le lieu, le nom du joueur {{{playerName}}}, sa CLASSE de héros {{{selectedHeroValue}}}, et une DESCRIPTION DÉTAILLÉE de l'apparence du héros basée sur sa classe et sa description ({{{heroDescription}}}). Style: Réaliste."),
  initialPromptDebug: z.string().optional().describe("The fully resolved initial prompt text used by the AI, for debugging purposes."),
});
export type GenerateInitialStoryOutput = z.infer<typeof GenerateInitialStoryOutputSchema>;

export async function generateInitialStory(input: GenerateInitialStoryInput): Promise<GenerateInitialStoryOutput> {
  // Log adventure start here as this is the first AI interaction point for a new game.
  await logAdventureStart(input.playerName, input.theme, input.subThemePrompt, input.selectedHeroValue, input.maxTurns);

  const heroDetails = heroOptions.find(h => h.value === input.selectedHeroValue);
  if (!heroDetails) {
    throw new Error(`Détails du héros non trouvés pour la valeur: ${input.selectedHeroValue}`);
  }
  const heroFullDescription = `${heroDetails.description} Habiletés: ${heroDetails.abilities.map(a => a.label).join(', ')}. Apparence: ${heroDetails.appearance || 'Apparence typique de sa classe.'}`;


  const effectiveSubThemePrompt = input.subThemePrompt || `Commence une aventure créative et surprenante pour ${input.playerName}, le/la ${heroDetails.label || 'Héros inconnu'}, dans le thème "${input.theme}".`;

  const flowInput = {
    ...input,
    subThemePrompt: effectiveSubThemePrompt,
    heroDescription: heroFullDescription, 
  };

  await logToFile({ level: 'info', message: '[AI_REQUEST_INIT_STORY] Input to generateInitialStoryFlow', payload: flowInput, excludeMedia: true });
  const result = await generateInitialStoryFlow(flowInput);
  await logToFile({ level: 'info', message: '[AI_RESPONSE_INIT_STORY] Output from generateInitialStoryFlow', payload: result, excludeMedia: true });
  return result;
}

const initialStoryPrompt = ai.definePrompt({
  name: 'initialStoryPrompt',
  input: {
    schema: GenerateInitialStoryInputSchema
  },
  output: {
    schema: GenerateInitialStoryOutputSchema,
  },
  prompt: await promptTemplatePromise, // Utiliser le template chargé
});


const generateInitialStoryFlow = ai.defineFlow<typeof GenerateInitialStoryInputSchema, typeof GenerateInitialStoryOutputSchema>(
  {
    name: 'generateInitialStoryFlow',
    inputSchema: GenerateInitialStoryInputSchema,
    outputSchema: GenerateInitialStoryOutputSchema,
  },
  async (flowInput) => {
    // Input validation
    if (!flowInput.theme || !flowInput.playerName || !flowInput.selectedHeroValue || !flowInput.heroDescription) {
      await logToFile({ level: 'error', message: '[VALIDATION_ERROR] Initial story generation - missing required fields', payload: flowInput, excludeMedia: true });
      throw new Error("Theme, playerName, selectedHeroValue, et heroDescription sont requis pour la génération de l'histoire initiale.");
    }
    
    const promptText = await promptTemplatePromise;
    if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
      await logToFile({ level: 'error', message: '[CRITICAL_ERROR] Initial story prompt template is empty or invalid.', excludeMedia: true });
      throw new Error("Le template de prompt pour l'histoire initiale est vide ou invalide.");
    }

    // Construct the debug prompt string using the resolved template and current input
    // This replaces placeholders in the prompt template with actual values from flowInput
    let debugPromptString = promptText;
    const placeholders: Record<keyof GenerateInitialStoryInput, string | number | undefined | null> = {
        theme: flowInput.theme,
        subThemePrompt: flowInput.subThemePrompt || 'N/A (aucun scénario spécifique choisi)',
        playerName: flowInput.playerName,
        selectedHeroValue: flowInput.selectedHeroValue,
        heroDescription: flowInput.heroDescription,
        maxTurns: flowInput.maxTurns,
    };

    for (const key in placeholders) {
        const placeholderKey = key as keyof GenerateInitialStoryInput;
        const value = placeholders[placeholderKey];
        // Ensure value is a string for replacement, handle number for maxTurns specifically
        const replacementValue = typeof value === 'number' ? String(value) : (value || '');
        debugPromptString = debugPromptString.replace(new RegExp(`{{{${placeholderKey}}}}`, 'g'), replacementValue);
    }


    const { output } = await initialStoryPrompt(flowInput);

    // Basic output validation
    if (!output || typeof output.story !== 'string' || !Array.isArray(output.choices) || output.choices.length === 0 || typeof output.location !== 'string' || !output.location.trim()) {
      await logToFile({ level: 'error', message: '[AI_OUTPUT_INVALID] Format invalide reçu de l\'IA pour l\'histoire initiale', payload: output, excludeMedia: true });
      const missingFields = [];
      if (typeof output?.story !== 'string') missingFields.push('story');
      if (!Array.isArray(output?.choices) || output?.choices.length === 0) missingFields.push('choices');
      if (typeof output?.location !== 'string' || !output?.location?.trim()) missingFields.push('location');
      if (output?.generatedImagePrompt !== undefined && typeof output.generatedImagePrompt !== 'string') missingFields.push('generatedImagePrompt (type invalide)');
      throw new Error(`Format invalide reçu de l'IA pour l'histoire initiale. Champs manquants ou invalides: ${missingFields.join(', ')}`);
    }
    if (!output.choices.every(choice => typeof choice === 'string')) {
      await logToFile({ level: 'error', message: '[AI_OUTPUT_INVALID] Format de choix invalide reçu de l\'IA', payload: output.choices, excludeMedia: true });
      throw new Error("Format invalide reçu de l'IA pour les choix.");
    }
    if (output.generatedImagePrompt !== undefined && output.generatedImagePrompt !== null && typeof output.generatedImagePrompt === 'string' && !output.generatedImagePrompt.trim()) {
      await logToFile({ level: 'warn', message: '[AI_OUTPUT_WARN] L\'IA a retourné un generatedImagePrompt vide, le définissant à undefined.', payload: output.generatedImagePrompt, excludeMedia: true });
      output.generatedImagePrompt = undefined;
    }

    // Ensure the output from the prompt call is spread, and then add/override initialPromptDebug
    return {
        ...output!,
        initialPromptDebug: debugPromptString,
    };
  }
);

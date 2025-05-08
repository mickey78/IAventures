
'use server';

/**
 * @fileOverview Ce fichier définit le flux Genkit pour générer l'histoire initiale basée sur le thème choisi, le prompt du sous-thème optionnel, le nom du joueur, le genre du joueur et la classe du héros. Il génère également un prompt d'image initial détaillé pour la cohérence visuelle.
 *
 * - generateInitialStory - Fonction qui génère l'histoire initiale, le lieu et le prompt d'image.
 * - GenerateInitialStoryInput - Type d'entrée pour la fonction generateInitialStory.
 * - GenerateInitialStoryOutput - Type de retour pour la fonction generateInitialStory.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { themedHeroOptions, defaultHeroOptions } from '@/config/heroes';
import type { ThemeValue, ParsedGameState, HeroAbilityState, CurrentGameState } from '@/types/game'; // Ajout de CurrentGameState
import { logToFile, logAdventureStart } from '@/services/loggingService';
import { readPromptFile } from '@/lib/prompt-utils';

const promptTemplatePromise = readPromptFile('initial-story.prompt'); 

const GenerateInitialStoryInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'Le thème principal choisi par le joueur (ex: Fantasy Médiévale, Exploration Spatiale...).'
    ),
  subThemePrompt: z.string().optional().describe("Le prompt de scénario spécifique pour le sous-thème choisi par le joueur, ou un prompt générique si aucun sous-thème n'est choisi."),
  playerName: z.string().describe('Le nom du joueur.'),
  playerGender: z.enum(['male', 'female']).describe('Le genre choisi par le joueur (male ou female).'),
  selectedHeroValue: z.string().describe("La valeur de la classe de héros choisie par le joueur (ex: 'Guerrier')."),
    heroDescription: z.string().describe("La description et les habiletés du héros choisi."),
    startingInventoryDescription: z.string().optional().describe("Une description textuelle de l'inventaire de départ pour l'IA."), // Ajouté
    maxTurns: z.number().int().positive().describe("Le nombre maximum de tours pour cette aventure."),
    imageStyle: z.string().optional().describe("Le style artistique souhaité pour l'image initiale (ex: realistic, cartoon)."),
});
export type GenerateInitialStoryInput = z.infer<typeof GenerateInitialStoryInputSchema>;

const GenerateInitialStoryOutputSchema = z.object({
  story: z.string().describe("Le contenu initial de l'histoire basé sur le thème et le sous-thème choisi (ou générique), s'adressant au joueur par son nom et tenant compte de son genre."),
  choices: z
    .array(z.string())
    .describe('Les choix présentés au joueur sous forme de boutons sélectionnables.'),
  location: z.string().describe("Le lieu/cadre initial de l'histoire."),
  generatedImagePrompt: z.string().optional().describe("Un prompt concis mais VIVID pour générer une image représentant la scène initiale. DOIT inclure le thème, le lieu, le nom du joueur {{{playerName}}} ({{{playerGender}}}), sa CLASSE de héros {{{selectedHeroValue}}}, et une DESCRIPTION DÉTAILLÉE de l'apparence du héros basée sur sa classe, sa description ({{{heroDescription}}}), et son genre. Style: Réaliste. Pas de texte dans l'image."),
  // updatedGameState: z.string().describe("L'état initial du jeu au format JSON string, incluant l'inventaire de départ et les habiletés du héros."), // Supprimé
  initialGameStateJson: z.string().describe("L'état initial complet du jeu, généré côté serveur, au format JSON string."), // Ajouté
  initialPromptDebug: z.string().optional().describe("The fully resolved initial prompt text used by the AI, for debugging purposes."),
});
// Le type GenerateInitialStoryOutput est automatiquement mis à jour par Zod
export type GenerateInitialStoryOutput = z.infer<typeof GenerateInitialStoryOutputSchema>;

// La signature de generateInitialStory reste la même car GenerateInitialStoryOutput est inféré
export async function generateInitialStory(input: GenerateInitialStoryInput): Promise<GenerateInitialStoryOutput> {
  await logAdventureStart(input.playerName, input.theme, input.subThemePrompt, input.selectedHeroValue, input.maxTurns);

  // Récupérer les détails du héros pour construire heroFullDescription
  let heroDetails = themedHeroOptions[input.theme as ThemeValue]?.find(h => h.value === input.selectedHeroValue);
  if (!heroDetails) {
      heroDetails = defaultHeroOptions.find(h => h.value === input.selectedHeroValue);
  }

  if (!heroDetails) {
    throw new Error(`Détails du héros non trouvés pour la valeur: ${input.selectedHeroValue} dans le thème ${input.theme} ou par défaut.`);
  }
  
  const heroFullDescription = `${heroDetails.description} Habiletés: ${heroDetails.abilities.map(a => a.label).join(', ')}. Apparence: ${heroDetails.appearance || 'Apparence typique de sa classe.'}`;

  const effectiveSubThemePrompt = input.subThemePrompt || `Commence une aventure créative et surprenante pour ${input.playerName} (${input.playerGender === 'male' ? 'le' : 'la'} ${heroDetails.label || 'Héros inconnu'}), dans le thème "${input.theme}".`;

  // Préparer l'input pour le flow Genkit
  const flowInput = {
    ...input, // Contient theme, playerName, playerGender, selectedHeroValue, maxTurns
    subThemePrompt: effectiveSubThemePrompt,
    heroDescription: heroFullDescription, // Passé pour que l'IA puisse l'utiliser dans la narration/image
    // Préparer la description de l'inventaire de départ pour le prompt
    startingInventoryDescription: heroDetails.startingInventory.length > 0 
      ? `Tu commences avec : ${heroDetails.startingInventory.map(item => `${item.name} (x${item.quantity})`).join(', ')}.` 
      : "Tu commences sans aucun objet.",
  };

  await logToFile({ level: 'info', message: '[AI_REQUEST_INIT_STORY] Input to generateInitialStoryFlow', payload: flowInput, excludeMedia: true });
  
  // Appel du flow Genkit. Le flow lui-même calculera heroAbilities et construira l'état initial.
  const result = await generateInitialStoryFlow(flowInput); 
  
  await logToFile({ level: 'info', message: '[AI_RESPONSE_INIT_STORY] Output from generateInitialStoryFlow', payload: result, excludeMedia: true });
  return result;
}

// Schema de sortie simplifié pour le prompt, ne contient plus updatedGameState
const InitialStoryPromptOutputSchema = z.object({
  story: z.string(),
  choices: z.array(z.string()),
  location: z.string(),
  generatedImagePrompt: z.string().optional(),
});

const initialStoryPrompt = ai.definePrompt({
  name: 'initialStoryPrompt',
  input: { schema: GenerateInitialStoryInputSchema },
  output: { schema: InitialStoryPromptOutputSchema }, // Utilise le schéma simplifié
  prompt: await promptTemplatePromise,
});


const generateInitialStoryFlow = ai.defineFlow(
  {
    name: 'generateInitialStoryFlow',
    inputSchema: GenerateInitialStoryInputSchema,
    outputSchema: GenerateInitialStoryOutputSchema, // Le flow retourne toujours le schéma complet avec initialGameStateJson
  },
  async (flowInput) => { // Signature standard (input, streamingCallback?)
    if (!flowInput.theme || !flowInput.playerName || !flowInput.playerGender || !flowInput.selectedHeroValue || !flowInput.heroDescription) {
      await logToFile({ level: 'error', message: '[VALIDATION_ERROR] Initial story generation - missing required fields', payload: flowInput, excludeMedia: true });
      throw new Error("Theme, playerName, playerGender, selectedHeroValue, et heroDescription sont requis pour la génération de l'histoire initiale.");
    }

    // --- Calcul des heroAbilities DÉPLACÉ À L'INTÉRIEUR du flow ---
    let heroDetails = themedHeroOptions[flowInput.theme as ThemeValue]?.find(h => h.value === flowInput.selectedHeroValue);
    if (!heroDetails) {
        heroDetails = defaultHeroOptions.find(h => h.value === flowInput.selectedHeroValue);
    }
    if (!heroDetails) {
      // Cette erreur ne devrait pas se produire si l'input est valide, mais sécurité
      throw new Error(`Détails du héros non trouvés DANS LE FLOW pour la valeur: ${flowInput.selectedHeroValue}`);
    }
    const heroAbilitiesForGameState: HeroAbilityState[] = heroDetails.abilities.map(ability => ({
      name: ability.label,
      description: `Habileté: ${ability.label}`, 
      status: 'disponible',
    }));
    // --- Fin du calcul déplacé ---
    
    const promptText = await promptTemplatePromise;
    if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
      await logToFile({ level: 'error', message: '[CRITICAL_ERROR] Initial story prompt template is empty or invalid.', excludeMedia: true });
      throw new Error("Le template de prompt pour l'histoire initiale est vide ou invalide.");
    }

    let debugPromptString = promptText;
    const placeholders: Record<keyof GenerateInitialStoryInput, string | number | undefined | null> = {
        theme: flowInput.theme,
        subThemePrompt: flowInput.subThemePrompt || 'N/A (aucun scénario spécifique choisi)',
        playerName: flowInput.playerName,
        playerGender: flowInput.playerGender,
        selectedHeroValue: flowInput.selectedHeroValue,
        heroDescription: flowInput.heroDescription,
        startingInventoryDescription: flowInput.startingInventoryDescription, // Ajouté
        maxTurns: flowInput.maxTurns,
        imageStyle: flowInput.imageStyle, // Ajouté
    };

    for (const key in placeholders) {
        const placeholderKey = key as keyof GenerateInitialStoryInput;
        const value = placeholders[placeholderKey];
        const replacementValue = typeof value === 'number' ? String(value) : (value || '');
        debugPromptString = debugPromptString.replace(new RegExp(`{{{${placeholderKey}}}}`, 'g'), replacementValue);
    }

    // Appel du prompt simplifié
    const { output } = await initialStoryPrompt(flowInput);

    // Validation de la sortie du prompt simplifié
    if (
      !output ||
      typeof output.story !== 'string' ||
      !Array.isArray(output.choices) ||
      output.choices.length === 0 ||
      typeof output.location !== 'string' ||
      !output.location.trim()
    ) {
      await logToFile({
        level: 'error',
        message: '[AI_OUTPUT_INVALID] Format invalide reçu de l\'IA pour l\'histoire initiale (prompt simplifié)',
        payload: output,
        excludeMedia: true,
      });
      const missingFields = [];
      if (typeof output?.story !== 'string') missingFields.push('story');
      if (!Array.isArray(output?.choices) || output?.choices.length === 0) missingFields.push('choices');
      if (typeof output?.location !== 'string' || !output?.location?.trim()) missingFields.push('location');
      if (output?.generatedImagePrompt !== undefined && typeof output.generatedImagePrompt !== 'string') {
        missingFields.push('generatedImagePrompt (type invalide)');
      }
      throw new Error(
        `Format invalide reçu de l'IA pour l'histoire initiale (prompt simplifié). Champs manquants ou invalides: ${missingFields.join(', ')}`
      );
    }

    // Construction de l'état initial du jeu côté serveur
    const initialGameState: CurrentGameState = {
        playerName: flowInput.playerName,
        // playerGender: flowInput.playerGender, // Pas dans CurrentGameState mais dans GameState global
        location: output.location,
        inventory: heroDetails.startingInventory || [], // Utilise l'inventaire de départ du héros
        heroAbilities: heroAbilitiesForGameState, // Utilise les habiletés préparées
        relationships: {},
        emotions: [],
        events: ["aventure_commencee"],
    };

    // Conversion en chaîne JSON
    const initialGameStateJson = JSON.stringify(initialGameState);

    // Validation simple du JSON généré (devrait toujours être valide)
    try {
        JSON.parse(initialGameStateJson);
    } catch (e) {
         // Correction de l'appel à logToFile : pas de champ 'error'
         await logToFile({ 
            level: 'error', 
            message: `[SERVER_ERROR] Échec de la sérialisation de initialGameStateJson. Error: ${e instanceof Error ? e.message : String(e)}`, 
            payload: initialGameState, 
            excludeMedia: true 
         });
         throw new Error(`Échec de la sérialisation de l'état initial du jeu côté serveur: ${e instanceof Error ? e.message : String(e)}`);
    }


    if (!output.choices.every(choice => typeof choice === 'string')) {
      await logToFile({ level: 'error', message: '[AI_OUTPUT_INVALID] Format de choix invalide reçu de l\'IA', payload: output.choices, excludeMedia: true });
      throw new Error("Format invalide reçu de l'IA pour les choix.");
    }
    if (output.generatedImagePrompt !== undefined && output.generatedImagePrompt !== null && typeof output.generatedImagePrompt === 'string' && !output.generatedImagePrompt.trim()) {
      await logToFile({ level: 'warn', message: '[AI_OUTPUT_WARN] L\'IA a retourné un generatedImagePrompt vide, le définissant à undefined.', payload: output.generatedImagePrompt, excludeMedia: true });
      output.generatedImagePrompt = undefined;
    }

    // Retourner l'objet complet attendu par GenerateInitialStoryOutputSchema
    return {
        story: output.story,
        choices: output.choices,
        location: output.location,
        generatedImagePrompt: output.generatedImagePrompt,
        initialGameStateJson: initialGameStateJson, // Retourne l'état initial généré ici
        initialPromptDebug: debugPromptString,
    };
  }
);

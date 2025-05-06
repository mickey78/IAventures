'use server';

/**
 * @fileOverview Génère le contenu de l'histoire en fonction du thème choisi, des choix du joueur, de l'inventaire, du nom du joueur, du lieu, de la classe du héros et du numéro de tour. Il peut également suggérer un prompt d'image pour les moments visuels importants, en visant la cohérence. Inclut la gestion des relations, des émotions et des combats simples basés sur des choix et les capacités du héros.
 *
 * - generateStoryContent - Fonction qui génère le contenu de l'histoire.
 * - GenerateStoryContentInput - Type d'entrée pour la fonction generateStoryContent.
 * - GenerateStoryContentOutput - Type de retour pour la fonction generateStoryContent.
 */
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { StorySegment, ParsedGameState } from '@/types/game'; // Importer les types partagés
import { parseGameState, safeJsonStringify } from '@/lib/gameStateUtils'; // Importer l'aide
import { heroOptions } from '@/config/heroes'; // Importer les options de héros pour obtenir la description et l'apparence
import { logToFile } from '@/services/loggingService'; 
import { readPromptFile } from '@/lib/prompt-utils'; 

const promptTemplatePromise = readPromptFile('generateStoryContentPrompt.prompt'); // Charger le template depuis le fichier

const GenerateStoryContentInputSchema = z.object({
  theme: z
    .string()
    .describe(
      "Le thème de l'histoire (ex: Fantasy Médiévale, Exploration Spatiale, Pirates des Caraïbes, Western et Cowboys, Mystère et Enquête, École des Super-Héros, Histoire d'Amour, Piégé dans le Jeu, Survie Post-Apocalyptique)"
    ),
  playerName: z.string().describe('Le nom du joueur.'),
  selectedHeroValue: z.string().describe("La classe de héros choisie par le joueur (ex: 'Guerrier')."),
  heroDescription: z.string().describe("La description complète du héros, incluant ses capacités et son apparence."), 
  lastStorySegment: z.object({
      id: z.number(),
      text: z.string(),
      speaker: z.enum(['player', 'narrator']),
      storyImageUrl: z.string().url().optional().nullable(),
      imageGenerationPrompt: z.string().optional().nullable(),
  }).optional().describe("Le tout dernier segment de l'histoire pour un contexte immédiat et une cohérence potentielle de l'image."),
  playerChoicesHistory: z.array(z.string()).optional().describe("L'historique des choix du joueur. Le TOUT DERNIER élément est le choix le plus récent auquel l'IA doit réagir."),
  gameState: z.string().optional().describe('Une chaîne JSON représentant l\'état actuel du jeu. Commencez avec une chaîne d\'objet vide si non défini.'),
  currentTurn: z.number().int().positive().describe('Le numéro du tour actuel (commence à 1).'),
  maxTurns: z.number().int().positive().describe("Le nombre maximum de tours pour cette aventure."),
  isLastTurn: z.boolean().describe('Indique si c\'est le dernier tour de l\'aventure.'),
  current_date: z.string().optional().describe('Date actuelle, injectée pour des éléments potentiels de l\'histoire.'), 
  previousImagePrompt: z.string().nullable().optional().describe("Le prompt utilisé pour l'image générée précédemment, le cas échéant, pour la cohérence visuelle."), 
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe("Le contenu de l'histoire généré. Si c'est le dernier tour, ce devrait être la conclusion."),
  nextChoices: z.array(z.string()).describe("2-3 choix pour la prochaine action. Tableau vide si c'est le dernier tour."),
  updatedGameState: z.string().describe("L'état du jeu mis à jour en JSON valide."),
  generatedImagePrompt: z.string().optional().describe("Prompt d'image UNIQUEMENT si scène visuellement distincte. DOIT être cohérent avec les images précédentes (description et style du héros). Inclure thème, lieu, nom du joueur {{{playerName}}}, CLASSE du héros {{{selectedHeroValue}}}, et DESCRIPTION DÉTAILLÉE de l'apparence du héros ({{{heroDescription}}}). Style: Réaliste. Laisser vide sinon."),
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;


export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  let initialGameState: ParsedGameState;
  try {
    initialGameState = parseGameState(input.gameState, input.playerName);
  } catch (e) {
    await logToFile({ level: 'warn', message: '[INPUT_VALIDATION] Invalid input gameState JSON, using defaults', payload: { gameState: input.gameState, error: e }, excludeMedia: true });
    initialGameState = {
        playerName: input.playerName || 'Unknown Player',
        location: 'Unknown Location',
        inventory: [],
        relationships: {},
        emotions: [],
        events: [],
    };
  }

  if (!initialGameState.playerName) initialGameState.playerName = input.playerName || 'Unknown Player';
  if (typeof initialGameState.location !== 'string' || !initialGameState.location.trim()) initialGameState.location = 'Unknown Location';
  if (!Array.isArray(initialGameState.inventory)) initialGameState.inventory = [];
  if (typeof initialGameState.relationships !== 'object' || initialGameState.relationships === null) initialGameState.relationships = {};
  if (!Array.isArray(initialGameState.emotions)) initialGameState.emotions = [];
  if (!Array.isArray(initialGameState.events)) initialGameState.events = [];


  const heroDetails = heroOptions.find(h => h.value === input.selectedHeroValue);
  if (!heroDetails) {
      await logToFile({ level: 'error', message: `[CONFIG_ERROR] Hero details not found for value: ${input.selectedHeroValue}`, excludeMedia: true });
      throw new Error(`Invalid hero selected: ${input.selectedHeroValue}`);
  }

  const heroFullDescription = `${heroDetails.description} Habiletés: ${heroDetails.abilities.map(a => a.label).join(', ')}. Apparence: ${heroDetails.appearance || 'Apparence typique de sa classe.'}`;

  const safeInput = {
    ...input,
    gameState: safeJsonStringify(initialGameState),
    playerChoicesHistory: input.playerChoicesHistory || [],
    lastStorySegmentText: input.lastStorySegment?.text || "C'est le début de l'aventure.",
    previousImagePrompt: input.lastStorySegment?.imageGenerationPrompt || null,
    heroDescription: heroFullDescription,
    current_date: new Date().toLocaleDateString('fr-FR'), 
  };

  await logToFile({ level: 'info', message: '[AI_REQUEST] generateStoryContentFlow - Input', payload: safeInput, excludeMedia: true });
  const result = await generateStoryContentFlow(safeInput);
  await logToFile({ level: 'info', message: '[AI_RESPONSE] generateStoryContentFlow - Output', payload: result, excludeMedia: true });
  return result;
}

const storyContentPrompt = ai.definePrompt({
  name: 'generateStoryContentPrompt',
  input: {
    schema: GenerateStoryContentInputSchema,
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  prompt: await promptTemplatePromise, // Utiliser le template chargé
});


const generateStoryContentFlow = ai.defineFlow(
{
  name: 'generateStoryContentFlow',
  inputSchema: GenerateStoryContentInputSchema,
  outputSchema: GenerateStoryContentOutputSchema,
},
async (flowInput) => {

   if (!flowInput.theme || !flowInput.playerName || !flowInput.selectedHeroValue || !flowInput.heroDescription || !flowInput.gameState || flowInput.currentTurn === undefined || !flowInput.maxTurns) {
       await logToFile({ level: 'error', message: '[VALIDATION_ERROR] Story content generation - missing required fields', payload: flowInput, excludeMedia: true });
       throw new Error("Theme, playerName, selectedHeroValue, heroDescription, gameState, et informations de tour sont requis.");
   }
    const promptText = await promptTemplatePromise;
    if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
      await logToFile({ level: 'error', message: '[CRITICAL_ERROR] Story content prompt template is empty or invalid.', excludeMedia: true });
      throw new Error("Le template de prompt pour le contenu de l'histoire est vide ou invalide.");
    }

   const safePlayerChoicesHistory = flowInput.playerChoicesHistory || [];
   if (safePlayerChoicesHistory.length === 0 && !flowInput.lastStorySegmentText?.includes("début") && flowInput.currentTurn > 1) {
       await logToFile({ level: 'warn', message: '[INPUT_WARN] generateStoryContent appelé avec un historique de choix vide en milieu de partie.', payload: { currentTurn: flowInput.currentTurn }, excludeMedia: true });
   }

    let currentGameStateObj: ParsedGameState;
    try {
        currentGameStateObj = parseGameState(flowInput.gameState, flowInput.playerName);
    } catch (e) {
        await logToFile({ level: 'error', message: '[JSON_PARSE_ERROR] JSON gameState d\'entrée invalide, réinitialisation aux valeurs par défaut', payload: {gameState: flowInput.gameState, error: e }, excludeMedia: true});
        currentGameStateObj = {
            playerName: flowInput.playerName || 'Unknown Player',
            location: 'Unknown Location',
            inventory: [],
            relationships: {},
            emotions: [],
            events: []
        };
    }

    const shouldGenerateEvent = Math.random() < 0.15; // 15% chance for a random event
    if (shouldGenerateEvent && flowInput.currentTurn > 1 && !flowInput.isLastTurn) { 
        const events = [
            "Une pluie torrentielle s'abat soudainement, rendant le sol glissant.",
            "Un léger tremblement de terre secoue le sol, ouvrant une petite fissure non loin.",
            "Un étrange marchand ambulant avec un chariot plein de curiosités apparaît au loin.",
            "Tu découvres une inscription ancienne et à moitié effacée sur un rocher ou un mur.",
            "Une créature inconnue et rapide passe en coup de vent, laissant une traînée de poussière.",
            "Tu entends un appel à l'aide étouffé venant d'une direction incertaine.",
            "Une musique mystérieuse et envoûtante flotte dans l'air, semblant t'appeler.",
            "Un brouillard épais et soudain commence à se lever, réduisant la visibilité.",
            "Tu trouves une petite bourse remplie de quelques pièces étranges.",
            "Le ciel change de couleur de manière spectaculaire pendant quelques instants.",
            "Un PNJ que tu as déjà rencontré réapparaît de manière inattendue.",
            "Un objet de ton inventaire se met à briller ou à vibrer faiblement."
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        if (!Array.isArray(currentGameStateObj.events)) {
            currentGameStateObj.events = [];
        }
        currentGameStateObj.events.push(`Événement aléatoire (${currentGameStateObj.location || 'unknown location'}) : ${randomEvent}`);
        await logToFile({ level: 'info', message: '[GAME_EVENT] Random event triggered', payload: { event: randomEvent, location: currentGameStateObj.location }, excludeMedia: true});
    }

    if (!currentGameStateObj.playerName) currentGameStateObj.playerName = flowInput.playerName || 'Unknown Player';
    if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Indeterminate Location';
    if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
    if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
    if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
    if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];

    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);

    const promptPayload = {
      ...flowInput,
      playerChoicesHistory: safePlayerChoicesHistory,
      gameState: validatedInputGameStateString,
      lastStorySegmentText: flowInput.lastStorySegmentText || (safePlayerChoicesHistory.length > 0 ? safePlayerChoicesHistory[safePlayerChoicesHistory.length - 1] : "C'est le début de l'aventure."),
    };

  const { output } = await storyContentPrompt(promptPayload);


   if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        await logToFile({ level: 'error', message: '[AI_OUTPUT_INVALID] Format invalide reçu de l\'IA pour le contenu de l\'histoire', payload: output, excludeMedia: true });
        return {
            storyContent: "Oups ! Le narrateur semble avoir perdu le fil de l'histoire à cause d'une interférence cosmique. Essayons autre chose.",
            nextChoices: flowInput.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier mon inventaire"],
            updatedGameState: validatedInputGameStateString,
            generatedImagePrompt: undefined,
        };
    }

    if (flowInput.isLastTurn && output.nextChoices.length > 0) {
        await logToFile({ level: 'warn', message: '[AI_OUTPUT_WARN] L\'IA a retourné des choix au dernier tour. Remplacement par un tableau vide.', payload: { choices: output.nextChoices }, excludeMedia: true });
        output.nextChoices = [];
    }
     if (!flowInput.isLastTurn && output.nextChoices.length === 0 && output.storyContent.length > 0 && !output.storyContent.toLowerCase().includes("attendre")) {
         await logToFile({ level: 'warn', message: '[AI_OUTPUT_WARN] L\'IA a retourné des choix vides lors d\'un tour normal sans attente explicite. Fourniture de choix de secours.', payload: { storyContent: output.storyContent }, excludeMedia: true });
         output.nextChoices = ["Regarder autour de moi", "Vérifier mon inventaire"];
         output.storyContent += "\n(Le narrateur semble chercher ses mots... Que fais-tu en attendant ?)";
     }
     if (output.generatedImagePrompt !== undefined && typeof output.generatedImagePrompt !== 'string') {
          await logToFile({ level: 'warn', message: '[AI_OUTPUT_WARN] L\'IA a retourné un format generatedImagePrompt invalide. Définition à undefined.', payload: { generatedImagePrompt: output.generatedImagePrompt }, excludeMedia: true});
          output.generatedImagePrompt = undefined;
     } else if (typeof output.generatedImagePrompt === 'string' && !output.generatedImagePrompt.trim()) {
          await logToFile({ level: 'warn', message: '[AI_OUTPUT_WARN] L\'IA a retourné une chaîne generatedImagePrompt vide. Définition à undefined.', excludeMedia: true });
          output.generatedImagePrompt = undefined;
     }


    let updatedGameStateObj: ParsedGameState;
    try {
        updatedGameStateObj = parseGameState(output.updatedGameState, flowInput.playerName || 'Unknown Player');
        if (updatedGameStateObj.playerName !== (flowInput.playerName || 'Unknown Player')) {
            await logToFile({ level: 'warn', message: '[AI_BEHAVIOR] AI changed playerName in updatedGameState. Reverting to original.', payload: { originalName: flowInput.playerName, aiName: updatedGameStateObj.playerName }, excludeMedia: true});
            updatedGameStateObj.playerName = flowInput.playerName || 'Unknown Player';
        }

    } catch (e) {
        await logToFile({ level: 'error', message: '[JSON_PARSE_ERROR] Error processing updatedGameState from AI', payload: {updatedGameState: output.updatedGameState, error: e }, excludeMedia: true});
        updatedGameStateObj = parseGameState(validatedInputGameStateString, flowInput.playerName || 'Unknown Player');
        output.storyContent += "\n(Attention : L'état du jeu pourrait ne pas être à jour suite à une petite erreur technique.)";
        output.nextChoices = flowInput.isLastTurn ? [] : ["Regarder autour", "Vérifier inventaire"];
        output.generatedImagePrompt = undefined;
    }

    output.updatedGameState = safeJsonStringify(updatedGameStateObj);

    if (!output.nextChoices.every(choice => typeof choice === 'string')) {
        await logToFile({ level: 'error', message: '[AI_OUTPUT_INVALID] Format de choix invalide reçu de l\'IA après validation gameState', payload: output.nextChoices, excludeMedia: true });
        output.nextChoices = flowInput.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier l'inventaire"];
        output.storyContent += "\n(Le narrateur a eu un petit bug en proposant les choix...)";
    }

  return output;
});
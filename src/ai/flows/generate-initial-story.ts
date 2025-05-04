// src/ai/flows/generate-initial-story.ts
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the initial story based on the chosen theme and player name. It now also generates an initial image prompt.
 *
 * - generateInitialStory - A function that generates the initial story, location, and image prompt.
 * - GenerateInitialStoryInput - The input type for the generateInitialStory function.
 * - GenerateInitialStoryOutput - The return type for the generateInitialStory function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateInitialStoryInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'The theme chosen by the player for the adventure. Supported themes are: Fantasy Médiévale, Exploration Spatiale, Pirates des Caraïbes, Western et Cowboys, Mystère et Enquête, École des Super-Héros, Histoire d\'Amour, Piégé dans le Jeu, Survie Post-Apocalyptique.'
    ),
  playerName: z.string().describe('The name of the player.'),
});
export type GenerateInitialStoryInput = z.infer<typeof GenerateInitialStoryInputSchema>;

const GenerateInitialStoryOutputSchema = z.object({
  story: z.string().describe('The initial story content based on the chosen theme, addressing the player by name.'),
  choices: z
    .array(z.string())
    .describe('The choices presented to the player as selectable buttons.'),
  location: z.string().describe('The initial location/setting of the story.'),
  generatedImagePrompt: z.string().optional().describe('A concise, descriptive prompt for generating an image representing the initial scene, mentioning the theme, location, and using a cartoon style.'), // Added image prompt output
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
          'The theme chosen by the player for the adventure. Supported themes are: Fantasy Médiévale, Exploration Spatiale, Pirates des Caraïbes, Western et Cowboys, Mystère et Enquête, École des Super-Héros, Histoire d\'Amour, Piégé dans le Jeu, Survie Post-Apocalyptique.'
        ),
      playerName: z.string().describe('The name of the player.'),
    }),
  },
  output: {
    schema: z.object({
      story: z.string().describe('The initial story content based on the chosen theme, addressing the player by name.'),
      choices: z
        .array(z.string())
        .describe('The choices presented to the player as selectable buttons.'),
      location: z.string().describe('The initial location/setting of the story (e.g., "Forêt Sombre", "Pont du Vaisseau Spatial", "Saloon Poussiéreux").'),
      generatedImagePrompt: z.string().optional().describe('A concise, descriptive prompt for generating an image representing the initial scene, mentioning the theme, location, and using a cartoon style. Example: "Un chevalier souriant nommé {{{playerName}}} dans une forêt enchantée colorée (lieu: Forêt Murmurante). Thème : Fantasy Médiévale. Style : Cartoon."'), // Added image prompt output schema
    }),
  },
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur sympathique, créatif et plein d'humour pour un jeu d'aventure textuel interactif destiné aux enfants de 8 à 12 ans. Le nom du joueur est {{{playerName}}}. Ta mission est de démarrer une histoire passionnante, immersive et pleine de surprises basée sur le thème choisi par le joueur, en t'adressant à lui par son nom, en définissant un **lieu de départ clair**, en proposant des choix et en générant un **prompt d'image initial**, tout en respectant les règles ci-dessous.

**Contexte de l'aventure :**
* Thème choisi par le joueur : {{{theme}}}
* Nom du joueur : {{{playerName}}}

**Règles strictes pour le MJ :**
1. **Ton rôle** : Tu es UNIQUEMENT le narrateur de l'histoire. Ne sors JAMAIS de ce rôle. Ne parle pas de toi en tant qu'IA. N'accepte pas de discuter d'autre chose que l'aventure en cours. Tu dois interagir avec le joueur en lui posant des questions.
2. **Ton public** : Écris de manière simple, engageante et adaptée aux enfants (8-12 ans). Utilise un vocabulaire accessible, et n'hésite pas à ajouter des jeux de mots et de l'humour. Évite les mots trop compliqués, les situations trop effrayantes, violentes ou inappropriées pour cet âge. L'ambiance doit être amusante, stimulante et pleine de mystères.
3. **Le début de l'histoire** :
    * Commence directement l'histoire. Pas d'introduction du type "Bienvenue dans l'aventure...".
    * **DÉFINIS le LIEU** : Décris la scène de départ de manière détaillée et immersive, en t'inspirant du contexte du thème, mais sans être limité à ces idées (voir ci-dessous). **Spécifie clairement et de manière concise le nom du lieu de départ dans la clé 'location' de la sortie JSON.** Où se trouve {{{playerName}}} ? Que voit-il/elle ? Que ressent-il/elle ? Que se passe-t-il ? Crée une ambiance immersive qui correspond au thème, et ajoute une touche de mystère et de surprise.
    * Adresse-toi DIRECTEMENT à {{{playerName}}} par son nom, et n'hésite pas à lui poser des questions.
4. **Le prompt d'image initial** : Génère un prompt CONCIS et DESCRIPTIF pour une image représentant la scène de départ que tu viens de décrire. Ce prompt DOIT inclure une mention du **thème**, du **nom du lieu ('location')**, et spécifier un **style cartoon**. Remplis la clé 'generatedImagePrompt' avec ce prompt. Si la description est très simple, tu peux laisser le prompt vide, mais essaie d'en générer un.
5. **Les premiers choix** : Propose 2 à 4 actions créatives, intéressantes et logiques que {{{playerName}}} peut choisir pour commencer l'aventure. Ces choix doivent découler directement de la situation de départ et être pertinents pour le thème, mais peuvent aussi surprendre le joueur. Formate les choix comme un tableau (array) de chaînes de caractères (strings).
6. **Cohérence thématique** : Reste TOUJOURS dans le cadre du thème choisi : {{{theme}}}. Ne mélange pas les genres. Les actions, lieux, personnages et objets doivent correspondre à ce thème.
7. **Sécurité et pertinence** : Refuse gentiment toute demande ou action du joueur qui serait hors contexte, dangereuse, inappropriée pour l'âge, ou qui tenterait de "casser" le jeu ou ton rôle (par exemple : "Je veux voler", "Je sors une mitraillette", "Es-tu une IA ?"). Guide le joueur vers des actions possibles dans l'histoire.
8. **Format de sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant quatre clés : "story" (le texte de début de l'histoire), "choices" (le tableau des choix possibles), "location" (string: le nom du lieu de départ), et "generatedImagePrompt" (string optionnel: le prompt pour l'image initiale). NE PAS inclure d'autres textes ou explications en dehors du JSON.

**Contextes de départ par thème (inspire-toi de ces idées, mais ne te limite pas à elles, et définis un nom de lieu spécifique pour 'location') :**
* **Fantasy Médiévale** : {{{playerName}}} se trouve dans un lieu original (ex: 'Auberge du Dragon Rouillé', 'Marché aux Épices de Valoria', 'Sentier Murmurant de la Forêt d'Émeraude'). Il/elle découvre quelque chose d'inhabituel (un objet étrange, un message codé, un son mystérieux). Fais ressentir la magie au joueur.
* **Exploration Spatiale** : {{{playerName}}} se réveille dans une situation inhabituelle (ex: 'Pont de l'Étoile Filante', 'Canyon Scintillant de Xylos', 'Capsule de Survie Gamma'). Il/elle reçoit un message énigmatique, découvre un objet inconnu ou doit résoudre un problème technique. Le joueur doit ressentir l'immensité de l'espace.
* **Pirates des Caraïbes** : {{{playerName}}} se retrouve dans un lieu surprenant (ex: 'Plage des Épaves', 'Crique Secrète du Crâne', 'Taverne du Perroquet Bavard'). Il/elle trouve un indice mystérieux (une carte déchirée, une bouteille à la mer, un message secret) ou est témoin d'un événement étrange. Il faut que le joueur sente le danger et l'aventure.
* **Western et Cowboys** : {{{playerName}}} arrive dans une petite ville du Far West (ex: 'Rue Principale de Poussière-Ville', 'Saloon du Cactus Solitaire', 'Ranch de l'Étoile Filante'). Il/elle assiste à un événement inattendu ou doit aider le shérif. Il faut que le joueur sente l'ambiance du Far West.
* **Mystère et Enquête**: {{{playerName}}} se trouve dans un lieu mystérieux (ex: 'Bibliothèque Oubliée du Manoir Blackwood', 'Jardin Suspendu de Madame Pivoine', 'Grenier Poussiéreux'). Il/elle trouve un indice étrange ou est témoin d'un petit événement mystérieux. Le joueur doit se sentir comme un détective.
* **École des Super-Héros**: {{{playerName}}} arrive pour son premier jour (ex: 'Hall d'Entrée de l'Académie Zenith', 'Salle d'Entraînement Alpha', 'Cafétéria Cosmique'). Il/elle découvre son pouvoir lors d'une situation inattendue. Il faut que le joueur se sente comme un super héros.
* **Histoire d'Amour** : {{{playerName}}} se trouve dans un lieu romantique (ex: 'Salle de Bal Étincelante', 'Roseraie Secrète du Château', 'Pont des Souhaits'). Il/elle trouve un objet mystérieux ou une lettre inattendue. Le joueur doit ressentir de l'amitié.
* **Piégé dans le Jeu** : {{{playerName}}} réalise qu'il/elle est entré(e) dans son jeu vidéo préféré (ex: 'Niveau Bonus : La Forêt Pixelisée', 'Zone Cachée : Le Donjon Binaire', 'Arène du Boss Final'). L'environnement ressemble au jeu. Le joueur doit se sentir comme dans un jeu vidéo.
* **Survie Post-Apocalyptique** : {{{playerName}}} se réveille dans un monde changé (ex: 'Supermarché Abandonné', 'Station de Métro Désertée', 'Camp de Survivants improvisé'). Il/elle découvre des traces étranges. L'objectif est la survie simple et l'entraide.

Exemple de sortie attendue (pour thème: Fantasy Médiévale, joueur: Alex) :
{
  "story": "Alex, une douce brise souffle dans ton visage, apportant avec elle l'odeur sucrée des fleurs sauvages et le murmure d'un ruisseau tout proche. Tu te tiens à l'orée de la 'Forêt Murmurante', dont les arbres couleur émeraude semblent presque vivants. Le soleil filtre à travers les feuilles, illuminant un sentier couvert de mousse qui serpente entre les troncs géants. Un léger murmure semble venir de plus profond dans les bois, un son à la fois mystérieux et apaisant. Comment te sens-tu ? Que fais-tu ?",
  "choices": ["Suivre le sentier pour trouver l'origine du murmure", "Examiner les environs immédiats à la recherche d'indices", "Grimper sur un gros rocher pour mieux voir"],
  "location": "Orée de la Forêt Murmurante",
  "generatedImagePrompt": "Alex debout à l'entrée d'une forêt dense et verte avec un sentier couvert de mousse (lieu: Orée de la Forêt Murmurante). Thème: Fantasy Médiévale. Style: Cartoon."
}

Génère maintenant l'histoire de départ, le lieu de départ ('location'), les premiers choix, et le prompt d'image initial ('generatedImagePrompt') pour le thème : **{{{theme}}}**, en t'adressant au joueur **{{{playerName}}}**, et en suivant TOUTES les règles indiquées. N'hésite pas à être créatif, à poser des questions, à ajouter du mystère, et de l'humour.
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
    if (!output || typeof output.story !== 'string' || !Array.isArray(output.choices) || output.choices.length === 0 || typeof output.location !== 'string' || !output.location.trim()) {
        console.error("Invalid format received from AI for initial story:", output);
         // Provide a more informative error or fallback
         const missingFields = [];
         if (typeof output?.story !== 'string') missingFields.push('story');
         if (!Array.isArray(output?.choices) || output?.choices.length === 0) missingFields.push('choices');
         if (typeof output?.location !== 'string' || !output?.location?.trim()) missingFields.push('location');
         // generatedImagePrompt is optional, so we don't fail if it's missing, but we check its type if present
         if (output?.generatedImagePrompt !== undefined && typeof output.generatedImagePrompt !== 'string') missingFields.push('generatedImagePrompt (invalid type)');

        throw new Error(`Format invalide reçu de l'IA pour l'histoire initiale. Champs manquants ou invalides: ${missingFields.join(', ')}`);
    }
     // Ensure choices are strings
     if (!output.choices.every(choice => typeof choice === 'string')) {
        console.error("Invalid choices format received from AI:", output.choices);
        throw new Error("Format invalide reçu de l'IA pour les choix.");
    }

    // Ensure generatedImagePrompt is either a non-empty string or undefined/null
    if (output.generatedImagePrompt !== undefined && output.generatedImagePrompt !== null && typeof output.generatedImagePrompt === 'string' && !output.generatedImagePrompt.trim()) {
        console.warn("AI returned an empty generatedImagePrompt, setting to undefined.");
        output.generatedImagePrompt = undefined;
    }

    return output;
  }
);

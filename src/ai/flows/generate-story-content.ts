
'use server';

/**
 * @fileOverview Génère le contenu de l'histoire en fonction du thème choisi, des choix du joueur, de l'inventaire, du nom du joueur, du lieu et du numéro de tour. Il peut également suggérer un prompt d'image pour les moments visuels importants, en visant la cohérence. Inclut la gestion des relations, des émotions et des combats simples basés sur des choix et les capacités du héros.
 *
 * - generateStoryContent - Fonction qui génère le contenu de l'histoire.
 * - GenerateStoryContentInput - Type d'entrée pour la fonction generateStoryContent.
 * - GenerateStoryContentOutput - Type de retour pour la fonction generateStoryContent.
 */
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { StorySegment, ParsedGameState } from '@/types/game'; // Importer les types partagés
import { parseGameState, safeJsonStringify } from '@/lib/gameStateUtils'; // Importer l'aide
import { heroOptions } from '@/config/heroes'; // Importer les options de héros pour obtenir la description

const GenerateStoryContentInputSchema = z.object({
  theme: z
    .string()
    .describe(
      "Le thème de l'histoire (ex: Fantasy Médiévale, Exploration Spatiale, Pirates des Caraïbes, Western et Cowboys, Mystère et Enquête, École des Super-Héros, Histoire d'Amour, Piégé dans le Jeu, Survie Post-Apocalyptique)"
    ),
  playerName: z.string().describe('Le nom du joueur.'),
  selectedHeroValue: z.string().describe("La classe de héros choisie par le joueur (ex: 'Guerrier')."), // Passer la valeur du héros
  lastStorySegment: z.object({ // Ajouter le dernier segment de l'histoire pour le contexte
      id: z.number(),
      text: z.string(),
      speaker: z.enum(['player', 'narrator']),
      storyImageUrl: z.string().url().optional().nullable(), // Inclure l'URL optionnelle de l'image du segment précédent
      imageGenerationPrompt: z.string().optional().nullable(), // Inclure le prompt d'image précédent pour la cohérence
  }).optional().describe("Le tout dernier segment de l'histoire (choix du joueur ou texte du narrateur) pour un contexte immédiat et une cohérence potentielle de l'image."),
  playerChoicesHistory: z.array(z.string()).optional().describe("L'historique des choix du joueur effectués jusqu'à présent, classés par ordre chronologique. Le TOUT DERNIER élément est le choix le plus récent auquel l'IA doit réagir."),
  gameState: z.string().optional().describe('Une chaîne JSON représentant l\'état actuel du jeu (ex: {"playerName": "Alex", "location": "Entrée de la Grotte", "inventory": ["clé", "carte"], "relationships":{"Gobelin":"ennemi"}, "emotions":["prudent"], "events":["rencontré gobelin"]}). Commencez avec une chaîne d\'objet vide si non défini.'),
  currentTurn: z.number().int().positive().describe('Le numéro du tour actuel (commence à 1).'),
  maxTurns: z.number().int().positive().describe("Le nombre maximum de tours pour cette aventure."),
  isLastTurn: z.boolean().describe('Indique si c\'est le dernier tour de l\'aventure.'),
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe("Le contenu de l'histoire généré, décrivant le résultat de la dernière action du joueur et la situation actuelle, en s'adressant au joueur par son nom. Si c'est le dernier tour, ce devrait être le segment de conclusion."),
  nextChoices: z.array(z.string()).describe("2-3 choix clairs et simples pour la prochaine action du joueur, pertinents par rapport à la situation actuelle, au thème, à l'inventaire et aux capacités du héros. Devrait être un tableau vide si c'est le dernier tour."),
  updatedGameState: z.string().describe("L'état du jeu mis à jour sous forme de chaîne JSON, reflétant les changements basés sur la dernière action et la progression de l'histoire (y compris inventaire, lieu, relations, émotions). Doit être un JSON valide."),
  generatedImagePrompt: z.string().optional().describe("Un prompt concis et descriptif pour la génération d'images UNIQUEMENT si une scène visuellement distincte se produit. DOIT viser la cohérence avec les images précédentes (si `previousImagePrompt` existe), notamment l'apparence du personnage et le style. Inclure le thème, le lieu actuel, le nom du joueur et spécifier \"Style : Cartoon\". Laisser vide sinon."),
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

// Wrapper function to prepare input and call the flow
export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  let initialGameState: ParsedGameState; // Use ParsedGameState type
  try {
    initialGameState = parseGameState(input.gameState, input.playerName); // Use utility function
  } catch (e) {
    console.warn("Invalid input gameState JSON, using defaults:", input.gameState, e);
    // Ensure a proper default ParsedGameState structure
    initialGameState = {
        playerName: input.playerName || 'Unknown Player',
        location: 'Unknown Location',
        inventory: [],
        relationships: {},
        emotions: [],
        events: []
    };
  }

  // Ensure essential keys exist after parsing/defaulting
  if (!initialGameState.playerName) initialGameState.playerName = input.playerName || 'Unknown Player';
  if (typeof initialGameState.location !== 'string' || !initialGameState.location.trim()) initialGameState.location = 'Indeterminate Location';
  if (!Array.isArray(initialGameState.inventory)) initialGameState.inventory = [];
  if (typeof initialGameState.relationships !== 'object' || initialGameState.relationships === null) initialGameState.relationships = {};
  if (!Array.isArray(initialGameState.emotions)) initialGameState.emotions = [];
  if (!Array.isArray(initialGameState.events)) initialGameState.events = [];


  // Fetch hero description to include in the prompt
  const heroDetails = heroOptions.find(h => h.value === input.selectedHeroValue);
  if (!heroDetails) {
      // Handle case where hero isn't found (should not happen if validation is correct upstream)
      console.error(`Hero details not found for value: ${input.selectedHeroValue}`);
      throw new Error(`Invalid hero selected: ${input.selectedHeroValue}`);
  }
  // Construct the hero description string including abilities
  const heroDescription = `${heroDetails.description} Habiletés: ${heroDetails.abilities.map(a => a.label).join(', ')}.`;


  const safeInput = {
    ...input,
    gameState: safeJsonStringify(initialGameState), // Use the validated/defaulted object string
    playerChoicesHistory: input.playerChoicesHistory || [],
    lastStorySegmentText: input.lastStorySegment?.text || "C'est le début de l'aventure.", // Provide default text if segment missing
    previousImagePrompt: input.lastStorySegment?.imageGenerationPrompt || null, // Pass previous prompt
    heroDescription: heroDescription, // Add hero description to context
  };

  return generateStoryContentFlow(safeInput);
}

// Define the prompt with updated schema including heroDescription
const prompt = ai.definePrompt({
  name: 'generateStoryContentPrompt',
  input: {
    schema: z.object({
      theme: z.string().describe("Le thème de l'histoire."),
      playerName: z.string().describe('Le nom du joueur.'),
      selectedHeroValue: z.string().describe("La classe de héros choisie."), // Keep hero value
      heroDescription: z.string().describe("La description du héros incluant ses capacités."), // Add description
      lastStorySegmentText: z.string().describe("Le texte du tout dernier segment de l'histoire (joueur ou narrateur) pour un contexte immédiat."),
      previousImagePrompt: z.string().nullable().optional().describe("Le prompt utilisé pour l'image générée précédemment, le cas échéant, pour la cohérence visuelle (apparence du personnage, style)."),
      playerChoicesHistory: z.array(z.string()).describe("Historique des choix du joueur. Le TOUT DERNIER élément est le choix le plus récent auquel réagir."),
      gameState: z.string().describe('État actuel du jeu (chaîne JSON). Exemple: {"playerName":"Héros", "location":"Clairière Forestière", "inventory":["Épée","Potion"], "relationships":{"Gobelin":"ennemi"}, "emotions":["prudent"], "events":["épée trouvée", "rencontré Gobelin"]}'),
      current_date: z.string().describe('Date actuelle, injectée pour des éléments potentiels de l\'histoire.'),
      currentTurn: z.number().describe('Le numéro du tour actuel (commence à 1).'),
      maxTurns: z.number().describe('Le nombre maximum de tours.'),
      isLastTurn: z.boolean().describe('Indique si c\'est le dernier tour.'),
    }),
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  // --- Updated Prompt ---
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8-12 ans. Le nom du joueur est {{{playerName}}}, un(e) **{{{selectedHeroValue}}}** (Description/Habiletés : **{{{heroDescription}}}**). L'aventure dure au maximum {{{maxTurns}}} tours. Nous sommes actuellement au tour {{{currentTurn}}}. Ta mission est de continuer l'histoire de manière amusante, logique et **strictement cohérente avec le thème et les capacités du héros**, en te basant sur la **dernière action effectuée par le joueur**, l'état actuel du jeu (y compris **lieu**, **relations**, **émotions**), en gérant des **combats simples basés sur des choix**, en générant éventuellement un prompt d'image **consistant**, et en t'adressant au joueur par son nom.

**Contexte de l'Aventure :**
*   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
*   Nom du joueur : {{{playerName}}}
*   Classe du Héros : **{{{selectedHeroValue}}}**
*   Description/Habiletés du Héros : **{{{heroDescription}}}**  &lt;-- UTILISE CETTE INFO POUR ADAPTER LA NARRATION ET LES CHOIX
*   Tour Actuel : {{{currentTurn}}} / {{{maxTurns}}}
*   État actuel du jeu (chaîne JSON - analyse-le pour l'utiliser) : {{{gameState}}}
    *   Contient: 'playerName', 'location', 'inventory', 'relationships' (ex: {"PNJ1":"ami"}), 'emotions' (ex: ["courageux"]), 'events'.
*   Dernier segment de l'histoire : "{{{lastStorySegmentText}}}"
*   Prompt de l'image précédente (pour la cohérence, si applicable) : {{{previousImagePrompt}}}
*   Historique des actions du joueur (le **dernier élément** est l'action à laquelle tu dois réagir) :
    {{#if playerChoicesHistory}}
    {{#each playerChoicesHistory}}
    - {{{this}}}
    {{/each}}
    {{else}}
    C'est le tout début de l'aventure !
    {{/if}}

**Règles strictes pour ta réponse (MJ) :**

1.  **Réagis à la DERNIÈRE ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique de la **dernière action** de {{{playerName}}} (le dernier élément de {{{playerChoicesHistory}}}). Adresse-toi toujours à {{{playerName}}} par son nom.
    *   **Gestion Inventaire** : Si le choix implique un objet (trouver, utiliser, inspecter, lancer, jeter), gère l'inventaire dans updatedGameState. Ajoute si trouvé, retire si utilisé/lancé/jeté. Annonce les trouvailles/utilisations dans storyContent. Ex: "Tu utilises la clé... et elle se casse dans la serrure ! La clé a été retirée de ton inventaire." ou "Bravo, tu as trouvé une Potion de Saut ! Ajoutée à ton inventaire !".
    *   **Utilisation d'Habileté** : Si la dernière action est "Utiliser [Nom Habileté]", décris le résultat de l'utilisation de cette habileté **spécifique au héros {{{selectedHeroValue}}} ({{{heroDescription}}})** dans la situation actuelle. Ex: "Tu utilises ta Force Extrême (Guerrier) pour soulever le rocher..." ou "Tu lances un Sort d'Arcane (Magicien) et..."
2.  **Cohérence des Personnages**: Maintiens la personnalité des PNJ. Leurs réactions doivent dépendre des relationships du gameState (ami, ennemi, neutre). Un ennemi sera hostile, un ami serviable. Mets à jour 'relationships' si une action change la relation.
3.  **Cohérence des Lieux**: Souviens-toi des lieux. Si une action **change le lieu**, **mets à jour la clé 'location'** dans updatedGameState. Décris le nouveau lieu dans storyContent.
4.  **Chronologie &amp; Causalité**: Respecte l'ordre des événements ('events' du gameState). Les actions ont des conséquences.
5.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} (confirme le lieu en utilisant 'location' du gameState parsé) ? Que perçoit-il/elle ? Qu'est-ce qui a changé ? Que se passe-t-il maintenant ? Tiens compte des 'emotions' pour l'ambiance (ex: si {{{playerName}}} est 'effrayé', décris une ambiance plus tendue).
6.  **Gestion Actions Hors-Contexte/Impossibles** : Refuse GENTIMENT ou réinterprète les actions illogiques/hors thème/impossibles. Explique pourquoi ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici dans {{{gameState.location}}}'.") et propose immédiatement de nouvelles actions VALIDES via nextChoices (sauf si c'est le dernier tour).
7.  **GESTION DES COMBATS SIMPLES (8-12 ans)**:
    *   **Déclenchement**: Si le joueur rencontre un PNJ marqué comme "ennemi" dans 'relationships', ou si la situation devient hostile.
    *   **PAS de violence explicite**: Ne décris PAS de sang, de blessures graves ou de mort de manière graphique. Utilise des métaphores, suggère l'action. L'objectif est de résoudre la situation, pas de vaincre brutalement.
    *   **Proposer des Choix de Combat**: Au lieu d'une description de combat, propose 2-3 choix clairs orientés action :
        *   Exemples : "Essayer de distraire le garde", "Utiliser la Potion de Disparition", "Se cacher derrière le rocher", "Tenter de raisonner le dragon grincheux", "Esquiver l'attaque du robot", "Utiliser le Bouclier d'Énergie", "Proposer un échange au pirate".
        *   **Adapte les choix au thème, à l'inventaire, aux 'emotions' (un joueur 'effrayé' pourrait avoir des options de fuite/cachette) et aux HABILTÉS du héros ({{{heroDescription}}})**. Un Guerrier pourrait avoir "Charger l'ennemi", un Magicien "Lancer un sort de glace", un Voleur "Tenter une attaque furtive".
        *   **Mentionne explicitement les habiletés possibles si c'est pertinent.** Ex: "(Habileté Voleur) Tenter de crocheter la serrure pendant que le garde regarde ailleurs", "(Habileté Guerrier) Bloquer l'attaque avec le bouclier", "(Habileté Magicien) Envoyer une rafale de vent".
    *   **Résolution par l'IA**: Évalue le choix du joueur face à la situation. Un peu de chance peut intervenir. **Tiens compte des habiletés ({{{heroDescription}}}) pour influencer le résultat.** Un Guerrier aura plus de succès en chargeant qu'un Magicien.
        *   **Succès**: Décris comment l'action du joueur réussit à désamorcer, éviter ou surmonter l'obstacle/ennemi. Ex: "Ta distraction fonctionne ! Le garde regarde ailleurs, te laissant passer.", "La Potion te rend invisible, tu te faufiles sans bruit.", "Le dragon, amusé par ta proposition, te laisse passer.", "Grâce à ta Maîtrise du Bouclier (Guerrier), tu dévies l'attaque sans effort !"
        *   **Échec partiel/Rebondissement**: L'action ne réussit pas complètement, créant une nouvelle situation. Ex: "Tu te caches, mais le garde t'a presque vu ! Il s'approche...", "Ton bouclier bloque l'attaque, mais il est fissuré.", "Le pirate rit de ton offre, mais semble intrigué.", "Ton Sort d'Arcane (Magicien) manque de puissance et l'ennemi ricane."
    *   **Mise à jour État**: Mets à jour 'updatedGameState' (ex: relationships peut changer si l'ennemi est apaisé, emotions peuvent changer, objet utilisé retiré de inventory, location si fuite réussie). Ajoute un événement pertinent à events (ex: "a évité le combat avec le garde").
    *   **Prochains Choix**: Après la résolution, propose de nouveaux choix normaux pour continuer l'aventure (ou d'autres choix de combat si la situation persiste). **N'inclus PAS d'actions d'habileté directes dans 'nextChoices', le joueur les utilise via l'interface.**
8.  **GÉNÉRATION D'IMAGE PROMPT (Consistance & Pertinence)** :
    *   **Quand générer ?** Uniquement si la scène actuelle est **visuellement distincte** de la précédente OU si un **événement visuel clé** se produit (nouveau lieu important, PNJ significatif apparaît, action avec impact visuel fort, découverte majeure, début/fin d'un combat suggéré). Ne génère PAS pour des actions simples (marcher, parler sans événement notable, utiliser un objet commun).
    *   **Comment générer ?** Crée un prompt CONCIS et DESCRIPTIF.
        *   **CONTENU**: Mentionne le **thème ({{{theme}}})**, le **lieu actuel ({{{gameState.location}}})**, le **nom du joueur ({{{playerName}}})** et sa **CLASSE ({{{selectedHeroValue}}})**, **l'action principale** venant de se produire, et tout **élément visuel clé** (PNJ important, objet important, phénomène). Inclus l'**ambiance/émotion** si pertinente ({{{gameState.emotions}}}).
        *   **CONSISTANCE VISUELLE (TRÈS IMPORTANT)**:
            *   **SI {{{previousImagePrompt}}} existe**, tu dois IMPÉRATIVEMENT essayer de **maintenir la cohérence visuelle** avec l'image précédente. Consulte {{{previousImagePrompt}}} pour t'aider.
            *   **Apparence de {{{playerName}}} (Héros: {{{selectedHeroValue}}})**: Décris {{{playerName}}} de manière **similaire** à sa description dans {{{previousImagePrompt}}} si possible (ex: si c'était "un chevalier souriant avec une armure bleue", continue avec "le chevalier souriant {{{playerName}}} dans son armure bleue..."). Ne change pas radicalement son apparence (couleur de cheveux, vêtements principaux) sans raison narrative forte. **Mentionne des éléments liés à sa classe ({{{selectedHeroValue}}}) si visible (ex: épée pour Guerrier, bâton pour Magicien).**
            *   **Éléments récurrents**: Si le prompt précédent mentionnait un compagnon, un objet clé tenu par le joueur, ou un détail important du décor, et qu'il est toujours pertinent, mentionne-le à nouveau pour renforcer la continuité.
            *   **Style Artistique**: Mentionne explicitement **"Style: Cartoon."** à la fin du prompt pour assurer l'uniformité visuelle entre les images.
            *   **Mots-Clés Descriptifs**: Réutilise des mots-clés descriptifs importants de {{{previousImagePrompt}}} si la scène est une continuation directe ou très similaire (ex: "forêt enchantée sombre et brumeuse", "cockpit high-tech scintillant"). Adapte si le lieu ou l'ambiance change significativement.
        *   **FORMAT**: Remplis la clé 'generatedImagePrompt' avec ce prompt. **Laisse vide si non pertinent.**
    *   **Exemples (avec consistance obligatoire)**:
        *   (Tour N) Prompt Précédent: "Le chevalier souriant {{{playerName}}} avec une armure bleue découvrant une épée lumineuse dans une grotte sombre (lieu: Grotte aux Échos). Thème: Fantasy Médiévale. Style: Cartoon. Ambiance mystérieuse."
        *   (Tour N+1, si action = prendre épée) Nouveau Prompt: "Le chevalier souriant {{{playerName}}} (Guerrier) dans son armure bleue brandissant fièrement l'épée lumineuse, qui éclaire vivement la Grotte aux Échos (lieu: Grotte aux Échos). Thème: Fantasy Médiévale. Style: Cartoon." (Conserve 'chevalier souriant', 'armure bleue', 'épée lumineuse', 'Grotte aux Échos', thème, style. Ajoute classe).
        *   (Tour N+2, si action = sortir de la grotte) Nouveau Prompt: "Le chevalier souriant {{{playerName}}} (Guerrier) en armure bleue, portant l'épée lumineuse à sa ceinture, sortant de la Grotte aux Échos pour arriver dans une clairière ensoleillée et fleurie (lieu: Clairière Ensoleillée). Thème: Fantasy Médiévale. Style: Cartoon." (Conserve 'chevalier souriant', 'armure bleue', mentionne l'épée, nouveau lieu, thème, style, ajoute classe).
        *   (Tour M) Prompt Précédent: "L'astronaute prudent {{{playerName}}} (Magicien) avec un casque rouge flottant devant une nébuleuse violette (lieu: Ceinture d'Astéroïdes Delta). Thème: Exploration Spatiale. Style: Cartoon. Air émerveillé."
        *   (Tour M+1, si action = examiner vaisseau) Nouveau Prompt: "" (Pas d'image car action peu visuelle).
        *   (Tour M+2, si action = rencontrer alien amical) Nouveau Prompt: "L'astronaute prudent {{{playerName}}} (Magicien) avec son casque rouge, souriant, flottant à côté d'un petit alien vert aux grands yeux dans une station spatiale lumineuse (lieu: Station Alpha). Thème: Exploration Spatiale. Style: Cartoon." (Conserve 'astronaute prudent', 'casque rouge', thème, style, nouveau lieu, ajoute alien, ajoute classe).
9.  **Gestion du Dernier Tour (quand isLastTurn est vrai)** :
    *   Ne propose **AUCUN** choix ('nextChoices' doit être [])
    *   Décris une **conclusion** basée sur le dernier choix et l'état final (incluant le lieu final depuis 'updatedGameState').
    *   Mets à jour 'updatedGameState' une dernière fois.
    *   **Ne génère PAS de prompt d'image pour la conclusion.**
10. **Propose de Nouveaux Choix (si PAS le dernier tour)** : Offre 2-3 options claires, simples, pertinentes pour la situation, le lieu actuel ({{{gameState.location}}}), et le thème. **N'inclus PAS d'actions d'habileté directes dans 'nextChoices', le joueur les utilise via l'interface.**
11. **Mets à Jour l'État du Jeu ('updatedGameState')** : Mets à jour **IMPÉRATIVEMENT** 'inventory' et 'location' si besoin. Mets aussi à jour 'relationships', 'emotions', et 'events' si pertinent. 'updatedGameState' doit être JSON valide contenant au minimum playerName, location, inventory, relationships, emotions, events. Si rien n'a changé, renvoie le 'gameState' précédent (stringify), mais valide.
12. **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide : 'storyContent' (string), 'nextChoices' (array de strings, vide si {{isLastTurn}} est vrai), 'updatedGameState' (string JSON valide), 'generatedImagePrompt' (string, optionnel, vide si non pertinent).
13. **Ton rôle** : Reste UNIQUEMENT le narrateur.
14. **Public (8-12 ans)** : Langage simple, adapté, positif. Pas de violence/peur excessive. Combat suggéré, pas décrit crûment.

**Important** : Concentre-toi sur la réaction à la **dernière action**, la gestion précise de l'inventaire, du **lieu**, des **relations** et des **émotions** dans 'updatedGameState', l'utilisation des **habiletés du héros ({{{heroDescription}}})** dans la narration et les choix, la décision de fournir ou non un 'generatedImagePrompt' (en visant la **consistance** visuelle et incluant theme/lieu/nom/classe/style si fourni), la gestion des **combats** par des choix appropriés, et la **conclusion si c'est le dernier tour** ({{isLastTurn}}).

Génère maintenant la suite (ou la fin) de l'histoire pour {{{playerName}}}, le/la {{{selectedHeroValue}}}.
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

   // Basic input validation
   if (!input.theme) throw new Error("Le thème est requis.");
   if (!input.playerName) throw new Error("Le nom du joueur est requis.");
   if (!input.selectedHeroValue) throw new Error("Le héros sélectionné est requis."); // Validate hero
   if (!input.gameState) throw new Error("L'état du jeu est requis.");
   if (input.currentTurn === undefined || !input.maxTurns) throw new Error("Les informations sur le tour sont requises."); // Specifically check currentTurn


   const safePlayerChoicesHistory = input.playerChoicesHistory || [];
   if (safePlayerChoicesHistory.length === 0 && !input.lastStorySegmentText?.includes("début") && input.currentTurn > 1) { // Added turn check
       console.warn("generateStoryContent appelé avec un historique de choix vide en milieu de partie. Cela pourrait indiquer un problème.");
   }

    let currentGameStateObj: ParsedGameState; // Use ParsedGameState type
    try {
        currentGameStateObj = parseGameState(input.gameState, input.playerName); // Use utility
    } catch (e) {
        console.error("JSON gameState d'entrée invalide, réinitialisation aux valeurs par défaut :", input.gameState, e);
        // Provide a more complete default state if parsing fails
        currentGameStateObj = {
            playerName: input.playerName || 'Unknown Player',
            location: 'Unknown Location', // Default location
            inventory: [],
            relationships: {},
            emotions: [],
            events: []
        };
    }

    // Simple random event logic (can be expanded) - Example: 10% chance per turn
    // Moved inside flow for server-side execution context
    const shouldGenerateEvent = Math.random() < 0.1; // Example: 10% chance
    if (shouldGenerateEvent && input.currentTurn > 1) { // Avoid event on turn 1
        const events = [
            "Une pluie torrentielle s'abat soudainement.",
            "Un léger tremblement de terre secoue le sol.",
            "Un étrange marchand ambulant apparaît au loin.",
            "Tu découvres une inscription ancienne sur un rocher.",
            "Une créature inconnue et rapide passe en coup de vent.",
            "Tu entends un appel à l'aide au loin.",
            "Une musique mystérieuse flotte dans l'air.",
            "Un brouillard épais commence à se lever.",
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        if (!Array.isArray(currentGameStateObj.events)) {
            currentGameStateObj.events = []; // Initialize if missing
        }
        // Add location context to event
        currentGameStateObj.events.push(`Événement aléatoire (${currentGameStateObj.location || 'unknown location'}) : ${randomEvent}`);
        console.log("Random event triggered:", randomEvent, "at location:", currentGameStateObj.location);
    }


    // Ensure essential keys exist after potential reset
    if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName || 'Unknown Player';
     if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Indeterminate Location'; // Ensure location exists
    if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
    if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
    if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
    if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];

    // Update gameState with new event (if any) before sending to prompt
    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);

   // Fetch hero description for the prompt
   // This logic is now in the wrapper function `generateStoryContent` above
   // const heroDetails = heroOptions.find(h => h.value === input.selectedHeroValue);
   // const heroDescription = heroDetails?.description || "Has unique abilities.";


  // Inject current date and previous prompt into prompt context
  const promptInput = {
      ...input,
      playerChoicesHistory: safePlayerChoicesHistory,
      gameState: validatedInputGameStateString, // Send validated/potentially updated state
      current_date: new Date().toLocaleDateString('fr-FR'),
      lastStorySegmentText: input.lastStorySegmentText || (safePlayerChoicesHistory.length > 0 ? safePlayerChoicesHistory[safePlayerChoicesHistory.length - 1] : "C'est le début de l'aventure."),
      previousImagePrompt: input.previousImagePrompt, // Pass previous prompt for AI consistency check
      heroDescription: input.heroDescription, // Pass the description already fetched
  };

  const { output } = await prompt(promptInput);

  // --- Output Validation ---
   if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        console.error("Format invalide reçu de l'IA pour le contenu de l'histoire :", output);
        // Attempt graceful recovery
        return {
            storyContent: "Oups ! Le narrateur semble avoir perdu le fil de l'histoire à cause d'une interférence cosmique. Essayons autre chose.",
            nextChoices: input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier mon inventaire"], // Provide safe generic choices, empty if last turn
            updatedGameState: validatedInputGameStateString, // Return last known valid state
            generatedImagePrompt: undefined, // No image prompt on error
        };
    }

     // Additional validation for last turn: choices MUST be empty
    if (input.isLastTurn && output.nextChoices.length > 0) {
        console.warn("L'IA a retourné des choix au dernier tour. Remplacement par un tableau vide.");
        output.nextChoices = [];
    }
     // Validation for normal turn: choices SHOULD exist (unless AI has specific reason, e.g., forced wait)
     if (!input.isLastTurn && output.nextChoices.length === 0 && output.storyContent.length > 0 && !output.storyContent.toLowerCase().includes("attendre")) { // Allow empty if story implies waiting
         console.warn("L'IA a retourné des choix vides lors d'un tour normal sans attente explicite. Fourniture de choix de secours.");
         output.nextChoices = ["Regarder autour de moi", "Vérifier mon inventaire"];
         output.storyContent += "\n(Le narrateur semble chercher ses mots... Que fais-tu en attendant ?)";
     }
     // Ensure generatedImagePrompt is a string or undefined, and if string, not empty
     if (output.generatedImagePrompt !== undefined && typeof output.generatedImagePrompt !== 'string') {
          console.warn("L'IA a retourné un format generatedImagePrompt invalide. Définition à undefined.");
          output.generatedImagePrompt = undefined;
     } else if (typeof output.generatedImagePrompt === 'string' && !output.generatedImagePrompt.trim()) {
          console.warn("L'IA a retourné une chaîne generatedImagePrompt vide. Définition à undefined.");
          output.generatedImagePrompt = undefined; // Treat empty string as undefined
     }


    // Validate the updatedGameState JSON and ensure essential keys are present
    let updatedGameStateObj: ParsedGameState; // Use ParsedGameState type
    try {
        // Use parseGameState utility for robust parsing and validation
        updatedGameStateObj = parseGameState(output.updatedGameState, input.playerName || 'Unknown Player');

        // Extra check: Ensure player name sync if it changed (unlikely but possible)
        if (updatedGameStateObj.playerName !== (input.playerName || 'Unknown Player')) {
            console.warn("AI changed playerName in updatedGameState. Reverting to original.");
            updatedGameStateObj.playerName = input.playerName || 'Unknown Player';
        }

    } catch (e) { // Catch potential errors from parseGameState though it should handle internally
        console.error("Error processing updatedGameState from AI:", output.updatedGameState, e);
        console.warn("Attempting to return previous valid game state due to AI error.");
        // Revert to the validated input state as fallback
        updatedGameStateObj = parseGameState(validatedInputGameStateString, input.playerName || 'Unknown Player'); // Parse the validated input string again
        // Append message indicating state might be stale
        output.storyContent += "\n(Attention : L'état du jeu pourrait ne pas être à jour suite à une petite erreur technique.)";
         // Provide safe fallback choices, considering if it was meant to be the last turn
         output.nextChoices = input.isLastTurn ? [] : ["Regarder autour", "Vérifier inventaire"];
         output.generatedImagePrompt = undefined; // No image on error
    }

    // Reserialize the validated/corrected game state object
    output.updatedGameState = safeJsonStringify(updatedGameStateObj);


    // Final check on choices array content (ensure they are strings)
    if (!output.nextChoices.every(choice => typeof choice === 'string')) {
        console.error("Format de choix invalide reçu de l'IA :", output.nextChoices);
        output.nextChoices = input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier l'inventaire"]; // Fallback choices
         output.storyContent += "\n(Le narrateur a eu un petit bug en proposant les choix...)";
    }


  return output;
});



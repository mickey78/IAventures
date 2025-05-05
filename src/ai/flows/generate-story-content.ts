'use server';

/**
 * @fileOverview Génère le contenu de l'histoire en fonction du thème choisi, des choix du joueur, de l'inventaire, du nom du joueur, du lieu et du numéro de tour. Il peut également suggérer un prompt d'image pour les moments visuels importants, en visant la cohérence. Inclut la gestion des relations, des émotions et des combats simples basés sur des choix.
 *
 * - generateStoryContent - Fonction qui génère le contenu de l'histoire.
 * - GenerateStoryContentInput - Type d'entrée pour la fonction generateStoryContent.
 * - GenerateStoryContentOutput - Type de retour pour la fonction generateStoryContent.
 */
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { StorySegment, ParsedGameState, HeroOption } from '@/types/game'; // Importer les types partagés, ajouter HeroOption
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
  nextChoices: z.array(z.string()).describe("2-3 choix clairs et simples pour la prochaine action du joueur, pertinents par rapport à la situation actuelle, au thème et à l'inventaire. Devrait être un tableau vide si c'est le dernier tour."),
  updatedGameState: z.string().describe("L'état du jeu mis à jour sous forme de chaîne JSON, reflétant les changements basés sur la dernière action et la progression de l'histoire (y compris inventaire, lieu, relations, émotions). Doit être un JSON valide."),
  generatedImagePrompt: z.string().optional().describe("Un prompt concis et descriptif pour la génération d'images UNIQUEMENT si une scène visuellement distincte se produit. DOIT viser la cohérence avec les images précédentes (si `previousImagePrompt` existe), notamment l'apparence du personnage et le style. Inclure le thème, le lieu actuel, le nom du joueur et spécifier \"Style : Cartoon\". Laisser vide sinon."),
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  let initialGameState: ParsedGameState; // Utiliser le type ParsedGameState
  try {
    initialGameState = parseGameState(input.gameState, input.playerName); // Utiliser la fonction utilitaire
  } catch (e) {
    console.warn("JSON gameState d'entrée invalide, utilisation des valeurs par défaut :", input.gameState, e);
    // Assurer une structure ParsedGameState par défaut appropriée
    initialGameState = {
        playerName: input.playerName || 'Joueur Inconnu',
        location: 'Lieu Inconnu',
        inventory: [],
        relationships: {},
        emotions: [],
        events: []
    };
  }

  // Assurer que les clés essentielles existent après l'analyse/la valeur par défaut
  if (!initialGameState.playerName) initialGameState.playerName = input.playerName || 'Joueur Inconnu';
  if (typeof initialGameState.location !== 'string' || !initialGameState.location.trim()) initialGameState.location = 'Lieu Indéterminé';
  if (!Array.isArray(initialGameState.inventory)) initialGameState.inventory = [];
  if (typeof initialGameState.relationships !== 'object' || initialGameState.relationships === null) initialGameState.relationships = {};
  if (!Array.isArray(initialGameState.emotions)) initialGameState.emotions = [];
  if (!Array.isArray(initialGameState.events)) initialGameState.events = [];

  // Récupérer la description du héros pour l'inclure dans le prompt
  const heroDetails = heroOptions.find(h => h.value === input.selectedHeroValue);
  const heroDescription = heroDetails?.description || "Possède des capacités uniques."; // Description par défaut si non trouvé


  const safeInput = {
    ...input,
    gameState: safeJsonStringify(initialGameState), // Utiliser la chaîne d'objet validée/par défaut
    playerChoicesHistory: input.playerChoicesHistory || [],
    lastStorySegmentText: input.lastStorySegment?.text || "C'est le début de l'aventure.", // Fournir un texte par défaut si le segment est manquant
    previousImagePrompt: input.lastStorySegment?.imageGenerationPrompt || null, // Passer le prompt précédent
    heroDescription: heroDescription, // Ajouter la description du héros au contexte
  };

  return generateStoryContentFlow(safeInput);
}


const prompt = ai.definePrompt({
  name: 'generateStoryContentPrompt',
  input: {
    schema: z.object({
      theme: z.string().describe("Le thème de l'histoire."),
      playerName: z.string().describe('Le nom du joueur.'),
      selectedHeroValue: z.string().describe("La classe de héros choisie."), // Garder la valeur du héros
      heroDescription: z.string().describe("La description du héros incluant ses capacités."), // Ajouter la description
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
    *   **Gestion Inventaire** : Si le choix implique un objet (trouver, utiliser, inspecter, lancer, jeter), gère l'inventaire dans 'updatedGameState'. Ajoute si trouvé, retire si utilisé/lancé/jeté. Annonce les trouvailles/utilisations dans 'storyContent'. Ex: "Tu utilises la clé... et elle se casse dans la serrure ! La clé a été retirée de ton inventaire." ou "Bravo, tu as trouvé une Potion de Saut ! Ajoutée à ton inventaire !".
2.  **Cohérence des Personnages**: Maintiens la personnalité des PNJ. Leurs réactions doivent dépendre des 'relationships' du gameState (ami, ennemi, neutre). Un ennemi sera hostile, un ami serviable. Mets à jour 'relationships' si une action change la relation.
3.  **Cohérence des Lieux**: Souviens-toi des lieux. Si une action **change le lieu**, **mets à jour la clé 'location'** dans 'updatedGameState'. Décris le nouveau lieu dans 'storyContent'.
4.  **Chronologie &amp; Causalité**: Respecte l'ordre des événements ('events' du gameState). Les actions ont des conséquences.
5.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} (confirme le lieu en utilisant 'location' du gameState parsé) ? Que perçoit-il/elle ? Qu'est-ce qui a changé ? Que se passe-t-il maintenant ? Tiens compte des 'emotions' pour l'ambiance (ex: si {{{playerName}}} est 'effrayé', décris une ambiance plus tendue).
6.  **Gestion Actions Hors-Contexte/Impossibles** : Refuse GENTIMENT ou réinterprète les actions illogiques/hors thème/impossibles. Explique pourquoi ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici dans {{{gameState.location}}}'.") et propose immédiatement de nouvelles actions VALIDES via 'nextChoices' (sauf si c'est le dernier tour).
7.  **GESTION DES COMBATS SIMPLES (8-12 ans)**:
    *   **Déclenchement**: Si le joueur rencontre un PNJ marqué comme "ennemi" dans 'relationships', ou si la situation devient hostile.
    *   **PAS de violence explicite**: Ne décris PAS de sang, de blessures graves ou de mort de manière graphique. Utilise des métaphores, suggère l'action. L'objectif est de résoudre la situation, pas de vaincre brutalement.
    *   **Proposer des Choix de Combat**: Au lieu d'une description de combat, propose 2-3 choix clairs orientés action :
        *   Exemples : "Essayer de distraire le garde", "Utiliser la Potion de Disparition", "Se cacher derrière le rocher", "Tenter de raisonner le dragon grincheux", "Esquiver l'attaque du robot", "Utiliser le Bouclier d'Énergie", "Proposer un échange au pirate".
        *   **Adapte les choix au thème, à l'inventaire, aux 'emotions' (un joueur 'effrayé' pourrait avoir des options de fuite/cachette) et aux HABILTÉS du héros ({{{heroDescription}}})**. Un Guerrier pourrait avoir "Charger l'ennemi", un Magicien "Lancer un sort de glace", un Voleur "Tenter une attaque furtive".
        *   Mentionne explicitement les habiletés possibles si c'est pertinent. Ex: "(Habileté Voleur) Tenter de crocheter la serrure pendant que le garde regarde ailleurs".
    *   **Résolution par l'IA**: Évalue le choix du joueur face à la situation. Un peu de chance peut intervenir. **Tiens compte des habiletés ({{{heroDescription}}}) pour influencer le résultat.** Un Guerrier aura plus de succès en chargeant qu'un Magicien.
        *   **Succès**: Décris comment l'action du joueur réussit à désamorcer, éviter ou surmonter l'obstacle/ennemi. Ex: "Ta distraction fonctionne ! Le garde regarde ailleurs, te laissant passer.", "La Potion te rend invisible, tu te faufiles sans bruit.", "Le dragon, amusé par ta proposition, te laisse passer."
        *   **Échec partiel/Rebondissement**: L'action ne réussit pas complètement, créant une nouvelle situation. Ex: "Tu te caches, mais le garde t'a presque vu ! Il s'approche...", "Ton bouclier bloque l'attaque, mais il est fissuré.", "Le pirate rit de ton offre, mais semble intrigué."
    *   **Mise à jour État**: Mets à jour 'updatedGameState' (ex: `relationships` peut changer si l'ennemi est apaisé, `emotions` peuvent changer, objet utilisé retiré de `inventory`, `location` si fuite réussie). Ajoute un événement pertinent à `events` (ex: "a évité le combat avec le garde").
    *   **Prochains Choix**: Après la résolution, propose de nouveaux choix normaux pour continuer l'aventure (ou d'autres choix de combat si la situation persiste).
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
        *   (Tour N+1, si action = prendre épée) Nouveau Prompt: "Le chevalier souriant {{{playerName}}} dans son armure bleue brandissant fièrement l'épée lumineuse, qui éclaire vivement la Grotte aux Échos (lieu: Grotte aux Échos). Thème: Fantasy Médiévale. Style: Cartoon." (Conserve 'chevalier souriant', 'armure bleue', 'épée lumineuse', 'Grotte aux Échos', thème, style).
        *   (Tour N+2, si action = sortir de la grotte) Nouveau Prompt: "Le chevalier souriant {{{playerName}}} en armure bleue, portant l'épée lumineuse à sa ceinture, sortant de la Grotte aux Échos pour arriver dans une clairière ensoleillée et fleurie (lieu: Clairière Ensoleillée). Thème: Fantasy Médiévale. Style: Cartoon." (Conserve 'chevalier souriant', 'armure bleue', mentionne l'épée, nouveau lieu, thème, style).
        *   (Tour M) Prompt Précédent: "L'astronaute prudent {{{playerName}}} avec un casque rouge flottant devant une nébuleuse violette (lieu: Ceinture d'Astéroïdes Delta). Thème: Exploration Spatiale. Style: Cartoon. Air émerveillé."
        *   (Tour M+1, si action = examiner vaisseau) Nouveau Prompt: "" (Pas d'image car action peu visuelle).
        *   (Tour M+2, si action = rencontrer alien amical) Nouveau Prompt: "L'astronaute prudent {{{playerName}}} avec son casque rouge, souriant, flottant à côté d'un petit alien vert aux grands yeux dans une station spatiale lumineuse (lieu: Station Alpha). Thème: Exploration Spatiale. Style: Cartoon." (Conserve 'astronaute prudent', 'casque rouge', thème, style, nouveau lieu, ajoute alien).
9.  **Gestion du Dernier Tour (quand isLastTurn est vrai)** :
    *   Ne propose **AUCUN** choix ('nextChoices' doit être [])
    *   Décris une **conclusion** basée sur le dernier choix et l'état final (incluant le lieu final depuis 'updatedGameState').
    *   Mets à jour 'updatedGameState' une dernière fois.
    *   **Ne génère PAS de prompt d'image pour la conclusion.**
10. **Propose de Nouveaux Choix (si PAS le dernier tour)** : Offre 2-3 options claires, simples, pertinentes pour la situation, le lieu actuel ({{{gameState.location}}}), et le thème. **Inclus éventuellement des actions liées aux habiletés du héros ({{{heroDescription}}}) si pertinent.** PAS d'actions d'inventaire directes dans 'nextChoices'.
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

   // Validation de base de l'entrée
   if (!input.theme) throw new Error("Le thème est requis.");
   if (!input.playerName) throw new Error("Le nom du joueur est requis.");
   if (!input.selectedHeroValue) throw new Error("Le héros sélectionné est requis."); // Vérifier le héros
   if (!input.gameState) throw new Error("L'état du jeu est requis.");
   if (input.currentTurn === undefined || !input.maxTurns) throw new Error("Les informations sur le tour sont requises."); // Vérifier spécifiquement currentTurn


   const safePlayerChoicesHistory = input.playerChoicesHistory || [];
   if (safePlayerChoicesHistory.length === 0 && !input.lastStorySegmentText?.includes("début") && input.currentTurn > 1) { // Ajout de la vérification du tour
       console.warn("generateStoryContent appelé avec un historique de choix vide en milieu de partie. Cela pourrait indiquer un problème.");
   }

    let currentGameStateObj: ParsedGameState; // Utiliser le type ParsedGameState
    try {
        currentGameStateObj = parseGameState(input.gameState, input.playerName); // Utiliser l'utilitaire
    } catch (e) {
        console.error("JSON gameState d'entrée invalide, réinitialisation aux valeurs par défaut :", input.gameState, e);
        // Fournir un état par défaut plus complet si l'analyse échoue
        currentGameStateObj = {
            playerName: input.playerName || 'Joueur Inconnu',
            location: 'Lieu Inconnu', // Lieu par défaut
            inventory: [],
            relationships: {},
            emotions: [],
            events: []
        };
    }

    // Logique d'événement aléatoire simple (peut être étendue) - Exemple : 10% de chance par tour
    // Déplacé à l'intérieur du flux pour le contexte d'exécution côté serveur
    const shouldGenerateEvent = Math.random() < 0.1; // Exemple : 10% de chance
    if (shouldGenerateEvent && input.currentTurn > 1) { // Éviter l'événement au tour 1
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
            currentGameStateObj.events = []; // Initialiser si manquant
        }
        // Ajouter le contexte du lieu à l'événement
        currentGameStateObj.events.push(`Événement aléatoire (${currentGameStateObj.location || 'lieu inconnu'}) : ${randomEvent}`);
        console.log("Événement aléatoire déclenché :", randomEvent, "au lieu :", currentGameStateObj.location);
    }


    // Assurer que les clés essentielles existent après une éventuelle réinitialisation
    if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName || 'Joueur Inconnu';
     if (typeof currentGameStateObj.location !== 'string' || !currentGameStateObj.location.trim()) currentGameStateObj.location = 'Lieu Indéterminé'; // Assurer que le lieu existe
    if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];
    if (typeof currentGameStateObj.relationships !== 'object' || currentGameStateObj.relationships === null) currentGameStateObj.relationships = {};
    if (!Array.isArray(currentGameStateObj.emotions)) currentGameStateObj.emotions = [];
    if (!Array.isArray(currentGameStateObj.events)) currentGameStateObj.events = [];

    // Mettre à jour le gameState avec le nouvel événement (le cas échéant) avant de l'envoyer au prompt
    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);

   // Récupérer la description du héros pour le prompt
   const heroDetails = heroOptions.find(h => h.value === input.selectedHeroValue);
   const heroDescription = heroDetails?.description || "Possède des capacités uniques.";


  // Injecter la date actuelle et le prompt précédent dans le contexte du prompt
  const promptInput = {
      ...input,
      playerChoicesHistory: safePlayerChoicesHistory,
      gameState: validatedInputGameStateString, // Envoyer l'état validé/potentiellement mis à jour
      current_date: new Date().toLocaleDateString('fr-FR'),
      lastStorySegmentText: input.lastStorySegmentText || (safePlayerChoicesHistory.length > 0 ? safePlayerChoicesHistory[safePlayerChoicesHistory.length - 1] : "C'est le début de l'aventure."),
      previousImagePrompt: input.previousImagePrompt, // Passer le prompt précédent pour vérification de cohérence par l'IA
      heroDescription: heroDescription, // Ajouter la description pour le prompt
  };

  const { output } = await prompt(promptInput);

  // --- Validation de la sortie ---
   if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        console.error("Format invalide reçu de l'IA pour le contenu de l'histoire :", output);
        // Tenter de récupérer gracieusement
        return {
            storyContent: "Oups ! Le narrateur semble avoir perdu le fil de l'histoire à cause d'une interférence cosmique. Essayons autre chose.",
            nextChoices: input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier mon inventaire"], // Fournir des choix génériques sûrs, vides si dernier tour
            updatedGameState: validatedInputGameStateString, // Retourner le dernier état valide connu
            generatedImagePrompt: undefined, // Pas de prompt d'image en cas d'erreur
        };
    }

     // Validation supplémentaire pour le dernier tour : les choix DOIVENT être vides
    if (input.isLastTurn && output.nextChoices.length > 0) {
        console.warn("L'IA a retourné des choix au dernier tour. Remplacement par un tableau vide.");
        output.nextChoices = [];
    }
     // Validation pour un tour normal : les choix DEVRAIENT exister (sauf raison spécifique de l'IA, ex: attente forcée)
     if (!input.isLastTurn && output.nextChoices.length === 0 && output.storyContent.length > 0 && !output.storyContent.toLowerCase().includes("attendre")) { // Autoriser le vide si l'histoire implique une attente
         console.warn("L'IA a retourné des choix vides lors d'un tour normal sans attente explicite. Fourniture de choix de secours.");
         output.nextChoices = ["Regarder autour de moi", "Vérifier mon inventaire"];
         output.storyContent += "\n(Le narrateur semble chercher ses mots... Que fais-tu en attendant ?)";
     }
     // Assurer que generatedImagePrompt est une chaîne ou undefined, et si chaîne, non vide
     if (output.generatedImagePrompt !== undefined && typeof output.generatedImagePrompt !== 'string') {
          console.warn("L'IA a retourné un format generatedImagePrompt invalide. Définition à undefined.");
          output.generatedImagePrompt = undefined;
     } else if (typeof output.generatedImagePrompt === 'string' && !output.generatedImagePrompt.trim()) {
          console.warn("L'IA a retourné une chaîne generatedImagePrompt vide. Définition à undefined.");
          output.generatedImagePrompt = undefined; // Traiter la chaîne vide comme undefined
     }


    // Valider le JSON updatedGameState et assurer que les clés essentielles sont présentes
    let updatedGameStateObj: ParsedGameState; // Utiliser le type ParsedGameState
    try {
        // Utiliser l'utilitaire parseGameState pour une analyse et une validation robustes
        updatedGameStateObj = parseGameState(output.updatedGameState, input.playerName || 'Joueur Inconnu');

        // Vérification supplémentaire : Assurer la synchronisation du nom du joueur s'il a changé (peu probable mais possible)
        if (updatedGameStateObj.playerName !== (input.playerName || 'Joueur Inconnu')) {
            console.warn("L'IA a changé playerName dans updatedGameState. Retour à l'original.");
            updatedGameStateObj.playerName = input.playerName || 'Joueur Inconnu';
        }

    } catch (e) { // Intercepter les erreurs potentielles de parseGameState bien qu'il doive les gérer en interne
        console.error("Erreur lors du traitement de updatedGameState de l'IA :", output.updatedGameState, e);
        console.warn("Tentative de retour de l'état de jeu valide précédent en raison d'une erreur de l'IA.");
        // Réinitialiser à l'état d'entrée validé comme solution de secours
        updatedGameStateObj = parseGameState(validatedInputGameStateString, input.playerName || 'Joueur Inconnu'); // Analyser à nouveau la chaîne d'entrée validée
        // Ajouter un message indiquant que l'état pourrait être obsolète
        output.storyContent += "\n(Attention : L'état du jeu pourrait ne pas être à jour suite à une petite erreur technique.)";
         // Fournir des choix de secours sûrs, en considérant si c'était censé être le dernier tour
         output.nextChoices = input.isLastTurn ? [] : ["Regarder autour", "Vérifier inventaire"];
         output.generatedImagePrompt = undefined; // Pas d'image en cas d'erreur
    }

    // Resérialiser l'objet d'état de jeu validé/corrigé
    output.updatedGameState = safeJsonStringify(updatedGameStateObj);


    // Vérification finale du contenu du tableau de choix (assurer que ce sont des chaînes)
    if (!output.nextChoices.every(choice => typeof choice === 'string')) {
        console.error("Format de choix invalide reçu de l'IA :", output.nextChoices);
        output.nextChoices = input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier l'inventaire"]; // Choix de secours
         output.storyContent += "\n(Le narrateur a eu un petit bug en proposant les choix...)";
    }


  return output;
});



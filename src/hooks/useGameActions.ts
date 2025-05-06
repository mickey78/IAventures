

import { useState, useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { StorySegment, GameState, ParsedGameState } from '@/types/game';
import { generateInitialStory } from '@/ai/flows/generate-initial-story';
import type { GenerateInitialStoryOutput, GenerateInitialStoryInput } from '@/ai/flows/generate-initial-story';
import { generateStoryContent } from '@/ai/flows/generate-story-content';
import type { GenerateStoryContentInput, GenerateStoryContentOutput } from '@/ai/flows/generate-story-content';
import { generateImage } from '@/ai/flows/generate-image';
import type { GenerateImageOutput } from '@/ai/flows/generate-image';
import { parseGameState, safeJsonStringify } from '@/lib/gameStateUtils';
import { themes } from '@/config/themes';
import { heroOptions } from '@/config/heroes';
// Removed client-side import of logToFile as it's server-only and logging is handled by server actions
// import { logToFile } from '@/services/loggingService';


export function useGameActions(
    gameState: GameState,
    setGameState: Dispatch<SetStateAction<GameState>>,
    toast: ReturnType<typeof useToast>['toast'],
    viewportRef: RefObject<HTMLDivElement>
) {
    const [shouldFlashInventory, setShouldFlashInventory] = useState(false);

    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            if (viewportRef.current) {
                viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
            }
        });
    }, [viewportRef]);

    const triggerImageGeneration = useCallback(async (segmentId: number, prompt: string | null | undefined) => {
        if (!prompt) {
            console.warn(`Image generation skipped for segment ${segmentId}: no prompt provided.`);
            // Logging for this skip should happen server-side if generateImage is called with null/undefined prompt
            setGameState((prev) => ({
                ...prev,
                story: prev.story.map(seg =>
                    seg.id === segmentId ? { ...seg, imageIsLoading: false, imageError: false } : seg
                ),
                generatingSegmentId: prev.generatingSegmentId === segmentId ? null : prev.generatingSegmentId,
            }));
            return;
        }

        setGameState((prev) => ({
            ...prev,
            story: prev.story.map(seg =>
                seg.id === segmentId
                    ? { ...seg, imageIsLoading: true, imageError: false, imageGenerationPrompt: prompt }
                    : seg
            ),
            generatingSegmentId: segmentId,
        }));

        try {
            // Server-side flow 'generateImage' will handle its own logging
            const imageData: GenerateImageOutput = await generateImage({ prompt });
            setGameState((prev) => ({
                ...prev,
                story: prev.story.map(seg =>
                    seg.id === segmentId
                        ? { ...seg, storyImageUrl: imageData.imageUrl, imageIsLoading: false }
                        : seg
                ),
                generatingSegmentId: null,
            }));
            scrollToBottom();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
            // Server-side flow 'generateImage' will handle its own error logging
            toast({ title: 'Erreur Image', description: `Impossible de générer l'image: ${errorMsg}`, variant: 'destructive' });
            setGameState((prev) => ({
                ...prev,
                story: prev.story.map(seg =>
                    seg.id === segmentId
                        ? { ...seg, storyImageUrl: null, imageIsLoading: false, imageError: true }
                        : seg
                ),
                generatingSegmentId: null,
            }));
        }
    }, [setGameState, toast, scrollToBottom]);

    const retryImageGeneration = useCallback(async (segmentId: number) => {
        // Logging for retry attempt will be handled by the generateImage flow
        const segmentToRetry = gameState.story.find(seg => seg.id === segmentId);

        if (!segmentToRetry) {
            toast({ title: 'Erreur', description: 'Segment d\'histoire introuvable.', variant: 'destructive' });
            return;
        }

        if (!segmentToRetry.imageGenerationPrompt) {
            toast({ title: 'Erreur', description: 'Aucun prompt disponible pour regénérer cette image.', variant: 'destructive' });
             setGameState(prev => ({
                 ...prev,
                 story: prev.story.map(seg =>
                     seg.id === segmentId ? { ...seg, imageError: false } : seg // Clear error state
                 ),
             }));
            return;
        }

        setGameState(prev => ({
            ...prev,
            story: prev.story.map(seg =>
                seg.id === segmentId ? { ...seg, imageError: false, imageIsLoading: true } : seg
            ),
        }));
        await triggerImageGeneration(segmentId, segmentToRetry.imageGenerationPrompt);
    }, [gameState.story, setGameState, toast, triggerImageGeneration]);

    const handleManualImageGeneration = useCallback((segmentId: number, segmentText: string) => {
        if (!gameState.theme || !gameState.currentGameState.location || !gameState.playerName || !gameState.selectedHero) {
            toast({ title: 'Erreur', description: 'Impossible de générer une image sans thème, lieu, héros ou nom de joueur définis.', variant: 'destructive' });
            return;
        }
        const heroDetails = heroOptions.find(h => h.value === gameState.selectedHero);
        if (!heroDetails) {
            toast({ title: 'Erreur', description: 'Détails du héros non trouvés.', variant: 'destructive' });
            return;
        }
        const heroFullDescription = `${heroDetails.description} Habiletés: ${heroDetails.abilities.map(a => a.label).join(', ')}. Apparence: ${heroDetails.appearance || 'Apparence typique de sa classe.'}`;
        const moodText = gameState.currentGameState.emotions && gameState.currentGameState.emotions.length > 0 ? ` Ambiance: ${gameState.currentGameState.emotions.join(', ')}.` : '';
        
        const lastNarratorSegmentWithPrompt = gameState.story
            .slice()
            .reverse()
            .find(seg => seg.speaker === 'narrator' && seg.imageGenerationPrompt);
        const previousPromptContext = lastNarratorSegmentWithPrompt?.imageGenerationPrompt ? ` Inspiré de : "${lastNarratorSegmentWithPrompt.imageGenerationPrompt.substring(0,100)}...".` : '';

        const prompt = `Une illustration de "${gameState.playerName}", le/la ${heroDetails.label} (${heroFullDescription}): "${segmentText.substring(0, 150)}...". Lieu: ${gameState.currentGameState.location}. Thème: ${gameState.theme}.${moodText} ${previousPromptContext} Style: Réaliste. Cohérence avec ${heroDetails.appearance}.`;
        triggerImageGeneration(segmentId, prompt);
    }, [gameState, toast, triggerImageGeneration]);


    const startNewGame = useCallback(async (nameToUse: string, themeToUse: string | null, subThemeToUse: string | null, heroToUse: string | null, turns: number) => {
        if (!themeToUse) {
            toast({ title: 'Erreur', description: 'Veuillez sélectionner un thème.', variant: 'destructive' });
            setGameState(prev => ({ ...prev, currentView: 'theme_selection' }));
            return;
        }
        if (!heroToUse) {
            toast({ title: 'Erreur', description: 'Veuillez sélectionner un héros.', variant: 'destructive' });
            setGameState(prev => ({ ...prev, currentView: 'hero_selection' }));
            return;
        }

        const heroDetails = heroOptions.find(h => h.value === heroToUse);
        if (!heroDetails) {
            toast({ title: 'Erreur', description: 'Détails du héros non trouvés.', variant: 'destructive' });
            setGameState(prev => ({ ...prev, currentView: 'hero_selection' }));
            return;
        }
        const heroFullDescription = `${heroDetails.description} Habiletés: ${heroDetails.abilities.map(a => a.label).join(', ')}. Apparence: ${heroDetails.appearance || 'Apparence typique de sa classe.'}`;

        let initialScenarioPrompt = `Commence une aventure créative et surprenante pour ${nameToUse}, le/la ${heroDetails.label}, dans le thème "${themeToUse}".`;
        if (subThemeToUse) {
            const mainTheme = themes.find(t => t.value === themeToUse);
            const subThemeDetails = mainTheme?.subThemes.find(st => st.value === subThemeToUse);
            if (!subThemeDetails) {
                toast({ title: 'Erreur', description: 'Détails du scénario sélectionné non trouvés. Utilisation d\'un démarrage générique.', variant: 'destructive' });
            } else {
                initialScenarioPrompt = subThemeDetails.prompt;
            }
        }

        setGameState((prev) => ({
            ...prev,
            isLoading: true,
            error: null,
            story: [],
            choices: [],
            playerChoicesHistory: [],
            currentView: 'game_active',
            theme: themeToUse,
            subTheme: subThemeToUse,
            selectedHero: heroToUse,
            playerName: nameToUse,
            maxTurns: turns,
            currentTurn: 1,
            generatingSegmentId: null,
            currentGameState: {
                playerName: nameToUse,
                location: 'Chargement...',
                inventory: [],
                relationships: {},
                emotions: [],
                events: [],
            },
            initialPromptDebug: "Chargement du prompt initial...",
        }));

        try {
            const initialStoryInput: GenerateInitialStoryInput = {
                theme: themeToUse,
                subThemePrompt: initialScenarioPrompt,
                playerName: nameToUse,
                selectedHeroValue: heroToUse,
                heroDescription: heroFullDescription,
                maxTurns: turns,
            };
            
            // Server-side flow generateInitialStory will handle its own logging
            const initialStoryData: GenerateInitialStoryOutput = await generateInitialStory(initialStoryInput);

            const initialSegmentId = Date.now();
            const initialStorySegment: StorySegment = {
                id: initialSegmentId,
                text: initialStoryData.story,
                speaker: 'narrator',
                storyImageUrl: null,
                imageIsLoading: !!initialStoryData.generatedImagePrompt,
                imageError: false,
                imageGenerationPrompt: initialStoryData.generatedImagePrompt,
            };

            setGameState((prev) => ({
                ...prev,
                story: [initialStorySegment],
                choices: initialStoryData.choices,
                isLoading: false,
                currentGameState: {
                    ...prev.currentGameState,
                    location: initialStoryData.location,
                    relationships: {},
                    emotions: [],
                    events: [],
                },
                 initialPromptDebug: initialStoryData.initialPromptDebug || "Prompt de débogage non fourni par le serveur.",
            }));

            if (initialStoryData.generatedImagePrompt) {
                triggerImageGeneration(initialSegmentId, initialStoryData.generatedImagePrompt);
            }

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
            // Server-side flow generateInitialStory will handle its own error logging
            setGameState((prev) => ({
                ...prev,
                isLoading: false,
                error: `Impossible de générer l'histoire initiale: ${errorMsg}`,
                theme: null, subTheme: null, selectedHero: null, playerName: null,
                currentGameState: { playerName: null, location: 'Erreur', inventory: [], relationships: {}, emotions: [], events: [] },
                currentView: 'theme_selection', maxTurns: 15, currentTurn: 1, generatingSegmentId: null, initialPromptDebug: null,
            }));
            toast({ title: 'Erreur de Génération', description: `Impossible de générer l'histoire initiale: ${errorMsg}`, variant: 'destructive' });
        }
    }, [setGameState, toast, triggerImageGeneration]);

    const handleAction = useCallback(async (actionText: string) => {
        if (!actionText.trim()) {
            toast({ title: "Action Vide", description: "Veuillez décrire votre action.", variant: "destructive" });
            return;
        }
        if (!gameState.playerName || !gameState.theme || !gameState.selectedHero) {
            toast({ title: 'Erreur', description: 'Erreur de jeu critique. Retour au menu principal.', variant: 'destructive' });
            setGameState(prev => ({ ...prev, currentView: 'menu' }));
            return;
        }
        if (gameState.currentView === 'game_ended') {
            toast({ title: "Fin de l'aventure", description: "L'histoire est terminée. Vous pouvez commencer une nouvelle partie.", variant: "destructive" });
            return;
        }

        // Player action logging should be done server-side if this action leads to an AI call

        const playerActionSegment: StorySegment = { id: Date.now(), text: actionText.trim(), speaker: 'player' };
        const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, actionText.trim()];
        const previousStory = [...gameState.story];
        const previousChoices = [...gameState.choices];
        const previousGameState = gameState.currentGameState;
        const lastSegmentBeforeAction = previousStory.length > 0 ? previousStory[previousStory.length - 1] : undefined;
        const nextTurn = gameState.currentTurn + 1;

        setGameState((prev) => ({
            ...prev,
            isLoading: true, error: null, story: [...prev.story, playerActionSegment],
            choices: [], playerChoicesHistory: nextPlayerChoicesHistory, currentTurn: nextTurn, generatingSegmentId: null,
        }));

        const isLastTurn = nextTurn > gameState.maxTurns;

        const heroDetails = heroOptions.find(h => h.value === gameState.selectedHero);
        if (!heroDetails) {
            toast({ title: 'Erreur Critique', description: 'Détails du héros introuvables. Veuillez recommencer.', variant: 'destructive' });
            setGameState(prev => ({ ...prev, isLoading: false, currentView: 'menu' }));
            return;
        }
        const heroFullDescription = `${heroDetails.description} Habiletés: ${heroDetails.abilities.map(a => a.label).join(', ')}. Apparence: ${heroDetails.appearance || 'Apparence typique de sa classe.'}`;

        const input: GenerateStoryContentInput = {
            theme: gameState.theme,
            playerName: gameState.playerName,
            selectedHeroValue: gameState.selectedHero,
            heroDescription: heroFullDescription,
            lastStorySegment: lastSegmentBeforeAction,
            playerChoicesHistory: nextPlayerChoicesHistory,
            gameState: safeJsonStringify(previousGameState),
            currentTurn: nextTurn,
            maxTurns: gameState.maxTurns,
            isLastTurn: isLastTurn,
            current_date: new Date().toLocaleDateString('fr-FR'),
            previousImagePrompt: lastSegmentBeforeAction?.imageGenerationPrompt || null,
        };

        try {
            // Server-side flow generateStoryContent will handle its own logging
            const nextStoryData: GenerateStoryContentOutput = await generateStoryContent(input);

            const narratorResponseSegmentId = Date.now() + 1;
            const narratorResponseSegment: StorySegment = {
                id: narratorResponseSegmentId,
                text: nextStoryData.storyContent,
                speaker: 'narrator',
                storyImageUrl: null,
                imageIsLoading: !!nextStoryData.generatedImagePrompt,
                imageError: false,
                imageGenerationPrompt: nextStoryData.generatedImagePrompt,
            };
            const updatedParsedGameState = parseGameState(nextStoryData.updatedGameState, gameState.playerName);

            const inventoryIncreased = updatedParsedGameState.inventory.length > previousGameState.inventory.length;
            if (inventoryIncreased) {
                setShouldFlashInventory(true);
            }

            setGameState((prev) => ({
                ...prev,
                story: [...prev.story, narratorResponseSegment],
                choices: nextStoryData.nextChoices,
                currentGameState: updatedParsedGameState,
                isLoading: false,
                currentView: isLastTurn ? 'game_ended' : 'game_active',
            }));

            if (nextStoryData.generatedImagePrompt) {
                triggerImageGeneration(narratorResponseSegmentId, nextStoryData.generatedImagePrompt);
            }

            if (isLastTurn) {
                // Logging for game end handled by generateStoryContent flow if it's the last turn
                toast({ title: "Fin de l'Aventure !", description: "Votre histoire est terminée. Merci d'avoir joué !", duration: 5000 });
            }

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
            // Server-side flow generateStoryContent will handle its own error logging
            setGameState((prev) => ({
                ...prev,
                isLoading: false, error: `Impossible de continuer l'histoire: ${errorMsg}`,
                story: previousStory, choices: previousChoices, currentGameState: previousGameState,
                playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1), currentTurn: prev.currentTurn - 1,
            }));
            toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
        }
    }, [gameState, setGameState, toast, triggerImageGeneration, setShouldFlashInventory]);


    return {
        startNewGame,
        handleAction,
        triggerImageGeneration,
        retryImageGeneration,
        handleManualImageGeneration,
        shouldFlashInventory,
        setShouldFlashInventory,
    };
}


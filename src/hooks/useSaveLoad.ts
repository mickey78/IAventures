
import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'; // Import useEffect
import { useToast } from '@/hooks/use-toast';
import { listSaveGames, saveGame, loadGame, deleteSaveGame, type GameStateToSave } from '@/lib/saveLoadUtils';
import type { GameState, GameView } from '@/types/game';
import { parseGameState } from '@/lib/gameStateUtils';
import { themes } from '@/config/themes';
import { themedHeroOptions, defaultHeroOptions } from '@/config/heroes'; // Changement ici
import type { ThemeValue } from '@/types/game'; // Ajout de ThemeValue

export function useSaveLoad(
    gameState: GameState,
    setGameState: Dispatch<SetStateAction<GameState>>,
    toast: ReturnType<typeof useToast>['toast'] // Pass toast function type
) {
    // Initialize savedGames as empty array to prevent hydration mismatch
    const [savedGames, setSavedGames] = useState<Omit<GameStateToSave, 'story' | 'choices' | 'currentGameState' | 'playerChoicesHistory'>[]>([]);
    const [saveNameInput, setSaveNameInput] = useState('');
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    // Load saved games list only on the client after mount
    useEffect(() => {
        setSavedGames(listSaveGames());
    }, []); // Empty dependency array ensures this runs once on mount (client-side)

    const handleOpenSaveDialog = useCallback(() => {
        if (gameState.currentView !== 'game_active') {
            toast({ title: "Action Impossible", description: "Vous ne pouvez sauvegarder qu'une partie en cours.", variant: "default" });
            return;
        }
        const dateStr = new Date().toLocaleDateString('fr-CA');
        const subThemeLabel = gameState.subTheme
            ? themes.find(t => t.value === gameState.theme)?.subThemes.find(st => st.value === gameState.subTheme)?.label || gameState.subTheme
            : 'Sans Scénario Spécifique';

        // Nouvelle logique pour trouver heroLabel
        const currentThemeValue = gameState.theme as ThemeValue | null;
        let heroLabel = 'Héros Inconnu';
        if (currentThemeValue && gameState.selectedHero) {
            const heroesForTheme = themedHeroOptions[currentThemeValue] || defaultHeroOptions;
            heroLabel = heroesForTheme.find(h => h.value === gameState.selectedHero)?.label || heroLabel;
        } else if (gameState.selectedHero) { // Fallback if theme is somehow null but hero isn't
             heroLabel = defaultHeroOptions.find(h => h.value === gameState.selectedHero)?.label || heroLabel;
        }

        const suggestedName = gameState.theme && gameState.playerName && gameState.selectedHero
            ? `${gameState.playerName} (${heroLabel}) - ${subThemeLabel} (T${gameState.currentTurn}/${gameState.maxTurns}) - ${dateStr}`
            : `Sauvegarde ${dateStr}`;

        setSaveNameInput(suggestedName);
        setIsSaveDialogOpen(true);
    }, [gameState, toast]);

    const handleSaveGame = useCallback(() => {
        if (!saveNameInput.trim()) {
            toast({ title: "Nom Invalide", description: "Veuillez entrer un nom pour la sauvegarde.", variant: "destructive" });
            return;
        }
        if (gameState.currentView !== 'game_active') {
            toast({ title: "Action Impossible", description: "Vous ne pouvez sauvegarder qu'une partie en cours.", variant: "destructive" });
            setIsSaveDialogOpen(false);
            return;
        }
        if (!gameState.theme || !gameState.playerName || !gameState.selectedHero || !gameState.playerGender) { // Added check for playerGender
            toast({ title: "Erreur", description: "Impossible de sauvegarder : informations de jeu manquantes (thème, nom, héros ou genre).", variant: "destructive" });
            return;
        }

        // Directly use gameState fields, saveGame handles stringifying currentGameState and removing image URLs
        const stateToSave: Omit<GameStateToSave, 'timestamp' | 'saveName'> & { story: GameState['story'] } = {
            theme: gameState.theme,
            subTheme: gameState.subTheme,
            selectedHero: gameState.selectedHero,
            playerName: gameState.playerName,
            playerGender: gameState.playerGender, // Pass playerGender
            story: gameState.story, // Pass the full story array
            choices: gameState.choices,
            currentGameState: JSON.stringify(gameState.currentGameState), // Pass the stringified object
            playerChoicesHistory: gameState.playerChoicesHistory,
            maxTurns: gameState.maxTurns,
            currentTurn: gameState.currentTurn,
        };

        if (saveGame(saveNameInput.trim(), stateToSave)) {
            toast({ title: "Partie Sauvegardée", description: `La partie "${saveNameInput.trim()}" a été sauvegardée.` });
            setSavedGames(listSaveGames()); // Refresh list
            setIsSaveDialogOpen(false);
        } else {
            // Error handling is now primarily within saveGame utility
            toast({ title: "Erreur Sauvegarde", description: "La sauvegarde a échoué. Vérifiez la console pour les détails.", variant: "destructive" });
        }
    }, [saveNameInput, gameState, toast, setIsSaveDialogOpen, setSavedGames]);

    const handleLoadGame = useCallback((saveName: string) => {
        const loadedState = loadGame(saveName);
        if (loadedState) {
            // Validation: Ensure theme still exists
            if (!themes.some(t => t.value === loadedState.theme)) {
                 toast({ title: "Erreur de Chargement", description: `Le thème sauvegardé ("${loadedState.theme}") n'existe plus. Impossible de charger.`, variant: "destructive" });
                 setSavedGames(listSaveGames()); // Refresh list after failed load
                 return;
            }
            // Validation: Ensure subTheme (if not null) still exists for the main theme
            if (loadedState.subTheme) {
                const mainThemeExists = themes.some(t => t.value === loadedState.theme);
                const subThemeExists = mainThemeExists && themes.find(t => t.value === loadedState.theme)?.subThemes.some(st => st.value === loadedState.subTheme);
                if (!subThemeExists) {
                    toast({ title: "Erreur de Chargement", description: `Le scénario sauvegardé ("${loadedState.subTheme}") pour le thème "${loadedState.theme}" n'existe plus ou est invalide. Impossible de charger.`, variant: "destructive" });
                    setSavedGames(listSaveGames()); // Refresh list
                    return;
                }
            }
            // Validation: Ensure selectedHero still exists for the theme or default
            let heroExists = false;
            const loadedThemeValue = loadedState.theme as ThemeValue | null;
            if (loadedThemeValue) {
                heroExists = themedHeroOptions[loadedThemeValue]?.some(h => h.value === loadedState.selectedHero) ?? false;
            }
            if (!heroExists) {
                heroExists = defaultHeroOptions.some(h => h.value === loadedState.selectedHero);
            }
            // Optionnel : chercher dans tous les thèmes si toujours pas trouvé
            if (!heroExists) {
                for (const themeKey in themedHeroOptions) {
                    const heroesInTheme = themedHeroOptions[themeKey as keyof typeof themedHeroOptions];
                    if (heroesInTheme?.some(h => h.value === loadedState.selectedHero)) {
                        heroExists = true;
                        break;
                    }
                }
            }
            if (!loadedState.selectedHero || !heroExists) {
                 toast({ title: "Erreur de Chargement", description: `Le héros sauvegardé ("${loadedState.selectedHero || 'Aucun'}") n'existe plus ou est invalide pour le thème "${loadedState.theme}". Impossible de charger.`, variant: "destructive" });
                 setSavedGames(listSaveGames()); // Refresh list
                 return;
            }


            const parsedLoadedGameState = parseGameState(loadedState.currentGameState, loadedState.playerName);
            const loadedView: GameView = loadedState.currentTurn > loadedState.maxTurns ? 'game_ended' : 'game_active';

            setGameState(prev => ({
                ...prev,
                theme: loadedState.theme,
                subTheme: loadedState.subTheme,
                selectedHero: loadedState.selectedHero,
                playerName: loadedState.playerName,
                playerGender: loadedState.playerGender, // Load playerGender
                story: loadedState.story,
                choices: loadedState.choices,
                currentGameState: parsedLoadedGameState,
                playerChoicesHistory: loadedState.playerChoicesHistory,
                isLoading: false,
                error: null,
                currentView: loadedView,
                maxTurns: loadedState.maxTurns,
                currentTurn: loadedState.currentTurn,
                generatingSegmentId: null,
                initialPromptDebug: null, // Reset debug prompt on load
            }));
            toast({ title: "Partie Chargée", description: `La partie "${saveName}" a été chargée.` });
            // Consider closing popovers externally if needed
        } else {
            toast({ title: "Erreur de Chargement", description: `Impossible de charger la partie "${saveName}".`, variant: "destructive" });
            setSavedGames(listSaveGames());
        }
    }, [setGameState, toast, setSavedGames]); // Added setSavedGames dependency

    const handleDeleteGame = useCallback((saveName: string) => {
        if (deleteSaveGame(saveName)) {
            toast({ title: "Sauvegarde Supprimée", description: `La sauvegarde "${saveName}" a été supprimée.` });
            setSavedGames(listSaveGames());
        } else {
            toast({ title: "Erreur", description: `Impossible de supprimer la sauvegarde "${saveName}".`, variant: "destructive" });
        }
    }, [toast, setSavedGames]); // Added setSavedGames dependency

    return {
        savedGames,
        setSavedGames, // Expose if needed outside the hook
        saveNameInput,
        setSaveNameInput,
        isSaveDialogOpen,
        setIsSaveDialogOpen,
        handleOpenSaveDialog,
        handleSaveGame,
        handleLoadGame,
        handleDeleteGame,
    };
}

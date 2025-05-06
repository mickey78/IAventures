import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { GameState, GameView, HeroAbility } from '@/types/game';
import { themes } from '@/config/themes';
import { heroOptions } from '@/config/heroes';
import { listSaveGames } from '@/lib/saveLoadUtils';
import { logToFile } from '@/services/loggingService'; // Assuming this is used for client-side logging if needed

export function useGameSetup(
    initialGameState: GameState,
    setGameState: Dispatch<SetStateAction<GameState>>
) {
    const [playerNameInput, setPlayerNameInput] = useState('');
    const [maxTurnsInput, setMaxTurnsInput] = useState<number>(15);
    const { toast } = useToast();

    // Navigation Handlers
    const showMainMenu = useCallback(() => {
        setGameState(prev => ({
          ...prev,
          story: [],
          choices: [],
          currentGameState: {
              playerName: null,
              location: 'Menu Principal',
              inventory: [],
              relationships: {},
              emotions: [],
              events: []
          },
          theme: null,
          subTheme: null,
          selectedHero: null,
          playerName: null,
          isLoading: false,
          error: null,
          playerChoicesHistory: [],
          currentView: 'menu',
          maxTurns: 15,
          currentTurn: 1,
          generatingSegmentId: null,
          initialPromptDebug: null,
        }));
        // If listSaveGames becomes async or needs more complex state, adjust
        // For now, assuming it's synchronous and its result is handled by useSaveLoad
    }, [setGameState]);

    const showThemeSelection = useCallback(() => {
        setGameState(prev => ({
          ...prev,
          currentView: 'theme_selection',
          theme: null,
          subTheme: null,
          selectedHero: null,
          playerName: null,
          currentTurn: 1,
          maxTurns: 15,
          currentGameState: { ...prev.currentGameState, location: 'Sélection du Thème', relationships: {}, emotions: [], events: [] },
          initialPromptDebug: null,
        }));
    }, [setGameState]);

    const showSubThemeSelection = useCallback((selectedThemeValue: string) => {
        const selectedMainTheme = themes.find(t => t.value === selectedThemeValue);
        if (!selectedMainTheme) {
            toast({ title: 'Erreur', description: 'Thème principal non trouvé.', variant: 'destructive' });
            return;
        }
         setGameState(prev => ({
           ...prev,
           theme: selectedThemeValue,
           currentView: 'sub_theme_selection',
           subTheme: null,
           selectedHero: null,
           currentGameState: { ...prev.currentGameState, location: `Choix du Scénario: ${selectedThemeValue}` },
         }));
    }, [setGameState, toast]);

    const showHeroSelection = useCallback(() => {
         if (!initialGameState.theme) { // Use initialGameState or gameState depending on context
           toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de continuer.', variant: 'destructive' });
           return;
         }
         setGameState(prev => ({ ...prev, currentView: 'hero_selection', selectedHero: null, currentGameState: { ...prev.currentGameState, location: 'Choix du Héros' } }));
    }, [setGameState, initialGameState.theme, toast]);


    const showNameInput = useCallback(() => {
        // Use current gameState from the hook's scope directly
        if (!initialGameState.theme || !initialGameState.selectedHero) {
          toast({ title: 'Erreur', description: 'Veuillez choisir un thème et un héros avant de continuer.', variant: 'destructive' });
          return;
        }
        setGameState(prev => ({ ...prev, currentView: 'name_input', currentGameState: { ...prev.currentGameState, location: 'Création du Personnage' } }));
    }, [setGameState, initialGameState.theme, initialGameState.selectedHero, toast]);


    const showLoadGameView = useCallback(() => {
        // Saved games list is managed by useSaveLoad hook primarily
        setGameState(prev => ({ ...prev, currentView: 'loading_game', currentGameState: { ...prev.currentGameState, location: 'Chargement de Partie' } }));
    }, [setGameState]);


    // Game Logic Handlers
    const handleThemeSelect = useCallback((themeValue: string) => {
         setGameState((prev) => ({ ...prev, theme: themeValue, subTheme: null, selectedHero: null }));
    }, [setGameState]);

    const handleSubThemeSelect = useCallback((subThemeValue: string | null) => {
        setGameState((prev) => ({ ...prev, subTheme: subThemeValue, selectedHero: null }));
    }, [setGameState]);

    const handleHeroSelect = useCallback((heroValue: string) => {
        setGameState((prev) => ({ ...prev, selectedHero: heroValue }));
    }, [setGameState]);


    // This function is called by NameInput's onSubmit, which in turn calls startNewGame from useGameActions
    const prepareAndStartNewGame = useCallback(() => {
        if (!playerNameInput.trim()) {
          toast({ title: 'Nom Invalide', description: 'Veuillez entrer votre nom.', variant: 'destructive' });
          return;
        }
         if (!initialGameState.selectedHero) { // Check against current gameState
          toast({ title: 'Héros Manquant', description: 'Veuillez sélectionner une classe de héros.', variant: 'destructive' });
          return;
        }
        const trimmedName = playerNameInput.trim();
        // The actual call to startNewGame (with AI interaction) is in useGameActions
        // This function in useGameSetup is primarily for UI state changes leading up to that.
        // For clarity, ensure that useGameActions.startNewGame is invoked from the main Page component.
        // This hook mainly handles the UI flow *before* the game starts.
        // So, this function might not directly call startNewGame from useGameActions,
        // but rather set up the state for the Page component to do so.
        // So, this function might not directly call startNewGame from useGameActions,
        // but rather set up the state for the Page component to do so.
        setGameState(prev => ({
            ...prev,
            playerName: trimmedName,
            maxTurns: maxTurnsInput,
            // currentView might be set to 'game_active' by useGameActions.startNewGame
        }));

    }, [playerNameInput, initialGameState.selectedHero, maxTurnsInput, toast, setGameState]);


    return {
        playerNameInput,
        setPlayerNameInput,
        maxTurnsInput,
        setMaxTurnsInput,
        showMainMenu,
        showThemeSelection,
        showSubThemeSelection,
        showHeroSelection,
        showNameInput,
        showLoadGameView,
        handleThemeSelect,
        handleSubThemeSelect,
        handleHeroSelect,
        prepareAndStartNewGame, // This now mainly updates state for NameInput
    };
}
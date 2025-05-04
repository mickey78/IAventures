
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { listSaveGames, type GameStateToSave } from '@/lib/saveLoadUtils';
import type { StorySegment, ParsedGameState, GameState, GameView, Theme, SubTheme } from '@/types/game'; // Import shared types
import { generateInitialStory } from '@/ai/flows/generate-initial-story';
import type { GenerateInitialStoryOutput, GenerateInitialStoryInput } from '@/ai/flows/generate-initial-story'; // Import Input type
import { generateStoryContent } from '@/ai/flows/generate-story-content';
import type { GenerateStoryContentInput, GenerateStoryContentOutput } from '@/ai/flows/generate-story-content';
import { generateImage } from '@/ai/flows/generate-image';
import type { GenerateImageOutput } from '@/ai/flows/generate-image';
import { saveGame, loadGame, deleteSaveGame } from '@/lib/saveLoadUtils';
import { parseGameState, safeJsonStringify } from '@/lib/gameStateUtils'; // Import helper
import { themes } from '@/config/themes'; // Import themes config

import { Card } from '@/components/ui/card';
import GameHeader from '@/components/game/GameHeader';
import MainMenu from '@/components/game/MainMenu';
import ThemeSelection from '@/components/game/ThemeSelection';
import SubThemeSelection from '@/components/game/SubThemeSelection'; // Import SubThemeSelection
import NameInput from '@/components/game/NameInput';
import LoadGame from '@/components/game/LoadGame';
import StoryDisplay from '@/components/game/StoryDisplay';
import ActionInput from '@/components/game/ActionInput';
import SaveDialog from '@/components/game/SaveDialog';
import GameEndedDisplay from '@/components/game/GameEndedDisplay';
import { AlertCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IAventuresGame() {
  const [gameState, setGameState] = useState<GameState>({
    story: [],
    choices: [],
    currentGameState: {
        playerName: null,
        location: 'Menu Principal',
        inventory: [],
        relationships: {},
        emotions: [],
        events: [],
     }, // Initialize with default object and location
    theme: null,
    subTheme: null, // Added subTheme state
    playerName: null,
    isLoading: false,
    error: null,
    playerChoicesHistory: [],
    currentView: 'menu',
    maxTurns: 15, // Default max turns
    currentTurn: 1, // Default current turn
    generatingSegmentId: null, // Track which segment is generating an image
  });
  const [savedGames, setSavedGames] = useState<Omit<GameStateToSave, 'story' | 'choices' | 'currentGameState' | 'playerChoicesHistory'>[]>([]); // Minimal info for list
  const [saveNameInput, setSaveNameInput] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [maxTurnsInput, setMaxTurnsInput] = useState<number>(15);
  const [customChoiceInput, setCustomChoiceInput] = useState('');
  const [isInventoryPopoverOpen, setIsInventoryPopoverOpen] = useState(false);
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);

  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // --- Load saved games on initial mount ---
  useEffect(() => {
    setSavedGames(listSaveGames());
  }, []);

  // --- Scrolling Effect ---
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
      }
    });
  }, []);

  useEffect(() => {
    if ((gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && gameState.story.length > 0) {
      scrollToBottom();
    }
  }, [gameState.story, gameState.currentView, scrollToBottom]);

  // --- Focus Custom Input Effect ---
  useEffect(() => {
    if (isCustomInputVisible && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomInputVisible]);

  // --- Navigation Handlers ---
  const showMainMenu = () => {
    setGameState(prev => ({
      ...prev,
      story: [],
      choices: [],
      currentGameState: { // Reset inner state completely
          playerName: null,
          location: 'Menu Principal',
          inventory: [],
          relationships: {},
          emotions: [],
          events: []
      },
      theme: null,
      subTheme: null, // Reset subTheme
      playerName: null,
      isLoading: false,
      error: null,
      playerChoicesHistory: [],
      currentView: 'menu',
      maxTurns: 15,
      currentTurn: 1,
      generatingSegmentId: null,
    }));
    setSavedGames(listSaveGames());
    setIsInventoryPopoverOpen(false);
    setIsCustomInputVisible(false);
  }

  const showThemeSelection = () => {
    setGameState(prev => ({
      ...prev,
      currentView: 'theme_selection',
      theme: null,
      subTheme: null, // Reset subTheme when going back to theme selection
      playerName: null,
      currentTurn: 1,
      maxTurns: 15,
      currentGameState: { ...prev.currentGameState, location: 'Sélection du Thème', relationships: {}, emotions: [], events: [] } // Reset specific parts
    }));
    setIsInventoryPopoverOpen(false);
    setIsCustomInputVisible(false);
  };

  const showSubThemeSelection = (selectedThemeValue: string) => {
    const selectedMainTheme = themes.find(t => t.value === selectedThemeValue);
    if (!selectedMainTheme) {
        toast({ title: 'Erreur', description: 'Thème principal non trouvé.', variant: 'destructive' });
        return;
    }
     setGameState(prev => ({
       ...prev,
       theme: selectedThemeValue, // Set the main theme
       currentView: 'sub_theme_selection',
       subTheme: null, // Reset subtheme selection for this view
       currentGameState: { ...prev.currentGameState, location: `Choix du Scénario: ${selectedThemeValue}` }
     }));
     setIsInventoryPopoverOpen(false);
     setIsCustomInputVisible(false);
   };


  const showNameInput = () => {
    if (!gameState.theme || !gameState.subTheme) { // Check for both theme and subTheme
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème et un scénario avant de continuer.', variant: 'destructive' });
      return;
    }
    setGameState(prev => ({ ...prev, currentView: 'name_input', currentGameState: { ...prev.currentGameState, location: 'Création du Personnage' } }));
    setIsInventoryPopoverOpen(false);
    setIsCustomInputVisible(false);
  }

  const showLoadGameView = () => {
    setSavedGames(listSaveGames());
    setGameState(prev => ({ ...prev, currentView: 'loading_game', currentGameState: { ...prev.currentGameState, location: 'Chargement de Partie' } }));
    setIsInventoryPopoverOpen(false);
    setIsCustomInputVisible(false);
  };

  // --- Game Logic ---
  const handleThemeSelect = (themeValue: string) => {
     // No need to change view here, just update the selected theme in state
     setGameState((prev) => ({ ...prev, theme: themeValue, subTheme: null })); // Reset subtheme if main theme changes
  };

  const handleSubThemeSelect = (subThemeValue: string) => {
    setGameState((prev) => ({ ...prev, subTheme: subThemeValue }));
  };


  const handleNameSubmit = () => {
    if (!playerNameInput.trim()) {
      toast({ title: 'Nom Invalide', description: 'Veuillez entrer votre nom.', variant: 'destructive' });
      return;
    }
    const trimmedName = playerNameInput.trim();
    setGameState(prev => ({
      ...prev,
      playerName: trimmedName,
      currentGameState: { ...prev.currentGameState, playerName: trimmedName, location: 'Initialisation...' },
      maxTurns: maxTurnsInput,
      currentTurn: 1,
    }));
    startNewGame(trimmedName, gameState.theme, gameState.subTheme, maxTurnsInput); // Pass subTheme
  }

  // --- Image Generation ---
  const triggerImageGeneration = useCallback(async (segmentId: number, prompt: string) => {
    setGameState((prev) => ({
        ...prev,
        story: prev.story.map(seg =>
            seg.id === segmentId
                ? { ...seg, imageIsLoading: true, imageError: false, imageGenerationPrompt: prompt } // Mark as loading and store prompt
                : seg
        ),
        generatingSegmentId: segmentId, // Track generating segment
    }));

    try {
        console.log(`Requesting image generation for segment ${segmentId} with prompt: ${prompt}`);
        const imageData: GenerateImageOutput = await generateImage({ prompt });
        console.log(`Image generated successfully for segment ${segmentId}`);
        setGameState((prev) => ({
            ...prev,
            story: prev.story.map(seg =>
                seg.id === segmentId
                    ? { ...seg, storyImageUrl: imageData.imageUrl, imageIsLoading: false }
                    : seg
            ),
            generatingSegmentId: null, // Clear generating tracker
        }));
        scrollToBottom(); // Scroll after image loads
    } catch (err) {
        console.error(`Error generating image for segment ${segmentId}:`, err);
        const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
        toast({ title: 'Erreur Image', description: `Impossible de générer l'image: ${errorMsg}`, variant: 'destructive' });
        setGameState((prev) => ({
            ...prev,
            story: prev.story.map(seg =>
                seg.id === segmentId
                    ? { ...seg, storyImageUrl: null, imageIsLoading: false, imageError: true } // Mark as error
                    : seg
            ),
            generatingSegmentId: null, // Clear generating tracker
        }));
    }
  }, [toast, scrollToBottom]); // Added scrollToBottom dependency

  const handleManualImageGeneration = (segmentId: number, segmentText: string) => {
      if (!gameState.theme || !gameState.currentGameState.location || !gameState.playerName) {
            toast({ title: 'Erreur', description: 'Impossible de générer une image sans thème, lieu ou nom de joueur définis.', variant: 'destructive' });
            return;
      }
      // Construct a prompt similar to the automatic one, including player name and current mood if available
      const moodText = gameState.currentGameState.emotions && gameState.currentGameState.emotions.length > 0 ? ` Ambiance: ${gameState.currentGameState.emotions.join(', ')}.` : '';
      const prompt = `Une illustration de "${gameState.playerName}": "${segmentText.substring(0, 80)}...". Lieu: ${gameState.currentGameState.location}. Thème: ${gameState.theme}.${moodText} Style: Cartoon.`;
      triggerImageGeneration(segmentId, prompt);
  };


  const startNewGame = async (nameToUse: string, themeToUse: string | null, subThemeToUse: string | null, turns: number) => {
    if (!themeToUse || !subThemeToUse) {
      console.error('Theme or subTheme missing, cannot start game.');
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un thème et un scénario.', variant: 'destructive' });
       // Decide where to send the user back - likely theme selection
       if (!themeToUse) showThemeSelection();
       else if (themeToUse) showSubThemeSelection(themeToUse); // Go back to subtheme selection if theme exists
      return;
    }

     // Find the specific subTheme prompt
     const mainTheme = themes.find(t => t.value === themeToUse);
     const subThemeDetails = mainTheme?.subThemes.find(st => st.value === subThemeToUse);
     if (!subThemeDetails) {
        console.error('SubTheme details not found.');
        toast({ title: 'Erreur', description: 'Détails du scénario non trouvés.', variant: 'destructive' });
        showSubThemeSelection(themeToUse); // Go back to subtheme selection
        return;
     }
     const initialScenarioPrompt = subThemeDetails.prompt;


    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [],
      choices: [],
      playerChoicesHistory: [],
      currentView: 'game_active',
      theme: themeToUse,
      subTheme: subThemeToUse, // Set subTheme
      playerName: nameToUse,
      maxTurns: turns,
      currentTurn: 1,
      generatingSegmentId: null,
      currentGameState: { // Reset game state inner parts completely for new game
        playerName: nameToUse, // Ensure player name is set here too
        location: 'Chargement...',
        inventory: [],
        relationships: {},
        emotions: [],
        events: [],
      },
    }));
    setIsInventoryPopoverOpen(false);
    setIsCustomInputVisible(false);

    try {
      const initialStoryInput: GenerateInitialStoryInput = { // Use the input type
          theme: themeToUse,
          subThemePrompt: initialScenarioPrompt, // Pass the specific sub-theme prompt
          playerName: nameToUse,
        };

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
          ...prev.currentGameState, // Keep playerName, inventory already reset
          location: initialStoryData.location,
          // Initialize relationships and emotions based on story? Or keep empty? For now, keep empty.
          relationships: {},
          emotions: [],
          events: [], // Start with no events
        }
      }));

      if (initialStoryData.generatedImagePrompt) {
        triggerImageGeneration(initialSegmentId, initialStoryData.generatedImagePrompt);
      }

    } catch (err) {
      console.error('Error generating initial story:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de générer l'histoire initiale: ${errorMsg}`,
        theme: null,
        subTheme: null, // Reset subTheme on error
        playerName: null,
        currentGameState: { // Ensure reset on error too
            playerName: null,
            location: 'Erreur',
            inventory: [],
            relationships: {},
            emotions: [],
            events: []
        },
        currentView: 'theme_selection', // Go back to theme selection on error
        maxTurns: 15,
        currentTurn: 1,
        generatingSegmentId: null,
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de générer l'histoire initiale: ${errorMsg}`, variant: 'destructive' });
    }
  };

  const handleAction = async (actionText: string) => {
    if (!actionText.trim()) {
      toast({ title: "Action Vide", description: "Veuillez décrire votre action.", variant: "destructive" });
      return;
    }
    if (!gameState.playerName || !gameState.theme) { // SubTheme check not strictly needed here, main theme is enough for content generation
      console.error('Player name or theme missing during action handling.');
      toast({ title: 'Erreur', description: 'Erreur de jeu critique. Retour au menu principal.', variant: 'destructive' });
      showMainMenu();
      return;
    }
    if (gameState.currentView === 'game_ended') {
      toast({ title: "Fin de l'aventure", description: "L'histoire est terminée. Vous pouvez commencer une nouvelle partie.", variant: "destructive" });
      return;
    }

    const playerActionSegment: StorySegment = {
      id: Date.now(),
      text: actionText.trim(),
      speaker: 'player',
      // No image fields for player actions
    };
    const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, actionText.trim()];
    const previousStory = [...gameState.story];
    const previousChoices = [...gameState.choices];
    const previousGameState = gameState.currentGameState; // This is now ParsedGameState object
    const lastSegmentBeforeAction = previousStory.length > 0 ? previousStory[previousStory.length - 1] : undefined;
    const nextTurn = gameState.currentTurn + 1;


    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [...prev.story, playerActionSegment],
      choices: [],
      playerChoicesHistory: nextPlayerChoicesHistory,
      currentTurn: nextTurn,
      generatingSegmentId: null,
    }));
    setCustomChoiceInput('');
    setIsInventoryPopoverOpen(false);
    setIsCustomInputVisible(false);

    const isLastTurn = nextTurn > gameState.maxTurns;

    const input: GenerateStoryContentInput = {
      theme: gameState.theme, // Pass main theme
      // subTheme: gameState.subTheme, // Pass subTheme if needed by the content generation prompt later
      playerName: gameState.playerName,
      lastStorySegment: lastSegmentBeforeAction, // Pass previous segment for context and image prompt
      playerChoicesHistory: nextPlayerChoicesHistory,
      gameState: safeJsonStringify(previousGameState), // Stringify the ParsedGameState object
      currentTurn: nextTurn,
      maxTurns: gameState.maxTurns,
      isLastTurn: isLastTurn,
    };

    try {
      const nextStoryData: GenerateStoryContentOutput = await generateStoryContent(input);

      const narratorResponseSegmentId = Date.now() + 1;
      const narratorResponseSegment: StorySegment = {
        id: narratorResponseSegmentId,
        text: nextStoryData.storyContent,
        speaker: 'narrator',
        storyImageUrl: null,
        imageIsLoading: !!nextStoryData.generatedImagePrompt,
        imageError: false,
        imageGenerationPrompt: nextStoryData.generatedImagePrompt, // Store the new prompt
      };
      const updatedParsedGameState = parseGameState(nextStoryData.updatedGameState, gameState.playerName);

      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, narratorResponseSegment],
        choices: nextStoryData.nextChoices,
        currentGameState: updatedParsedGameState, // Store the parsed object
        isLoading: false,
        currentView: isLastTurn ? 'game_ended' : 'game_active',
      }));

      if (nextStoryData.generatedImagePrompt) {
        triggerImageGeneration(narratorResponseSegmentId, nextStoryData.generatedImagePrompt);
      }

      if (isLastTurn) {
        toast({ title: "Fin de l'Aventure !", description: "Votre histoire est terminée. Merci d'avoir joué !", duration: 5000 });
      }

    } catch (err) {
      console.error('Error generating story content:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de continuer l'histoire: ${errorMsg}`,
        story: previousStory,
        choices: previousChoices,
        currentGameState: previousGameState, // Revert to previous ParsedGameState object
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1),
        currentTurn: prev.currentTurn - 1, // Revert turn count on error
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };

  const handleCustomChoiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAction(customChoiceInput);
  };

  const handleInventoryActionClick = (actionPrefix: string, item: string) => {
    if (gameState.currentView === 'game_ended') {
      toast({ title: "Fin de l'aventure", description: "L'histoire est terminée.", variant: "destructive" });
      setIsInventoryPopoverOpen(false);
      return;
    }
    const fullActionText = `${actionPrefix} ${item}`;
    setCustomChoiceInput(fullActionText);
    setIsInventoryPopoverOpen(false);
    setIsCustomInputVisible(true);
    requestAnimationFrame(() => {
      customInputRef.current?.focus();
      customInputRef.current?.setSelectionRange(fullActionText.length, fullActionText.length);
    });
    toast({ title: "Action d'Inventaire", description: `Prêt à '${fullActionText}'. Appuyez sur Envoyer.` });
  };

  // --- Save/Load Handlers ---
  const handleOpenSaveDialog = () => {
     if (gameState.currentView !== 'game_active') { // Allow saving only when active
      toast({ title: "Action Impossible", description: "Vous ne pouvez sauvegarder qu'une partie en cours.", variant: "default" });
      return;
    }
    const dateStr = new Date().toLocaleDateString('fr-CA');
    const subThemeLabel = themes.find(t => t.value === gameState.theme)?.subThemes.find(st => st.value === gameState.subTheme)?.label || gameState.subTheme || '';
    const suggestedName = gameState.theme && gameState.playerName && gameState.subTheme
       ? `${gameState.playerName} - ${subThemeLabel} (T${gameState.currentTurn}/${gameState.maxTurns}) - ${dateStr}` // More specific name
       : `Sauvegarde ${dateStr}`;

    setSaveNameInput(suggestedName);
    setIsSaveDialogOpen(true);
  };

  const handleSaveGame = () => {
    if (!saveNameInput.trim()) {
      toast({ title: "Nom Invalide", description: "Veuillez entrer un nom pour la sauvegarde.", variant: "destructive" });
      return;
    }
     if (gameState.currentView !== 'game_active') {
        toast({ title: "Action Impossible", description: "Vous ne pouvez sauvegarder qu'une partie en cours.", variant: "destructive" });
        setIsSaveDialogOpen(false);
        return;
    }
    if (!gameState.theme || !gameState.subTheme || !gameState.playerName) { // Check for subTheme too
      toast({ title: "Erreur", description: "Impossible de sauvegarder : informations de jeu manquantes (thème, scénario ou nom).", variant: "destructive" });
      return;
    }

    // Ensure currentGameState is stringified before saving
    const stringifiedGameState = safeJsonStringify(gameState.currentGameState); // Use the utility

    // Prepare the state, ensuring story segments exclude transient/image data
    const stateToSave = {
      theme: gameState.theme,
      subTheme: gameState.subTheme, // Save subTheme
      playerName: gameState.playerName,
      story: gameState.story.map(seg => { // Map to exclude fields for saving
          const { storyImageUrl, imageIsLoading, imageError, imageGenerationPrompt, ...rest } = seg;
          return rest; // Keep only id, text, speaker
      }),
      choices: gameState.choices,
      currentGameState: stringifiedGameState, // Pass the stringified version
      playerChoicesHistory: gameState.playerChoicesHistory,
      maxTurns: gameState.maxTurns,
      currentTurn: gameState.currentTurn,
    };

    // Use saveGame utility, which now handles image data removal internally
    if (saveGame(saveNameInput.trim(), stateToSave)) {
      toast({ title: "Partie Sauvegardée", description: `La partie "${saveNameInput.trim()}" a été sauvegardée.` });
      setSavedGames(listSaveGames());
      setIsSaveDialogOpen(false);
    } else {
      // Error handling is now primarily within saveGame utility (e.g., quota exceeded)
       toast({ title: "Erreur Sauvegarde", description: "La sauvegarde a échoué. Vérifiez la console pour les détails.", variant: "destructive" });
    }
  };

 const handleLoadGame = (saveName: string) => {
    const loadedState = loadGame(saveName); // loadGame now adds default image states and subTheme
    if (loadedState) {
       // Validate subTheme existence if possible (optional, depends on how strict you want to be)
        const mainThemeExists = themes.some(t => t.value === loadedState.theme);
        const subThemeExists = mainThemeExists && themes.find(t => t.value === loadedState.theme)?.subThemes.some(st => st.value === loadedState.subTheme);
        if (!subThemeExists) {
             toast({ title: "Erreur de Chargement", description: `Le scénario sauvegardé ("${loadedState.subTheme}") pour le thème "${loadedState.theme}" n'existe plus ou est invalide. Impossible de charger.`, variant: "destructive" });
             setSavedGames(listSaveGames()); // Refresh list
             return;
         }


      const parsedLoadedGameState = parseGameState(loadedState.currentGameState, loadedState.playerName); // Ensure parsing
      const loadedView: GameView = loadedState.currentTurn > loadedState.maxTurns ? 'game_ended' : 'game_active'; // Determine view based on turns

      setGameState(prev => ({
        ...prev,
        theme: loadedState.theme,
        subTheme: loadedState.subTheme, // Load subTheme
        playerName: loadedState.playerName,
        story: loadedState.story, // Use the story with rehydrated image states
        choices: loadedState.choices,
        currentGameState: parsedLoadedGameState, // Use the parsed game state object
        playerChoicesHistory: loadedState.playerChoicesHistory,
        isLoading: false,
        error: null,
        currentView: loadedView,
        maxTurns: loadedState.maxTurns,
        currentTurn: loadedState.currentTurn,
        generatingSegmentId: null, // Reset image generation tracking
      }));
      toast({ title: "Partie Chargée", description: `La partie "${saveName}" a été chargée.` });
      setIsInventoryPopoverOpen(false);
      setIsCustomInputVisible(false);
    } else {
      toast({ title: "Erreur de Chargement", description: `Impossible de charger la partie "${saveName}".`, variant: "destructive" });
      setSavedGames(listSaveGames()); // Refresh list in case the save was corrupted/removed
    }
  };


  const handleDeleteGame = (saveName: string) => {
    if (deleteSaveGame(saveName)) {
      toast({ title: "Sauvegarde Supprimée", description: `La sauvegarde "${saveName}" a été supprimée.` });
      setSavedGames(listSaveGames());
    } else {
      toast({ title: "Erreur", description: `Impossible de supprimer la sauvegarde "${saveName}".`, variant: "destructive" });
    }
  };

  // --- Render Logic ---
  const renderCurrentView = () => {
    switch (gameState.currentView) {
      case 'menu':
        return <MainMenu onNewGame={showThemeSelection} onLoadGame={showLoadGameView} hasSavedGames={savedGames.length > 0} />;
      case 'theme_selection':
        return <ThemeSelection
                    themes={themes}
                    selectedTheme={gameState.theme}
                    onThemeSelect={handleThemeSelect}
                    onNext={showSubThemeSelection} // Go to subtheme selection
                    onBack={showMainMenu}
                />;
      case 'sub_theme_selection': { // Added case for sub-theme selection
        const selectedMainTheme = themes.find(t => t.value === gameState.theme);
        return <SubThemeSelection
                  mainTheme={selectedMainTheme}
                  selectedSubTheme={gameState.subTheme}
                  onSubThemeSelect={handleSubThemeSelect}
                  onNext={showNameInput} // Go to name input
                  onBack={showThemeSelection} // Go back to theme selection
              />;
        }
      case 'name_input':
        return <NameInput
                    playerName={playerNameInput}
                    onPlayerNameChange={setPlayerNameInput}
                    maxTurns={maxTurnsInput}
                    onMaxTurnsChange={setMaxTurnsInput}
                    onSubmit={handleNameSubmit}
                    onBack={() => gameState.theme && showSubThemeSelection(gameState.theme)} // Go back to subtheme selection
                    isLoading={gameState.isLoading}
                />;
      case 'loading_game':
        return <LoadGame
                    savedGames={savedGames}
                    onLoadGame={handleLoadGame}
                    onDeleteGame={handleDeleteGame}
                    onBack={showMainMenu}
                />;
      case 'game_active':
        return (
          <>
            <StoryDisplay
                story={gameState.story}
                playerName={gameState.playerName}
                viewportRef={viewportRef}
                isLoading={gameState.isLoading}
                generatingSegmentId={gameState.generatingSegmentId}
                onManualImageGeneration={handleManualImageGeneration}
            />
            {!gameState.isLoading && (
              <ActionInput
                choices={gameState.choices}
                customChoiceInput={customChoiceInput}
                onCustomChoiceChange={setCustomChoiceInput}
                onCustomChoiceSubmit={handleCustomChoiceSubmit}
                onAction={handleAction}
                isLoading={gameState.isLoading}
                isCustomInputVisible={isCustomInputVisible}
                onToggleCustomInput={() => setIsCustomInputVisible(!isCustomInputVisible)}
                customInputRef={customInputRef}
              />
            )}
            {gameState.isLoading && (
                <div className="flex items-center justify-start space-x-2 text-muted-foreground mt-4 ml-4">
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Génération de la suite...</span>
                </div>
            )}
          </>
        );
       case 'game_ended':
         return (
           <>
            <StoryDisplay
                story={gameState.story}
                playerName={gameState.playerName}
                viewportRef={viewportRef}
                isLoading={false} // Game ended, not loading new content
                generatingSegmentId={gameState.generatingSegmentId}
                onManualImageGeneration={handleManualImageGeneration} // Allow generation even after end? Maybe disable.
            />
            <GameEndedDisplay
                maxTurns={gameState.maxTurns}
                finalLocation={gameState.currentGameState.location}
                onMainMenu={showMainMenu}
            />
           </>
         );
      default:
        return <p>État inconnu</p>;
    }
  };

  const shouldCenterContent = ['menu', 'theme_selection', 'sub_theme_selection', 'name_input', 'loading_game'].includes(gameState.currentView); // Added sub_theme_selection

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg flex flex-col flex-grow mt-10" style={{ height: 'calc(95vh - 40px)' }}>
        <GameHeader
            currentView={gameState.currentView}
            theme={gameState.theme}
            subTheme={gameState.subTheme} // Pass subTheme
            playerName={gameState.playerName}
            location={gameState.currentGameState.location}
            inventory={gameState.currentGameState.inventory}
            currentTurn={gameState.currentTurn}
            maxTurns={gameState.maxTurns}
            isLoading={gameState.isLoading}
            isInventoryOpen={isInventoryPopoverOpen}
            onInventoryToggle={setIsInventoryPopoverOpen}
            onInventoryAction={handleInventoryActionClick}
            onSave={handleOpenSaveDialog}
            onMainMenu={showMainMenu}
        />

        <div className={cn(
             "flex-grow flex flex-col overflow-hidden p-4 md:p-6",
             shouldCenterContent && "items-center justify-center"
         )}>
          {renderCurrentView()}

          {/* Error Display */}
          {gameState.error && (
            <div className="flex-shrink-0 mt-auto p-2 bg-destructive/10 rounded-md border border-destructive text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="flex-1">{gameState.error}</p>
            </div>
          )}
        </div>
      </Card>

      <SaveDialog
        isOpen={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        saveName={saveNameInput}
        onSaveNameChange={setSaveNameInput}
        onSave={handleSaveGame}
        isGameActive={gameState.currentView === 'game_active'}
      />
    </div>
  );
}

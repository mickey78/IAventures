
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { listSaveGames, type GameStateToSave } from '@/lib/saveLoadUtils';
import type { StorySegment, GameState, GameView, HeroAbility } from '@/types/game'; // Import shared types
import { heroOptions } from '@/config/heroes'; // Import hero config
import { themes } from '@/config/themes'; // Import themes config
import { useGameActions } from '@/hooks/useGameActions'; // Import the new hook
import { useSaveLoad } from '@/hooks/useSaveLoad'; // Import the new hook

import { Card } from '@/components/ui/card';
import GameHeader from '@/components/game/GameHeader';
import MainMenu from '@/components/game/MainMenu';
import ThemeSelection from '@/components/game/ThemeSelection';
import SubThemeSelection from '@/components/game/SubThemeSelection';
import HeroSelection from '@/components/game/HeroSelection';
import NameInput from '@/components/game/NameInput';
import LoadGame from '@/components/game/LoadGame';
import StoryDisplay from '@/components/game/StoryDisplay';
import ActionInput from '@/components/game/ActionInput';
import SaveDialog from '@/components/game/SaveDialog';
import GameEndedDisplay from '@/components/game/GameEndedDisplay';
import DebugInitialPrompt from '@/components/game/DebugInitialPrompt'; // Import Debug Component
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
    initialPromptDebug: null, // Initialize debug info
  });
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [maxTurnsInput, setMaxTurnsInput] = useState<number>(15);
  const [customChoiceInput, setCustomChoiceInput] = useState('');
  const [isInventoryPopoverOpen, setIsInventoryPopoverOpen] = useState(false);
  const [isAbilitiesPopoverOpen, setIsAbilitiesPopoverOpen] = useState(false);
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);


  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Use custom hook for game actions (AI interactions)
  const {
    startNewGame,
    handleAction,
    triggerImageGeneration,
    handleManualImageGeneration,
    shouldFlashInventory,
    setShouldFlashInventory,
  } = useGameActions(gameState, setGameState, toast, viewportRef);

  // Use custom hook for save/load functionality
  const {
    savedGames,
    setSavedGames, // Expose setter if needed from hook
    saveNameInput,
    setSaveNameInput,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    handleOpenSaveDialog,
    handleSaveGame,
    handleLoadGame,
    handleDeleteGame,
  } = useSaveLoad(gameState, setGameState, toast);


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

   // --- Inventory Flash Effect ---
   useEffect(() => {
    if (shouldFlashInventory) {
      const timer = setTimeout(() => {
        setShouldFlashInventory(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldFlashInventory, setShouldFlashInventory]);


  // --- Navigation Handlers ---
  const showMainMenu = () => {
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
      initialPromptDebug: null, // Reset debug info
    }));
    setSavedGames(listSaveGames()); // Refresh saved games list via hook
    setIsInventoryPopoverOpen(false);
    setIsAbilitiesPopoverOpen(false);
    setIsCustomInputVisible(false);
  }

  const showThemeSelection = () => {
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
      initialPromptDebug: null, // Reset debug info
    }));
    setIsInventoryPopoverOpen(false);
     setIsAbilitiesPopoverOpen(false);
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
       theme: selectedThemeValue,
       currentView: 'sub_theme_selection',
       subTheme: null,
       selectedHero: null,
       currentGameState: { ...prev.currentGameState, location: `Choix du Scénario: ${selectedThemeValue}` },
     }));
     setIsInventoryPopoverOpen(false);
     setIsAbilitiesPopoverOpen(false);
     setIsCustomInputVisible(false);
   };

   const showHeroSelection = () => {
     if (!gameState.theme) {
       toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de continuer.', variant: 'destructive' });
       return;
     }
     setGameState(prev => ({ ...prev, currentView: 'hero_selection', selectedHero: null, currentGameState: { ...prev.currentGameState, location: 'Choix du Héros' } }));
     setIsInventoryPopoverOpen(false);
      setIsAbilitiesPopoverOpen(false);
     setIsCustomInputVisible(false);
   };


  const showNameInput = () => {
    if (!gameState.theme || !gameState.selectedHero) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème et un héros avant de continuer.', variant: 'destructive' });
      return;
    }
    setGameState(prev => ({ ...prev, currentView: 'name_input', currentGameState: { ...prev.currentGameState, location: 'Création du Personnage' } }));
    setIsInventoryPopoverOpen(false);
     setIsAbilitiesPopoverOpen(false);
     setIsCustomInputVisible(false);
  }

  const showLoadGameView = () => {
    setSavedGames(listSaveGames()); // Refresh saved games list via hook
    setGameState(prev => ({ ...prev, currentView: 'loading_game', currentGameState: { ...prev.currentGameState, location: 'Chargement de Partie' } }));
    setIsInventoryPopoverOpen(false);
     setIsAbilitiesPopoverOpen(false);
     setIsCustomInputVisible(false);
  };

  // --- Game Logic Handlers ---
  const handleThemeSelect = (themeValue: string) => {
     setGameState((prev) => ({ ...prev, theme: themeValue, subTheme: null, selectedHero: null }));
  };

  const handleSubThemeSelect = (subThemeValue: string | null) => {
    setGameState((prev) => ({ ...prev, subTheme: subThemeValue, selectedHero: null }));
  };

  const handleHeroSelect = (heroValue: string) => { // Changed type to string
    setGameState((prev) => ({ ...prev, selectedHero: heroValue }));
  };


  const handleNameSubmit = () => {
    if (!playerNameInput.trim()) {
      toast({ title: 'Nom Invalide', description: 'Veuillez entrer votre nom.', variant: 'destructive' });
      return;
    }
     if (!gameState.selectedHero) {
      toast({ title: 'Héros Manquant', description: 'Veuillez sélectionner une classe de héros.', variant: 'destructive' });
      return;
    }
    const trimmedName = playerNameInput.trim();
    // Call startNewGame from the hook
    startNewGame(trimmedName, gameState.theme, gameState.subTheme, gameState.selectedHero, maxTurnsInput);
  }


  const handleCustomChoiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Call handleAction from the hook
    handleAction(customChoiceInput);
    setCustomChoiceInput(''); // Clear input after submission
    setIsCustomInputVisible(false); // Hide custom input field
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

  const handleAbilityActionClick = (ability: HeroAbility) => {
    if (gameState.currentView === 'game_ended') {
        toast({ title: "Fin de l'aventure", description: "L'histoire est terminée.", variant: "destructive" });
        setIsAbilitiesPopoverOpen(false);
        return;
    }
    const fullActionText = `Utiliser ${ability.label}`;
    setCustomChoiceInput(fullActionText);
    setIsAbilitiesPopoverOpen(false);
    setIsCustomInputVisible(true);
    requestAnimationFrame(() => {
      customInputRef.current?.focus();
      customInputRef.current?.setSelectionRange(fullActionText.length, fullActionText.length);
    });
    toast({ title: "Action d'Habileté", description: `Prêt à '${fullActionText}'. Appuyez sur Envoyer.` });
  };

  // --- Save/Load Handlers are now called directly from the useSaveLoad hook ---


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
                    onNext={showSubThemeSelection}
                    onBack={showMainMenu}
                />;
      case 'sub_theme_selection': {
        const selectedMainTheme = themes.find(t => t.value === gameState.theme);
        return <SubThemeSelection
                  mainTheme={selectedMainTheme}
                  selectedSubTheme={gameState.subTheme}
                  onSubThemeSelect={handleSubThemeSelect}
                  onNext={showHeroSelection}
                  onBack={showThemeSelection}
              />;
        }
      case 'hero_selection':
        return <HeroSelection
                    heroes={heroOptions}
                    selectedHero={gameState.selectedHero}
                    onHeroSelect={handleHeroSelect}
                    onNext={showNameInput}
                    onBack={() => gameState.theme ? showSubThemeSelection(gameState.theme) : showThemeSelection()}
                />;
      case 'name_input':
        return <NameInput
                    playerName={playerNameInput}
                    onPlayerNameChange={setPlayerNameInput}
                    maxTurns={maxTurnsInput}
                    onMaxTurnsChange={setMaxTurnsInput}
                    onSubmit={handleNameSubmit}
                    onBack={showHeroSelection}
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
            {gameState.initialPromptDebug && <DebugInitialPrompt prompt={gameState.initialPromptDebug} />}
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
                onAction={handleAction} // Use handleAction from hook
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
            {gameState.initialPromptDebug && <DebugInitialPrompt prompt={gameState.initialPromptDebug} />}
            <StoryDisplay
                story={gameState.story}
                playerName={gameState.playerName}
                viewportRef={viewportRef}
                isLoading={false}
                generatingSegmentId={gameState.generatingSegmentId}
                onManualImageGeneration={handleManualImageGeneration}
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

  const shouldCenterContent = ['menu', 'theme_selection', 'sub_theme_selection', 'hero_selection', 'name_input', 'loading_game'].includes(gameState.currentView);

    const currentHeroAbilities = gameState.selectedHero
      ? heroOptions.find(h => h.value === gameState.selectedHero)?.abilities || []
      : [];


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg flex flex-col flex-grow mt-10" style={{ height: 'calc(95vh - 40px)' }}>
        <GameHeader
            currentView={gameState.currentView}
            theme={gameState.theme}
            subTheme={gameState.subTheme}
            selectedHero={gameState.selectedHero}
            playerName={gameState.playerName}
            location={gameState.currentGameState.location}
            inventory={gameState.currentGameState.inventory}
            abilities={currentHeroAbilities}
            currentTurn={gameState.currentTurn}
            maxTurns={gameState.maxTurns}
            isLoading={gameState.isLoading}
            isInventoryOpen={isInventoryPopoverOpen}
            onInventoryToggle={setIsInventoryPopoverOpen}
            onInventoryAction={handleInventoryActionClick}
            isAbilitiesOpen={isAbilitiesPopoverOpen}
            onAbilitiesToggle={setIsAbilitiesPopoverOpen}
            onAbilityAction={handleAbilityActionClick}
            onSave={handleOpenSaveDialog} // Use handler from save/load hook
            onMainMenu={showMainMenu}
            shouldFlashInventory={shouldFlashInventory}
        />

        <div className={cn(
             "flex-grow flex flex-col overflow-hidden p-4 md:p-6",
             shouldCenterContent && "items-center justify-center"
         )}>
          {renderCurrentView()}

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
        onSave={handleSaveGame} // Use handler from save/load hook
        isGameActive={gameState.currentView === 'game_active'}
      />
    </div>
  );
}

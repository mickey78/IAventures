
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { listSaveGames, type GameStateToSave } from '@/lib/saveLoadUtils';
// StorySegment et GameView seront traités ensuite si l'erreur persiste après correction des imports React.
// Pour l'instant, je vais les retirer pour voir si les autres erreurs disparaissent.
import type { GameState, HeroAbility, HeroOption, ThemeValue } from '@/types/game'; // Import shared types
import { themedHeroOptions, defaultHeroOptions } from '@/config/heroes'; // Import hero config
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
import ImageModal from '@/components/game/ImageModal';
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
        heroAbilities: [], // Ajout de heroAbilities
        relationships: {},
        emotions: [],
        events: [],
     },
    theme: null,
    subTheme: null,
    selectedHero: null,
    playerName: null,
    playerGender: null, // Initialize playerGender
    isLoading: false,
    error: null,
    playerChoicesHistory: [],
    currentView: 'menu',
    maxTurns: 15,
    currentTurn: 1,
    generatingSegmentId: null,
    initialPromptDebug: null,
  });
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [maxTurnsInput, setMaxTurnsInput] = useState<number>(15);
  const [customChoiceInput, setCustomChoiceInput] = useState('');
  const [isInventoryPopoverOpen, setIsInventoryPopoverOpen] = useState(false);
  const [isAbilitiesPopoverOpen, setIsAbilitiesPopoverOpen] = useState(false);
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ imageUrl: string | null | undefined; text: string }>({ imageUrl: null, text: '' });


  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const {
    startNewGame,
    handleAction,
    triggerImageGeneration,
    retryImageGeneration,
    handleManualImageGeneration,
    shouldFlashInventory,
    setShouldFlashInventory,
  } = useGameActions(gameState, setGameState, toast, viewportRef);

  const {
    savedGames,
    setSavedGames,
    saveNameInput,
    setSaveNameInput,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    handleOpenSaveDialog,
    handleSaveGame,
    handleLoadGame,
    handleDeleteGame,
  } = useSaveLoad(gameState, setGameState, toast);

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

  useEffect(() => {
    if (isCustomInputVisible && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomInputVisible]);

   useEffect(() => {
    if (shouldFlashInventory) {
      const timer = setTimeout(() => {
        setShouldFlashInventory(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldFlashInventory, setShouldFlashInventory]);

  const showMainMenu = () => {
    setGameState(prev => ({
      ...prev,
      story: [],
      choices: [],
      currentGameState: {
          playerName: null,
          location: 'Menu Principal',
          inventory: [],
          heroAbilities: [], // Ajout de heroAbilities
          relationships: {},
          emotions: [],
          events: []
      },
      theme: null,
      subTheme: null,
      selectedHero: null,
      playerName: null,
      playerGender: null, // Reset playerGender
      isLoading: false,
      error: null,
      playerChoicesHistory: [],
      currentView: 'menu',
      maxTurns: 15,
      currentTurn: 1,
      generatingSegmentId: null,
      initialPromptDebug: null,
    }));
    setSavedGames(listSaveGames());
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
      playerGender: null, // Reset playerGender
      currentTurn: 1,
      maxTurns: 15,
      currentGameState: { ...prev.currentGameState, location: 'Sélection du Thème', relationships: {}, emotions: [], events: [] },
      initialPromptDebug: null,
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
       playerGender: null, // Reset playerGender
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
     setGameState(prev => ({ ...prev, currentView: 'hero_selection', selectedHero: null, playerGender: null, currentGameState: { ...prev.currentGameState, location: 'Choix du Héros' } }));
     setIsInventoryPopoverOpen(false);
      setIsAbilitiesPopoverOpen(false);
     setIsCustomInputVisible(false);
   };


  const showNameInput = () => {
    if (!gameState.theme || !gameState.selectedHero || !gameState.playerGender) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème, un héros et un genre avant de continuer.', variant: 'destructive' });
      return;
    }
    setGameState(prev => ({ ...prev, currentView: 'name_input', currentGameState: { ...prev.currentGameState, location: 'Création du Personnage' } }));
    setIsInventoryPopoverOpen(false);
     setIsAbilitiesPopoverOpen(false);
     setIsCustomInputVisible(false);
  }

  const showLoadGameView = () => {
    setSavedGames(listSaveGames());
    setGameState(prev => ({ ...prev, currentView: 'loading_game', currentGameState: { ...prev.currentGameState, location: 'Chargement de Partie' } }));
    setIsInventoryPopoverOpen(false);
     setIsAbilitiesPopoverOpen(false);
     setIsCustomInputVisible(false);
  };

  const handleThemeSelect = (themeValue: string) => {
     setGameState((prev) => ({ ...prev, theme: themeValue, subTheme: null, selectedHero: null, playerGender: null }));
  };

  const handleSubThemeSelect = (subThemeValue: string | null) => {
    setGameState((prev) => ({ ...prev, subTheme: subThemeValue, selectedHero: null, playerGender: null }));
  };

  const handleHeroSelect = (heroValue: string) => {
    setGameState((prev) => ({ ...prev, selectedHero: heroValue }));
  };

  const handleGenderSelect = (gender: 'male' | 'female') => {
    setGameState((prev) => ({ ...prev, playerGender: gender }));
  };


  const handleNameSubmit = () => {
    if (!playerNameInput.trim()) {
      toast({ title: 'Nom Invalide', description: 'Veuillez entrer votre nom.', variant: 'destructive' });
      return;
    }
     if (!gameState.selectedHero || !gameState.playerGender) {
      toast({ title: 'Héros/Genre Manquant', description: 'Veuillez sélectionner une classe de héros et un genre.', variant: 'destructive' });
      return;
    }
    const trimmedName = playerNameInput.trim();
    startNewGame(trimmedName, gameState.theme, gameState.subTheme, gameState.selectedHero, gameState.playerGender, maxTurnsInput);
  }


  const handleCustomChoiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAction(customChoiceInput);
    setCustomChoiceInput('');
    setIsCustomInputVisible(false);
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

   const handleImageClick = useCallback((imageUrl: string | null | undefined, text: string) => {
    if (imageUrl) {
      setModalContent({ imageUrl, text });
      setIsImageModalOpen(true);
    } else {
        toast({ title: "Image non disponible", description: "Il n'y a pas d'image à afficher pour ce segment.", variant: "default" });
    }
  }, [toast]);

  const handleCloseImageModal = useCallback(() => {
    setIsImageModalOpen(false);
    setTimeout(() => setModalContent({ imageUrl: null, text: '' }), 300);
  }, []);

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
      case 'hero_selection': {
        const currentThemeValue = gameState.theme as ThemeValue | null;
        let heroesForTheme: HeroOption[] = defaultHeroOptions; // Fallback to default
        if (currentThemeValue && themedHeroOptions[currentThemeValue]) {
          heroesForTheme = themedHeroOptions[currentThemeValue]!;
        }
        return <HeroSelection
                    heroes={heroesForTheme}
                    selectedHero={gameState.selectedHero}
                    onHeroSelect={handleHeroSelect}
                    selectedGender={gameState.playerGender} // Pass selected gender
                    onGenderSelect={handleGenderSelect} // Pass gender select handler
                    onNext={showNameInput}
                    onBack={() => gameState.theme ? showSubThemeSelection(gameState.theme) : showThemeSelection()}
                />;
      }
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
            <StoryDisplay
                story={gameState.story}
                playerName={gameState.playerName}
                viewportRef={viewportRef}
                isLoading={gameState.isLoading}
                generatingSegmentId={gameState.generatingSegmentId}
                onManualImageGeneration={handleManualImageGeneration}
                onRetryImageGeneration={retryImageGeneration}
                onImageClick={handleImageClick}
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
                isLoading={false}
                generatingSegmentId={gameState.generatingSegmentId}
                onManualImageGeneration={handleManualImageGeneration}
                onRetryImageGeneration={retryImageGeneration}
                onImageClick={handleImageClick}
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

    const currentHeroAbilities = gameState.selectedHero && gameState.theme
      ? themedHeroOptions[gameState.theme as ThemeValue]?.find(h => h.value === gameState.selectedHero)?.abilities || defaultHeroOptions.find(h => h.value === gameState.selectedHero)?.abilities || []
      : [];


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <Card className={cn(
            "w-full shadow-lg border-border rounded-lg flex flex-col flex-grow mt-10",
            (gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') ? 'max-w-6xl' : 'max-w-4xl'
        )} style={{ height: 'calc(95vh - 40px)' }}>
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
            onSave={handleOpenSaveDialog}
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
        onSave={handleSaveGame}
        isGameActive={gameState.currentView === 'game_active' || gameState.currentView === 'game_ended'}
      />

        <ImageModal
          isOpen={isImageModalOpen}
          onClose={handleCloseImageModal}
          imageUrl={modalContent.imageUrl}
          text={modalContent.text}
        />
    </div>
  );
}

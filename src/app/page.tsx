// src/app/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateInitialStory } from '@/ai/flows/generate-initial-story';
import { generateStoryContent } from '@/ai/flows/generate-story-content';
import type { GenerateStoryContentInput } from '@/ai/flows/generate-story-content';
import { useToast } from '@/hooks/use-toast';
import { BookOpenText, Loader, Wand2, ScrollText, Rocket, Anchor, Sun, Heart, Gamepad2, ShieldAlert, Save, Trash2, FolderOpen, PlusCircle, User, Bot, Smile } from 'lucide-react'; // Added User, Bot, Smile icons
import { saveGame, loadGame, listSaveGames, deleteSaveGame, type GameStateToSave } from '@/lib/saveLoadUtils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // Import cn utility

export interface StorySegment {
  id: number;
  text: string;
  speaker: 'player' | 'narrator'; // Identify the speaker
}

interface GameState {
  story: StorySegment[];
  choices: string[];
  currentGameState: string;
  theme: string | null;
  playerName: string | null;
  isLoading: boolean;
  error: string | null;
  playerChoicesHistory: string[];
  currentView: 'menu' | 'theme_selection' | 'name_input' | 'loading_game' | 'game_active';
}

interface Theme {
    value: string;
    label: string;
    prompt: string;
    icon: React.ElementType;
}

const themes: Theme[] = [
  { value: 'Fantasy Médiévale', label: 'Fantasy Médiévale', prompt: 'Enquête de disparition mystère', icon: ScrollText },
  { value: 'Exploration Spatiale', label: 'Exploration Spatiale', prompt: 'Mission de sauvetage sur une planète inconnue', icon: Rocket },
  { value: 'Pirates des Caraïbes', label: 'Pirates des Caraïbes', prompt: 'Chasse au trésor légendaire', icon: Anchor },
  { value: 'Western et Cowboys', label: 'Western et Cowboys', prompt: 'Confrontation avec un hors-la-loi', icon: Sun },
  { value: 'Histoire d\'Amour', label: 'Histoire d\'Amour', prompt: 'Rencontre inattendue et romance naissante', icon: Heart },
  { value: 'Piégé dans le Jeu', label: 'Piégé dans le Jeu', prompt: 'Évasion d\'un jeu vidéo immersif', icon: Gamepad2 },
  { value: 'Survie Post-Apocalyptique', label: 'Survie Post-Apocalyptique', prompt: 'Recherche de ressources dans un monde dévasté', icon: ShieldAlert },
];

export default function AdventureCraftGame() {
  const [gameState, setGameState] = useState<GameState>({
    story: [],
    choices: [],
    currentGameState: '{}',
    theme: null,
    playerName: null,
    isLoading: false,
    error: null,
    playerChoicesHistory: [],
    currentView: 'menu',
  });
  const [savedGames, setSavedGames] = useState<GameStateToSave[]>([]);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState('');

  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);

  // --- Load saved games on initial mount ---
  useEffect(() => {
    setSavedGames(listSaveGames());
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
        if (viewportRef.current) {
           viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    });
  }, []);


  useEffect(() => {
      if (gameState.currentView === 'game_active' && gameState.story.length > 0) {
          scrollToBottom();
      }
  }, [gameState.story, gameState.currentView, scrollToBottom]);

  // --- Navigation Handlers ---
  const showMainMenu = () => {
    setGameState(prev => ({
        ...prev,
        story: [],
        choices: [],
        currentGameState: '{}',
        theme: null,
        playerName: null,
        isLoading: false,
        error: null,
        playerChoicesHistory: [],
        currentView: 'menu'
    }));
     setSavedGames(listSaveGames());
  }

  const showThemeSelection = () => {
    setGameState(prev => ({ ...prev, currentView: 'theme_selection', theme: null, playerName: null }));
  };

  const showNameInput = () => {
     if (!gameState.theme) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de continuer.', variant: 'destructive' });
      return;
    }
    setGameState(prev => ({ ...prev, currentView: 'name_input' }));
  }

  const showLoadGameView = () => {
    setSavedGames(listSaveGames());
    setGameState(prev => ({ ...prev, currentView: 'loading_game' }));
  };

  // --- Game Logic ---
  const handleThemeSelect = (themeValue: string) => {
    setGameState((prev) => ({ ...prev, theme: themeValue }));
  };

  const handleNameSubmit = () => {
     if (!playerNameInput.trim()) {
      toast({ title: 'Nom Invalide', description: 'Veuillez entrer votre nom.', variant: 'destructive' });
      return;
    }
    const trimmedName = playerNameInput.trim();
    // Set player name first using the functional update form
    setGameState(prev => ({ ...prev, playerName: trimmedName }));
    // Use useEffect to start the game AFTER the state has been updated
    startNewGame(trimmedName); // Pass the name explicitly
  }


   // useEffect to trigger game start when player name is set after name input
   // We check if the view is 'name_input' to ensure this only runs after name submission
   // This approach might be overly complex. Let's simplify `handleNameSubmit`.

  const startNewGame = async (nameToUse: string) => { // Expects name as argument
    if (!gameState.theme) { // Only theme needs checking now, name is passed in
      console.error('Theme missing, cannot start game.');
       toast({ title: 'Erreur', description: 'Veuillez sélectionner un thème.', variant: 'destructive' });
       showThemeSelection();
      return;
    }

    setGameState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        story: [],
        choices: [],
        currentGameState: JSON.stringify({ playerName: nameToUse }), // Use argument here
        playerChoicesHistory: [],
        currentView: 'game_active', // Switch view
        playerName: nameToUse, // Ensure name is set correctly in state
    }));

    try {
      const initialStoryData = await generateInitialStory({
          theme: gameState.theme,
          playerName: nameToUse // Use argument here
      });
      setGameState((prev) => ({
        ...prev,
        story: [{ id: Date.now(), text: initialStoryData.story, speaker: 'narrator' }], // Initial story is from narrator
        choices: initialStoryData.choices,
        isLoading: false,
      }));
    } catch (err) {
      console.error('Error generating initial story:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de générer l'histoire initiale: ${errorMsg}`,
        theme: null,
        playerName: null, // Reset name state
        currentView: 'theme_selection', // Go back
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de générer l'histoire initiale: ${errorMsg}`, variant: 'destructive' });
    }
  };

 const handleChoice = async (choice: string) => {
    if (!gameState.playerName || !gameState.theme) {
        console.error('Player name or theme missing during choice handling.');
        toast({ title: 'Erreur', description: 'Erreur de jeu. Veuillez réessayer.', variant: 'destructive' });
        showMainMenu();
        return;
    }

    // Player's choice segment
    const playerChoiceSegment: StorySegment = { id: Date.now(), text: choice, speaker: 'player' };
    const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, choice];
    const previousStory = [...gameState.story]; // Keep previous story for potential revert

    // Update state immediately to show player choice
    setGameState((prev) => ({
      ...prev,
      isLoading: true, // Start loading for AI response
      error: null,
      story: [...prev.story, playerChoiceSegment], // Add player choice bubble
      choices: [], // Clear choices while loading
      playerChoicesHistory: nextPlayerChoicesHistory,
    }));
    // Scroll down after showing player choice (useEffect handles this)

    // Prepare input for AI
    const input: GenerateStoryContentInput = {
      theme: gameState.theme,
      playerName: gameState.playerName,
      playerChoices: nextPlayerChoicesHistory, // Send updated history
      gameState: gameState.currentGameState || '{}',
    };

    try {
      const nextStoryData = await generateStoryContent(input);
      // Narrator's response segment
      const narratorResponseSegment: StorySegment = { id: Date.now() + 1, text: nextStoryData.storyContent, speaker: 'narrator' };

      // Update state with AI response
      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, narratorResponseSegment], // Add narrator response bubble
        choices: nextStoryData.nextChoices,
        currentGameState: nextStoryData.updatedGameState,
        isLoading: false, // Stop loading
      }));
      // scrollToBottom is handled by useEffect
    } catch (err) {
      console.error('Error generating story content:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      // Revert optimistic updates on error
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de continuer l'histoire: ${errorMsg}`,
        story: previousStory, // Revert to story before player choice was added
        choices: gameState.choices, // Restore choices (or should fetch previous?) - let's keep current (which are empty) or restore prev
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1), // Revert history
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };

  // --- Save/Load Handlers ---
  const handleOpenSaveDialog = () => {
    const dateStr = new Date().toLocaleDateString('fr-CA');
    const suggestedName = gameState.theme && gameState.playerName
        ? `${gameState.playerName} - ${gameState.theme} ${dateStr}`
        : `Sauvegarde ${dateStr}`;
    setSaveNameInput(suggestedName);
    setIsSaveDialogOpen(true);
  };

  const handleSaveGame = () => {
    if (!saveNameInput.trim()) {
        toast({ title: "Nom Invalide", description: "Veuillez entrer un nom pour la sauvegarde.", variant: "destructive" });
        return;
    }
    if (!gameState.theme || !gameState.playerName) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder sans thème ou nom de joueur actif.", variant: "destructive" });
        return;
    }

    const stateToSave: Omit<GameStateToSave, 'timestamp' | 'saveName'> = {
        theme: gameState.theme,
        playerName: gameState.playerName,
        story: gameState.story,
        choices: gameState.choices,
        currentGameState: gameState.currentGameState,
        playerChoicesHistory: gameState.playerChoicesHistory,
    };

    if (saveGame(saveNameInput.trim(), stateToSave)) {
        toast({ title: "Partie Sauvegardée", description: `La partie "${saveNameInput.trim()}" a été sauvegardée.` });
        setSavedGames(listSaveGames());
        setIsSaveDialogOpen(false);
    } else {
        toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder la partie.", variant: "destructive" });
    }
  };

  const handleLoadGame = (saveName: string) => {
    const loadedState = loadGame(saveName);
    if (loadedState) {
        setGameState(prev => ({
            ...prev,
            theme: loadedState.theme,
            playerName: loadedState.playerName,
            story: loadedState.story,
            choices: loadedState.choices,
            currentGameState: loadedState.currentGameState,
            playerChoicesHistory: loadedState.playerChoicesHistory,
            isLoading: false,
            error: null,
            currentView: 'game_active'
        }));
        toast({ title: "Partie Chargée", description: `La partie "${saveName}" a été chargée.` });
    } else {
        toast({ title: "Erreur de Chargement", description: `Impossible de charger la partie "${saveName}".`, variant: "destructive" });
        setSavedGames(listSaveGames());
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

 // --- Rendering Functions ---
const renderStory = () => (
    <ScrollAreaPrimitive.Root className="relative overflow-hidden flex-1 w-full rounded-md border mb-4 bg-card"> {/* Use flex-1 to take available space */}
        <ScrollAreaPrimitive.Viewport
            ref={viewportRef}
            className="h-full w-full rounded-[inherit] p-4 space-y-4" // Add space between bubbles
        >
            {gameState.story.map((segment) => (
            <div
                key={segment.id}
                className={cn(
                    "flex flex-col max-w-[85%] sm:max-w-[75%] p-3 rounded-lg shadow",
                    segment.speaker === 'player'
                        ? 'ml-auto bg-primary text-primary-foreground rounded-br-none' // Player bubble on the right, different color
                        : 'mr-auto bg-muted text-muted-foreground rounded-bl-none' // Narrator bubble on the left, different color
                )}
            >
                <div className="flex items-center gap-2 mb-1">
                    {segment.speaker === 'player' ? (
                        <Smile className="h-4 w-4" /> // Player icon
                    ) : (
                        <Bot className="h-4 w-4" /> // Narrator icon
                    )}
                    <span className="text-xs font-medium">
                        {segment.speaker === 'player' ? gameState.playerName : 'Narrateur'}
                    </span>
                </div>
                 <p className="whitespace-pre-wrap text-sm">{segment.text}</p> {/* Ensure text wraps */}
            </div>
            ))}
            {/* Loading indicator */}
            {gameState.isLoading && (
                <div className="flex items-center justify-center space-x-2 text-muted-foreground mt-4">
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Génération de la suite...</span>
                </div>
            )}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
 );


  const renderChoices = () => (
    <div className="flex flex-wrap gap-2 mt-auto justify-center pb-4"> {/* Use mt-auto to push to bottom, pb-4 for spacing */}
      {gameState.choices.map((choice, index) => (
        <Button
          key={index}
          onClick={() => handleChoice(choice)}
          disabled={gameState.isLoading}
          variant="secondary" // Keep variant for styling consistency if desired
          className="flex-grow sm:flex-grow-0 bg-primary hover:bg-primary/90 text-primary-foreground" // Explicitly set background/text colors
          aria-label={`Faire le choix : ${choice}`}
        >
          {choice}
        </Button>
      ))}
    </div>
  );

  const renderThemeSelection = () => (
      <div className="flex flex-col items-center space-y-6">
          <p className="text-xl font-semibold text-center">Choisissez votre univers d'aventure :</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {themes.map((theme) => {
                  const Icon = theme.icon;
                  const isSelected = gameState.theme === theme.value;
                  return (
                      <Card
                          key={theme.value}
                          className={cn(
                              "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary",
                              isSelected ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border hover:bg-accent/50'
                          )}
                          onClick={() => handleThemeSelect(theme.value)}
                          role="button"
                          aria-pressed={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleThemeSelect(theme.value); }}
                      >
                          <CardHeader className="items-center text-center pb-2">
                              <Icon className="h-10 w-10 mb-2 text-primary" />
                              <CardTitle className="text-lg">{theme.label}</CardTitle>
                          </CardHeader>
                          <CardContent className="text-center text-sm text-muted-foreground pt-0 pb-4 min-h-[60px]">
                              {theme.prompt}
                          </CardContent>
                      </Card>
                  );
              })}
          </div>
          <Button
              onClick={showNameInput}
              disabled={!gameState.theme}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md mt-6"
          >
              Suivant
          </Button>
            <Button variant="outline" onClick={showMainMenu} className="mt-2">
                Retour au Menu Principal
            </Button>
      </div>
  );

  const renderNameInput = () => (
      <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
          <Label htmlFor="playerName" className="text-xl font-semibold text-center">Comment t'appelles-tu, aventurier(ère) ?</Label>
          <Input
                id="playerName"
                type="text"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                placeholder="Entre ton nom ici"
                className="text-center"
                maxLength={50}
            />
          <Button
              onClick={handleNameSubmit}
              disabled={!playerNameInput.trim() || gameState.isLoading}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md mt-6"
          >
              {gameState.isLoading ? (
                  <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Préparation...
                  </>
              ) : (
                  <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Commencer l'Aventure
                  </>
              )}
          </Button>
          <Button variant="outline" onClick={showThemeSelection} className="mt-2">
              Retour au choix du thème
          </Button>
      </div>
  );

  const renderMainMenu = () => (
    <div className="flex flex-col items-center space-y-4">
        <h2 className="text-2xl font-semibold">Menu Principal</h2>
        <Button onClick={showThemeSelection} size="lg" className="w-60 bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-5 w-5" /> Nouvelle Partie
        </Button>
        <Button onClick={showLoadGameView} size="lg" className="w-60" variant="secondary" disabled={savedGames.length === 0}>
            <FolderOpen className="mr-2 h-5 w-5" /> Charger une Partie
        </Button>
        {savedGames.length === 0 && <p className="text-sm text-muted-foreground">Aucune partie sauvegardée.</p>}
    </div>
  );

  const renderLoadGame = () => (
    <div className="flex flex-col items-center space-y-4 w-full">
        <h2 className="text-2xl font-semibold mb-4">Charger une Partie</h2>
        {savedGames.length > 0 ? (
             <ScrollAreaPrimitive.Root className="w-full max-w-md h-[300px] rounded-md border">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] p-4">
                    <ul className="space-y-3">
                        {savedGames.map((save) => (
                            <li key={save.saveName} className="flex items-center justify-between gap-2 p-3 rounded-md bg-card hover:bg-accent/50 transition-colors">
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-medium truncate">{save.saveName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {save.playerName ? `${save.playerName} - ` : ''}
                                        {save.theme} - {new Date(save.timestamp).toLocaleString('fr-FR')}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                     <Button size="sm" onClick={() => handleLoadGame(save.saveName)} variant="secondary">Charger</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteGame(save.saveName)} aria-label={`Supprimer la sauvegarde ${save.saveName}`}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </ScrollAreaPrimitive.Viewport>
                <ScrollBar />
                <ScrollAreaPrimitive.Corner />
            </ScrollAreaPrimitive.Root>
        ) : (
            <p className="text-muted-foreground">Aucune partie sauvegardée.</p>
        )}
        <Button variant="outline" onClick={showMainMenu} className="mt-4">
            Retour au Menu Principal
        </Button>
    </div>
  );

  const renderSaveDialog = () => (
    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Sauvegarder la partie</DialogTitle>
                <DialogDescription>
                    Entrez un nom pour votre sauvegarde. Si le nom existe déjà, il sera écrasé.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input
                    value={saveNameInput}
                    onChange={(e) => setSaveNameInput(e.target.value)}
                    placeholder="Nom de la sauvegarde"
                    aria-label="Nom de la sauvegarde"
                />
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Annuler</Button>
                 </DialogClose>
                <Button type="button" onClick={handleSaveGame} disabled={!saveNameInput.trim()}>Sauvegarder</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );

  return (
    // Adjust main container for full height and flex column layout
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
       {/* Make Card take full available height and use flex */}
       <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg flex flex-col flex-grow" style={{ height: '95vh' }}>
        <CardHeader className="text-center flex-shrink-0"> {/* Prevent header from growing */}
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <BookOpenText className="h-8 w-8 text-primary" />
            AdventureCraft
          </CardTitle>
          <CardDescription className="text-muted-foreground">
             {/* Dynamic description based on view */}
             {gameState.currentView === 'game_active' && gameState.theme && gameState.playerName
              ? `Aventure de ${gameState.playerName} : ${gameState.theme}`
              : gameState.currentView === 'theme_selection'
              ? "Choisissez un thème pour votre nouvelle aventure ! (8-12 ans)"
              : gameState.currentView === 'name_input'
              ? "Prépare-toi pour l'aventure !"
              : gameState.currentView === 'loading_game'
              ? "Choisissez une partie à charger."
              : "Bienvenue ! Commencez une nouvelle aventure ou chargez une partie."}
          </CardDescription>
        </CardHeader>

        {/* Make CardContent grow and use flex */}
        <CardContent className="flex-grow flex flex-col overflow-hidden p-4 md:p-6">
          {gameState.currentView === 'menu' && renderMainMenu()}
          {gameState.currentView === 'theme_selection' && renderThemeSelection()}
          {gameState.currentView === 'name_input' && renderNameInput()}
          {gameState.currentView === 'loading_game' && renderLoadGame()}
          {gameState.currentView === 'game_active' && (
            <>
              {renderStory()} {/* Story area will now grow */}
              {!gameState.isLoading && gameState.choices.length > 0 && renderChoices()} {/* Choices stick to bottom */}
            </>
          )}
          {gameState.error && (
             <p className="text-destructive mt-auto text-center font-medium p-2 bg-destructive/10 rounded-md">{gameState.error}</p> // mt-auto to push error down
          )}
        </CardContent>

         {/* Footer remains at the bottom of the card */}
         {gameState.currentView === 'game_active' && gameState.story.length > 0 && (
            <CardFooter className="flex-shrink-0 flex flex-col sm:flex-row justify-center items-center gap-4 mt-auto pt-4 border-t border-border">
                 <Button variant="outline" onClick={handleOpenSaveDialog} disabled={gameState.isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                 </Button>
                 <Button variant="outline" onClick={showMainMenu}>
                    Menu Principal / Quitter
                </Button>
            </CardFooter>
         )}
      </Card>
      {renderSaveDialog()}
    </div>
  );
}

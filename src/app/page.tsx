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
import { BookOpenText, Loader, Wand2, ScrollText, Rocket, Anchor, Sun, Heart, Gamepad2, ShieldAlert, Save, Trash2, FolderOpen, PlusCircle } from 'lucide-react';
import { saveGame, loadGame, listSaveGames, deleteSaveGame, type GameStateToSave } from '@/lib/saveLoadUtils';
import { Input } from '@/components/ui/input'; // Import Input
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Import Dialog components

export interface StorySegment { // Export for saveLoadUtils
  id: number;
  text: string;
  isPlayerChoice?: boolean;
}

interface GameState {
  story: StorySegment[];
  choices: string[];
  currentGameState: string;
  theme: string | null;
  isLoading: boolean;
  error: string | null;
  playerChoicesHistory: string[];
  currentView: 'menu' | 'theme_selection' | 'loading_game' | 'game_active'; // Added view state
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
    isLoading: false,
    error: null,
    playerChoicesHistory: [],
    currentView: 'menu', // Start at the main menu
  });
  const [savedGames, setSavedGames] = useState<GameStateToSave[]>([]);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);

  // --- Load saved games on initial mount ---
  useEffect(() => {
    // Check localStorage only on the client-side after hydration
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
        isLoading: false,
        error: null,
        playerChoicesHistory: [],
        currentView: 'menu'
    }));
     // Refresh saved games list when returning to menu
     setSavedGames(listSaveGames());
  }

  const showThemeSelection = () => {
    setGameState(prev => ({ ...prev, currentView: 'theme_selection', theme: null })); // Reset theme when going to selection
  };

  const showLoadGameView = () => {
    setSavedGames(listSaveGames()); // Refresh list before showing
    setGameState(prev => ({ ...prev, currentView: 'loading_game' }));
  };

  // --- Game Logic ---
  const handleThemeSelect = (themeValue: string) => {
    setGameState((prev) => ({ ...prev, theme: themeValue }));
  };

  const startNewGame = async () => {
    if (!gameState.theme) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de commencer.', variant: 'destructive' });
      return;
    }

    setGameState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        story: [],
        choices: [],
        currentGameState: '{}',
        playerChoicesHistory: [],
        currentView: 'game_active' // Switch view to active game
    }));

    try {
      const initialStoryData = await generateInitialStory({ theme: gameState.theme });
      setGameState((prev) => ({
        ...prev,
        story: [{ id: Date.now(), text: initialStoryData.story }],
        choices: initialStoryData.choices,
        currentGameState: '{}', // Explicitly reset
        isLoading: false,
      }));
    } catch (err) {
      console.error('Error generating initial story:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de générer l'histoire initiale: ${errorMsg}`,
        theme: null, // Allow re-selection
        currentView: 'theme_selection', // Go back to theme selection on error
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de générer l'histoire initiale: ${errorMsg}`, variant: 'destructive' });
    }
  };

 const handleChoice = async (choice: string) => {
    const playerChoiceSegment = { id: Date.now(), text: `> ${choice}`, isPlayerChoice: true };
    const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, choice];

    const input: GenerateStoryContentInput = {
      theme: gameState.theme!,
      playerChoices: nextPlayerChoicesHistory,
      gameState: gameState.currentGameState || '{}',
    };

    const previousChoices = [...gameState.choices];

    // Update state immediately to show player choice
    setGameState((prev) => ({
      ...prev,
      isLoading: true, // Start loading for AI response
      error: null,
      story: [...prev.story, playerChoiceSegment], // Add player choice to story
      choices: [], // Clear choices while loading
      playerChoicesHistory: nextPlayerChoicesHistory,
    }));
    scrollToBottom(); // Scroll down after showing player choice

    try {
      const nextStoryData = await generateStoryContent(input);
      // Update state with AI response
      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, { id: Date.now() + 1, text: nextStoryData.storyContent }], // Add AI response
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
        story: prev.story.slice(0, -1), // Remove the optimistically added player choice
        choices: previousChoices, // Restore previous choices
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1), // Revert history
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };

  // --- Save/Load Handlers ---
  const handleOpenSaveDialog = () => {
    // Suggest a save name based on theme and date
    const dateStr = new Date().toLocaleDateString('fr-CA'); // YYYY-MM-DD
    const suggestedName = gameState.theme ? `${gameState.theme} ${dateStr}` : `Sauvegarde ${dateStr}`;
    setSaveNameInput(suggestedName);
    setIsSaveDialogOpen(true);
  };

  const handleSaveGame = () => {
    if (!saveNameInput.trim()) {
        toast({ title: "Nom Invalide", description: "Veuillez entrer un nom pour la sauvegarde.", variant: "destructive" });
        return;
    }
    if (!gameState.theme) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder sans thème actif.", variant: "destructive" });
        return;
    }

    const stateToSave: Omit<GameStateToSave, 'timestamp' | 'saveName'> = {
        theme: gameState.theme,
        story: gameState.story,
        choices: gameState.choices,
        currentGameState: gameState.currentGameState,
        playerChoicesHistory: gameState.playerChoicesHistory,
    };

    if (saveGame(saveNameInput.trim(), stateToSave)) {
        toast({ title: "Partie Sauvegardée", description: `La partie "${saveNameInput.trim()}" a été sauvegardée.` });
        setSavedGames(listSaveGames()); // Update save list state
        setIsSaveDialogOpen(false); // Close dialog
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
            story: loadedState.story,
            choices: loadedState.choices,
            currentGameState: loadedState.currentGameState,
            playerChoicesHistory: loadedState.playerChoicesHistory,
            isLoading: false,
            error: null,
            currentView: 'game_active' // Set view to active game
        }));
        toast({ title: "Partie Chargée", description: `La partie "${saveName}" a été chargée.` });
    } else {
        toast({ title: "Erreur de Chargement", description: `Impossible de charger la partie "${saveName}".`, variant: "destructive" });
        setSavedGames(listSaveGames()); // Refresh list in case the save was invalid/deleted
    }
  };

  const handleDeleteGame = (saveName: string) => {
     if (deleteSaveGame(saveName)) {
         toast({ title: "Sauvegarde Supprimée", description: `La sauvegarde "${saveName}" a été supprimée.` });
         setSavedGames(listSaveGames()); // Refresh the list
     } else {
         toast({ title: "Erreur", description: `Impossible de supprimer la sauvegarde "${saveName}".`, variant: "destructive" });
     }
  };

  // --- Rendering Functions ---
 const renderStory = () => (
    <ScrollAreaPrimitive.Root className="relative overflow-hidden h-[400px] w-full rounded-md border mb-4">
        <ScrollAreaPrimitive.Viewport
            ref={viewportRef}
            className="h-full w-full rounded-[inherit] p-4 bg-card text-card-foreground"
        >
            {gameState.story.map((segment) => (
            <p key={segment.id} className={`mb-2 whitespace-pre-wrap ${segment.isPlayerChoice ? 'italic text-muted-foreground' : ''}`}>
                {segment.text}
            </p>
            ))}
            {/* Loading indicator only shown when fetching next part of story */}
            {gameState.isLoading && gameState.story.length > 0 && !gameState.choices.length && (
                <div className="flex items-center space-x-2 text-muted-foreground mt-4">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Génération de la suite...</span>
                </div>
            )}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
 );


  const renderChoices = () => (
    <div className="flex flex-wrap gap-2 mt-4 justify-center">
      {gameState.choices.map((choice, index) => (
        <Button
          key={index}
          onClick={() => handleChoice(choice)}
          disabled={gameState.isLoading}
          variant="secondary"
          className="flex-grow sm:flex-grow-0 bg-primary hover:bg-primary/90 text-primary-foreground" // Keep buttons blue
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
                          className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary ${
                              isSelected ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border hover:bg-accent/50'
                          }`}
                          onClick={() => handleThemeSelect(theme.value)}
                          role="button"
                          aria-pressed={isSelected}
                          tabIndex={0} // Make it focusable
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleThemeSelect(theme.value); }} // Keyboard interaction
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
              onClick={startNewGame} // Changed from startGame to startNewGame
              disabled={!gameState.theme || gameState.isLoading}
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
            <Button variant="outline" onClick={showMainMenu} className="mt-2">
                Retour au Menu Principal
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
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <BookOpenText className="h-8 w-8 text-primary" />
            AdventureCraft
          </CardTitle>
          <CardDescription className="text-muted-foreground">
             {gameState.currentView === 'game_active' && gameState.theme
              ? `Aventure en cours : ${gameState.theme}`
              : gameState.currentView === 'theme_selection'
              ? "Choisissez un thème pour votre nouvelle aventure ! (8-12 ans)"
              : gameState.currentView === 'loading_game'
              ? "Choisissez une partie à charger."
              : "Bienvenue ! Commencez une nouvelle aventure ou chargez une partie."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {gameState.currentView === 'menu' && renderMainMenu()}
          {gameState.currentView === 'theme_selection' && renderThemeSelection()}
          {gameState.currentView === 'loading_game' && renderLoadGame()}
          {gameState.currentView === 'game_active' && (
            <>
              {renderStory()}
              {!gameState.isLoading && gameState.choices.length > 0 && renderChoices()}
            </>
          )}
          {gameState.error && (
             <p className="text-destructive mt-4 text-center font-medium p-2 bg-destructive/10 rounded-md">{gameState.error}</p>
          )}
        </CardContent>

         {gameState.currentView === 'game_active' && gameState.story.length > 0 && (
            <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4 pt-4 border-t border-border">
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

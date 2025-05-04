// src/app/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"; // Import primitives
import { ScrollBar } from "@/components/ui/scroll-area"; // Import ScrollBar separately
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// Removed Select component imports as they are no longer used
import { generateInitialStory } from '@/ai/flows/generate-initial-story';
import { generateStoryContent } from '@/ai/flows/generate-story-content';
import type { GenerateStoryContentInput } from '@/ai/flows/generate-story-content';
import { useToast } from '@/hooks/use-toast';
import { BookOpenText, Loader, Wand2, ScrollText, Rocket, Anchor, Sun, Heart, Gamepad2, ShieldAlert } from 'lucide-react';

interface StorySegment {
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
}

interface Theme {
    value: string;
    label: string;
    prompt: string;
    icon: React.ElementType; // Add icon property
}

// Add icons to the themes array
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
    currentGameState: '{}', // Default to empty JSON string
    theme: null,
    isLoading: false,
    error: null,
    playerChoicesHistory: [],
  });

  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null); // Ref for the scrollable viewport

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
        if (viewportRef.current) {
           viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    });
  }, []);


  useEffect(() => {
      if (gameState.story.length > 0) {
          scrollToBottom();
      }
  }, [gameState.story, scrollToBottom]);

  const handleThemeSelect = (themeValue: string) => {
    setGameState((prev) => ({
      ...prev,
      theme: themeValue, // Only set the theme, don't reset story etc. here
      // Resetting will happen in startGame
    }));
  };

  const startGame = async () => {
    if (!gameState.theme) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de commencer.', variant: 'destructive' });
      return;
    }

    setGameState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        story: [], // Reset story
        choices: [], // Reset choices
        currentGameState: '{}', // Reset game state
        playerChoicesHistory: [] // Reset history
    }));

    try {
      const initialStoryData = await generateInitialStory({ theme: gameState.theme });
      setGameState((prev) => ({
        ...prev,
        story: [{ id: Date.now(), text: initialStoryData.story }],
        choices: initialStoryData.choices,
        currentGameState: '{}', // Initialize game state explicitly
        isLoading: false,
      }));
    } catch (err) {
      console.error('Error generating initial story:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de générer l'histoire initiale: ${errorMsg}`,
        theme: null, // Reset theme selection on error to allow re-selection
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

    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [...prev.story, playerChoiceSegment],
      choices: [],
      playerChoicesHistory: nextPlayerChoicesHistory,
    }));
    scrollToBottom(); // Scroll down immediately after showing player choice

    try {
      const nextStoryData = await generateStoryContent(input);
      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, { id: Date.now() + 1, text: nextStoryData.storyContent }],
        choices: nextStoryData.nextChoices,
        currentGameState: nextStoryData.updatedGameState,
        isLoading: false,
      }));
      // Note: scrollToBottom is handled by useEffect watching gameState.story
    } catch (err) {
      console.error('Error generating story content:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      // Revert state
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        choices: previousChoices.length > 0 ? previousChoices : ['Réessayer la dernière action'],
        error: `Impossible de continuer l'histoire: ${errorMsg}`,
        story: prev.story.slice(0, -1), // Remove the player choice segment added optimistically
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1), // Remove the last choice from history
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };

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
          variant="secondary" // Keep secondary or change as needed
          className="flex-grow sm:flex-grow-0 bg-primary hover:bg-primary/90 text-primary-foreground" // Make buttons blue
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
              onClick={startGame}
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
      </div>
  );


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg"> {/* Increased max-width */}
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <BookOpenText className="h-8 w-8 text-primary" />
            AdventureCraft
          </CardTitle>
          <CardDescription className="text-muted-foreground">
             {gameState.theme && gameState.story.length > 0
              ? `Aventure en cours : ${gameState.theme}`
              : "Choisissez un thème et lancez-vous dans une aventure interactive ! (8-12 ans)"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Conditional rendering based on whether a theme is selected AND the story has started */}
          {!gameState.theme || gameState.story.length === 0 ? (
            renderThemeSelection()
          ) : (
            <>
              {renderStory()}
              {!gameState.isLoading && renderChoices()}
            </>
          )}
          {gameState.error && (
             <p className="text-destructive mt-4 text-center font-medium p-2 bg-destructive/10 rounded-md">{gameState.error}</p>
          )}
        </CardContent>
         {/* Show "Recommencer" button only if the story has started */}
         {gameState.story.length > 0 && (
            <CardFooter className="flex justify-center mt-4 pt-4 border-t border-border">
                 <Button variant="outline" onClick={() => setGameState({
                     story: [],
                     choices: [],
                     currentGameState: '{}',
                     theme: null, // Reset theme to show selection screen
                     isLoading: false,
                     error: null,
                     playerChoicesHistory: [],
                 })}>
                    Changer de thème / Recommencer
                </Button>
            </CardFooter>
         )}
      </Card>
    </div>
  );
}

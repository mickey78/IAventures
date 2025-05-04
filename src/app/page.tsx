// src/app/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"; // Import primitives
import { ScrollBar } from "@/components/ui/scroll-area"; // Import ScrollBar separately
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Removed unused ScrollArea import
import { generateInitialStory } from '@/ai/flows/generate-initial-story';
import { generateStoryContent } from '@/ai/flows/generate-story-content';
import type { GenerateStoryContentInput } from '@/ai/flows/generate-story-content';
import { useToast } from '@/hooks/use-toast';
import { BookOpenText, Loader, Wand2 } from 'lucide-react';

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

const themes = [
  { value: 'Fantasy Médiévale', label: 'Fantasy Médiévale', prompt: 'Enquête de disparition mystère' },
  { value: 'Exploration Spatiale', label: 'Exploration Spatiale', prompt: 'Mission de sauvetage sur une planète inconnue' },
  { value: 'Pirates des Caraïbes', label: 'Pirates des Caraïbes', prompt: 'Chasse au trésor légendaire' },
  { value: 'Western et Cowboys', label: 'Western et Cowboys', prompt: 'Confrontation avec un hors-la-loi' },
  { value: 'Histoire d\'Amour', label: 'Histoire d\'Amour', prompt: 'Rencontre inattendue et romance naissante' },
  { value: 'Piégé dans le Jeu', label: 'Piégé dans le Jeu', prompt: 'Évasion d\'un jeu vidéo immersif' },
  { value: 'Survie Post-Apocalyptique', label: 'Survie Post-Apocalyptique', prompt: 'Recherche de ressources dans un monde dévasté' },
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
    // Use requestAnimationFrame for smoother scrolling after render
    requestAnimationFrame(() => {
        if (viewportRef.current) {
           viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    });
  }, []);


  useEffect(() => {
      // Scroll whenever story updates, including initial load and subsequent additions
      if (gameState.story.length > 0) {
          scrollToBottom();
      }
  }, [gameState.story, scrollToBottom]); // Depend on story array and the callback

  const handleThemeSelect = (themeValue: string) => {
    setGameState((prev) => ({
      ...prev,
      theme: themeValue,
      story: [], // Reset story on new theme selection
      choices: [],
      currentGameState: '{}', // Reset game state
      playerChoicesHistory: [],
      error: null,
    }));
  };

  const startGame = async () => {
    if (!gameState.theme) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de commencer.', variant: 'destructive' });
      return;
    }

    setGameState((prev) => ({ ...prev, isLoading: true, error: null, story: [], choices: [], currentGameState: '{}', playerChoicesHistory: [] })); // Full reset before start

    try {
      const initialStoryData = await generateInitialStory({ theme: gameState.theme });
      setGameState((prev) => ({
        ...prev,
        story: [{ id: Date.now(), text: initialStoryData.story }],
        choices: initialStoryData.choices,
        currentGameState: '{}', // Initialize game state explicitly
        isLoading: false,
      }));
      // scrollToBottom will be called by the useEffect hook
    } catch (err) {
      console.error('Error generating initial story:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de générer l'histoire initiale: ${errorMsg}`,
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de générer l'histoire initiale: ${errorMsg}`, variant: 'destructive' });
    }
  };

 const handleChoice = async (choice: string) => {
    // 1. Calculate next state values BEFORE setting state
    const playerChoiceSegment = { id: Date.now(), text: `> ${choice}`, isPlayerChoice: true };
    // Use previous state to ensure the history passed to AI includes the current choice
    const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, choice];

    // 2. Prepare the input using the calculated values
    const input: GenerateStoryContentInput = {
      theme: gameState.theme!,
      playerChoices: nextPlayerChoicesHistory, // Use the updated history directly
      gameState: gameState.currentGameState || '{}', // Pass the current game state string
    };

    // Store the choices before clearing them for potential error recovery
    const previousChoices = [...gameState.choices];

    // 3. Set state for optimistic update and loading
    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [...prev.story, playerChoiceSegment], // Add optimistic choice
      choices: [], // Clear choices while loading
      playerChoicesHistory: nextPlayerChoicesHistory, // Store the updated history in state
    }));
    scrollToBottom(); // Scroll immediately after adding player choice

    // 4. Make the API call
    try {
      const nextStoryData = await generateStoryContent(input); // Pass the correctly prepared input
      setGameState((prev) => ({
        ...prev,
        // Add the new story content from AI
        story: [...prev.story, { id: Date.now() + 1, text: nextStoryData.storyContent }],
        choices: nextStoryData.nextChoices,
        currentGameState: nextStoryData.updatedGameState,
        isLoading: false,
      }));
      // scrollToBottom will be called by the useEffect hook triggering on story change
    } catch (err) {
      console.error('Error generating story content:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      // Revert optimistic updates on error
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        // Restore previous choices if API call failed
        choices: previousChoices.length > 0 ? previousChoices : ['Réessayer la dernière action'],
        error: `Impossible de continuer l'histoire: ${errorMsg}`,
        // Remove the optimistically added player choice segment
        story: prev.story.slice(0, -1),
        // Revert history update in state
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1),
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };

 const renderStory = () => (
    // Use ScrollArea primitives directly to attach ref to Viewport
    <ScrollAreaPrimitive.Root className="relative overflow-hidden h-[400px] w-full rounded-md border mb-4">
        <ScrollAreaPrimitive.Viewport
            ref={viewportRef} // Attach ref here
            className="h-full w-full rounded-[inherit] p-4 bg-card text-card-foreground" // Apply styling here
        >
            {gameState.story.map((segment) => (
            <p key={segment.id} className={`mb-2 whitespace-pre-wrap ${segment.isPlayerChoice ? 'italic text-muted-foreground' : ''}`}>
                {segment.text}
            </p>
            ))}
            {gameState.isLoading && gameState.story.length > 0 && ( // Show loading only after the story starts
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
          className="flex-grow sm:flex-grow-0"
          aria-label={`Faire le choix : ${choice}`} // Accessibility
        >
          {choice}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-3xl shadow-lg border-border rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <BookOpenText className="h-8 w-8 text-primary" />
            AdventureCraft
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choisissez un thème et lancez-vous dans une aventure interactive ! (8-12 ans)
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!gameState.theme || gameState.story.length === 0 ? (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-lg font-medium">Choisissez votre aventure :</p>
              <Select onValueChange={handleThemeSelect} value={gameState.theme ?? undefined}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Sélectionnez un thème" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={startGame}
                disabled={!gameState.theme || gameState.isLoading}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md" // Added styling
              >
                {gameState.isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                    <>
                     <Wand2 className="mr-2 h-4 w-4" />
                     Commencer l'Aventure
                    </>
                )}
              </Button>
            </div>
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
         {gameState.story.length > 0 && (
            <CardFooter className="flex justify-center mt-4 pt-4 border-t border-border">
                 <Button variant="outline" onClick={() => setGameState({
                     story: [],
                     choices: [],
                     currentGameState: '{}',
                     theme: null,
                     isLoading: false,
                     error: null,
                     playerChoicesHistory: [],
                 })}>
                    Recommencer
                </Button>
            </CardFooter>
         )}
      </Card>
    </div>
  );
}

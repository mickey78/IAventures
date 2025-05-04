'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    currentGameState: '',
    theme: null,
    isLoading: false,
    error: null,
    playerChoicesHistory: [],
  });

  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
        if (viewportRef.current) {
           viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, 100); // Short delay to ensure content is rendered
  }, []);


  useEffect(() => {
    scrollToBottom();
  }, [gameState.story, scrollToBottom]);

  const handleThemeSelect = (themeValue: string) => {
    setGameState((prev) => ({
      ...prev,
      theme: themeValue,
      story: [], // Reset story on new theme selection
      choices: [],
      currentGameState: '',
      playerChoicesHistory: [],
      error: null,
    }));
  };

  const startGame = async () => {
    if (!gameState.theme) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de commencer.', variant: 'destructive' });
      return;
    }

    setGameState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const initialStoryData = await generateInitialStory({ theme: gameState.theme });
      setGameState((prev) => ({
        ...prev,
        story: [{ id: Date.now(), text: initialStoryData.story }],
        choices: initialStoryData.choices,
        currentGameState: 'Initial state set.', // Initialize game state
        isLoading: false,
        playerChoicesHistory: [], // Reset history
      }));
      scrollToBottom();
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
    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [...prev.story, { id: Date.now(), text: `> ${choice}`, isPlayerChoice: true }],
      choices: [], // Clear choices while loading next part
      playerChoicesHistory: [...prev.playerChoicesHistory, choice],
    }));
    scrollToBottom(); // Scroll after adding player choice

    const input: GenerateStoryContentInput = {
      theme: gameState.theme!,
      playerChoices: gameState.playerChoicesHistory.concat(choice), // Include current choice in history for API
      gameState: gameState.currentGameState,
    };

    try {
      const nextStoryData = await generateStoryContent(input);
      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, { id: Date.now() + 1, text: nextStoryData.storyContent }], // Use a slightly different ID just in case
        choices: nextStoryData.nextChoices,
        currentGameState: nextStoryData.updatedGameState,
        isLoading: false,
      }));
      scrollToBottom();
    } catch (err) {
      console.error('Error generating story content:', err);
       const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        // Re-enable previous choices on error
        choices: prev.choices.length > 0 ? prev.choices : ['Réessayer'],
        error: `Impossible de continuer l'histoire: ${errorMsg}`,
        // Remove player choice and the failed segment attempt if necessary (optional)
         story: prev.story.slice(0, -1), // Removes the player choice text added optimistically
         playerChoicesHistory: prev.playerChoicesHistory.slice(0,-1), // Remove last choice from history
      }));
       toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };

  const renderStory = () => (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-card text-card-foreground mb-4" ref={scrollAreaRef}>
       <div ref={viewportRef}>
            {gameState.story.map((segment) => (
            <p key={segment.id} className={`mb-2 ${segment.isPlayerChoice ? 'italic text-muted-foreground' : ''}`}>
                {segment.text}
            </p>
            ))}
            {gameState.isLoading && (
                <div className="flex items-center space-x-2 text-muted-foreground mt-4">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Génération de l'histoire...</span>
                </div>
            )}
       </div>
    </ScrollArea>
  );

  const renderChoices = () => (
    <div className="flex flex-wrap gap-2 mt-4">
      {gameState.choices.map((choice, index) => (
        <Button
          key={index}
          onClick={() => handleChoice(choice)}
          disabled={gameState.isLoading}
          variant="secondary"
          className="flex-grow sm:flex-grow-0"
        >
          {choice}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-3xl shadow-lg border-border">
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
            <p className="text-destructive mt-4 text-center">{gameState.error}</p>
          )}
        </CardContent>
         {gameState.story.length > 0 && (
            <CardFooter className="flex justify-center mt-4">
                 <Button variant="outline" onClick={() => setGameState({
                     story: [],
                     choices: [],
                     currentGameState: '',
                     theme: null,
                     isLoading: false,
                     error: null,
                     playerChoicesHistory: [],
                 })}>
                    Recommencer (Choisir un autre thème)
                </Button>
            </CardFooter>
         )}
      </Card>
    </div>
  );
}

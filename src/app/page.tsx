// src/app/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateInitialStory } from '@/ai/flows/generate-initial-story';
import { generateStoryContent } from '@/ai/flows/generate-story-content';
import type { GenerateStoryContentInput, GenerateStoryContentOutput } from '@/ai/flows/generate-story-content';
import { useToast } from '@/hooks/use-toast';
import { BookOpenText, Loader, Wand2, ScrollText, Rocket, Anchor, Sun, Heart, Gamepad2, ShieldAlert, Save, Trash2, FolderOpen, PlusCircle, User, Bot, Smile, Send, Search, Sparkles, Briefcase, AlertCircle } from 'lucide-react'; // Added User, Bot, Smile, Send, Search, Sparkles, Briefcase, AlertCircle icons
import { saveGame, loadGame, listSaveGames, deleteSaveGame, type GameStateToSave } from '@/lib/saveLoadUtils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // Import cn utility
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components

export interface StorySegment {
  id: number;
  text: string;
  speaker: 'player' | 'narrator'; // Identify the speaker
}

// Define ParsedGameState structure
interface ParsedGameState {
    inventory: string[];
    playerName?: string;
    location?: string;
    status?: string;
    // Add other potential gameState fields here
    [key: string]: any; // Allow for other properties
}


interface GameState {
  story: StorySegment[];
  choices: string[];
  currentGameState: ParsedGameState; // Use parsed object
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
  { value: 'Mystère et Enquête', label: 'Mystère et Enquête', prompt: 'Résous une énigme ou retrouve un objet perdu.', icon: Search },
  { value: 'École des Super-Héros', label: 'École des Super-Héros', prompt: 'Apprends à maîtriser tes pouvoirs et sauve la situation !', icon: Sparkles },
  { value: 'Histoire d\'Amour', label: 'Histoire d\'Amour', prompt: 'Rencontre inattendue et romance naissante', icon: Heart },
  { value: 'Piégé dans le Jeu', label: 'Piégé dans le Jeu', prompt: 'Évasion d\'un jeu vidéo immersif', icon: Gamepad2 },
  { value: 'Survie Post-Apocalyptique', label: 'Survie Post-Apocalyptique', prompt: 'Recherche de ressources dans un monde dévasté', icon: ShieldAlert },
];

// Helper function to safely parse game state JSON
const parseGameState = (stateString: string | undefined | null, playerNameFallback: string | null = 'Joueur'): ParsedGameState => {
    const defaultState: ParsedGameState = { inventory: [], playerName: playerNameFallback || undefined };
    if (!stateString) {
        return defaultState;
    }
    try {
        const parsed = JSON.parse(stateString);
        if (typeof parsed !== 'object' || parsed === null) {
            console.warn("Parsed game state is not an object, returning default.");
            return defaultState;
        }
        // Ensure inventory is an array of strings
        const inventory = Array.isArray(parsed.inventory)
            ? parsed.inventory.filter((item: any) => typeof item === 'string')
            : [];
        // Ensure playerName is a string
        const playerName = typeof parsed.playerName === 'string' ? parsed.playerName : playerNameFallback || undefined;

        return { ...parsed, inventory, playerName };
    } catch (error) {
        console.error("Error parsing game state JSON:", error, "String was:", stateString);
        return defaultState;
    }
};


export default function AdventureCraftGame() {
  const [gameState, setGameState] = useState<GameState>({
    story: [],
    choices: [],
    currentGameState: { inventory: [] }, // Initialize with default object
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
  const [customChoiceInput, setCustomChoiceInput] = useState(''); // State for custom input

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
        currentGameState: { inventory: [], playerName: null }, // Reset state
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
    // Set player name first
    setGameState(prev => ({ ...prev, playerName: trimmedName, currentGameState: { ...prev.currentGameState, playerName: trimmedName } }));
    // Start the game immediately after setting the name
    startNewGame(trimmedName, gameState.theme); // Pass name and current theme
  }


  const startNewGame = async (nameToUse: string, themeToUse: string | null) => {
    if (!themeToUse) {
      console.error('Theme missing, cannot start game.');
       toast({ title: 'Erreur', description: 'Veuillez sélectionner un thème.', variant: 'destructive' });
       showThemeSelection(); // Go back if theme somehow missing
      return;
    }

    setGameState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        story: [],
        choices: [],
        currentGameState: { playerName: nameToUse, inventory: [] }, // Initialize with name and empty inventory
        playerChoicesHistory: [],
        currentView: 'game_active', // Switch view
        theme: themeToUse, // Ensure theme is set
        playerName: nameToUse, // Ensure name is set
    }));

    try {
      const initialStoryData = await generateInitialStory({
          theme: themeToUse,
          playerName: nameToUse
      });
      setGameState((prev) => ({
        ...prev,
        story: [{ id: Date.now(), text: initialStoryData.story, speaker: 'narrator' }], // Initial story is from narrator
        choices: initialStoryData.choices,
        isLoading: false,
         // Initial GameState from AI? Let's assume not for now, initialize manually
      }));
    } catch (err) {
      console.error('Error generating initial story:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de générer l'histoire initiale: ${errorMsg}`,
        theme: null,
        playerName: null,
        currentGameState: { inventory: [] }, // Reset state
        currentView: 'theme_selection', // Go back
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de générer l'histoire initiale: ${errorMsg}`, variant: 'destructive' });
    }
  };

  // Function to handle both standard choices and inventory actions
  const handleAction = async (actionText: string) => {
    if (!actionText.trim()) {
        toast({ title: "Action Vide", description: "Veuillez décrire votre action.", variant: "destructive" });
        return;
    }
    if (!gameState.playerName || !gameState.theme) {
        console.error('Player name or theme missing during action handling.');
        toast({ title: 'Erreur', description: 'Erreur de jeu critique. Retour au menu principal.', variant: 'destructive' });
        showMainMenu();
        return;
    }

    const playerActionSegment: StorySegment = { id: Date.now(), text: actionText.trim(), speaker: 'player' };
    const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, actionText.trim()];
    const previousStory = [...gameState.story];
    const previousChoices = [...gameState.choices]; // Store previous choices for potential revert
    const previousGameState = gameState.currentGameState; // Store previous parsed state

    // Optimistic update: show player action, clear choices, start loading
    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [...prev.story, playerActionSegment],
      choices: [], // Clear standard choices
      playerChoicesHistory: nextPlayerChoicesHistory,
    }));
    setCustomChoiceInput(''); // Clear custom input if used
    // Scroll handled by useEffect

    // Prepare input for AI
    const input: GenerateStoryContentInput = {
      theme: gameState.theme,
      playerName: gameState.playerName,
      // Pass the last narrator segment OR player choice if it's the very first turn
      lastStorySegment: previousStory.length > 0 ? previousStory[previousStory.length - 1] : undefined,
      playerChoicesHistory: nextPlayerChoicesHistory, // Send updated history including the current action
      gameState: JSON.stringify(gameState.currentGameState), // Send current state stringified
    };

    try {
      const nextStoryData: GenerateStoryContentOutput = await generateStoryContent(input);

      const narratorResponseSegment: StorySegment = { id: Date.now() + 1, text: nextStoryData.storyContent, speaker: 'narrator' };
      const updatedParsedGameState = parseGameState(nextStoryData.updatedGameState, gameState.playerName); // Parse the response

      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, narratorResponseSegment],
        choices: nextStoryData.nextChoices,
        currentGameState: updatedParsedGameState, // Store the new parsed state
        isLoading: false,
      }));
      // Scroll handled by useEffect

    } catch (err) {
      console.error('Error generating story content:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de continuer l'histoire: ${errorMsg}`,
        story: previousStory, // Revert story
        choices: previousChoices, // Revert choices
        currentGameState: previousGameState, // Revert game state
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1), // Revert history
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };


  const handleCustomChoiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleAction(customChoiceInput); // Use the main handleAction function
  };

  // Specific handler for inventory item clicks (leads to action input)
  const handleInventoryItemClick = (item: string) => {
      // For now, just pre-fill the custom input box to suggest using the item
      setCustomChoiceInput(`Utiliser ${item} `); // Add space for user to complete action
      // Focus the input field?
      // Or potentially open a specific action popover later
      toast({ title: "Action d'Inventaire", description: `Décrivez comment vous voulez utiliser : ${item}` });
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

    // Prepare the state to be saved, ensuring currentGameState is stringified
    const stateToSave: Omit<GameStateToSave, 'timestamp' | 'saveName'> = {
        theme: gameState.theme,
        playerName: gameState.playerName,
        story: gameState.story,
        choices: gameState.choices,
        currentGameState: JSON.stringify(gameState.currentGameState), // Stringify the parsed state
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
        const parsedLoadedGameState = parseGameState(loadedState.currentGameState, loadedState.playerName); // Parse the loaded string
        setGameState(prev => ({
            ...prev,
            theme: loadedState.theme,
            playerName: loadedState.playerName,
            story: loadedState.story,
            choices: loadedState.choices,
            currentGameState: parsedLoadedGameState, // Store the parsed state
            playerChoicesHistory: loadedState.playerChoicesHistory,
            isLoading: false,
            error: null,
            currentView: 'game_active'
        }));
        toast({ title: "Partie Chargée", description: `La partie "${saveName}" a été chargée.` });
    } else {
        toast({ title: "Erreur de Chargement", description: `Impossible de charger la partie "${saveName}".`, variant: "destructive" });
        setSavedGames(listSaveGames()); // Refresh list in case of corruption
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

 // Function to parse segment text and highlight inventory additions
 const formatStoryText = (text: string) => {
    const inventoryAddRegex = /(Tu as trouvé.*?ajouté[e]? à ton inventaire\s*!)/gi;
    const parts = text.split(inventoryAddRegex);
    return parts.map((part, index) => {
      if (inventoryAddRegex.test(part)) {
        // Reset regex lastIndex before testing again if needed, though split avoids this issue
        return <strong key={index} className="text-foreground font-semibold">{part}</strong>;
      }
      return part;
    });
  };


const renderStory = () => (
    <ScrollAreaPrimitive.Root className="relative overflow-hidden flex-1 w-full rounded-md border mb-4 bg-card"> {/* Use flex-1 to take available space */}
        <ScrollAreaPrimitive.Viewport
            ref={viewportRef}
            className="h-full w-full rounded-[inherit] p-4 space-y-4" // space-y-4 adds vertical space between bubbles
        >
            {gameState.story.map((segment) => (
            <div
                key={segment.id}
                className={cn(
                    "flex flex-col max-w-[90%] sm:max-w-[85%] p-3 rounded-lg shadow", // Increased max-width
                    segment.speaker === 'player'
                        ? 'ml-auto bg-primary text-primary-foreground rounded-br-none'
                        : 'mr-auto bg-muted text-muted-foreground rounded-bl-none'
                )}
            >
                <div className="flex items-center gap-2 mb-1">
                    {segment.speaker === 'player' ? (
                        <Smile className="h-4 w-4" />
                    ) : (
                        <Bot className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium">
                        {segment.speaker === 'player' ? gameState.playerName : 'Narrateur'}
                    </span>
                </div>
                 <p className="whitespace-pre-wrap text-sm">
                    {segment.speaker === 'narrator' ? formatStoryText(segment.text) : segment.text}
                 </p>
            </div>
            ))}
            {/* Loading indicator */}
            {gameState.isLoading && gameState.choices.length === 0 && (
                <div className="flex items-center justify-start space-x-2 text-muted-foreground mt-4 ml-4">
                    <Bot className="h-4 w-4 mr-2" />
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Génération de la suite...</span>
                </div>
            )}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
 );

 const renderInventory = () => (
     <Popover>
         <PopoverTrigger asChild>
             <Button variant="outline" className="shrink-0" disabled={gameState.isLoading || gameState.currentGameState.inventory.length === 0}>
                 <Briefcase className="mr-2 h-4 w-4" />
                 Inventaire ({gameState.currentGameState.inventory.length})
             </Button>
         </PopoverTrigger>
         <PopoverContent className="w-60 p-2">
             <div className="space-y-2">
                 <h4 className="font-medium leading-none text-center">Inventaire</h4>
                 {gameState.currentGameState.inventory.length > 0 ? (
                     <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                         {gameState.currentGameState.inventory.map((item, index) => (
                             <li key={index}>
                                 <Button
                                     variant="ghost"
                                     size="sm"
                                     className="w-full justify-start h-auto py-1 px-2 text-left"
                                     onClick={() => handleInventoryItemClick(item)}
                                     title={`Utiliser ${item}`}
                                 >
                                     {item}
                                 </Button>
                             </li>
                         ))}
                     </ul>
                 ) : (
                     <p className="text-xs text-muted-foreground text-center">Votre inventaire est vide.</p>
                 )}
             </div>
         </PopoverContent>
     </Popover>
 );


  const renderChoicesAndInput = () => (
    <div className="mt-auto pb-4 flex flex-col gap-4">
      {/* Predefined Choices */}
      <div className="flex flex-wrap gap-2 justify-center">
        {gameState.choices.map((choice, index) => (
          <Button
            key={index}
            onClick={() => handleAction(choice)} // Use handleAction
            disabled={gameState.isLoading}
            variant="secondary"
            className="flex-grow sm:flex-grow-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            aria-label={`Faire le choix : ${choice}`}
          >
            {choice}
          </Button>
        ))}
      </div>

      {/* Custom Choice Input and Inventory Button */}
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-lg mx-auto items-center">
          <form onSubmit={handleCustomChoiceSubmit} className="flex-grow flex gap-2 w-full sm:w-auto">
              <Input
                type="text"
                value={customChoiceInput}
                onChange={(e) => setCustomChoiceInput(e.target.value)}
                placeholder="Que faites-vous ? (ou utilisez un objet)"
                className="flex-grow"
                disabled={gameState.isLoading}
                aria-label="Entrez votre propre action ou utilisez un objet"
              />
              <Button type="submit" disabled={gameState.isLoading || !customChoiceInput.trim()} size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Send className="h-4 w-4" />
                <span className="sr-only">Envoyer</span>
              </Button>
          </form>
           {renderInventory()} {/* Render inventory button/popover here */}
      </div>

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
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
       <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg flex flex-col flex-grow" style={{ height: '95vh' }}>
        <CardHeader className="text-center flex-shrink-0">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <BookOpenText className="h-8 w-8 text-primary" />
            AdventureCraft
          </CardTitle>
          <CardDescription className="text-muted-foreground">
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

        <CardContent className="flex-grow flex flex-col overflow-hidden p-4 md:p-6">
          {gameState.currentView === 'menu' && renderMainMenu()}
          {gameState.currentView === 'theme_selection' && renderThemeSelection()}
          {gameState.currentView === 'name_input' && renderNameInput()}
          {gameState.currentView === 'loading_game' && renderLoadGame()}
          {gameState.currentView === 'game_active' && (
            <>
              {renderStory()}
              {!gameState.isLoading && renderChoicesAndInput()}
            </>
          )}
          {/* Error Display */}
          {gameState.error && (
            <div className="mt-auto p-2 bg-destructive/10 rounded-md border border-destructive text-destructive text-sm flex items-center gap-2">
                 <AlertCircle className="h-4 w-4 shrink-0" />
                 <p className="flex-1">{gameState.error}</p>
            </div>
          )}
        </CardContent>

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


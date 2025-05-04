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
import { BookOpenText, Loader, Wand2, ScrollText, Rocket, Anchor, Sun, Heart, Gamepad2, ShieldAlert, Save, Trash2, FolderOpen, PlusCircle, User, Bot, Smile, Send, Search, Sparkles, Briefcase, AlertCircle, Eye, MoveUpRight, Repeat, History } from 'lucide-react'; // Added Repeat, History icons
import { saveGame, loadGame, listSaveGames, deleteSaveGame, type GameStateToSave } from '@/lib/saveLoadUtils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // Import cn utility
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { Separator } from '@/components/ui/separator'; // Import Separator
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip" // Import Tooltip components
import { Slider } from "@/components/ui/slider" // Import Slider component


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
  currentView: 'menu' | 'theme_selection' | 'name_input' | 'loading_game' | 'game_active' | 'game_ended'; // Added 'game_ended'
  maxTurns: number; // Added maxTurns
  currentTurn: number; // Added currentTurn
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
    maxTurns: 15, // Default max turns
    currentTurn: 1, // Default current turn
  });
  const [savedGames, setSavedGames] = useState<GameStateToSave[]>([]);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [maxTurnsInput, setMaxTurnsInput] = useState<number>(15); // State for slider value
  const [customChoiceInput, setCustomChoiceInput] = useState(''); // State for custom input
  const [isInventoryPopoverOpen, setIsInventoryPopoverOpen] = useState(false); // State for inventory popover

  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null); // Ref for custom input

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
      if ((gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && gameState.story.length > 0) {
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
        currentView: 'menu',
        maxTurns: 15, // Reset turns
        currentTurn: 1, // Reset turns
    }));
     setSavedGames(listSaveGames());
     setIsInventoryPopoverOpen(false); // Close popover on navigating away
  }

  const showThemeSelection = () => {
    setGameState(prev => ({ ...prev, currentView: 'theme_selection', theme: null, playerName: null, currentTurn: 1, maxTurns: 15 }));
    setIsInventoryPopoverOpen(false);
  };

  const showNameInput = () => {
     if (!gameState.theme) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de continuer.', variant: 'destructive' });
      return;
    }
    setGameState(prev => ({ ...prev, currentView: 'name_input' }));
    setIsInventoryPopoverOpen(false);
  }

  const showLoadGameView = () => {
    setSavedGames(listSaveGames());
    setGameState(prev => ({ ...prev, currentView: 'loading_game' }));
     setIsInventoryPopoverOpen(false);
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
    // Set player name and max turns first
    setGameState(prev => ({
        ...prev,
        playerName: trimmedName,
        currentGameState: { ...prev.currentGameState, playerName: trimmedName },
        maxTurns: maxTurnsInput, // Set maxTurns from slider
        currentTurn: 1, // Reset current turn for new game
    }));
    // Start the game immediately after setting the name and turns
    startNewGame(trimmedName, gameState.theme, maxTurnsInput); // Pass name, current theme, and max turns
  }


  const startNewGame = async (nameToUse: string, themeToUse: string | null, turns: number) => {
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
        maxTurns: turns, // Set max turns
        currentTurn: 1, // Start at turn 1
    }));
     setIsInventoryPopoverOpen(false); // Ensure closed on new game

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
        maxTurns: 15,
        currentTurn: 1,
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
    // Prevent action if game ended
    if (gameState.currentView === 'game_ended') {
        toast({ title: "Fin de l'aventure", description: "L'histoire est terminée. Vous pouvez commencer une nouvelle partie.", variant: "destructive" });
        return;
    }

    const playerActionSegment: StorySegment = { id: Date.now(), text: actionText.trim(), speaker: 'player' };
    const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, actionText.trim()];
    const previousStory = [...gameState.story];
    const previousChoices = [...gameState.choices]; // Store previous choices for potential revert
    const previousGameState = gameState.currentGameState; // Store previous parsed state
    const lastSegmentBeforeAction = previousStory[previousStory.length - 1]; // Get last segment for AI context
    const nextTurn = gameState.currentTurn + 1; // Calculate next turn


    // Optimistic update: show player action, clear choices, start loading
    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [...prev.story, playerActionSegment],
      choices: [], // Clear standard choices
      playerChoicesHistory: nextPlayerChoicesHistory,
      currentTurn: nextTurn, // Increment turn optimistically
    }));
    setCustomChoiceInput(''); // Clear custom input if used
    setIsInventoryPopoverOpen(false); // Close inventory popover after action
    // Scroll handled by useEffect

    const isLastTurn = nextTurn > gameState.maxTurns;

    // Prepare input for AI
    const input: GenerateStoryContentInput = {
      theme: gameState.theme,
      playerName: gameState.playerName,
      lastStorySegment: lastSegmentBeforeAction,
      playerChoicesHistory: nextPlayerChoicesHistory,
      gameState: JSON.stringify(previousGameState),
      currentTurn: nextTurn, // Send the *next* turn number
      maxTurns: gameState.maxTurns,
      isLastTurn: isLastTurn, // Tell AI if it's the last turn
    };

    try {
      const nextStoryData: GenerateStoryContentOutput = await generateStoryContent(input);

      const narratorResponseSegment: StorySegment = { id: Date.now() + 1, text: nextStoryData.storyContent, speaker: 'narrator' };
      const updatedParsedGameState = parseGameState(nextStoryData.updatedGameState, gameState.playerName); // Parse the response

      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, narratorResponseSegment], // Add the narrator's response
        choices: nextStoryData.nextChoices, // Use AI's choices (might be empty if ending)
        currentGameState: updatedParsedGameState, // Store the new parsed state
        isLoading: false,
        currentView: isLastTurn ? 'game_ended' : 'game_active', // Update view based on turn
      }));

      if (isLastTurn) {
          toast({ title: "Fin de l'Aventure !", description: "Votre histoire est terminée. Merci d'avoir joué !", duration: 5000 });
      }
      // Scroll handled by useEffect

    } catch (err) {
      console.error('Error generating story content:', err);
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      // Revert state: Remove player's action and restore previous state/turn
      setGameState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Impossible de continuer l'histoire: ${errorMsg}`,
        story: previousStory, // Revert story (remove optimistic player action)
        choices: previousChoices, // Revert choices
        currentGameState: previousGameState, // Revert game state
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1), // Revert history
        currentTurn: prev.currentTurn - 1, // Revert turn count
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de continuer l'histoire: ${errorMsg}`, variant: 'destructive' });
    }
  };


  const handleCustomChoiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleAction(customChoiceInput); // Use the main handleAction function
  };

  // Specific handler for inventory item clicks (leads to action input)
  const handleInventoryActionClick = (actionPrefix: string, item: string) => {
      // Prevent action if game ended
      if (gameState.currentView === 'game_ended') {
            toast({ title: "Fin de l'aventure", description: "L'histoire est terminée.", variant: "destructive" });
            setIsInventoryPopoverOpen(false);
            return;
      }
      const fullActionText = `${actionPrefix} ${item}`;
      setCustomChoiceInput(fullActionText); // Set the input field text
      setIsInventoryPopoverOpen(false); // Close the popover
      // Focus the input field after state update
      requestAnimationFrame(() => {
          customInputRef.current?.focus();
          customInputRef.current?.setSelectionRange(fullActionText.length, fullActionText.length); // Move cursor to end
      });
      toast({ title: "Action d'Inventaire", description: `Prêt à '${fullActionText}'. Appuyez sur Envoyer.` });
  };


  // --- Save/Load Handlers ---
  const handleOpenSaveDialog = () => {
    // Prevent saving if game ended
    if (gameState.currentView === 'game_ended') {
        toast({ title: "Action Impossible", description: "Vous ne pouvez pas sauvegarder une partie terminée.", variant: "destructive" });
        return;
    }
    const dateStr = new Date().toLocaleDateString('fr-CA');
    const suggestedName = gameState.theme && gameState.playerName
        ? `${gameState.playerName} - ${gameState.theme} ${dateStr} (T${gameState.currentTurn}/${gameState.maxTurns})` // Add turn info
        : `Sauvegarde ${dateStr}`;
    setSaveNameInput(suggestedName);
    setIsSaveDialogOpen(true);
  };

  const handleSaveGame = () => {
    if (!saveNameInput.trim()) {
        toast({ title: "Nom Invalide", description: "Veuillez entrer un nom pour la sauvegarde.", variant: "destructive" });
        return;
    }
    if (!gameState.theme || !gameState.playerName || gameState.currentView !== 'game_active') { // Check view
        toast({ title: "Erreur", description: "Impossible de sauvegarder : partie non active ou informations manquantes.", variant: "destructive" });
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
        maxTurns: gameState.maxTurns, // Save maxTurns
        currentTurn: gameState.currentTurn, // Save currentTurn
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
        // Check if loaded game was already ended
        const loadedView = loadedState.currentTurn > loadedState.maxTurns ? 'game_ended' : 'game_active';

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
            currentView: loadedView, // Set view based on loaded turns
            maxTurns: loadedState.maxTurns, // Load maxTurns
            currentTurn: loadedState.currentTurn, // Load currentTurn
        }));
        toast({ title: "Partie Chargée", description: `La partie "${saveName}" a été chargée.` });
         setIsInventoryPopoverOpen(false); // Close popover on load
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
    // Match variations like "Tu as trouvé", "Vous avez trouvé", "ajouté(e) à", etc.
    const inventoryAddRegex = /(?:Tu as|Vous avez) trouvé.*?(?:ajouté|ajoutée)\s+à\s+ton\s+inventaire\s*!/gi;
    const parts = text.split(inventoryAddRegex);

    return parts.reduce((acc, part, index) => {
      acc.push(part); // Push the non-matching part
      if (index < parts.length - 1) {
        // Find the actual matched text (since split removes it)
        const match = text.substring(acc.join('').length).match(inventoryAddRegex);
        if (match) {
          acc.push(
            <strong key={`match-${index}`} className="text-primary font-semibold">
              {match[0]}
            </strong>
          );
        }
      }
      return acc;
    }, [] as React.ReactNode[]);
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
            {gameState.isLoading && gameState.choices.length === 0 && gameState.currentView !== 'game_ended' && (
                <div className="flex items-center justify-start space-x-2 text-muted-foreground mt-4 ml-4">
                    <Bot className="h-4 w-4 mr-2" />
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Génération de la suite...</span>
                </div>
            )}
             {/* End Game Message */}
             {gameState.currentView === 'game_ended' && !gameState.isLoading && (
                 <div className="flex flex-col items-center justify-center text-center p-4 mt-4 bg-muted rounded-md">
                     <History className="h-8 w-8 mb-2 text-primary" />
                     <p className="font-semibold text-lg">Fin de l'Aventure</p>
                     <p className="text-sm text-muted-foreground">
                        Votre histoire s'est conclue après {gameState.maxTurns} tours.
                     </p>
                     <Button variant="primary" size="sm" onClick={showMainMenu} className="mt-4">
                         Retour au Menu Principal
                     </Button>
                 </div>
             )}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
 );

 const renderInventory = () => (
     <Popover open={isInventoryPopoverOpen} onOpenChange={setIsInventoryPopoverOpen}>
         <PopoverTrigger asChild>
             <Button variant="secondary" className="shrink-0" disabled={gameState.isLoading || gameState.currentGameState.inventory.length === 0 || gameState.currentView === 'game_ended'}>
                 <Briefcase className="mr-2 h-4 w-4" />
                 Inventaire ({gameState.currentGameState.inventory.length})
             </Button>
         </PopoverTrigger>
         <PopoverContent className="w-72 p-2" align="end">
              <TooltipProvider delayDuration={300}>
                 <div className="space-y-2">
                     <h4 className="font-medium leading-none text-center pb-2">Inventaire</h4>
                     {gameState.currentGameState.inventory.length > 0 ? (
                         <ScrollAreaPrimitive.Root className="max-h-60 w-full">
                             <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] p-1">
                                <ul className="text-sm space-y-2">
                                    {gameState.currentGameState.inventory.map((item, index) => (
                                        <li key={index} className="flex items-center justify-between gap-1 border-b border-border pb-1 last:border-b-0 last:pb-0">
                                            <span className="flex-1 font-medium truncate" title={item}>
                                                {item}
                                            </span>
                                            <div className="flex gap-1 shrink-0">
                                                <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <Button
                                                             variant="ghost"
                                                             size="icon-sm" // New smaller size
                                                             className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                             onClick={() => handleInventoryActionClick('Inspecter', item)}
                                                             disabled={gameState.isLoading || gameState.currentView === 'game_ended'}
                                                         >
                                                             <Eye className="h-4 w-4" />
                                                             <span className="sr-only">Inspecter {item}</span>
                                                         </Button>
                                                     </TooltipTrigger>
                                                     <TooltipContent side="top">Inspecter</TooltipContent>
                                                 </Tooltip>
                                                 <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <Button
                                                             variant="ghost"
                                                             size="icon-sm"
                                                             className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                             onClick={() => handleInventoryActionClick('Utiliser', item)}
                                                             disabled={gameState.isLoading || gameState.currentView === 'game_ended'}
                                                         >
                                                             <Wand2 className="h-4 w-4" />
                                                             <span className="sr-only">Utiliser {item}</span>
                                                         </Button>
                                                     </TooltipTrigger>
                                                     <TooltipContent side="top">Utiliser</TooltipContent>
                                                 </Tooltip>
                                                  <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <Button
                                                             variant="ghost"
                                                             size="icon-sm"
                                                             className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                             onClick={() => handleInventoryActionClick('Lancer', item)}
                                                             disabled={gameState.isLoading || gameState.currentView === 'game_ended'}
                                                         >
                                                             <MoveUpRight className="h-4 w-4" />
                                                             <span className="sr-only">Lancer {item}</span>
                                                         </Button>
                                                     </TooltipTrigger>
                                                     <TooltipContent side="top">Lancer</TooltipContent>
                                                 </Tooltip>
                                                 <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <Button
                                                             variant="ghost"
                                                             size="icon-sm"
                                                             className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                                             onClick={() => handleInventoryActionClick('Se débarrasser de', item)}
                                                             disabled={gameState.isLoading || gameState.currentView === 'game_ended'}
                                                         >
                                                             <Trash2 className="h-4 w-4" />
                                                             <span className="sr-only">Se débarrasser de {item}</span>
                                                         </Button>
                                                     </TooltipTrigger>
                                                     <TooltipContent side="top">Se débarrasser</TooltipContent>
                                                 </Tooltip>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                              </ScrollAreaPrimitive.Viewport>
                             <ScrollBar />
                            <ScrollAreaPrimitive.Corner />
                         </ScrollAreaPrimitive.Root>
                     ) : (
                         <p className="text-xs text-muted-foreground text-center py-4">Votre inventaire est vide.</p>
                     )}
                 </div>
             </TooltipProvider>
         </PopoverContent>
     </Popover>
 );


  const renderChoicesAndInput = () => (
    <div className="mt-auto pb-4 flex flex-col gap-4">
      {/* Predefined Choices */}
       {gameState.choices.length > 0 && gameState.currentView === 'game_active' && ( // Only show if game active
           <div className="flex flex-wrap gap-2 justify-center">
             {gameState.choices.map((choice, index) => (
               <Button
                 key={index}
                 onClick={() => handleAction(choice)} // Use handleAction
                 disabled={gameState.isLoading}
                 variant="primary" // Keep primary for main actions
                 className="flex-grow sm:flex-grow-0"
                 aria-label={`Faire le choix : ${choice}`}
               >
                 {choice}
               </Button>
             ))}
           </div>
       )}

      {/* Separator */}
      {gameState.choices.length > 0 && gameState.currentView === 'game_active' && <Separator className="my-2" />}


      {/* Custom Choice Input and Inventory Button */}
      {gameState.currentView === 'game_active' && ( // Only show if game active
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-lg mx-auto items-center justify-center">
              <form onSubmit={handleCustomChoiceSubmit} className="flex-grow flex gap-2 w-full sm:w-auto">
                  <Input
                    ref={customInputRef} // Assign ref
                    type="text"
                    value={customChoiceInput}
                    onChange={(e) => setCustomChoiceInput(e.target.value)}
                    placeholder="Que faites-vous ? (ou utilisez un objet)"
                    className="flex-grow"
                    disabled={gameState.isLoading}
                    aria-label="Entrez votre propre action ou utilisez un objet"
                  />
                  <Button type="submit" disabled={gameState.isLoading || !customChoiceInput.trim()} size="icon" variant="primary">
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Envoyer</span>
                  </Button>
              </form>
               {renderInventory()} {/* Render inventory button/popover here */}
          </div>
      )}

    </div>
  );

  const renderThemeSelection = () => (
      <div className="flex flex-col items-center space-y-6 w-full">
          <p className="text-xl font-semibold text-center">Choisissez votre univers d'aventure :</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
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
              variant="primary"
              className="rounded-md shadow-md mt-6"
          >
              Suivant
          </Button>
            <Button variant="outline" onClick={showMainMenu} className="mt-2">
                Retour au Menu Principal
            </Button>
      </div>
  );

  const renderNameInput = () => (
      <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md h-full"> {/* Increased max-width */}
          <Label htmlFor="playerName" className="text-xl font-semibold text-center">Comment t'appelles-tu, aventurier(ère) ?</Label>
          <Input
                id="playerName"
                type="text"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                placeholder="Entre ton nom ici"
                className="text-center w-full"
                maxLength={50}
                autoFocus // Focus on name input
            />
          <div className="w-full space-y-3">
             <Label htmlFor="maxTurns" className="text-center block">Nombre de tours souhaités : <span className="font-bold text-primary">{maxTurnsInput}</span></Label>
             <Slider
                 id="maxTurns"
                 min={10}
                 max={25}
                 step={1}
                 value={[maxTurnsInput]}
                 onValueChange={(value) => setMaxTurnsInput(value[0])}
                 className="w-full"
                 aria-label={`Nombre de tours souhaités: ${maxTurnsInput}`}
             />
          </div>
          <Button
              onClick={handleNameSubmit}
              disabled={!playerNameInput.trim() || gameState.isLoading}
              size="lg"
              variant="primary"
              className="rounded-md shadow-md w-full"
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
          <Button variant="outline" onClick={showThemeSelection} className="mt-2 w-full">
              Retour au choix du thème
          </Button>
      </div>
  );

  const renderMainMenu = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-full"> {/* Added justify-center and h-full */}
        <h2 className="text-2xl font-semibold">Menu Principal</h2>
        <Button onClick={showThemeSelection} size="lg" className="w-60" variant="primary">
            <PlusCircle className="mr-2 h-5 w-5" /> Nouvelle Partie
        </Button>
        <Button onClick={showLoadGameView} size="lg" className="w-60" variant="secondary" disabled={savedGames.length === 0}>
            <FolderOpen className="mr-2 h-5 w-5" /> Charger une Partie
        </Button>
        {savedGames.length === 0 && <p className="text-sm text-muted-foreground">Aucune partie sauvegardée.</p>}
    </div>
  );

  const renderLoadGame = () => (
    <div className="flex flex-col items-center space-y-4 w-full h-full justify-center"> {/* Added justify-center and h-full */}
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
                                        {save.theme} - T{save.currentTurn}/{save.maxTurns} - {new Date(save.timestamp).toLocaleString('fr-FR')}
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

  // Determine if the current view should have centered content
  const shouldCenterContent = ['menu', 'theme_selection', 'name_input', 'loading_game'].includes(gameState.currentView);

  const renderTurnCounter = () => (
    <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border text-sm text-muted-foreground shadow-sm flex items-center gap-1.5">
        <Repeat className="h-4 w-4" />
        Tour: <span className="font-semibold text-foreground">{gameState.currentTurn}</span> / {gameState.maxTurns}
    </div>
  );


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground relative"> {/* Added relative */}
       {/* ThemeSwitcher stays top right */}
       {/* <div className="absolute top-4 right-4 z-50">
           <ThemeSwitcher />
       </div> */}

       {/* Turn Counter - visible only during active game */}
       {(gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && renderTurnCounter()}

       <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg flex flex-col flex-grow mt-10" style={{ height: 'calc(95vh - 40px)' }}> {/* Adjust height and margin */}
        <CardHeader className="text-center flex-shrink-0 pt-6 pb-2"> {/* Adjust padding */}
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <BookOpenText className="h-8 w-8 text-primary" />
            AdventureCraft
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1"> {/* Adjust margin */}
             {gameState.currentView === 'game_active' && gameState.theme && gameState.playerName
              ? `Aventure de ${gameState.playerName} : ${gameState.theme}`
              : gameState.currentView === 'game_ended' && gameState.theme && gameState.playerName
              ? `Aventure terminée de ${gameState.playerName} : ${gameState.theme}`
              : gameState.currentView === 'theme_selection'
              ? "Choisissez un thème pour votre nouvelle aventure ! (8-12 ans)"
              : gameState.currentView === 'name_input'
              ? "Prépare-toi pour l'aventure !"
              : gameState.currentView === 'loading_game'
              ? "Choisissez une partie à charger."
              : "Bienvenue ! Commencez une nouvelle aventure ou chargez une partie."}
          </CardDescription>
        </CardHeader>

         <CardContent className={cn(
            "flex-grow flex flex-col overflow-hidden p-4 md:p-6",
             shouldCenterContent && "items-center justify-center" // Center content for specific views
         )}>
          {gameState.currentView === 'menu' && renderMainMenu()}
          {gameState.currentView === 'theme_selection' && renderThemeSelection()}
          {gameState.currentView === 'name_input' && renderNameInput()}
          {gameState.currentView === 'loading_game' && renderLoadGame()}
          {(gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && (
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

         {/* Footer appears only when game is active (not ended) */}
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
```</content>
  </change>
  <change>
    <file>src/ai/flows/generate-story-content.ts</file>
    <description>Update input schema and prompt to include currentTurn, maxTurns, and isLastTurn. Modify prompt to generate a concluding story segment when isLastTurn is true.</description>
    <content><![CDATA[// src/ai/flows/generate-story-content.ts
'use server';

/**
 * @fileOverview Generates story content based on the chosen theme, player choices, inventory, player name, and turn count.
 *
 * - generateStoryContent - A function that generates story content.
 * - GenerateStoryContentInput - The input type for the generateStoryContent function.
 * - GenerateStoryContentOutput - The return type for the generateStoryContent function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { StorySegment } from '@/app/page'; // Import StorySegment type

// Define a helper function to safely parse JSON
function safeJsonParse(jsonString: string | undefined | null, defaultValue: object = {}): any { // Return any for flexibility internally
  if (!jsonString) {
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(jsonString);
    // Basic check if it's an object (and not null)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return defaultValue; // Return default if not an object
  } catch (e) {
    console.error("Failed to parse JSON string:", jsonString, e);
    return defaultValue; // Return default value if parsing fails
  }
}

// Define a helper function to safely stringify JSON
function safeJsonStringify(jsonObject: object): string {
  try {
    return JSON.stringify(jsonObject);
  } catch (e) {
    console.error("Failed to stringify JSON object:", jsonObject, e);
    return '{}'; // Return empty object string if stringify fails
  }
}


const GenerateStoryContentInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'The theme of the story (e.g., Medieval Fantasy, Space Exploration, Pirates of the Caribbean, Western and Cowboys, Mystery and Investigation, Superhero School, Love Story, Trapped in the Game, Post-Apocalyptic Survival)'
    ),
  playerName: z.string().describe('The name of the player.'),
  lastStorySegment: z.object({ // Add last story segment for context
      id: z.number(),
      text: z.string(),
      speaker: z.enum(['player', 'narrator'])
  }).optional().describe('The very last segment of the story (player choice or narrator text) for immediate context.'),
  playerChoicesHistory: z.array(z.string()).optional().describe('The history of player choices made so far, ordered chronologically. The VERY LAST element is the most recent choice the AI must react to.'),
  gameState: z.string().optional().describe('A JSON string representing the current game state (e.g., {"inventory": ["key", "map"], "location": "Cave", "playerName": "Alex"}). Start with an empty object string if undefined.'),
  currentTurn: z.number().int().positive().describe('The current turn number (starts at 1).'),
  maxTurns: z.number().int().positive().describe('The maximum number of turns for this adventure.'),
  isLastTurn: z.boolean().describe('Indicates if this is the final turn of the adventure.'),
});
export type GenerateStoryContentInput = z.infer<typeof GenerateStoryContentInputSchema>;

const GenerateStoryContentOutputSchema = z.object({
  storyContent: z.string().describe('The generated story content, describing the result of the player\'s last action and the current situation, addressing the player by name. If it\'s the last turn, this should be the concluding segment.'),
  nextChoices: z.array(z.string()).describe('2-3 clear and simple choices for the player\'s next action, relevant to the current situation, theme, and inventory. Should be an empty array if it\'s the last turn.'),
  updatedGameState: z.string().describe('The updated game state as a JSON string, reflecting changes based on the last action and story progression (including inventory). Must be valid JSON.'),
});
export type GenerateStoryContentOutput = z.infer<typeof GenerateStoryContentOutputSchema>;

export async function generateStoryContent(input: GenerateStoryContentInput): Promise<GenerateStoryContentOutput> {
  const initialGameState = safeJsonParse(input.gameState, { playerName: input.playerName, inventory: [] });

  // Ensure player name and inventory array exist in the initial game state object
  if (!initialGameState.playerName) {
      initialGameState.playerName = input.playerName;
  }
  if (!Array.isArray(initialGameState.inventory)) {
      initialGameState.inventory = [];
  }

  const safeInput = {
    ...input,
    gameState: safeJsonStringify(initialGameState), // Use the validated/defaulted object
    playerChoicesHistory: input.playerChoicesHistory || [],
    lastStorySegmentText: input.lastStorySegment?.text || "C'est le début de l'aventure.", // Provide default text if segment is missing
  };

  return generateStoryContentFlow(safeInput);
}


const prompt = ai.definePrompt({
  name: 'generateStoryContentPrompt',
  input: {
    schema: z.object({
      theme: z.string().describe('The theme of the story.'),
      playerName: z.string().describe('The name of the player.'),
      lastStorySegmentText: z.string().describe('The text of the very last story segment (player or narrator) for immediate context.'),
      playerChoicesHistory: z.array(z.string()).describe('History of player choices. The VERY LAST element is the most recent choice to react to.'),
      gameState: z.string().describe('Current game state (JSON string). Example: {"location":"Forest","inventory":["Sword","Potion"],"status":"Healthy","playerName":"Hero"}'),
      current_date: z.string().describe('Current date, injected for potential story elements.'),
      currentTurn: z.number().describe('The current turn number.'),
      maxTurns: z.number().describe('The maximum number of turns.'),
      isLastTurn: z.boolean().describe('Whether this is the last turn.'),
    }),
  },
  output: {
    schema: GenerateStoryContentOutputSchema,
  },
  prompt: `Tu es un Maître du Jeu (MJ) / Narrateur amical et imaginatif pour un jeu d'aventure textuel interactif destiné aux enfants de 8-12 ans. Le nom du joueur est {{{playerName}}}. L'aventure dure au maximum {{{maxTurns}}} tours. Nous sommes actuellement au tour {{{currentTurn}}}. Ta mission est de continuer l'histoire de manière amusante, logique et **strictement cohérente avec le thème**, en te basant sur le **dernier choix effectué par le joueur**, l'état actuel du jeu, et en t'adressant au joueur par son nom.

  **Contexte de l'Aventure :**
  *   Thème Principal : **{{{theme}}}** (Tu dois IMPÉRATIVEMENT rester dans ce thème)
  *   Nom du joueur : {{{playerName}}}
  *   Tour Actuel : {{{currentTurn}}} / {{{maxTurns}}}
  *   État actuel du jeu (JSON string) : {{{gameState}}}
      *   Note : L'état du jeu contient généralement 'inventory' (tableau d'objets) et 'playerName'.
  *   Dernier segment de l'histoire : "{{{lastStorySegmentText}}}"
  *   Historique des choix du joueur (le **dernier élément** est le choix auquel tu dois réagir) :
      {{#if playerChoicesHistory}}
      {{#each playerChoicesHistory}}
      - {{{this}}}
      {{/each}}
      {{else}}
      C'est le tout début de l'aventure !
      {{/if}}

  **Règles strictes pour ta réponse (MJ) :**

  1.  **Réagis au DERNIER CHOIX/ACTION** : Ta réponse DOIT commencer par décrire le résultat direct et logique du **dernier choix** de {{{playerName}}}. Adresse-toi toujours à {{{playerName}}} par son nom.
       *   **Gestion Inventaire** : Si le dernier choix implique un objet (utilisation, trouvaille), mets à jour 'updatedGameState.inventory' (ajout/retrait). Annonce clairement les trouvailles ("Tu as trouvé... Ajouté à l'inventaire !"). Si un objet est utilisé et consommé, retire-le.
  2.  **Décris la nouvelle situation** : Après le résultat de l'action, explique la situation actuelle : où est {{{playerName}}} ? Que perçoit-il/elle ? Qu'est-ce qui a changé ?
  3.  **Ton rôle** : Reste UNIQUEMENT le narrateur. Pas de sortie de rôle, pas de discussion hors aventure, pas de mention d'IA.
  4.  **Public (8-12 ans)** : Langage simple, adapté, positif, aventureux. Pas de violence/peur excessive/thèmes adultes.
  5.  **Cohérence Thématique ({{{theme}}})** : CRUCIAL. Tout (narration, objets, lieux, choix) doit rester dans le thème **{{{theme}}}**.
  6.  **Gestion Actions Hors-Contexte/Impossibles** : Si le **dernier choix** est illogique, hors thème, dangereux, impossible, refuse GENTIMENT ou réinterprète. Explique pourquoi ("Hmm, {{{playerName}}}, essayer de {action impossible} ne semble pas fonctionner ici.") et propose immédiatement de nouvelles actions VALIDES via 'nextChoices' (sauf si c'est le dernier tour).
  7.  **Gestion du Dernier Tour (isLastTurn = true)** :
       *   Si `{{{isLastTurn}}}` est vrai, c'est la fin ! Ne propose **AUCUN** nouveau choix (`nextChoices` doit être un tableau vide `[]`).
       *   Décris une **conclusion** à l'aventure basée sur le dernier choix et l'état final du jeu. La conclusion doit être satisfaisante et cohérente avec l'histoire et le thème. Elle peut être ouverte ou fermée. Exemple: "Et c'est ainsi, {{{playerName}}}, qu'après avoir {dernière action}, tu {conclusion}. Ton aventure sur {lieu/thème} se termine ici... pour l'instant !".
       *   Mets quand même à jour `updatedGameState` une dernière fois si nécessaire.
  8.  **Propose de Nouveaux Choix (NON-Inventaire, si PAS le dernier tour)** : Si `{{{isLastTurn}}}` est FAUX, offre 2 ou 3 options claires, simples, pertinentes pour la situation et le thème. PAS d'actions d'inventaire directes dans `nextChoices`.
  9.  **Mets à Jour l'État du Jeu ('updatedGameState')** : Réfléchis aux conséquences du **dernier choix** (inventaire, lieu, etc.). Mets à jour **IMPÉRATIVEMENT** 'inventory' si besoin. `updatedGameState` doit être une chaîne JSON valide avec 'playerName' et 'inventory'. Si rien n'a changé, renvoie le `gameState` précédent (stringify), mais valide.
  10. **Format de Sortie** : Réponds UNIQUEMENT avec un objet JSON valide contenant : 'storyContent' (string), 'nextChoices' (array de strings, vide si `{{{isLastTurn}}}` est vrai), 'updatedGameState' (string JSON valide). RIEN d'autre.

  **Exemple de sortie (Tour normal)**
  {
    "storyContent": "Léa, tu actives ton scanner... Il semble que tu pourrais forcer l'ouverture...",
    "nextChoices": ["Essayer de forcer la porte", "Chercher un autre passage"],
    "updatedGameState": "{\"location\":\"Corridor X-7\",\"inventory\":[\"Scanner\"],\"playerName\":\"Léa\"}"
  }

  **Exemple de sortie (DERNIER TOUR, isLastTurn = true)**
   {
    "storyContent": "Et c'est ainsi, Tom, qu'après avoir courageusement brandi l'Épée Courte face au gardien endormi, tu remarques un passage secret derrière lui ! Ton aventure dans la Salle du Trésor touche à sa fin, pleine de découvertes. Bravo !",
    "nextChoices": [],
    "updatedGameState": "{\"location\":\"Passage Secret\",\"inventory\":[\"Épée Courte\"],\"status\":\"Victorieux\",\"playerName\":\"Tom\"}"
   }

  **Important** : Date actuelle : {{current_date}} (peu pertinent). Concentre-toi sur la réaction au **dernier choix**, la gestion de l'inventaire, et la **conclusion si c'est le dernier tour**.

  Génère maintenant la suite (ou la fin) de l'histoire pour {{{playerName}}}, en respectant TOUTES les règles, le thème {{{theme}}}, l'état du jeu, et le compte des tours ({{{currentTurn}}}/{{{maxTurns}}}, `{{{isLastTurn}}}`).
  `,
});


const generateStoryContentFlow = ai.defineFlow<
  typeof GenerateStoryContentInputSchema,
  typeof GenerateStoryContentOutputSchema
>({
  name: 'generateStoryContentFlow',
  inputSchema: GenerateStoryContentInputSchema,
  outputSchema: GenerateStoryContentOutputSchema,
},
async input => {
   // Basic input validation
   if (!input.theme) throw new Error("Theme is required.");
   if (!input.playerName) throw new Error("Player name is required.");
   if (!input.gameState) throw new Error("Game state is required.");
   if (!input.currentTurn || !input.maxTurns) throw new Error("Turn information is required.");

   const safePlayerChoicesHistory = input.playerChoicesHistory || [];
   if (safePlayerChoicesHistory.length === 0 && !input.lastStorySegmentText?.includes("début")) {
       console.warn("generateStoryContent called with empty choice history mid-game. This might indicate an issue.");
   }

    // Validate input gameState is valid JSON before sending to AI
    let currentGameStateObj: any;
    try {
        currentGameStateObj = JSON.parse(input.gameState);
        if (typeof currentGameStateObj !== 'object' || currentGameStateObj === null) {
            throw new Error("Parsed gameState is not an object.");
        }
         // Ensure essential keys exist
        if (!currentGameStateObj.playerName) currentGameStateObj.playerName = input.playerName;
        if (!Array.isArray(currentGameStateObj.inventory)) currentGameStateObj.inventory = [];

    } catch (e) {
        console.error("Invalid input gameState JSON, resetting to default:", input.gameState, e);
        currentGameStateObj = { playerName: input.playerName, inventory: [] };
    }
    const validatedInputGameStateString = safeJsonStringify(currentGameStateObj);


  // Inject current date into the prompt context
  const promptInput = {
      ...input,
      playerChoicesHistory: safePlayerChoicesHistory,
      gameState: validatedInputGameStateString, // Send validated state
      current_date: new Date().toLocaleDateString('fr-FR'),
      // Use optional lastStorySegmentText from input
      lastStorySegmentText: input.lastStorySegmentText || (safePlayerChoicesHistory.length > 0 ? safePlayerChoicesHistory[safePlayerChoicesHistory.length - 1] : "C'est le début de l'aventure."),
  };

  const { output } = await prompt(promptInput);

  // --- Output Validation ---
   if (!output || typeof output.storyContent !== 'string' || !Array.isArray(output.nextChoices) || typeof output.updatedGameState !== 'string') {
        console.error("Invalid format received from AI for story content:", output);
        // Attempt to recover gracefully
        return {
            storyContent: "Oups ! Le narrateur semble avoir perdu le fil de l'histoire à cause d'une interférence cosmique. Essayons autre chose.",
            nextChoices: input.isLastTurn ? [] : ["Regarder autour de moi", "Vérifier mon inventaire"], // Provide generic safe choices, empty if last turn
            updatedGameState: validatedInputGameStateString // Return the last known valid state
        };
        // Or throw: throw new Error("Format invalide reçu de l'IA pour le contenu de l'histoire.");
    }

     // Additional validation for last turn: choices MUST be empty
    if (input.isLastTurn && output.nextChoices.length > 0) {
        console.warn("AI returned choices on the last turn. Overriding to empty array.");
        output.nextChoices = [];
    }
     // Validation for normal turn: choices SHOULD exist (unless AI has specific reason)
     if (!input.isLastTurn && output.nextChoices.length === 0 && output.storyContent.length > 0) {
         console.warn("AI returned empty choices on a normal turn. Providing fallback choices.");
         output.nextChoices = ["Regarder autour de moi", "Vérifier mon inventaire"];
         output.storyContent += "\n(Le narrateur semble chercher ses mots... Que fais-tu en attendant ?)";
     }


    // Validate updatedGameState JSON and ensure essential keys are present
    let updatedGameStateObj: any;
    try {
        updatedGameStateObj = JSON.parse(output.updatedGameState);
        if (typeof updatedGameStateObj !== 'object' || updatedGameStateObj === null) {
            throw new Error("Parsed updatedGameState is not an object.");
        }
         // Ensure essential keys are preserved or re-added
        if (!updatedGameStateObj.playerName) {
             console.warn("AI removed playerName from updatedGameState, re-adding.");
             updatedGameStateObj.playerName = input.playerName;
        }
         if (!Array.isArray(updatedGameStateObj.inventory)) {
             console.warn("AI removed or corrupted inventory in updatedGameState, resetting/fixing.");
             // Attempt to recover from input state or default
             const originalGameState = safeJsonParse(validatedInputGameStateString); // Parse validated string
             const originalInventory = originalGameState.inventory;
             updatedGameStateObj.inventory = Array.isArray(originalInventory) ? originalInventory : [];
         }
         // Ensure inventory items are strings (basic check)
         if (!updatedGameStateObj.inventory.every((item: any) => typeof item === 'string')) {
             console.warn("AI returned non-string items in inventory, filtering.");
             updatedGameStateObj.inventory = updatedGameStateObj.inventory.filter((item: any) => typeof item === 'string');
         }

    } catch (e) {
        console.error("AI returned invalid JSON for updatedGameState:", output.updatedGameState, e);
        console.warn("Attempting to return previous valid game state due to AI error.");
        // Reset to the validated input state as a fallback
        updatedGameStateObj = safeJsonParse(validatedInputGameStateString); // Parse validated string
        // Add a message indicating the state might be stale
        output.storyContent += "\n(Attention: L'état de l'inventaire pourrait ne pas être à jour suite à une petite erreur.)";
         // Provide safe fallback choices, considering if it was supposed to be the last turn
         output.nextChoices = input.isLastTurn ? [] : ["Regarder autour", "Vérifier inventaire"];
    }

    // Reserialize the validated/corrected game state object
    output.updatedGameState = safeJsonStringify(updatedGameStateObj);


    // Final check on choices array content (ensure strings)
    if (!output.nextChoices.every(choice => typeof choice === 'string')) {
        console.error("Invalid choices format received from AI:", output.nextChoices);
        output.nextChoices = input.isLastTurn ? [] : ["Regarder autour de moi"]; // Fallback choices
    }


  return output;
});
```</content>
  </change>
  <change>
    <file>src/lib/saveLoadUtils.ts</file>
    <description>Add maxTurns and currentTurn to GameStateToSave interface and update save/load functions to handle these new fields.</description>
    <content><![CDATA[// src/lib/saveLoadUtils.ts
'use client'; // Mark as client component because it uses localStorage

import type { StorySegment } from '@/app/page'; // Adjust the import path as needed

// Define the structure of the data to be saved
export interface GameStateToSave {
  theme: string;
  playerName: string; // Added player name
  story: StorySegment[];
  choices: string[];
  currentGameState: string; // Stored as JSON string
  playerChoicesHistory: string[];
  timestamp: number;
  saveName: string;
  maxTurns: number; // Added max turns
  currentTurn: number; // Added current turn
}

const SAVE_GAME_KEY = 'adventureCraftSaves_v1'; // Use a versioned key

/**
 * Retrieves all saved games from localStorage.
 * Handles potential JSON parsing errors and validates structure.
 * @returns An array of saved game states.
 */
export function listSaveGames(): GameStateToSave[] {
  if (typeof window === 'undefined') {
    return []; // Cannot access localStorage on server
  }
  try {
    const savedGamesJson = localStorage.getItem(SAVE_GAME_KEY);
    if (!savedGamesJson) {
      return [];
    }
    const savedGames = JSON.parse(savedGamesJson) as GameStateToSave[];
    // Basic validation - check if it's an array
    if (!Array.isArray(savedGames)) {
        console.error("Invalid save data found in localStorage. Expected an array.");
        localStorage.removeItem(SAVE_GAME_KEY); // Clear invalid data
        return [];
    }
     // Further validation for essential fields
     savedGames.forEach(save => {
        if (typeof save.playerName !== 'string') {
             console.warn(`Save game "${save.saveName}" missing player name. Defaulting to 'Joueur'.`);
            save.playerName = 'Joueur'; // Assign a default if needed
        }
        if (typeof save.currentGameState !== 'string') {
            console.warn(`Save game "${save.saveName}" has invalid currentGameState format. Attempting to stringify.`);
            // Try to stringify if it's somehow an object, default to '{}' on error
            try {
                save.currentGameState = JSON.stringify(save.currentGameState || {});
            } catch (e) {
                console.error(`Failed to stringify gameState for save "${save.saveName}". Resetting to '{}'.`);
                save.currentGameState = '{}';
            }
        }
         // Validate JSON within currentGameState string
         try {
             const parsedState = JSON.parse(save.currentGameState);
             if (typeof parsedState !== 'object' || parsedState === null) throw new Error("Not an object");
              if (!Array.isArray(parsedState.inventory)) parsedState.inventory = []; // Ensure inventory array exists
         } catch (e) {
             console.warn(`Save game "${save.saveName}" has invalid JSON in currentGameState. Resetting gameState to basic structure.`);
             save.currentGameState = JSON.stringify({ playerName: save.playerName, inventory: [] });
         }
        // Validate turn numbers (assign defaults if missing)
        if (typeof save.maxTurns !== 'number' || save.maxTurns <= 0) {
            console.warn(`Save game "${save.saveName}" missing or invalid maxTurns. Defaulting to 15.`);
            save.maxTurns = 15;
        }
        if (typeof save.currentTurn !== 'number' || save.currentTurn <= 0) {
            console.warn(`Save game "${save.saveName}" missing or invalid currentTurn. Defaulting to 1.`);
            save.currentTurn = 1;
        }
        // Ensure current turn doesn't exceed max turns (could happen with manual edits)
        if (save.currentTurn > save.maxTurns + 1) { // Allow one over for "ended" state
             console.warn(`Save game "${save.saveName}" has currentTurn exceeding maxTurns. Clamping.`);
             save.currentTurn = save.maxTurns + 1;
        }
     });

    // Sort by timestamp descending (most recent first)
    return savedGames.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error loading save games from localStorage:', error);
    // Optionally clear corrupted data
    // localStorage.removeItem(SAVE_GAME_KEY);
    return [];
  }
}

/**
 * Saves the current game state to localStorage.
 * Finds an existing save with the same name or adds a new one.
 * Expects gameState.currentGameState to be a valid JSON string.
 * @param saveName The name/identifier for the save slot.
 * @param gameState The game state to save (including playerName, stringified currentGameState, and turn info).
 * @returns True if save was successful, false otherwise.
 */
export function saveGame(saveName: string, gameState: Omit<GameStateToSave, 'timestamp' | 'saveName'>): boolean {
   if (typeof window === 'undefined') {
    console.error('Cannot save game on the server.');
    return false;
  }
  if (!gameState.playerName) {
      console.error('Cannot save game without a player name.');
      return false;
  }
   // Validate that currentGameState is a string before saving
   if (typeof gameState.currentGameState !== 'string') {
        console.error('Error saving: currentGameState must be a stringified JSON.');
        return false;
   }
    // Validate the JSON structure within the string *before* saving
    try {
         const parsedState = JSON.parse(gameState.currentGameState);
         if (typeof parsedState !== 'object' || parsedState === null || !parsedState.playerName || !Array.isArray(parsedState.inventory)) {
            throw new Error("Invalid structure in currentGameState JSON");
         }
    } catch (e) {
        console.error('Error saving: Invalid JSON structure in currentGameState string.', e, gameState.currentGameState);
        return false;
    }
    // Validate turns before saving
    if (typeof gameState.maxTurns !== 'number' || gameState.maxTurns <= 0 || typeof gameState.currentTurn !== 'number' || gameState.currentTurn <= 0) {
        console.error('Error saving: Invalid turn data provided.');
        return false;
    }


  try {
    const saves = listSaveGames(); // Gets validated saves
    const now = Date.now();
    const newState: GameStateToSave = {
        ...gameState, // Includes stringified currentGameState and turn info
        saveName: saveName,
        timestamp: now,
    }

    const existingIndex = saves.findIndex(s => s.saveName === saveName);

    if (existingIndex > -1) {
        saves[existingIndex] = newState;
    } else {
        saves.push(newState);
    }

    saves.sort((a, b) => b.timestamp - a.timestamp);

    localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saves));
    console.log(`Game saved as "${saveName}" for player "${gameState.playerName}" at turn ${gameState.currentTurn}/${gameState.maxTurns}`);
    return true;
  } catch (error) {
    console.error('Error saving game to localStorage:', error);
    return false;
  }
}

/**
 * Loads a specific game state from localStorage by save name.
 * @param saveName The name of the save slot to load.
 * @returns The loaded game state (with currentGameState as a string and turn info) or null if not found or error occurs.
 */
export function loadGame(saveName: string): GameStateToSave | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    // listSaveGames already validates structure, JSON validity, and turn numbers
    const saves = listSaveGames();
    const save = saves.find(s => s.saveName === saveName);
    if (!save) {
        console.warn(`Save game "${saveName}" not found.`);
        return null;
    }

    // The save object returned by listSaveGames should be valid
    console.log(`Game "${saveName}" loaded for player "${save.playerName}" at turn ${save.currentTurn}/${save.maxTurns}.`);
    return save; // Return the object with currentGameState as a string and turn info
  } catch (error) {
    console.error(`Error loading game "${saveName}" from localStorage:`, error);
    return null;
  }
}

/**
 * Deletes a specific save game from localStorage by save name.
 * @param saveName The name of the save slot to delete.
 * @returns True if deletion was successful or save didn't exist, false on error.
 */
export function deleteSaveGame(saveName: string): boolean {
   if (typeof window === 'undefined') {
    console.error('Cannot delete game on the server.');
    return false;
  }
  try {
    let saves = listSaveGames();
    const initialLength = saves.length;
    saves = saves.filter(s => s.saveName !== saveName);

    if (saves.length === initialLength) {
        console.warn(`Save game "${saveName}" not found for deletion.`);
    }

    if (saves.length === 0) {
        localStorage.removeItem(SAVE_GAME_KEY);
    } else {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saves));
    }
    console.log(`Save game "${saveName}" deleted.`);
    return true;
  } catch (error) {
    console.error(`Error deleting game "${saveName}" from localStorage:`, error);
    return false;
  }
}
```</content>
  </change>
  <change>
    <file>src/components/ui/slider.tsx</file>
    <description>Add Slider component from ShadCN UI library.</description>
    <content><![CDATA["use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

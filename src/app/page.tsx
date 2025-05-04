'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image'; // Import next/image
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar, ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea component
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateInitialStory } from '@/ai/flows/generate-initial-story';
import type { GenerateInitialStoryOutput } from '@/ai/flows/generate-initial-story'; // Import specific type
import { generateStoryContent } from '@/ai/flows/generate-story-content';
import type { GenerateStoryContentInput, GenerateStoryContentOutput } from '@/ai/flows/generate-story-content';
import { generateImage } from '@/ai/flows/generate-image'; // Import the image generation flow
import type { GenerateImageOutput } from '@/ai/flows/generate-image'; // Import the image generation output type
import { useToast } from '@/hooks/use-toast';
import { BookOpenText, Loader, Wand2, ScrollText, Rocket, Anchor, Sun, Heart, Gamepad2, ShieldAlert, Save, Trash2, FolderOpen, PlusCircle, User, Bot, Smile, Send, Search, Sparkles, Briefcase, AlertCircle, Eye, MoveUpRight, Repeat, History, MapPin, ImageIcon, ImageOff } from 'lucide-react'; // Added MapPin, ImageIcon, ImageOff
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
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for image loading


export interface StorySegment {
  id: number;
  text: string;
  speaker: 'player' | 'narrator'; // Identify the speaker
  storyImageUrl?: string | null; // Optional URL for the generated image
  imageIsLoading?: boolean; // Flag to indicate image is being generated
  imageError?: boolean; // Flag to indicate image generation failed
}

// Define ParsedGameState structure
interface ParsedGameState {
    inventory: string[];
    playerName?: string;
    location?: string; // Added location
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
    const defaultState: ParsedGameState = { inventory: [], location: 'Lieu Inconnu', playerName: playerNameFallback || undefined }; // Added default location
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
        // Ensure location is a string
        const location = typeof parsed.location === 'string' ? parsed.location : 'Lieu Indéterminé'; // Added location parsing

        return { ...parsed, inventory, playerName, location }; // Added location to return
    } catch (error) {
        console.error("Error parsing game state JSON:", error, "String was:", stateString);
        return defaultState;
    }
};


export default function IAventuresGame() {
  const [gameState, setGameState] = useState<GameState>({
    story: [],
    choices: [],
    currentGameState: { inventory: [], location: 'Menu Principal' }, // Initialize with default object and location
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
        currentGameState: { inventory: [], playerName: null, location: 'Menu Principal' }, // Reset state including location
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
    setGameState(prev => ({ ...prev, currentView: 'theme_selection', theme: null, playerName: null, currentTurn: 1, maxTurns: 15, currentGameState: {...prev.currentGameState, location: 'Sélection du Thème'} })); // Update location
    setIsInventoryPopoverOpen(false);
  };

  const showNameInput = () => {
     if (!gameState.theme) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un thème avant de continuer.', variant: 'destructive' });
      return;
    }
    setGameState(prev => ({ ...prev, currentView: 'name_input', currentGameState: {...prev.currentGameState, location: 'Création du Personnage'} })); // Update location
    setIsInventoryPopoverOpen(false);
  }

  const showLoadGameView = () => {
    setSavedGames(listSaveGames());
    setGameState(prev => ({ ...prev, currentView: 'loading_game', currentGameState: {...prev.currentGameState, location: 'Chargement de Partie'} })); // Update location
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
        currentGameState: { ...prev.currentGameState, playerName: trimmedName, location: 'Initialisation...' }, // Update location
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
        // currentGameState already set in handleNameSubmit with player name, location is placeholder
        playerChoicesHistory: [],
        currentView: 'game_active', // Switch view
        theme: themeToUse, // Ensure theme is set
        playerName: nameToUse, // Ensure name is set
        maxTurns: turns, // Set max turns
        currentTurn: 1, // Start at turn 1
    }));
     setIsInventoryPopoverOpen(false); // Ensure closed on new game

    try {
      const initialStoryData: GenerateInitialStoryOutput = await generateInitialStory({ // Specify output type
          theme: themeToUse,
          playerName: nameToUse
      });
      setGameState((prev) => ({
        ...prev,
        story: [{
            id: Date.now(),
            text: initialStoryData.story,
            speaker: 'narrator',
            storyImageUrl: null, // No image for initial story
            imageIsLoading: false,
            imageError: false,
        }], // Initial story is from narrator
        choices: initialStoryData.choices,
        isLoading: false,
        currentGameState: { // Set initial GameState including location from AI
            ...prev.currentGameState,
            location: initialStoryData.location, // Use location from AI response
            inventory: [], // Start with empty inventory
        }
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
        currentGameState: { inventory: [], location: 'Erreur' }, // Reset state with error location
        currentView: 'theme_selection', // Go back
        maxTurns: 15,
        currentTurn: 1,
      }));
      toast({ title: 'Erreur de Génération', description: `Impossible de générer l'histoire initiale: ${errorMsg}`, variant: 'destructive' });
    }
  };

  // Trigger image generation asynchronously
  const triggerImageGeneration = useCallback(async (segmentId: number, prompt: string) => {
    try {
        const imageData: GenerateImageOutput = await generateImage({ prompt });
        setGameState((prev) => ({
            ...prev,
            story: prev.story.map(seg =>
                seg.id === segmentId
                    ? { ...seg, storyImageUrl: imageData.imageUrl, imageIsLoading: false, imageError: false }
                    : seg
            ),
        }));
         scrollToBottom(); // Scroll after image loads
    } catch (err) {
        console.error('Error generating image:', err);
        const errorMsg = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
        toast({ title: 'Erreur Image', description: `Impossible de générer l'image: ${errorMsg}`, variant: 'destructive' });
        setGameState((prev) => ({
            ...prev,
            story: prev.story.map(seg =>
                seg.id === segmentId
                    ? { ...seg, storyImageUrl: null, imageIsLoading: false, imageError: true } // Mark as error
                    : seg
            ),
        }));
    }
  }, [toast, scrollToBottom]); // Added scrollToBottom dependency

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

    const playerActionSegment: StorySegment = {
        id: Date.now(),
        text: actionText.trim(),
        speaker: 'player',
        storyImageUrl: null, // Player actions don't have images
        imageIsLoading: false,
        imageError: false,
    };
    const nextPlayerChoicesHistory = [...gameState.playerChoicesHistory, actionText.trim()];
    const previousStory = [...gameState.story];
    const previousChoices = [...gameState.choices]; // Store previous choices for potential revert
    const previousGameState = gameState.currentGameState; // Store previous parsed state
    const lastSegmentBeforeAction = previousStory[previousStory.length - 1]; // Get last segment for AI context
    const nextTurn = gameState.currentTurn + 1; // Increment turn optimistically


    // Optimistic update: show player action, clear choices, start loading, increment turn
    setGameState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      story: [...prev.story, playerActionSegment],
      choices: [], // Clear standard choices
      playerChoicesHistory: nextPlayerChoicesHistory,
      currentTurn: nextTurn, // Increment turn optimistically
      // Location might change, so we wait for AI response to update it
    }));
    setCustomChoiceInput(''); // Clear custom input if used
    setIsInventoryPopoverOpen(false); // Close inventory popover after action
    // Scroll handled by useEffect

    const isLastTurn = nextTurn > gameState.maxTurns; // Check if the *new* turn is the last

    // Prepare input for AI
    const input: GenerateStoryContentInput = {
      theme: gameState.theme,
      playerName: gameState.playerName,
      lastStorySegment: lastSegmentBeforeAction, // Send the segment BEFORE the player's action
      playerChoicesHistory: nextPlayerChoicesHistory, // Send history including the new action
      gameState: JSON.stringify(previousGameState), // Send state BEFORE the action (including current location)
      currentTurn: nextTurn, // Send the *new* turn number
      maxTurns: gameState.maxTurns,
      isLastTurn: isLastTurn, // Tell AI if it's the last turn
    };

    try {
      const nextStoryData: GenerateStoryContentOutput = await generateStoryContent(input);

      const narratorResponseSegmentId = Date.now() + 1;
      const narratorResponseSegment: StorySegment = {
          id: narratorResponseSegmentId,
          text: nextStoryData.storyContent,
          speaker: 'narrator',
          storyImageUrl: null, // Initially null
          imageIsLoading: !!nextStoryData.generatedImagePrompt, // True if prompt exists
          imageError: false,
      };
      const updatedParsedGameState = parseGameState(nextStoryData.updatedGameState, gameState.playerName); // Parse the response

      setGameState((prev) => ({
        ...prev,
        story: [...prev.story, narratorResponseSegment], // Add the narrator's response AFTER player's action
        choices: nextStoryData.nextChoices, // Use AI's choices (might be empty if ending)
        currentGameState: updatedParsedGameState, // Store the new parsed state (including potentially updated location)
        isLoading: false,
        // currentTurn is already updated optimistically
        currentView: isLastTurn ? 'game_ended' : 'game_active', // Update view based on turn check
      }));

      // If an image prompt was generated, trigger the image generation
      if (nextStoryData.generatedImagePrompt) {
          // Add theme context to the image prompt for better results
          const imagePromptWithTheme = `${nextStoryData.generatedImagePrompt}. Thème : ${gameState.theme}. Style : Illustration pour enfant, coloré, clair.`;
          triggerImageGeneration(narratorResponseSegmentId, imagePromptWithTheme);
      }

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
        currentGameState: previousGameState, // Revert game state (including location)
        playerChoicesHistory: prev.playerChoicesHistory.slice(0, -1), // Revert history
        currentTurn: prev.currentTurn - 1, // Revert turn count (back to previous turn)
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
    // Allow saving even if game ended (might want to save the final state)
    if (!gameState.theme || !gameState.playerName || !['game_active', 'game_ended'].includes(gameState.currentView)) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder : informations de jeu manquantes.", variant: "destructive" });
        return;
    }

    // Prepare the state to be saved, ensuring currentGameState is stringified
    const stateToSave: Omit<GameStateToSave, 'timestamp' | 'saveName'> = {
        theme: gameState.theme,
        playerName: gameState.playerName,
        story: gameState.story.map(s => ({...s, imageIsLoading: false, imageError: false})), // Don't save loading/error states for images
        choices: gameState.choices,
        currentGameState: JSON.stringify(gameState.currentGameState), // Stringify the parsed state (including location)
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
        const parsedLoadedGameState = parseGameState(loadedState.currentGameState, loadedState.playerName); // Parse the loaded string (including location)
        // Determine view based on loaded turns: if current > max, it's ended
        const loadedView = loadedState.currentTurn > loadedState.maxTurns ? 'game_ended' : 'game_active';

        setGameState(prev => ({
            ...prev,
            theme: loadedState.theme,
            playerName: loadedState.playerName,
            story: loadedState.story.map(s => ({...s, imageIsLoading: false, imageError: false})), // Ensure loaded images aren't marked as loading/error
            choices: loadedState.choices,
            currentGameState: parsedLoadedGameState, // Store the parsed state (including location)
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
                 {/* Image Display */}
                 {segment.speaker === 'narrator' && segment.imageIsLoading && (
                     <div className="mt-2 flex justify-center items-center h-48 bg-muted/50 rounded-md">
                         <Loader className="h-8 w-8 animate-spin text-primary" />
                     </div>
                 )}
                 {segment.speaker === 'narrator' && segment.imageError && (
                      <div className="mt-2 flex flex-col justify-center items-center h-48 bg-destructive/10 rounded-md text-destructive p-2 text-center">
                         <ImageOff className="h-8 w-8 mb-2" />
                         <p className="text-xs">Erreur de génération d'image.</p>
                     </div>
                 )}
                 {segment.speaker === 'narrator' && segment.storyImageUrl && !segment.imageIsLoading && !segment.imageError && (
                     <div className="mt-2 relative aspect-video rounded-md overflow-hidden border border-border">
                         <Image
                            src={segment.storyImageUrl}
                            alt={`Image de l'aventure générée pour: ${segment.text.substring(0, 50)}...`}
                            fill
                            sizes="(max-width: 768px) 90vw, 85vw" // Responsive sizes
                            style={{ objectFit: 'cover' }} // Cover the area
                            priority={gameState.story[gameState.story.length - 1].id === segment.id} // Prioritize last image
                         />
                     </div>
                 )}
                 {/* Text Content */}
                 <p className="whitespace-pre-wrap text-sm mt-1"> {/* Added mt-1 for spacing below image */}
                    {segment.speaker === 'narrator' ? formatStoryText(segment.text) : segment.text}
                 </p>
            </div>
            ))}
            {/* Loading indicator */}
            {gameState.isLoading && gameState.currentView !== 'game_ended' && (
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
                        {gameState.currentGameState.location && ` Vous terminez à : ${gameState.currentGameState.location}.`}
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
         <PopoverContent className="w-72 p-2" align="start"> {/* Changed align to start */}
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


      {/* Custom Choice Input */}
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
              {/* Inventory button is moved to header */}
          </div>
      )}

    </div>
  );

  const renderThemeSelection = () => (
      <div className="flex flex-col items-center space-y-6 w-full h-full">
          <p className="text-xl font-semibold text-center shrink-0">Choisissez votre univers d'aventure :</p>
          <ScrollArea className="flex-grow w-full max-w-5xl pr-4"> {/* Wrap grid in ScrollArea */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </ScrollArea>
           <div className="flex flex-col sm:flex-row gap-2 mt-6 shrink-0"> {/* Footer buttons */}
                <Button
                    onClick={showNameInput}
                    disabled={!gameState.theme}
                    size="lg"
                    variant="primary"
                    className="rounded-md shadow-md"
                >
                    Suivant
                </Button>
                <Button variant="outline" onClick={showMainMenu}>
                    Retour au Menu Principal
                </Button>
            </div>
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
             <ScrollAreaPrimitive.Root className="w-full max-w-lg h-[300px] rounded-md border"> {/* Increased max-width to lg */}
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
    <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border text-sm text-muted-foreground shadow-sm flex items-center gap-1.5">
        <Repeat className="h-4 w-4" />
        Tour: <span className="font-semibold text-foreground">{gameState.currentTurn > gameState.maxTurns ? gameState.maxTurns : gameState.currentTurn}</span> / {gameState.maxTurns}
    </div>
  );


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background text-foreground"> {/* Removed relative */}
       {/* ThemeSwitcher stays top right - handled in layout.tsx */}

       <Card className="w-full max-w-4xl shadow-lg border-border rounded-lg flex flex-col flex-grow mt-10" style={{ height: 'calc(95vh - 40px)' }}> {/* Adjust height and margin */}
        <CardHeader className="relative text-center flex-shrink-0 pt-4 pb-2 flex items-center justify-between border-b border-border"> {/* Adjusted padding & add border */}
             {/* Left Aligned: Inventory Button (only visible in game) */}
            <div className="absolute top-3 left-4"> {/* Position absolutely left */}
                {(gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && renderInventory()}
            </div>

            {/* Centered: Title, Description, Location */}
            <div className="flex-1 flex flex-col items-center mx-auto px-16"> {/* Added padding to avoid overlap */}
                <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                    <BookOpenText className="h-8 w-8 text-primary" />
                    IAventures
                </CardTitle>
                 <CardDescription className="text-muted-foreground mt-1">
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
                 {/* Current Location Display */}
                  {(gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && gameState.currentGameState.location && (
                    <div className="mt-1 text-sm text-accent-foreground flex items-center gap-1">
                         <MapPin className="h-4 w-4 text-accent" />
                         Lieu: <span className="font-medium">{gameState.currentGameState.location}</span>
                    </div>
                  )}
             </div>
             {/* Right Aligned: Turn Counter */}
             {(gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && (
                <div className="absolute top-3 right-4"> {/* Position absolutely right */}
                    {renderTurnCounter()}
                </div>
             )}
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
              {/* Only render choices/input if game is active */}
              {gameState.currentView === 'game_active' && !gameState.isLoading && renderChoicesAndInput()}
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

         {/* Footer appears only when game is active or ended */}
         {(gameState.currentView === 'game_active' || gameState.currentView === 'game_ended') && gameState.story.length > 0 && (
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

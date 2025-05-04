
import React from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import type { GameStateToSave } from '@/lib/saveLoadUtils'; // Keep this import
import { themes } from '@/config/themes'; // Import themes to get subtheme labels

// Define the type for saved games list locally or import if shared
interface SavedGameInfo extends Omit<GameStateToSave, 'story' | 'choices' | 'currentGameState' | 'playerChoicesHistory'> {
    // Only need fields relevant for display in the list
    saveName: string;
    playerName?: string; // Optional if playerName is part of GameStateToSave
    theme: string;      // Keep theme mandatory for display
    subTheme: string | null; // Include subTheme
    timestamp: number;
    currentTurn: number;
    maxTurns: number;
}

interface LoadGameProps {
    savedGames: SavedGameInfo[]; // Use the minimal type for display
    onLoadGame: (saveName: string) => void;
    onDeleteGame: (saveName: string) => void;
    onBack: () => void;
}

const LoadGame: React.FC<LoadGameProps> = ({ savedGames, onLoadGame, onDeleteGame, onBack }) => {

    // Helper function to get subtheme label
    const getSubThemeLabel = (themeValue: string, subThemeValue: string | null): string => {
        if (!subThemeValue) return 'N/A';
        const mainTheme = themes.find(t => t.value === themeValue);
        const subTheme = mainTheme?.subThemes.find(st => st.value === subThemeValue);
        return subTheme?.label || subThemeValue; // Fallback to value if label not found
    };


    return (
        <div className="flex flex-col items-center space-y-4 w-full h-full justify-center">
            <h2 className="text-2xl font-semibold mb-4">Charger une Partie</h2>
            {savedGames.length > 0 ? (
                <ScrollAreaPrimitive.Root className="w-full max-w-2xl h-[300px] rounded-md border">
                    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] p-4">
                        <ul className="space-y-3">
                            {savedGames.map((save) => (
                                <li key={save.saveName} className="flex items-center justify-between gap-2 p-3 rounded-md bg-card hover:bg-accent/50 transition-colors">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-medium truncate">{save.saveName}</p>
                                        <p className="text-xs text-muted-foreground truncate"> {/* Added truncate here too */}
                                            {save.playerName ? `${save.playerName} - ` : ''}
                                            {getSubThemeLabel(save.theme, save.subTheme)} - T{save.currentTurn}/{save.maxTurns} - {new Date(save.timestamp).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button size="sm" onClick={() => onLoadGame(save.saveName)} variant="secondary">Charger</Button>
                                        <Button size="sm" variant="destructive" onClick={() => onDeleteGame(save.saveName)} aria-label={`Supprimer la sauvegarde ${save.saveName}`}>
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
            <Button variant="outline" onClick={onBack} className="mt-4">
                Retour au Menu Principal
            </Button>
        </div>
    );
};

export default LoadGame;

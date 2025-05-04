
import React from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import type { GameStateToSave } from '@/lib/saveLoadUtils'; // Keep this import

// Define the type for saved games list locally or import if shared
interface SavedGameInfo extends Omit<GameStateToSave, 'story' | 'choices' | 'currentGameState' | 'playerChoicesHistory'> {
    // Only need fields relevant for display in the list
    saveName: string;
    playerName?: string; // Optional if playerName is part of GameStateToSave
    theme?: string;      // Optional
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
                                        <p className="text-xs text-muted-foreground">
                                            {save.playerName ? `${save.playerName} - ` : ''}
                                            {save.theme} - T{save.currentTurn}/{save.maxTurns} - {new Date(save.timestamp).toLocaleString('fr-FR')}
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

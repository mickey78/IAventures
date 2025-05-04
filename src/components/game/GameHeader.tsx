
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import InventoryPopover from './InventoryPopover'; // Assuming InventoryPopover is refactored
import TurnCounter from './TurnCounter'; // Assuming TurnCounter is refactored
import HeaderActions from './HeaderActions'; // Assuming HeaderActions is refactored
import { BookOpenText, MapPin } from 'lucide-react';
import type { ParsedGameState, GameView } from '@/types/game'; // Import shared types

interface GameHeaderProps {
    currentView: GameView;
    theme: string | null;
    playerName: string | null;
    location: string | undefined;
    inventory: string[];
    currentTurn: number;
    maxTurns: number;
    isLoading: boolean;
    isInventoryOpen: boolean;
    onInventoryToggle: (isOpen: boolean) => void;
    onInventoryAction: (actionPrefix: string, item: string) => void;
    onSave: () => void;
    onMainMenu: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
    currentView,
    theme,
    playerName,
    location,
    inventory,
    currentTurn,
    maxTurns,
    isLoading,
    isInventoryOpen,
    onInventoryToggle,
    onInventoryAction,
    onSave,
    onMainMenu,
}) => {

    const getHeaderText = () => {
        switch (currentView) {
            case 'game_active':
                return theme && playerName ? `Aventure de ${playerName} : ${theme}` : "Aventure en cours";
            case 'game_ended':
                return theme && playerName ? `Aventure terminée de ${playerName} : ${theme}` : "Aventure terminée";
            case 'theme_selection':
                return "Choisissez un thème pour votre nouvelle aventure ! (8-12 ans)";
            case 'name_input':
                return "Prépare-toi pour l'aventure !";
            case 'loading_game':
                return "Choisissez une partie à charger.";
            case 'menu':
            default:
                return "Bienvenue ! Commencez une nouvelle aventure ou chargez une partie.";
        }
    };

    const showGameControls = ['game_active', 'game_ended'].includes(currentView);

    return (
        <CardHeader className="relative text-center flex-shrink-0 pt-4 pb-2 flex items-center justify-between border-b border-border">
            {/* Left Aligned: Inventory Button (only visible in game) */}
            <div className="absolute top-3 left-4">
                {showGameControls && (
                    <InventoryPopover
                        inventory={inventory}
                        isOpen={isInventoryOpen}
                        onOpenChange={onInventoryToggle}
                        onActionClick={onInventoryAction}
                        isLoading={isLoading}
                        isGameEnded={currentView === 'game_ended'}
                    />
                )}
            </div>

            {/* Centered: Title, Description, Location */}
            <div className="flex-1 flex flex-col items-center mx-auto px-16"> {/* Added padding to avoid overlap */}
                <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                    <BookOpenText className="h-8 w-8 text-primary" />
                    IAventures
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                    {getHeaderText()}
                </CardDescription>
                {/* Current Location Display */}
                {showGameControls && location && (
                    <div className="mt-1 text-sm text-accent-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-accent" />
                        Lieu: <span className="font-medium">{location}</span>
                    </div>
                )}
            </div>

            {/* Right Aligned: Turn Counter and Action Buttons */}
            {showGameControls && (
                <div className="absolute top-3 right-4 flex flex-col items-end space-y-2">
                    <TurnCounter currentTurn={currentTurn} maxTurns={maxTurns} />
                    <HeaderActions onSave={onSave} onMainMenu={onMainMenu} isLoading={isLoading || currentView === 'game_ended'} />
                </div>
            )}
        </CardHeader>
    );
};

export default GameHeader;

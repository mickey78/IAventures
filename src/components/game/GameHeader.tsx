
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import InventoryPopover from './InventoryPopover'; // Assuming InventoryPopover is refactored
import TurnCounter from './TurnCounter'; // Assuming TurnCounter is refactored
import HeaderActions from './HeaderActions'; // Assuming HeaderActions is refactored
import { BookOpenText, MapPin } from 'lucide-react';
import type { ParsedGameState, GameView } from '@/types/game'; // Import shared types
import { themes } from '@/config/themes'; // Import themes to get labels

interface GameHeaderProps {
    currentView: GameView;
    theme: string | null;
    subTheme: string | null; // Added subTheme prop
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
    shouldFlashInventory: boolean; // Added prop for flashing effect
}

const GameHeader: React.FC<GameHeaderProps> = ({
    currentView,
    theme,
    subTheme, // Destructure subTheme
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
    shouldFlashInventory, // Destructure flashing prop
}) => {

    const getHeaderText = () => {
        let mainTitle = "Bienvenue ! Commencez une nouvelle aventure ou chargez une partie.";
        let subTitle = "";

        const mainThemeLabel = themes.find(t => t.value === theme)?.label;
        const subThemeLabel = themes.find(t => t.value === theme)?.subThemes.find(st => st.value === subTheme)?.label;


        switch (currentView) {
            case 'game_active':
                mainTitle = playerName ? `Aventure de ${playerName}` : "Aventure en cours";
                subTitle = mainThemeLabel ? `${mainThemeLabel}${subThemeLabel ? `: ${subThemeLabel}` : ''}` : '';
                 break;
            case 'game_ended':
                 mainTitle = playerName ? `Aventure terminée de ${playerName}` : "Aventure terminée";
                 subTitle = mainThemeLabel ? `${mainThemeLabel}${subThemeLabel ? `: ${subThemeLabel}` : ''}` : '';
                break;
            case 'theme_selection':
                mainTitle = "Choisissez un thème pour votre nouvelle aventure !";
                subTitle= "(8-12 ans)";
                break;
             case 'sub_theme_selection':
                 mainTitle = `Choisissez un scénario pour "${mainThemeLabel || 'Thème Inconnu'}"`;
                 break;
            case 'name_input':
                mainTitle = "Prépare-toi pour l'aventure !";
                subTitle = mainThemeLabel && subThemeLabel ? `${mainThemeLabel} - ${subThemeLabel}` : '';
                break;
            case 'loading_game':
                mainTitle = "Choisissez une partie à charger.";
                break;
            case 'menu':
            default:
                 // Default title is already set
                 break;
        }
        return { mainTitle, subTitle };
    };

    const { mainTitle, subTitle } = getHeaderText();
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
                        shouldFlash={shouldFlashInventory} // Pass the flashing state
                    />
                )}
            </div>

            {/* Centered: Title, Description, Location */}
            <div className="flex-1 flex flex-col items-center mx-auto px-16"> {/* Added padding to avoid overlap */}
                <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                    <BookOpenText className="h-8 w-8 text-primary" />
                    IAventures
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1 text-center">
                     {mainTitle}
                     {subTitle && <span className="block text-xs">{subTitle}</span>}
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

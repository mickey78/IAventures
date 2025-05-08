
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import InventoryPopover from './InventoryPopover'; // Assuming InventoryPopover is refactored
import AbilitiesPopover from './AbilitiesPopover'; // Import AbilitiesPopover
import TurnCounter from './TurnCounter'; // Assuming TurnCounter is refactored
import HeaderActions from './HeaderActions'; // Assuming HeaderActions is refactored
import { BookOpenText, MapPin, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon
import type { GameView, HeroAbility, InventoryItem, ThemeValue } from '@/types/game'; // Import shared types, add HeroAbility, InventoryItem
import { themes } from '@/config/themes'; // Import themes to get labels
import { themedHeroOptions, defaultHeroOptions } from '@/config/heroes'; // Import themed heroes
import { ThemeSwitcher } from '@/components/theme-switcher'; // Import ThemeSwitcher for primary colors
import { ThemeToggle } from '@/components/ThemeToggle'; // Import ThemeToggle for light/dark mode
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select components
import { imageStyles, defaultImageStyle, type ImageStyle } from '@/config/imageStyles'; // Added image styles config

interface GameHeaderProps {
    currentView: GameView;
    theme: ThemeValue | null;
    subTheme: string | null; // Added subTheme prop
    selectedHero: string | null; // Added selectedHero prop
    playerName: string | null;
    location: string | undefined;
    inventory: InventoryItem[]; // Changed to InventoryItem[]
    abilities: HeroAbility[]; // Added abilities prop
    currentTurn: number;
    maxTurns: number;
    isLoading: boolean;
    isInventoryOpen: boolean;
    onInventoryToggle: (isOpen: boolean) => void;
    onInventoryAction: (actionPrefix: string, item: string) => void;
    isAbilitiesOpen: boolean; // Added abilities state prop
    onAbilitiesToggle: (isOpen: boolean) => void; // Added abilities toggle handler
    onAbilityAction: (ability: HeroAbility) => void; // Added ability action handler
    onSave: () => void;
    onMainMenu: () => void;
    shouldFlashInventory: boolean; // Added prop for flashing effect
    selectedImageStyle: string | null | undefined;
    onImageStyleChange: (style: string) => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
    currentView,
    theme,
    subTheme, // Destructure subTheme
    selectedHero, // Destructure selectedHero
    playerName,
    location,
    inventory,
    abilities, // Destructure abilities
    currentTurn,
    maxTurns,
    isLoading,
    isInventoryOpen,
    onInventoryToggle,
    onInventoryAction,
    isAbilitiesOpen, // Destructure abilities state
    onAbilitiesToggle, // Destructure abilities toggle handler
    onAbilityAction, // Destructure ability action handler
    onSave,
    onMainMenu,
    shouldFlashInventory, // Destructure flashing prop
    selectedImageStyle,
    onImageStyleChange,
}) => {

    const getHeaderText = () => {
        let mainTitle = "Bienvenue ! Commencez une nouvelle aventure ou chargez une partie.";
        let subTitle = "";

        const mainThemeLabel = themes.find(t => t.value === theme)?.label;
        const subThemeLabel = theme ? themes.find(t => t.value === theme)?.subThemes.find(st => st.value === subTheme)?.label : undefined;
        
        let heroLabel: string | undefined = undefined;
        if (theme && selectedHero) {
            const heroesForTheme = themedHeroOptions[theme as ThemeValue] || defaultHeroOptions;
            heroLabel = heroesForTheme.find(h => h.value === selectedHero)?.label;
        }


        switch (currentView) {
            case 'game_active':
            case 'game_ended':
                mainTitle = playerName ? `Aventure de ${playerName}` : "Aventure en cours";
                const themePart = mainThemeLabel ? `${mainThemeLabel}${subThemeLabel ? `: ${subThemeLabel}` : ''}` : 'Thème inconnu';
                const heroPart = heroLabel ? `en tant que ${heroLabel}` : '';
                subTitle = `${themePart} ${heroPart}`.trim();
                if (currentView === 'game_ended') mainTitle = mainTitle.replace('en cours', 'terminée');
                 break;
            case 'theme_selection':
                mainTitle = "Choisissez un thème pour votre nouvelle aventure !";
                subTitle= "(8-12 ans)";
                break;
             case 'sub_theme_selection':
                 mainTitle = `Choisissez un scénario pour "${mainThemeLabel || 'Thème Inconnu'}"`;
                 break;
             case 'hero_selection': // Added case for hero selection
                 mainTitle = `Choisissez votre classe de héros pour "${mainThemeLabel || 'Thème Inconnu'}"`;
                 subTitle = subThemeLabel || 'Sans Scénario Spécifique';
                 break;
            case 'name_input':
                mainTitle = "Prépare-toi pour l'aventure !";
                // Ensure subThemeLabel and heroLabel are handled if null
                const effectiveSubThemeLabel = subThemeLabel || 'Sans Scénario Spécifique';
                const effectiveHeroLabel = heroLabel || 'Héros Inconnu';
                subTitle = mainThemeLabel ? `${mainThemeLabel} - ${effectiveSubThemeLabel} (${effectiveHeroLabel})` : '';
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
            {/* Left Aligned: Inventory & Abilities Buttons (only visible in game) */}
            <div className="absolute top-3 left-4 flex flex-col items-start space-y-1"> {/* Changed to flex-col and space-y-1 */}
                {showGameControls && (
                    <>
                        <InventoryPopover
                            inventory={inventory}
                            isOpen={isInventoryOpen}
                            onOpenChange={onInventoryToggle}
                            onActionClick={onInventoryAction}
                            isLoading={isLoading}
                            isGameEnded={currentView === 'game_ended'}
                            shouldFlash={shouldFlashInventory} // Pass the flashing state
                        />
                        <AbilitiesPopover
                            abilities={abilities}
                            isOpen={isAbilitiesOpen}
                            onOpenChange={onAbilitiesToggle}
                            onActionClick={onAbilityAction}
                            isLoading={isLoading}
                            isGameEnded={currentView === 'game_ended'}
                        />
                    </>
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
             <div className="absolute top-3 right-4 flex flex-col items-end space-y-2">
                {showGameControls && (
                    <>
                        <TurnCounter currentTurn={currentTurn} maxTurns={maxTurns} />
                         <div className="flex items-center gap-2">
                            <HeaderActions onSave={onSave} onMainMenu={onMainMenu} isLoading={isLoading || currentView === 'game_ended'} />
                            <Select value={selectedImageStyle ?? defaultImageStyle} onValueChange={onImageStyleChange}>
                                <SelectTrigger className="w-[150px] h-9" aria-label="Style d'image">
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Style d'image" />
                                </SelectTrigger>
                                <SelectContent>
                                    {imageStyles.map((style: ImageStyle) => (
                                        <SelectItem key={style.value} value={style.value}>
                                            {style.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <ThemeSwitcher /> {/* Primary color theme switcher */}
                            <ThemeToggle /> {/* Light/Dark/System theme toggle */}
                        </div>
                    </>
                )}
                 {/* Fallback ThemeSwitchers for non-game views */}
                 {currentView !== 'game_active' && currentView !== 'game_ended' && currentView !== 'menu' && (
                     <div className="flex items-center gap-2">
                        <Select value={selectedImageStyle ?? defaultImageStyle} onValueChange={onImageStyleChange}>
                            <SelectTrigger className="w-[150px] h-9" aria-label="Style d'image">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Style d'image" />
                            </SelectTrigger>
                            <SelectContent>
                                {imageStyles.map((style: ImageStyle) => (
                                    <SelectItem key={style.value} value={style.value}>
                                        {style.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <ThemeSwitcher />
                        <ThemeToggle />
                     </div>
                 )}
                 {currentView === 'menu' && (
                    <div className="flex items-center gap-2">
                        <Select value={selectedImageStyle ?? defaultImageStyle} onValueChange={onImageStyleChange}>
                            <SelectTrigger className="w-[150px] h-9" aria-label="Style d'image">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Style d'image" />
                            </SelectTrigger>
                            <SelectContent>
                                {imageStyles.map((style: ImageStyle) => (
                                    <SelectItem key={style.value} value={style.value}>
                                        {style.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <ThemeSwitcher />
                        <ThemeToggle />
                    </div>
                 )}
            </div>
        </CardHeader>
    );
};

export default GameHeader;

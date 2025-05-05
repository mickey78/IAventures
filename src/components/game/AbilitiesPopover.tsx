
import React from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from 'lucide-react'; // Use Sparkles or another relevant icon
import type { HeroAbility } from '@/types/game'; // Import HeroAbility type

interface AbilitiesPopoverProps {
    abilities: HeroAbility[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onActionClick: (ability: HeroAbility) => void; // Callback when ability is clicked
    isLoading: boolean;
    isGameEnded: boolean;
}

const AbilitiesPopover: React.FC<AbilitiesPopoverProps> = ({
    abilities,
    isOpen,
    onOpenChange,
    onActionClick,
    isLoading,
    isGameEnded,
}) => {
    const isDisabled = isLoading || isGameEnded;

    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="secondary" // Or choose another variant
                    size="sm"
                    className="shrink-0"
                    disabled={isDisabled || abilities.length === 0}
                >
                    <Sparkles className="mr-2 h-4 w-4" /> {/* Icon for the button */}
                    Habiletés ({abilities.length})
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
                <TooltipProvider delayDuration={300}>
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none text-center pb-2">Habiletés du Héros</h4>
                        {abilities.length > 0 ? (
                            <ScrollAreaPrimitive.Root className="max-h-60 w-full">
                                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] p-1">
                                    <ul className="text-sm space-y-2">
                                        {abilities.map((ability, index) => {
                                            const AbilityIcon = ability.icon; // Get the icon component
                                            return (
                                                <li key={index} className="flex items-center justify-between gap-1 border-b border-border pb-1 last:border-b-0 last:pb-0">
                                                    <div className="flex items-center gap-1.5 flex-1">
                                                        <AbilityIcon className="h-4 w-4 text-primary shrink-0" />
                                                        <span className="font-medium truncate" title={ability.label}>
                                                            {ability.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => onActionClick(ability)}
                                                                    disabled={isDisabled}
                                                                >
                                                                    {/* Use a general "use" icon or the ability's icon again */}
                                                                    <Sparkles className="h-4 w-4" />
                                                                    <span className="sr-only">Utiliser {ability.label}</span>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">Utiliser</TooltipContent>
                                                        </Tooltip>
                                                        {/* Add other actions like "Inspecter Habileté" if needed */}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </ScrollAreaPrimitive.Viewport>
                                <ScrollBar />
                                <ScrollAreaPrimitive.Corner />
                            </ScrollAreaPrimitive.Root>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">Aucune habileté spéciale pour ce héros.</p>
                        )}
                    </div>
                </TooltipProvider>
            </PopoverContent>
        </Popover>
    );
};

export default AbilitiesPopover;

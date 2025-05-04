
import React from 'react';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Briefcase, Eye, Wand2, MoveUpRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn

interface InventoryPopoverProps {
    inventory: string[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onActionClick: (actionPrefix: string, item: string) => void;
    isLoading: boolean;
    isGameEnded: boolean;
    shouldFlash: boolean; // Added prop for flashing effect
}

const InventoryPopover: React.FC<InventoryPopoverProps> = ({
    inventory,
    isOpen,
    onOpenChange,
    onActionClick,
    isLoading,
    isGameEnded,
    shouldFlash // Destructure flashing prop
}) => {
    const isDisabled = isLoading || isGameEnded;

    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className={cn(
                        "shrink-0",
                        shouldFlash && "animate-flash-orange" // Conditionally apply animation class
                    )}
                    disabled={isDisabled || inventory.length === 0}
                >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Inventaire ({inventory.length})
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
                <TooltipProvider delayDuration={300}>
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none text-center pb-2">Inventaire</h4>
                        {inventory.length > 0 ? (
                            <ScrollAreaPrimitive.Root className="max-h-60 w-full">
                                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] p-1">
                                    <ul className="text-sm space-y-2">
                                        {inventory.map((item, index) => (
                                            <li key={index} className="flex items-center justify-between gap-1 border-b border-border pb-1 last:border-b-0 last:pb-0">
                                                <span className="flex-1 font-medium truncate" title={item}>
                                                    {item}
                                                </span>
                                                <div className="flex gap-1 shrink-0">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                onClick={() => onActionClick('Inspecter', item)}
                                                                disabled={isDisabled}
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
                                                                onClick={() => onActionClick('Utiliser', item)}
                                                                disabled={isDisabled}
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
                                                                onClick={() => onActionClick('Lancer', item)}
                                                                disabled={isDisabled}
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
                                                                onClick={() => onActionClick('Se débarrasser de', item)}
                                                                disabled={isDisabled}
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
};

export default InventoryPopover;

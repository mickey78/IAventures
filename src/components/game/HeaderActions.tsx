
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, Home } from 'lucide-react';

interface HeaderActionsProps {
    onSave: () => void;
    onMainMenu: () => void;
    isLoading: boolean; // Includes game ended state for disabling save
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ onSave, onMainMenu, isLoading }) => {
    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex gap-2"> {/* Container for icon buttons */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="h-8 w-8"
                            onClick={onSave}
                            disabled={isLoading} // Disable if loading or game ended
                        >
                            <Save className="h-4 w-4" />
                            <span className="sr-only">Sauvegarder</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Sauvegarder</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="h-8 w-8"
                            onClick={onMainMenu}
                        >
                            <Home className="h-4 w-4" />
                            <span className="sr-only">Menu Principal</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Menu Principal</TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
};

export default HeaderActions;

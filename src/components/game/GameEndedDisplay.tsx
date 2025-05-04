
import React from 'react';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

interface GameEndedDisplayProps {
    maxTurns: number;
    finalLocation: string | undefined;
    onMainMenu: () => void;
}

const GameEndedDisplay: React.FC<GameEndedDisplayProps> = ({ maxTurns, finalLocation, onMainMenu }) => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-4 mt-4 bg-muted rounded-md flex-shrink-0">
            <History className="h-8 w-8 mb-2 text-primary" />
            <p className="font-semibold text-lg">Fin de l'Aventure</p>
            <p className="text-sm text-muted-foreground">
                Votre histoire s'est conclue après {maxTurns} tours.
                {finalLocation && ` Vous terminez à : ${finalLocation}.`}
            </p>
            <Button variant="primary" size="sm" onClick={onMainMenu} className="mt-4">
                Retour au Menu Principal
            </Button>
        </div>
    );
};

export default GameEndedDisplay;


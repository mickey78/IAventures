
import React from 'react';
import { Repeat } from 'lucide-react';

interface TurnCounterProps {
    currentTurn: number;
    maxTurns: number;
}

const TurnCounter: React.FC<TurnCounterProps> = ({ currentTurn, maxTurns }) => {
    // Clamp currentTurn display if it exceeds maxTurns (e.g., on game end screen)
    const displayTurn = Math.min(currentTurn, maxTurns);

    return (
        <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border text-sm text-muted-foreground shadow-sm flex items-center gap-1.5">
            <Repeat className="h-4 w-4" />
            Tour: <span className="font-semibold text-foreground">{displayTurn}</span> / {maxTurns}
        </div>
    );
};

export default TurnCounter;

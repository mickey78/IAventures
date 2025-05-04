
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, FolderOpen } from 'lucide-react';

interface MainMenuProps {
    onNewGame: () => void;
    onLoadGame: () => void;
    hasSavedGames: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ onNewGame, onLoadGame, hasSavedGames }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-4 h-full">
            <h2 className="text-2xl font-semibold">Menu Principal</h2>
            <Button onClick={onNewGame} size="lg" className="w-60" variant="primary">
                <PlusCircle className="mr-2 h-5 w-5" /> Nouvelle Partie
            </Button>
            <Button onClick={onLoadGame} size="lg" className="w-60" variant="secondary" disabled={!hasSavedGames}>
                <FolderOpen className="mr-2 h-5 w-5" /> Charger une Partie
            </Button>
            {!hasSavedGames && <p className="text-sm text-muted-foreground">Aucune partie sauvegardée.</p>}
        </div>
    );
};

export default MainMenu;

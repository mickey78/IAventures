
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader, Wand2 } from 'lucide-react';

interface NameInputProps {
    playerName: string;
    onPlayerNameChange: (name: string) => void;
    maxTurns: number;
    onMaxTurnsChange: (turns: number) => void;
    onSubmit: () => void;
    onBack: () => void;
    isLoading: boolean;
}

const NameInput: React.FC<NameInputProps> = ({
    playerName,
    onPlayerNameChange,
    maxTurns,
    onMaxTurnsChange,
    onSubmit,
    onBack,
    isLoading
}) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md h-full">
            <Label htmlFor="playerName" className="text-xl font-semibold text-center">Comment t'appelles-tu, aventurier(ère) ?</Label>
            <Input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => onPlayerNameChange(e.target.value)}
                placeholder="Entre ton nom ici"
                className="text-center w-full"
                maxLength={50}
                autoFocus
            />
            <div className="w-full space-y-3">
                <Label htmlFor="maxTurns" className="text-center block">Nombre de tours souhaités : <span className="font-bold text-primary">{maxTurns}</span></Label>
                <Slider
                    id="maxTurns"
                    min={10}
                    max={25}
                    step={1}
                    value={[maxTurns]}
                    onValueChange={(value) => onMaxTurnsChange(value[0])}
                    className="w-full"
                    aria-label={`Nombre de tours souhaités: ${maxTurns}`}
                />
            </div>
            <Button
                onClick={onSubmit}
                disabled={!playerName.trim() || isLoading}
                size="lg"
                variant="primary"
                className="rounded-md shadow-md w-full"
            >
                {isLoading ? (
                    <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Préparation...
                    </>
                ) : (
                    <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Commencer l'Aventure
                    </>
                )}
            </Button>
            <Button variant="outline" onClick={onBack} className="mt-2 w-full">
                Retour au choix du thème
            </Button>
        </div>
    );
};

export default NameInput;


import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, Edit } from 'lucide-react';

interface ActionInputProps {
    choices: string[];
    customChoiceInput: string;
    onCustomChoiceChange: (value: string) => void;
    onCustomChoiceSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onAction: (actionText: string) => void;
    isLoading: boolean;
    isCustomInputVisible: boolean;
    onToggleCustomInput: () => void;
    customInputRef: React.RefObject<HTMLInputElement>;
}

const ActionInput: React.FC<ActionInputProps> = ({
    choices,
    customChoiceInput,
    onCustomChoiceChange,
    onCustomChoiceSubmit,
    onAction,
    isLoading,
    isCustomInputVisible,
    onToggleCustomInput,
    customInputRef
}) => {
    return (
        <div className="flex-shrink-0 pb-2 flex flex-col gap-2">
            {/* Predefined Choices */}
            {choices.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                    {choices.map((choice, index) => (
                        <Button
                            key={index}
                            onClick={() => onAction(choice)}
                            disabled={isLoading}
                            variant="primary" // Use primary for main choices
                            className="flex-grow sm:flex-grow-0"
                            aria-label={`Faire le choix : ${choice}`}
                        >
                            {choice}
                        </Button>
                    ))}
                    {/* Button to toggle custom input */}
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={onToggleCustomInput}
                                    disabled={isLoading}
                                    aria-label={isCustomInputVisible ? "Masquer l'entrée personnalisée" : "Afficher l'entrée personnalisée"}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {isCustomInputVisible ? "Masquer l'entrée personnalisée" : "Écrire une action personnalisée"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            {/* Custom Choice Input - Conditionally rendered */}
            {isCustomInputVisible && (
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-lg mx-auto items-center justify-center mt-2">
                    <form onSubmit={onCustomChoiceSubmit} className="flex-grow flex gap-2 w-full sm:w-auto">
                        <Input
                            ref={customInputRef}
                            type="text"
                            value={customChoiceInput}
                            onChange={(e) => onCustomChoiceChange(e.target.value)}
                            placeholder="Que faites-vous ? (ou utilisez un objet)"
                            className="flex-grow"
                            disabled={isLoading}
                            aria-label="Entrez votre propre action ou utilisez un objet"
                        />
                        <Button type="submit" disabled={isLoading || !customChoiceInput.trim()} size="icon" variant="primary">
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Envoyer</span>
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ActionInput;

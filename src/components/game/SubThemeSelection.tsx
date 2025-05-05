
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Theme } from '@/types/game'; // Import shared types
import { Zap } from 'lucide-react'; // Import an icon for the skip button

interface SubThemeSelectionProps {
    mainTheme: Theme | undefined; // The main theme containing sub-themes
    selectedSubTheme: string | null;
    onSubThemeSelect: (subThemeValue: string | null) => void; // Allow null for skipping
    onNext: () => void; // Proceed to name input
    onBack: () => void; // Go back to main theme selection
}

const SubThemeSelection: React.FC<SubThemeSelectionProps> = ({
    mainTheme,
    selectedSubTheme,
    onSubThemeSelect,
    onNext,
    onBack
}) => {
    if (!mainTheme) {
        return <p className="text-destructive text-center">Erreur: Thème principal non trouvé.</p>; // Handle missing theme
    }

    const handleSkip = () => {
        onSubThemeSelect(null); // Indicate skipping
        onNext(); // Directly proceed to next step
    };

    return (
        <div className="flex flex-col items-center space-y-4 w-full h-full"> {/* Reduced space-y */}
            <p className="text-xl font-semibold text-center shrink-0">Choisissez un scénario pour "{mainTheme.label}" :</p>

            {/* Skip Button */}
            <Button
                variant="secondary"
                className="w-full max-w-md mb-4" // Full width up to md
                onClick={handleSkip}
            >
                <Zap className="mr-2 h-4 w-4" />
                Commencer sans scénario spécifique (Surprise !)
            </Button>

            <ScrollArea className="flex-grow w-full max-w-5xl pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mainTheme.subThemes.map((subTheme) => {
                        const Icon = subTheme.icon; // Get the icon component
                        const isSelected = selectedSubTheme === subTheme.value;
                        return (
                            <Card
                                key={subTheme.value}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary flex flex-col h-full", // Added h-full
                                    isSelected ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border hover:bg-accent/50'
                                )}
                                onClick={() => onSubThemeSelect(subTheme.value)}
                                role="button"
                                aria-pressed={isSelected}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSubThemeSelect(subTheme.value); }}
                            >
                                <CardHeader className="items-center text-center pb-2">
                                    <Icon className="h-8 w-8 mb-2 text-primary" /> {/* Display the icon */}
                                    <CardTitle className="text-lg">{subTheme.label}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center text-sm text-muted-foreground pt-0 pb-4 flex-grow"> {/* Added flex-grow */}
                                    {subTheme.prompt}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 shrink-0"> {/* Reduced mt */}
                {/* Keep the "Suivant" button but it's less necessary if Skip goes directly */}
                 <Button
                    onClick={onNext}
                    disabled={selectedSubTheme === null} // Only enabled if a specific scenario is selected
                    size="lg"
                    variant="primary"
                    className="rounded-md shadow-md"
                >
                    Suivant (Scénario Choisi)
                </Button>
                <Button variant="outline" onClick={onBack}>
                    Retour au choix du Thème
                </Button>
            </div>
        </div>
    );
};

export default SubThemeSelection;


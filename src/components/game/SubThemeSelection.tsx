
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Theme } from '@/types/game'; // Import shared types

interface SubThemeSelectionProps {
    mainTheme: Theme | undefined; // The main theme containing sub-themes
    selectedSubTheme: string | null;
    onSubThemeSelect: (subThemeValue: string) => void;
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

    return (
        <div className="flex flex-col items-center space-y-6 w-full h-full">
            <p className="text-xl font-semibold text-center shrink-0">Choisissez un scénario pour "{mainTheme.label}" :</p>
            <ScrollArea className="flex-grow w-full max-w-5xl pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mainTheme.subThemes.map((subTheme) => {
                        const isSelected = selectedSubTheme === subTheme.value;
                        return (
                            <Card
                                key={subTheme.value}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary flex flex-col", // Added flex flex-col
                                    isSelected ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border hover:bg-accent/50'
                                )}
                                onClick={() => onSubThemeSelect(subTheme.value)}
                                role="button"
                                aria-pressed={isSelected}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSubThemeSelect(subTheme.value); }}
                            >
                                <CardHeader className="items-center text-center pb-2">
                                    {/* Optional: Could add sub-theme specific icons later */}
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
            <div className="flex flex-col sm:flex-row gap-2 mt-6 shrink-0">
                <Button
                    onClick={onNext}
                    disabled={!selectedSubTheme}
                    size="lg"
                    variant="primary"
                    className="rounded-md shadow-md"
                >
                    Suivant
                </Button>
                <Button variant="outline" onClick={onBack}>
                    Retour au choix du Thème
                </Button>
            </div>
        </div>
    );
};

export default SubThemeSelection;

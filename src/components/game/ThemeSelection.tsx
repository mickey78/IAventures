
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Theme } from '@/types/game'; // Import shared types

interface ThemeSelectionProps {
    themes: Theme[];
    selectedTheme: string | null;
    onThemeSelect: (themeValue: string) => void;
    onNext: () => void;
    onBack: () => void;
}

const ThemeSelection: React.FC<ThemeSelectionProps> = ({ themes, selectedTheme, onThemeSelect, onNext, onBack }) => {
    return (
        <div className="flex flex-col items-center space-y-6 w-full h-full">
            <p className="text-xl font-semibold text-center shrink-0">Choisissez votre univers d'aventure :</p>
            <ScrollArea className="flex-grow w-full max-w-5xl pr-4"> {/* Wrap grid in ScrollArea */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {themes.map((theme) => {
                        const Icon = theme.icon;
                        const isSelected = selectedTheme === theme.value;
                        return (
                            <Card
                                key={theme.value}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary",
                                    isSelected ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border hover:bg-accent/50'
                                )}
                                onClick={() => onThemeSelect(theme.value)}
                                role="button"
                                aria-pressed={isSelected}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onThemeSelect(theme.value); }}
                            >
                                <CardHeader className="items-center text-center pb-2">
                                    <Icon className="h-10 w-10 mb-2 text-primary" />
                                    <CardTitle className="text-lg">{theme.label}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center text-sm text-muted-foreground pt-0 pb-4 min-h-[60px]">
                                    {theme.prompt}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-2 mt-6 shrink-0"> {/* Footer buttons */}
                <Button
                    onClick={onNext}
                    disabled={!selectedTheme}
                    size="lg"
                    variant="primary"
                    className="rounded-md shadow-md"
                >
                    Suivant
                </Button>
                <Button variant="outline" onClick={onBack}>
                    Retour au Menu Principal
                </Button>
            </div>
        </div>
    );
};

export default ThemeSelection;

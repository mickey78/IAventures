
import React from 'react';
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Theme } from '@/types/game'; // Import shared types

interface ThemeSelectionProps {
    themes: Theme[];
    selectedTheme: string | null;
    onThemeSelect: (themeValue: string) => void;
    onNext: (selectedThemeValue: string) => void; // Changed to pass the selected theme value
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
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-hidden group", // Added relative, overflow-hidden, group
                                    "bg-card text-card-foreground", // Use card background and foreground
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary' // Apply primary border and ring when selected
                                        : 'border-border hover:border-accent', // Default border, accent border on hover
                                    "hover:bg-accent/10" // Slight accent background on hover
                                )}
                                onClick={() => onThemeSelect(theme.value)}
                                role="button"
                                aria-pressed={isSelected}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onThemeSelect(theme.value); }}
                            >
                                {/* Background Image Container */}
                                {theme.image && (
                                    <div className="absolute inset-0 z-0">
                                        <Image
                                            // Use placeholder image URL if local image is not available yet or fails to load
                                            src={theme.image || `https://picsum.photos/seed/${theme.value}/400/300`}
                                            alt={`Arrière-plan pour ${theme.label}`}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            style={{ objectFit: 'cover' }}
                                            className="opacity-40 group-hover:opacity-50 transition-opacity duration-300" // Increased opacity slightly
                                            data-ai-hint={`${theme.value.split(' ')[0]} background`} // Add AI hint for picsum
                                            unoptimized // Add unoptimized if using external URLs like picsum often
                                        />
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/50 to-transparent z-10"></div>
                                    </div>
                                )}
                                {/* Content must be relative and have higher z-index */}
                                <div className="relative z-20 flex flex-col h-full">
                                    <CardHeader className="items-center text-center pb-2">
                                        <Icon className="h-10 w-10 mb-2 text-primary drop-shadow-lg" /> {/* Added drop-shadow */}
                                        <CardTitle className="text-lg text-foreground">{theme.label}</CardTitle> {/* Ensure foreground color */}
                                    </CardHeader>
                                    <CardContent className="text-center text-sm text-foreground/90 pt-0 pb-4 min-h-[60px] flex-grow"> {/* Ensure foreground color */}
                                        {theme.description}
                                    </CardContent>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-2 mt-6 shrink-0"> {/* Footer buttons */}
                <Button
                    onClick={() => selectedTheme && onNext(selectedTheme)} // Pass the selected theme value
                    disabled={!selectedTheme}
                    size="lg"
                    variant="primary"
                    className="rounded-md shadow-md"
                >
                    Choisir un Scénario
                </Button>
                <Button variant="outline" onClick={onBack}>
                    Retour au Menu Principal
                </Button>
            </div>
        </div>
    );
};

export default ThemeSelection;


import React from 'react';
import Image from 'next/image';
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
    onNext: () => void; // Proceed to hero selection
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
        onNext(); // Directly proceed to next step (Hero Selection)
    };

    return (
        <div className="flex flex-col items-center space-y-4 w-full h-full"> {/* Reduced space-y */}
            <p className="text-xl font-semibold text-center shrink-0">Choisissez un scénario pour "{mainTheme.label}" :</p>

            {/* Skip Button */}
            <Button
                variant="primary" // Changed variant to primary
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
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col h-full relative overflow-hidden group", // Added relative, overflow-hidden, group
                                    "bg-card text-card-foreground", // Use card background and foreground
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary' // Apply primary border and ring when selected
                                        : 'border-border hover:border-accent', // Default border, accent border on hover
                                    "hover:bg-accent/10" // Slight accent background on hover
                                )}
                                onClick={() => onSubThemeSelect(subTheme.value)}
                                role="button"
                                aria-pressed={isSelected}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSubThemeSelect(subTheme.value); }}
                            >
                                 {/* Background Image Container */}
                                 {subTheme.image && (
                                    <div className="absolute inset-0 z-0">
                                        <Image
                                            // Use placeholder image URL if local image is not available yet or fails to load
                                            src={subTheme.image || `https://picsum.photos/seed/${subTheme.value}/400/300`}
                                            alt={`Arrière-plan pour ${subTheme.label}`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            style={{ objectFit: 'cover' }}
                                            className="opacity-60 group-hover:opacity-70 transition-opacity duration-300" // Adjusted opacity
                                            data-ai-hint={`${subTheme.value.split(' ')[0]} scene`} // Add AI hint for picsum
                                            unoptimized // Add unoptimized if using external URLs like picsum often
                                        />
                                         {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/50 to-transparent z-10"></div>
                                    </div>
                                 )}
                                 {/* Content must be relative and have higher z-index */}
                                <div className="relative z-20 flex flex-col h-full">
                                    <CardHeader className="items-center text-center pb-2">
                                        <Icon className="h-8 w-8 mb-2 text-primary drop-shadow-lg" /> {/* Display the icon, added drop-shadow */}
                                        <CardTitle className="text-lg text-foreground">{subTheme.label}</CardTitle> {/* Ensure foreground color */}
                                    </CardHeader>
                                    <CardContent className="text-center text-sm text-foreground/90 pt-0 pb-4 flex-grow"> {/* Ensure foreground color */}
                                        {subTheme.prompt}
                                    </CardContent>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 shrink-0"> {/* Reduced mt */}
                {/* Keep the "Suivant" button but it's less necessary if Skip goes directly */}
                 <Button
                    onClick={onNext} // Go to Hero Selection
                    disabled={selectedSubTheme === undefined} // Allow proceeding if null (skipped) or a value is selected
                    size="lg"
                    variant="primary"
                    className="rounded-md shadow-md"
                >
                    Choisir un Héros {/* Updated Button Text */}
                </Button>
                <Button variant="outline" onClick={onBack}>
                    Retour au choix du Thème
                </Button>
            </div>
        </div>
    );
};

export default SubThemeSelection;

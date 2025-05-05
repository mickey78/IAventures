
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroClass, HeroOption } from '@/types/game';
import { Separator } from '@/components/ui/separator'; // Import Separator

interface HeroSelectionProps {
    heroes: HeroOption[];
    selectedHero: HeroClass | null;
    onHeroSelect: (heroValue: HeroClass) => void;
    onNext: () => void;
    onBack: () => void;
}

const HeroSelection: React.FC<HeroSelectionProps> = ({ heroes, selectedHero, onHeroSelect, onNext, onBack }) => {
    return (
        <div className="flex flex-col items-center space-y-6 w-full h-full">
            <p className="text-xl font-semibold text-center shrink-0">Choisissez votre classe de héros :</p>
            <ScrollArea className="flex-grow w-full max-w-5xl pr-4">
                {/* Changed grid columns to always be 2 */}
                <div className="grid grid-cols-2 gap-4">
                    {heroes.map((hero) => {
                        const Icon = hero.icon;
                        const isSelected = selectedHero === hero.value;
                        return (
                            <Card
                                key={hero.value}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary flex flex-col h-full", // Added h-full
                                    isSelected ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border hover:bg-accent/50'
                                )}
                                onClick={() => onHeroSelect(hero.value)}
                                role="button"
                                aria-pressed={isSelected}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onHeroSelect(hero.value); }}
                            >
                                <CardHeader className="items-center text-center pb-2">
                                    <Icon className="h-10 w-10 mb-2 text-primary" />
                                    <CardTitle className="text-lg">{hero.label}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center text-sm text-muted-foreground pt-0 pb-4 flex-grow flex flex-col"> {/* Added flex-grow and flex-col */}
                                    <p className="mb-2">{hero.description}</p>
                                    {hero.abilities && hero.abilities.length > 0 && (
                                        <>
                                            <Separator className="my-2 bg-border/50" />
                                            <div className="space-y-1 mt-1 text-left">
                                                {hero.abilities.map((ability, index) => {
                                                     const AbilityIcon = ability.icon;
                                                     return (
                                                         <div key={index} className="flex items-center gap-1.5 text-xs">
                                                             <AbilityIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                                                             <span>{ability.label}</span>
                                                         </div>
                                                     );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-2 mt-6 shrink-0">
                <Button
                    onClick={onNext}
                    disabled={!selectedHero}
                    size="lg"
                    variant="primary"
                    className="rounded-md shadow-md"
                >
                    Suivant
                </Button>
                <Button variant="outline" onClick={onBack}>
                    Retour au choix du scénario
                </Button>
            </div>
        </div>
    );
};

export default HeroSelection;


import React, { useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label"; // Import Label
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { cn } from "@/lib/utils";
import type { HeroClass, HeroOption } from '@/types/game';
import { Separator } from '@/components/ui/separator';
import { Briefcase } from 'lucide-react'; // Importer l'icône Briefcase

interface HeroSelectionProps {
    heroes: HeroOption[];
    selectedHero: HeroClass | null;
    onHeroSelect: (heroValue: HeroClass) => void;
    selectedGender: 'male' | 'female' | null;
    onGenderSelect: (gender: 'male' | 'female') => void;
    onNext: () => void;
    onBack: () => void;
}

const HeroSelection: React.FC<HeroSelectionProps> = ({
    heroes,
    selectedHero,
    onHeroSelect,
    selectedGender,
    onGenderSelect,
    onNext,
    onBack
}) => {
    useEffect(() => {
        if (selectedGender === null) {
            onGenderSelect('male');
        }
    }, [selectedGender, onGenderSelect]);

    return (
        <div className="flex flex-col items-center space-y-6 w-full h-full">
            <p className="text-xl font-semibold text-center shrink-0">Choisissez votre classe de héros :</p>

            {/* Nouveau sélecteur de genre avec Tabs */}
            <div className="flex flex-col items-center space-y-2 shrink-0 my-4">
                <p className="text-lg font-medium">Quel est ton genre ?</p>
                <Tabs
                    defaultValue="male"
                    value={selectedGender || 'male'}
                    onValueChange={(value) => onGenderSelect(value as 'male' | 'female')}
                    className="w-[200px]"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="male" className="data-[state=active]:text-primary">Garçon</TabsTrigger>
                        <TabsTrigger value="female" className="data-[state=active]:text-primary">Fille</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="flex-grow w-full max-w-5xl pr-4">
                <div className="grid grid-cols-2 gap-4">
                    {heroes.map((hero) => {
                        const Icon = hero.icon;
                        const isSelected = selectedHero === hero.value;
                        return (
                            <Card
                                key={hero.value}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary flex flex-col h-full",
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
                                <CardContent className="text-center text-sm text-muted-foreground pt-0 pb-4 flex-grow flex flex-col">
                                    <p className="mb-2">{hero.description}</p>
                                    {hero.abilities && hero.abilities.length > 0 && (
                                        <>
                                            <Separator className="my-2 bg-border/50" />
                                            {/* Ajout du nouveau libellé */}
                                            <p className="text-xs font-medium text-muted-foreground mb-1 text-left">Habiletés de départ :</p>
                                            {/* Modification du conteneur pour l'affichage en ligne */}
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-left">
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
                                    {/* Ajout de l'affichage de l'inventaire de départ */}
                                    {hero.startingInventory && hero.startingInventory.length > 0 && (
                                        <>
                                            <Separator className="my-2 bg-border/50" />
                                            <p className="text-xs font-medium text-muted-foreground mb-1 text-left">Équipement de départ :</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-left">
                                                {hero.startingInventory.map((item, index) => (
                                                    <div key={index} className="flex items-center gap-1.5 text-xs">
                                                        <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <span>{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* L'ancien bloc de sélection de genre a été déplacé et transformé */}

            <div className="flex flex-col sm:flex-row gap-2 mt-6 shrink-0">
                <Button
                    onClick={onNext}
                    disabled={!selectedHero || !selectedGender}
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

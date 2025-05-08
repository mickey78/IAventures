

import React from 'react';
import Image from 'next/image';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button'; // Added import
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from "@/lib/utils";
import { Bot, Smile, Loader, History, ImageOff, ImageIcon, Info, RefreshCw } from 'lucide-react'; // Added ImageIcon, Info, RefreshCw
import type { StorySegment } from '@/types/game'; // Import shared types

interface StoryDisplayProps {
    story: StorySegment[];
    playerName: string | null;
    viewportRef: React.RefObject<HTMLDivElement>;
    isLoading: boolean; // To show the overall loading state
    generatingSegmentId: number | null; // ID of the segment currently generating an image
    onManualImageGeneration: (segmentId: number, segmentText: string) => void; // Callback for manual generation
    onRetryImageGeneration: (segmentId: number) => void; // Callback for retrying generation
    onImageClick: (imageUrl: string | null | undefined, text: string) => void; // Callback for image click
}

// Function to parse segment text and highlight inventory additions
const formatStoryText = (text: string) => {
    const inventoryAddRegex = /(?:Tu as|Vous avez) trouvé.*?(?:ajouté|ajoutée)\s+à\s+ton\s+inventaire\s*!/gi;
    const parts = text.split(inventoryAddRegex);

    return parts.reduce((acc, part, index) => {
        acc.push(part); // Push the non-matching part
        if (index < parts.length - 1) {
            // Find the actual matched text (since split removes it)
            const match = text.substring(acc.map(node => typeof node === 'string' ? node : '').join('').length).match(inventoryAddRegex);
            if (match) {
                acc.push(
                    <strong key={`match-${index}`} className="text-primary font-semibold">
                        {match[0]}
                    </strong>
                );
            }
        }
        return acc;
    }, [] as React.ReactNode[]);
};

const StoryDisplay: React.FC<StoryDisplayProps> = ({
    story,
    playerName,
    viewportRef,
    isLoading,
    generatingSegmentId,
    onManualImageGeneration,
    onRetryImageGeneration, // Destructure retry function
    onImageClick // Destructure image click handler
 }) => {

    const isGeneratingImage = (segmentId: number) => generatingSegmentId === segmentId;

    return (
        <ScrollAreaPrimitive.Root className="relative overflow-hidden flex-1 w-full rounded-md border mb-2 bg-card">
            <ScrollAreaPrimitive.Viewport
                ref={viewportRef}
                className="h-full w-full rounded-[inherit] px-4 py-2 space-y-4"
            >
                {story.map((segment) => (
                    <div
                        key={segment.id}
                        className={cn(
                            "flex flex-col max-w-[90%] sm:max-w-[85%] p-3 rounded-lg shadow",
                            segment.speaker === 'player'
                                ? 'ml-auto bg-primary text-primary-foreground rounded-br-none'
                                : 'mr-auto bg-muted text-muted-foreground rounded-bl-none relative group' // Added relative and group
                        )}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {segment.speaker === 'player' ? (
                                <Smile className="h-4 w-4" />
                            ) : (
                                <Bot className="h-4 w-4" />
                            )}
                            <span className="text-xs font-medium">
                                {segment.speaker === 'player' ? playerName : 'Narrateur'}
                            </span>
                        </div>

                          {/* Manual Image Generation Button */}
                          {/* Remplacer segment.text par segment.content */}
                          {segment.speaker === 'narrator' && !segment.imageUrl && !segment.isGeneratingImage && !segment.imageError && (
                              <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                  onClick={() => onManualImageGeneration(segment.id, segment.content)}
                                  aria-label="Générer une image pour ce passage"
                                  disabled={isGeneratingImage(segment.id)} // Disable if already generating for this segment
                              >
                                 {isGeneratingImage(segment.id) ? (
                                     <Loader className="h-4 w-4 animate-spin" />
                                 ) : (
                                     <ImageIcon className="h-4 w-4" />
                                 )}

                             </Button>
                         )}


                        {/* Image Display */}
                        {/* Remplacer imageIsLoading par isGeneratingImage */}
                        {segment.speaker === 'narrator' && segment.isGeneratingImage && (
                              <div className="mt-2 flex justify-center items-center h-48 bg-muted/50 rounded-md">
                                  <Skeleton className="h-full w-full rounded-md" />
                              </div>
                        )}
                        {segment.speaker === 'narrator' && segment.imageError && (
                             <div className="mt-2 flex flex-col justify-center items-center h-48 bg-destructive/10 rounded-md text-destructive p-2 text-center relative">
                                 <ImageOff className="h-8 w-8 mb-2" />
                                 <p className="text-xs">Erreur de génération d'image.</p>
                                  {/* Retry Button */}
                                 <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute bottom-2 right-2 h-7 px-2 text-xs"
                                    onClick={() => onRetryImageGeneration(segment.id)}
                                    aria-label="Réessayer de générer l'image"
                                 >
                                     <RefreshCw className="h-3 w-3 mr-1" />
                                     Réessayer
                                  </Button>
                              </div>
                         )}
                         {/* Remplacer storyImageUrl par imageUrl, imageIsLoading par isGeneratingImage, segment.text par segment.content */}
                        {segment.speaker === 'narrator' && segment.imageUrl && !segment.isGeneratingImage && !segment.imageError && (
                             <div
                                 className="mt-2 relative aspect-video rounded-md overflow-hidden border border-border cursor-pointer"
                                 onClick={() => onImageClick(segment.imageUrl, segment.content)} // Add onClick handler
                             >
                                 <Image
                                     src={segment.imageUrl}
                                     alt={`Image générée: ${segment.content.substring(0, 50)}...`}
                                     fill
                                     sizes="(max-width: 768px) 90vw, 85vw"
                                    style={{ objectFit: 'cover' }}
                                    priority={story.length > 0 && story[story.length - 1].id === segment.id}
                                    unoptimized // Added to potentially help with very large Base64 strings if needed
                                 />
                             </div>
                         )}

                         {/* Text Content */}
                         {/* Remplacer segment.text par segment.content */}
                         <p className={cn(
                             "whitespace-pre-wrap mt-1",
                             segment.speaker === 'narrator' ? 'text-base' : 'text-sm'
                         )}>
                            {segment.speaker === 'narrator' ? formatStoryText(segment.content) : segment.content}
                         </p>
                     </div>
                ))}
                 {/* Global Loading indicator removed from here, handled in parent */}

            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
 };

 export default StoryDisplay;

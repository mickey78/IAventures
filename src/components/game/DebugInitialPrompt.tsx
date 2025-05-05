
import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Import Button
import { cn } from '@/lib/utils';

interface DebugInitialPromptProps {
  prompt: string | null; // Allow null if no prompt is available
}

const DebugInitialPrompt: React.FC<DebugInitialPromptProps> = ({ prompt }) => {
  const [isOpen, setIsOpen] = useState(false); // Start collapsed

  if (!prompt) {
    return null; // Don't render anything if there's no prompt
  }

  return (
    <div className={cn(
        "flex-shrink-0 mt-2 mb-4 p-2 bg-yellow-900/20 border border-yellow-800/30 rounded-md text-xs text-yellow-400 flex flex-col gap-1.5",
        !isOpen && "overflow-hidden max-h-10" // Limit height when collapsed
    )}>
        <div className="flex items-start justify-between w-full">
            <div className="flex items-start gap-1.5">
                 <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="font-semibold">Prompt Initial (Debug)</p>
            </div>
            <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 text-yellow-400 hover:text-yellow-200 hover:bg-yellow-800/50"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={isOpen ? "Réduire le prompt" : "Développer le prompt"}
            >
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
        </div>
        {isOpen && (
            <pre className="font-mono whitespace-pre-wrap break-words text-[10px] leading-tight mt-1 pl-[22px]"> {/* Indent content */}
                {prompt}
            </pre>
        )}
    </div>
  );
};

export default DebugInitialPrompt;

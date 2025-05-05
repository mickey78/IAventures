
import React from 'react';
import { Info } from 'lucide-react';

interface DebugInitialPromptProps {
  prompt: string;
}

const DebugInitialPrompt: React.FC<DebugInitialPromptProps> = ({ prompt }) => {
  return (
    <div className="flex-shrink-0 mt-2 mb-4 p-2 bg-yellow-900/20 border border-yellow-800/30 rounded-md text-xs text-yellow-400 flex items-start gap-1.5">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold mb-1">Prompt Initial (Debug):</p>
        <pre className="font-mono whitespace-pre-wrap break-words text-[10px] leading-tight">
          {prompt}
        </pre>
      </div>
    </div>
  );
};

export default DebugInitialPrompt;

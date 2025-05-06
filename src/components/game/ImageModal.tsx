
import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'; // Added DialogTitle
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null | undefined;
  text: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, text }) => {
  if (!isOpen || !imageUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="p-0 m-0 max-w-none w-screen h-screen bg-black/90 border-none rounded-none flex flex-col items-center justify-center"
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={onClose} 
      >
        {/* Visually hidden DialogTitle for accessibility */}
        <DialogTitle className="sr-only">Image en plein écran: {text.substring(0, 50)}...</DialogTitle>
        <div className="relative w-[90vw] h-[80vh]">
          <Image
            src={imageUrl}
            alt={`Image en plein écran: ${text.substring(0, 100)}...`}
            fill
            style={{ objectFit: 'contain' }}
            sizes="90vw"
            priority 
          />
        </div>
        <div className="mt-4 p-4 bg-background/80 rounded-md max-w-[80vw] text-center text-foreground text-sm max-h-[15vh] overflow-y-auto">
          {text}
        </div>
        <Button
           variant="ghost"
           size="icon"
           className="absolute top-4 right-4 text-white hover:text-gray-300 hover:bg-black/50 rounded-full h-10 w-10"
           onClick={onClose}
           aria-label="Fermer"
        >
          <X className="h-6 w-6" />
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ImageModal;

    
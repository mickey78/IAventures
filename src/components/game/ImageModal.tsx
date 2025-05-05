
import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
        // Prevent default closing behavior by setting onInteractOutside={(e) => e.preventDefault()} if needed, but Dialog overlay click usually closes
        onPointerDownOutside={(e) => e.preventDefault()} // Prevents closing on overlay click if desired
        onEscapeKeyDown={onClose} // Ensure escape key still closes
      >
        <div className="relative w-[90vw] h-[80vh]">
          <Image
            src={imageUrl}
            alt="Image en plein écran"
            fill
            style={{ objectFit: 'contain' }}
            sizes="90vw"
            priority // Load the modal image with high priority
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

    
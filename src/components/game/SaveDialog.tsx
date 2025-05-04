
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SaveDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    saveName: string;
    onSaveNameChange: (name: string) => void;
    onSave: () => void;
    isGameActive: boolean; // To disable save button if game is not active
}

const SaveDialog: React.FC<SaveDialogProps> = ({ isOpen, onOpenChange, saveName, onSaveNameChange, onSave, isGameActive }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sauvegarder la partie</DialogTitle>
                    <DialogDescription>
                        Entrez un nom pour votre sauvegarde. Si le nom existe déjà, il sera écrasé. Les images générées ne sont pas sauvegardées pour économiser de l'espace.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={saveName}
                        onChange={(e) => onSaveNameChange(e.target.value)}
                        placeholder="Nom de la sauvegarde"
                        aria-label="Nom de la sauvegarde"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Annuler</Button>
                    </DialogClose>
                    <Button type="button" onClick={onSave} disabled={!saveName.trim() || !isGameActive}>Sauvegarder</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SaveDialog;

import { Loader } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader className="h-12 w-12 animate-spin text-primary" />
        <p className="text-foreground text-lg">Chargement de l'aventure...</p>
      </div>
    </div>
  );
}

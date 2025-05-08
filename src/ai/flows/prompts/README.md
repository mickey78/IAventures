# Prompts Dépréciés

⚠️ **ATTENTION** : Ces fichiers de prompts sont dépréciés et ne sont conservés que pour référence.

Le nouveau système de prompts modulaires se trouve dans le répertoire `src/ai/prompts/`.

## Migration

Pour utiliser le nouveau système de prompts modulaires :

1. Importez `readPromptFile` depuis `@/lib/prompt-utils`
2. Utilisez les nouveaux noms de fichiers :
   - `initial-story.prompt` au lieu de `initialStoryPrompt.prompt`
   - `story-content.prompt` au lieu de `generateStoryContentPrompt.prompt`

Exemple :
```typescript
import { readPromptFile } from '@/lib/prompt-utils';

const promptTemplatePromise = readPromptFile('initial-story.prompt');
```

## Avantages du Nouveau Système

- Réduction des répétitions
- Maintenance simplifiée
- Consommation de tokens optimisée
- Cohérence accrue

Pour plus d'informations, consultez le README dans `src/ai/prompts/`.

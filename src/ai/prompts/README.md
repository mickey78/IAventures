# Système de Prompts Modulaires pour IAventures

Ce dossier contient le nouveau système de prompts modulaires pour IAventures, conçu pour réduire les répétitions et optimiser la consommation de tokens pendant la narration.

## Structure des Dossiers

```
src/ai/prompts/
├── base/                       # Modules de base réutilisables
│   ├── common.prompt           # Instructions communes à tous les prompts
│   ├── image-generation.prompt # Règles pour la génération d'images
│   ├── combat.prompt           # Règles pour les combats
│   └── game-state.prompt       # Règles pour la gestion de l'état du jeu
├── initial-story.prompt        # Prompt pour l'histoire initiale
├── story-content.prompt        # Prompt pour la continuation de l'histoire
└── README.md                   # Ce fichier
```

## Fonctionnement

Le système utilise un mécanisme d'inclusion de modules partiels avec la syntaxe `{{> nom-du-module}}`. Lors du chargement d'un prompt, les références aux modules sont remplacées par leur contenu.

### Exemple

```
{{> common}}

Le nom du joueur est {{{playerName}}}.

{{> image-generation}}

// Reste du prompt...
```

## Avantages

1. **Réduction des répétitions** : Les instructions communes sont définies une seule fois et réutilisées.
2. **Maintenance simplifiée** : Les modifications d'une règle se font à un seul endroit.
3. **Consommation de tokens optimisée** : Les prompts sont plus concis tout en conservant toutes les fonctionnalités.
4. **Cohérence** : Les règles sont appliquées de manière uniforme dans tous les prompts.

## Utilisation

Pour utiliser ce système dans le code :

```typescript
import { readPromptFile } from '@/lib/prompt-utils';

// Le système gère automatiquement la résolution des modules
const promptContent = await readPromptFile('story-content.prompt');
```

## Compatibilité

Le système maintient une compatibilité avec l'ancien format de prompts. Les fichiers existants dans `src/ai/flows/prompts/` continueront de fonctionner, mais il est recommandé de migrer vers le nouveau système pour bénéficier des optimisations.

## Création d'un Nouveau Module

Pour créer un nouveau module réutilisable :

1. Créez un fichier `.prompt` dans le dossier `base/`
2. Incluez-le dans vos prompts avec `{{> nom-du-module}}`

## Mise en Cache

Les prompts et modules sont mis en cache après le premier chargement pour améliorer les performances.

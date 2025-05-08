// src/ai/test-modular-prompts.ts
'use server';

/**
 * Script de test pour le système de prompts modulaires
 * 
 * Ce script charge un prompt modulaire et affiche le résultat après résolution des modules.
 * Il permet de vérifier que le système fonctionne correctement.
 * 
 * Usage: 
 * - Importer et appeler testModularPrompts() depuis une action serveur
 * - Ou exécuter directement avec ts-node src/ai/test-modular-prompts.ts
 */

import { readPromptFile } from '../lib/prompt-utils';

export async function testModularPrompts() {
  console.log('Test du système de prompts modulaires');
  
  try {
    // Test du prompt d'histoire initiale
    console.log('\n--- Test du prompt d\'histoire initiale ---');
    const initialStoryPrompt = await readPromptFile('initial-story.prompt');
    console.log('Taille du prompt après résolution:', initialStoryPrompt?.length || 0);
    console.log('Premiers 200 caractères:', initialStoryPrompt?.substring(0, 200));
    console.log('Derniers 200 caractères:', initialStoryPrompt?.substring((initialStoryPrompt?.length || 0) - 200));
    
    // Test du prompt de contenu d'histoire
    console.log('\n--- Test du prompt de contenu d\'histoire ---');
    const storyContentPrompt = await readPromptFile('story-content.prompt');
    console.log('Taille du prompt après résolution:', storyContentPrompt?.length || 0);
    console.log('Premiers 200 caractères:', storyContentPrompt?.substring(0, 200));
    console.log('Derniers 200 caractères:', storyContentPrompt?.substring((storyContentPrompt?.length || 0) - 200));
    
    // Test de compatibilité avec l'ancien format
    console.log('\n--- Test de compatibilité avec l\'ancien format ---');
    const legacyPrompt = await readPromptFile('generateStoryContentPrompt.prompt');
    console.log('Taille du prompt legacy:', legacyPrompt?.length || 0);
    
    return {
      success: true,
      initialStoryPromptLength: initialStoryPrompt?.length || 0,
      storyContentPromptLength: storyContentPrompt?.length || 0,
      legacyPromptLength: legacyPrompt?.length || 0
    };
  } catch (error) {
    console.error('Erreur lors du test des prompts modulaires:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Exécution directe si appelé avec ts-node
if (typeof require !== 'undefined' && require.main === module) {
  testModularPrompts()
    .then(result => console.log('Résultat du test:', result))
    .catch(error => console.error('Erreur:', error));
}

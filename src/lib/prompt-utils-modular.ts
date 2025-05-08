// src/lib/prompt-utils-modular.ts

import { cache } from 'react';

/**
 * Cache for loaded prompt files to avoid repeated file system access
 */
const promptCache: Record<string, string> = {};
const partialCache: Record<string, string> = {};

/**
 * Reads a prompt file from the specified path relative to the `src/ai/prompts` directory.
 * On the server, it reads from the file system. On the client, it returns undefined
 * as client-side file system access is not possible or secure.
 * 
 * @param filename The name of the prompt file (e.g., 'initial-story.prompt').
 * @returns A promise that resolves with the content of the file as a string on the server, or undefined on the client.
 * @throws Error if the file cannot be read on the server.
 */
export async function readPromptFile(filename: string): Promise<string | undefined> {
  if (typeof window !== 'undefined') {
    // Client-side: cannot access file system.
    return undefined;
  }

  // Check cache first
  if (promptCache[filename]) {
    return promptCache[filename];
  }

  // Server-side: proceed with reading the file.
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  try {
    // First try to read from the new modular prompts directory
    let filePath = path.join(process.cwd(), 'src', 'ai', 'prompts', filename);
    let fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    
    // If not found, try the legacy location
    if (!fileExists) {
      filePath = path.join(process.cwd(), 'src', 'ai', 'flows', 'prompts', filename);
      fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      
      if (!fileExists) {
        throw new Error(`Prompt file not found: ${filename}`);
      }
    }
    
    let fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Process partials if this is a modular prompt
    if (fileContent.includes('{{>')) {
      fileContent = await processPartials(fileContent);
    }
    
    // Cache the processed content
    promptCache[filename] = fileContent;
    
    return fileContent;
  } catch (error) {
    console.error(`Error reading prompt file ${filename} on the server:`, error);
    throw new Error(`Failed to read prompt file: ${filename} on server. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Processes a prompt template to include any partial templates referenced with {{> partial}} syntax.
 * 
 * @param template The prompt template that may contain partial references.
 * @returns A promise that resolves with the processed template with all partials included.
 */
async function processPartials(template: string): Promise<string> {
  const partialRegex = /{{>\s*([a-zA-Z0-9_-]+)\s*}}/g;
  let match;
  let processedTemplate = template;
  
  // Find all partial references
  const partialPromises: Promise<void>[] = [];
  const replacements: [string, string][] = [];
  
  while ((match = partialRegex.exec(template)) !== null) {
    const fullMatch = match[0];
    const partialName = match[1].trim();
    
    // Load the partial content if not already cached
    if (!partialCache[partialName]) {
      const loadPartial = async () => {
        try {
          const fs = await import('node:fs/promises');
          const path = await import('node:path');
          
          const partialPath = path.join(process.cwd(), 'src', 'ai', 'prompts', 'base', `${partialName}.prompt`);
          const partialContent = await fs.readFile(partialPath, 'utf-8');
          partialCache[partialName] = partialContent;
        } catch (error) {
          console.error(`Error loading partial ${partialName}:`, error);
          partialCache[partialName] = `[ERROR LOADING PARTIAL: ${partialName}]`;
        }
      };
      
      partialPromises.push(loadPartial());
    }
  }
  
  // Wait for all partials to be loaded
  await Promise.all(partialPromises);
  
  // Replace all partial references with their content
  partialRegex.lastIndex = 0; // Reset regex index
  while ((match = partialRegex.exec(template)) !== null) {
    const fullMatch = match[0];
    const partialName = match[1].trim();
    replacements.push([fullMatch, partialCache[partialName] || `[PARTIAL NOT FOUND: ${partialName}]`]);
  }
  
  // Apply all replacements
  for (const [search, replace] of replacements) {
    processedTemplate = processedTemplate.replace(search, replace);
  }
  
  return processedTemplate;
}

/**
 * Legacy compatibility function that maps old filenames to new ones.
 * This allows existing code to continue working with the new modular prompt system.
 * 
 * @param legacyFilename The legacy filename used in the old system.
 * @returns The corresponding filename in the new system.
 */
function mapLegacyFilename(legacyFilename: string): string {
  const mapping: Record<string, string> = {
    'initialStoryPrompt.prompt': 'initial-story.prompt',
    'generateStoryContentPrompt.prompt': 'story-content.prompt'
  };
  
  return mapping[legacyFilename] || legacyFilename;
}

/**
 * Legacy compatibility function that maintains the same interface as the original readPromptFile.
 * This function is exported for backward compatibility with existing code.
 * 
 * @param filename The name of the prompt file in the legacy format.
 * @returns A promise that resolves with the content of the file as a string on the server, or undefined on the client.
 */
export async function readLegacyPromptFile(filename: string): Promise<string | undefined> {
  const mappedFilename = mapLegacyFilename(filename);
  return readPromptFile(mappedFilename);
}

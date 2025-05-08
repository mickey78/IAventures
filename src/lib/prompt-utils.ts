
// src/lib/prompt-utils.ts

import { readLegacyPromptFile } from './prompt-utils-modular';

/**
 * Reads a prompt file, processes its modular includes, and returns its content.
 * This function serves as the primary interface for accessing prompt templates.
 *
 * It handles:
 *  - Mapping legacy prompt filenames (e.g., 'initialStoryPrompt.prompt') to their new
 *    counterparts (e.g., 'initial-story.prompt').
 *  - Attempting to load the (mapped) prompt file first from the new modular directory
 *    `src/ai/prompts/`.
 *  - If not found, falling back to the legacy directory `src/ai/flows/prompts/`.
 *  - Processing `{{> partialName}}` inclusions by reading partials from
 *    `src/ai/prompts/base/partialName.prompt`.
 *  - Caching of both full prompts and partials for performance.
 *
 * Note: This function internally calls `readLegacyPromptFile` from `./prompt-utils-modular`,
 * which orchestrates the above logic.
 * 
 * @param filename The name of the prompt file. Can be a legacy name (it will be mapped)
 *                 or a new modular prompt name.
 * @returns A promise that resolves with the fully processed content of the file as a string
 *          on the server, or undefined on the client (as file system access is server-only).
 * @throws Error if the file cannot be read or a critical partial is missing on the server.
 */
export async function readPromptFile(filename: string): Promise<string | undefined> {
  return readLegacyPromptFile(filename);
}

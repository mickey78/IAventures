// src/lib/prompt-utils.ts
import fs from 'node:fs/promises'; // Ensure using 'node:' prefix for server-side modules
import path from 'path';

/**
 * Reads a prompt file from the specified path relative to the `src/ai/flows/prompts` directory.
 * @param filename The name of the prompt file (e.g., 'initialStoryPrompt.prompt').
 * @returns A promise that resolves with the content of the file as a string.
 * @throws Error if the file cannot be read.
 */
export async function readPromptFile(filename: string): Promise<string> {
  if (typeof window !== 'undefined') {
    // This function is intended for server-side operations only.
    console.error('readPromptFile was called on the client side. This is not supported.');
    throw new Error('readPromptFile cannot be called on the client side.');
  }
  try {
    // Construct the full path to the prompt file
    const filePath = path.join(process.cwd(), 'src', 'ai', 'flows', 'prompts', filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
  } catch (error) {
    console.error(`Error reading prompt file ${filename}:`, error);
    throw new Error(`Failed to read prompt file: ${filename}. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

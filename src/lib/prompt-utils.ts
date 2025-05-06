
// src/lib/prompt-utils.ts

/**
 * Reads a prompt file from the specified path relative to the `src/ai/flows/prompts` directory.
 * On the server, it reads from the file system. On the client, it returns undefined
 * as client-side file system access is not possible or secure.
 * @param filename The name of the prompt file (e.g., 'initialStoryPrompt.prompt').
 * @returns A promise that resolves with the content of the file as a string on the server, or undefined on the client.
 * @throws Error if the file cannot be read on the server.
 */
export async function readPromptFile(filename: string): Promise<string | undefined> {
  if (typeof window !== 'undefined') {
    // Client-side: cannot access file system.
    // console.warn('readPromptFile was called on the client side. Returning undefined.');
    return undefined;
  }

  // Server-side: proceed with reading the file.
  // Dynamically import server-only modules here.
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  try {
    const filePath = path.join(process.cwd(), 'src', 'ai', 'flows', 'prompts', filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
  } catch (error) {
    console.error(`Error reading prompt file ${filename} on the server:`, error);
    // Consider how to handle this error. Throwing might be appropriate
    // if the prompt is critical for server-side operations.
    throw new Error(`Failed to read prompt file: ${filename} on server. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

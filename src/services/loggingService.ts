// src/services/loggingService.ts
import fs from 'node:fs/promises'; // Use node:fs/promises for Next.js server environment
import path from 'path';
import util from 'util';

const LOG_FILE = 'adventure.log';
const LOG_DIR = path.join(process.cwd()); // Log at the root of the project
const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Ensure log directory exists (optional, as logging to root directly)
// async function ensureLogDirectoryExists() {
//   try {
//     await fs.mkdir(LOG_DIR, { recursive: true });
//   } catch (error) {
//     console.error('Error creating log directory:', error);
//   }
// }

// Call once at the start if using a subdirectory
// ensureLogDirectoryExists();

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    payload?: any;
    excludeMedia?: boolean; // New flag to exclude media data
}

// Helper function to safely stringify payload, excluding media if requested
function safeStringifyPayload(payload: any, excludeMedia?: boolean): string {
    if (payload === undefined) return '';
    if (excludeMedia && payload && typeof payload === 'object') {
        const { media, photoDataUri, storyImageUrl, ...restOfPayload } = payload; // Destructure known media keys
        // Check for other potential large base64 strings or media-like keys
        const cleanedPayload = Object.entries(restOfPayload).reduce((acc, [key, value]) => {
            if (typeof value === 'string' && value.startsWith('data:image')) {
                // acc[key] = value.substring(0, 100) + "... (media data excluded)";
            } else if (key.toLowerCase().includes('image') || key.toLowerCase().includes('media')) {
                // acc[key] = "(media data likely excluded)";
            }
             else {
                acc[key] = value;
            }
            return acc;
        }, {} as any);
        return util.inspect(cleanedPayload, { depth: null, colors: false, breakLength: Infinity });

    }
    return util.inspect(payload, { depth: null, colors: false, breakLength: Infinity });
}


export async function logToFile(logEntry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    if (typeof window !== 'undefined') {
        // This function is intended for server-side logging only.
        // console.warn('logToFile was called on the client side. Skipping.');
        return;
    }

    const finalLogEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        ...logEntry,
    };

    const logFilePath = path.join(LOG_DIR, LOG_FILE);
    let logString = `${finalLogEntry.timestamp} [${finalLogEntry.level.toUpperCase()}] ${finalLogEntry.message}`;

    if (finalLogEntry.payload) {
        const payloadString = safeStringifyPayload(finalLogEntry.payload, finalLogEntry.excludeMedia);
        logString += `\nPayload: ${payloadString}\n`;
    } else {
        logString += '\n';
    }

    try {
        // Check log file size
        try {
            const stats = await fs.stat(logFilePath);
            if (stats.size > MAX_LOG_SIZE_BYTES) {
                await fs.writeFile(logFilePath, `--- Log truncated due to size limit (${new Date().toISOString()}) ---\n`);
                console.warn(`Log file ${LOG_FILE} was truncated due to size limit.`);
            }
        } catch (err: any) {
            if (err.code !== 'ENOENT') { // Ignore if file doesn't exist yet
                console.error('Error checking log file stats:', err);
            }
        }

        await fs.appendFile(logFilePath, logString);
    } catch (error) {
        console.error('Error writing to log file:', error);
        // Fallback to console if file logging fails
        console.log(logString.trim());
    }
}


export async function logAdventureStart(
    playerName: string,
    theme: string,
    subTheme: string | null,
    hero: string,
    maxTurns: number
): Promise<void> {
    const separator = "==================================================";
    await logToFile({
        level: 'info',
        message: `${separator}\nNEW ADVENTURE SESSION STARTED\n${separator}\nPlayer: ${playerName}\nTheme: ${theme}\nSub-Theme: ${subTheme || 'N/A'}\nHero: ${hero}\nMax Turns: ${maxTurns}\n${separator}`,
        excludeMedia: true,
    });
}

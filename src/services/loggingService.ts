// src/services/loggingService.ts
import fs from 'node:fs/promises'; // Ensure using 'node:' prefix for server-side modules
import path from 'path';
import util from 'util';

const LOG_FILE = 'adventure.log';
const LOG_DIR = path.join(process.cwd()); 
const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    payload?: any;
    excludeMedia?: boolean; 
}

function safeStringifyPayload(payload: any, excludeMedia?: boolean): string {
    if (typeof window !== 'undefined') { 
        return '(Payload stringification skipped on client)';
    }
    if (payload === undefined) return '';
    if (excludeMedia && payload && typeof payload === 'object') {
        const { media, photoDataUri, storyImageUrl, ...restOfPayload } = payload; 
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
        try {
            const stats = await fs.stat(logFilePath);
            if (stats.size > MAX_LOG_SIZE_BYTES) {
                await fs.writeFile(logFilePath, `--- Log truncated due to size limit (${new Date().toISOString()}) ---\n`);
                console.warn(`Log file ${LOG_FILE} was truncated due to size limit.`);
            }
        } catch (err: any) {
            if (err.code !== 'ENOENT') { 
                console.error('Error checking log file stats:', err);
            }
        }

        await fs.appendFile(logFilePath, logString);
    } catch (error) {
        console.error('Error writing to log file:', error);
        console.log(logString.trim());
    }
}


export async function logAdventureStart(
    playerName: string,
    theme: string,
    subTheme: string | null | undefined, 
    hero: string,
    maxTurns: number
): Promise<void> {
    if (typeof window !== 'undefined') {
        return; 
    }
    const separator = "==================================================";
    await logToFile({
        level: 'info',
        message: `${separator}\nNEW ADVENTURE SESSION STARTED\n${separator}\nPlayer: ${playerName}\nTheme: ${theme}\nSub-Theme: ${subTheme || 'N/A'}\nHero: ${hero}\nMax Turns: ${maxTurns}\n${separator}`,
        excludeMedia: true,
    });
}

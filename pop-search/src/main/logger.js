import log from 'electron-log/main';
export { log };
import path from 'path';
import { app } from 'electron';

// Optional: Initialize the logger
log.initialize();

// Configure the log file
// For portability and reliability, we use the library's default "userData" path.
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.fileName = 'debug_log.txt';

// Also log to console for development visibility
log.transports.console.level = 'info';

export function logToFile(message) {
    try {
        console.log(`[Main Log] ${message}`);
        log.info(message);
    } catch (e) {
        console.error('Logging failed:', e);
    }
}

// Log initial path for debugging
console.log(`[Main Log] Logger initialized. Target path: ${log.transports.file.getFile().path}`);

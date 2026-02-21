import { spawn } from 'child_process';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { logToFile } from './logger.js';

let ahkProcess = null;

/**
 * Start the AutoHotkey trigger script
 * - In development: runs the .ahk script directly
 * - In production: runs the compiled .exe from resources
 */
export function startAhk() {
    if (ahkProcess) {
        logToFile('[AHK Manager] Process already running');
        return;
    }

    try {
        const isDev = !app.isPackaged;
        let ahkPath;

        if (isDev) {
            // Development: Run the compiled .exe from the assets folder
            ahkPath = path.join(process.cwd(), 'assets', 'pop_search_trigger.exe');

            if (!fs.existsSync(ahkPath)) {
                console.error('[AHK Manager] Compiled EXE not found in assets:', ahkPath);
                console.log('[AHK Manager] Please run "npm run build:ahk" to compile the script.');
                return;
            }

            console.log('[AHK Manager] Starting AHK executable (dev mode):', ahkPath);
            ahkProcess = spawn(ahkPath, [], {
                detached: false
            });
        } else {
            // Production: Run the compiled .exe from resources/assets
            ahkPath = path.join(process.resourcesPath, 'assets', 'pop_search_trigger.exe');
            logToFile(`[AHK Manager] Resolving AHK path: ${ahkPath}`);

            if (!fs.existsSync(ahkPath)) {
                logToFile(`[AHK Manager] CRITICAL: Compiled EXE not found in resources at: ${ahkPath}`);
                return;
            }

            logToFile(`[AHK Manager] Starting AHK executable (production mode): ${ahkPath}`);
            ahkProcess = spawn(ahkPath, [], {
                detached: false
            });
        }

        ahkProcess.on('error', (err) => {
            logToFile(`[AHK Manager] Failed to start: ${err.message}`);
            ahkProcess = null;
        });

        ahkProcess.on('exit', (code) => {
            logToFile(`[AHK Manager] Process exited with code: ${code}`);
            ahkProcess = null;
        });

        logToFile(`[AHK Manager] Process started successfully (PID: ${ahkProcess.pid})`);
    } catch (err) {
        logToFile(`[AHK Manager] Error starting AHK: ${err.message}`);
        ahkProcess = null;
    }
}

/**
 * Stop the AutoHotkey trigger script
 */
export function stopAhk() {
    if (!ahkProcess) {
        console.log('[AHK Manager] No process to stop');
        return;
    }

    try {
        console.log('[AHK Manager] Stopping AHK process (PID:', ahkProcess.pid, ')');
        ahkProcess.kill();
        ahkProcess = null;
        console.log('[AHK Manager] Process stopped successfully');
    } catch (err) {
        console.error('[AHK Manager] Error stopping AHK:', err);
    }
}

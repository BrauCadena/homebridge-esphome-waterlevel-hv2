import { isRecord } from './typeguards';
import { existsSync, promises as fs } from 'fs';
import { join } from 'path';

/**
 * Debug utility to log raw data packets from the ESP32 to a local file.
 * This version is optimized for the @2colors/esphome-native-api event system.
 */
export const writeReadDataToLogFile = (host: string, device: any): void => {
    // Default directory for temporary logs (common in Linux/macOS environments)
    const logDir = '/tmp';
    
    /**
     * Check if the log directory exists and the device object is valid.
     * We use a type cast to 'any' to bypass TS2571: Object is of type 'unknown'.
     */
    if (existsSync(join(logDir)) && isRecord(device)) {
        const fileName = `esphome-log-${Date.now()}-${host.replace(/\./g, '-')}.json`;
        
        // Explicitly cast to any to ensure the .on() method is accessible
        const espDevice = device as any;
        
        /**
         * The new library emits a 'data' event for every raw packet received.
         * We subscribe to this event to capture the communication flow.
         */
        espDevice.on('data', (data: any) => {
            const logEntry = JSON.stringify({
                type: data.type || 'unknown',
                time: Date.now(),
                host: host
            });

            // Append the log entry to the file. 
            // Errors are caught silently to prevent the plugin from crashing.
            fs.appendFile(join(logDir, fileName), `${logEntry}\n`).catch(() => {
                // Silently ignore write errors
            });
        });
    }
};
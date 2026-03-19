export interface LogEntry {
    correlationId: string;
    timestamp?: string;
    level?: 'info' | 'error' | 'warn';
    event?: string;
    [key: string]: unknown;
}

/**
 * Structured JSON logger for Cloudflare Workers
 * Outputs JSON logs with correlation IDs for request tracing
 */
export const logger = {
    info(entry: LogEntry): void {
        const { level, timestamp, ...cleanEntry } = entry;
        const logEntry = {
            ...cleanEntry,
            timestamp: new Date().toISOString(),
            level: 'info' as const
        };
        console.log(JSON.stringify(logEntry));
    },

    error(entry: LogEntry): void {
        const { level, timestamp, ...cleanEntry } = entry;
        const logEntry = {
            ...cleanEntry,
            timestamp: new Date().toISOString(),
            level: 'error' as const
        };
        console.error(JSON.stringify(logEntry));
    },

    warn(entry: LogEntry): void {
        const { level, timestamp, ...cleanEntry } = entry;
        const logEntry = {
            ...cleanEntry,
            timestamp: new Date().toISOString(),
            level: 'warn' as const
        };
        console.warn(JSON.stringify(logEntry));
    }
};
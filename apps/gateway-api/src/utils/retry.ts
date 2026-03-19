export interface RetryOptions {
    maxRetries: number;
    initialDelay: number;  // milliseconds
    maxDelay?: number;     // max delay cap
    jitter?: boolean;      // add random jitter to prevent thundering herd
}

/**
 * Retry a function with exponential backoff and optional jitter
 * Used for retrying transient failures (timeouts, 5xx errors)
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    const { maxRetries, initialDelay, maxDelay = 30000, jitter = true } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't delay after the last attempt
            if (attempt < maxRetries) {
                // Calculate exponential backoff: initialDelay * 2^attempt
                const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

                // Add jitter if enabled (±25% random variation)
                const finalDelay = jitter
                    ? delay * (0.75 + Math.random() * 0.5)
                    : delay;

                await new Promise(resolve => setTimeout(resolve, finalDelay));
            }
        }
    }

    throw lastError;
}

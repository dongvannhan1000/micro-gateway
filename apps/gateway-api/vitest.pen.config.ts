import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for penetration tests
 * This config excludes the default test exclusions to allow pen-test files to run
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // Only run penetration tests - no exclusions
        include: ['**/security/pen-test-*.test.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});

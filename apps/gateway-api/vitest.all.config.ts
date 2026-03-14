import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for running ALL tests (including penetration tests)
 * This config removes the default exclusions to allow comprehensive testing
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // Run all tests - minimal exclusions
        exclude: [
            'node_modules',
            'dist',
            '.git',
            'coverage',
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: false,  // Use explicit imports instead of globals
        environment: 'node',
        exclude: [
            'node_modules',
            'dist',
            '.git',
            'coverage',
            '**/security/pen-test-*.test.ts',  // Exclude penetration tests from CI/CD
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});

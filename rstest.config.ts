import { withRslibConfig } from '@rstest/adapter-rslib';
import { defineConfig } from '@rstest/core';

export default defineConfig({
    extends: withRslibConfig(),
    coverage: {
        enabled: true,
        exclude: ['**/index.ts'],
        thresholds: {
            statements: 95,
            branches: 75,
            functions: 100,
            lines: 95
        }
    }
});

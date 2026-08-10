import { withRslibConfig } from '@rstest/adapter-rslib';
import { defineConfig } from '@rstest/core';

export default defineConfig({
    extends: withRslibConfig(),
    coverage: {
        enabled: true,
        thresholds: {
            statements: 100,
            branches: 100,
            functions: 100,
            lines: 100
        }
    }
});

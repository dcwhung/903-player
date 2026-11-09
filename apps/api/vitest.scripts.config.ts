import { defineConfig } from 'vitest/config';

// scripts/（importLibrary.mjs）喺 Node 跑：讀 repo library/、spawn wrangler，所以唔放入 workerd project
export default defineConfig({
    test: {
        name: '@903-player/api-scripts',
        globals: true,
        environment: 'node',
        include: ['scripts/**/*.test.ts'],
    },
});

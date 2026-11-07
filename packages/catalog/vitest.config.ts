import { defineConfig } from 'vitest/config';

// 純邏輯 package：node 環境就夠（唔使 jsdom）
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// 測試唔准真係上網：預設一律失敗，要用就自己 mock
beforeEach(() => {
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('network disabled in tests'))),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    globalThis.localStorage?.clear();
});

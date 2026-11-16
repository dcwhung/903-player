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
});

// jsdom 冇 canvas：getContext 一律 null（裁切預覽 drawChoice 會跳過），唔好每個 test 印「Not implemented」
if (typeof HTMLCanvasElement !== 'undefined')
    HTMLCanvasElement.prototype.getContext = (() =>
        null) as unknown as HTMLCanvasElement['getContext'];

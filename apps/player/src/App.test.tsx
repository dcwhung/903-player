import { render } from '@testing-library/react';
import { App } from './App';

// 只驗 App 層面嘅觀察：頁面同背景 probe 換走，唔使起成個主頁 / 出網
vi.mock('./pages/home/HomePage', () => ({ HomePage: () => null }));
vi.mock('./services/audioProbe', () => ({
    probeRecentRecordings: () => Promise.resolve([]),
    readStoredRecordings: () => [],
    readUnavailableEpisodes: () => [],
}));

const gapVar = () => document.documentElement.style.getPropertyValue('--viewport-gap-bottom');

describe('App', () => {
    afterEach(() => {
        Reflect.deleteProperty(navigator, 'standalone');
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    // 冇 mini player 都要量（用戶 iPhone 截圖，v1.28.1）：短提示 / 主頁底部留位用
    // --mini-player-offset-bottom，iOS standalone viewport 矮過螢幕時要扣返差距，唔係淨係 mini player 先量
    it('should publish the iOS standalone viewport gap without a mini player', () => {
        Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => ({
                matches: query.includes('portrait'),
                media: query,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
            })),
        );
        vi.spyOn(window.screen, 'height', 'get').mockReturnValue(852);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(797);

        const { unmount } = render(<App />);

        expect(document.querySelector('main[data-mini-player]')).toBeNull();
        expect(gapVar()).toBe('55px');
        unmount();
    });
});

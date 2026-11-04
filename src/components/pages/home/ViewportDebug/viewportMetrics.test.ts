import { metricRows, readViewport, type ViewportSnapshot } from './viewportMetrics';

const SNAPSHOT: ViewportSnapshot = {
    innerWidth: 430,
    innerHeight: 877,
    screenWidth: 430,
    screenHeight: 932,
    visualViewportHeight: 877,
    devicePixelRatio: 3,
    standalone: true,
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
    viewportGapBottom: '55px',
    miniPlayerOffsetPx: 8,
    miniPlayerGapPx: 8.5,
};

describe('metricRows', () => {
    it('should list every metric with its value', () => {
        expect(metricRows(SNAPSHOT)).toEqual([
            ['innerWidth × innerHeight', '430 × 877'],
            ['screen width × height', '430 × 932'],
            ['visualViewport.height', '877'],
            ['devicePixelRatio', '3'],
            ['navigator.standalone', 'true'],
            ['safe-area top / right / bottom / left', '59 / 0 / 34 / 0'],
            ['--viewport-gap-bottom', '55px'],
            ['--mini-player-offset-bottom', '8'],
            ['mini player gap to bottom', '8.5'],
        ]);
    });

    it('should say when a value is not available', () => {
        const rows = metricRows({
            ...SNAPSHOT,
            visualViewportHeight: undefined,
            standalone: undefined,
            viewportGapBottom: '',
            miniPlayerGapPx: undefined,
        });

        expect(Object.fromEntries(rows)).toMatchObject({
            'visualViewport.height': 'n/a',
            'navigator.standalone': 'n/a',
            '--viewport-gap-bottom': 'unset',
            'mini player gap to bottom': 'no mini player',
        });
    });
});

describe('readViewport', () => {
    /** 量安全區 / mini player 底距嘅 probe：jsdom 冇 env()，由假 computed style 畀 */
    const probeStyle: Record<string, string> = {
        paddingTop: '59px',
        paddingRight: '0px',
        paddingBottom: '34px',
        paddingLeft: '0px',
        width: '8px',
    };

    afterEach(() => {
        vi.restoreAllMocks();
        document.documentElement.style.removeProperty('--viewport-gap-bottom');
        document.body.replaceChildren();
    });

    const mockStyles = (probe: HTMLElement) => {
        const realStyle = window.getComputedStyle.bind(window);
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el) =>
            el === probe ? (probeStyle as unknown as CSSStyleDeclaration) : realStyle(el),
        );
    };

    it('should read the window, the probe and the root variable', () => {
        const probe = document.createElement('div');
        mockStyles(probe);
        document.documentElement.style.setProperty('--viewport-gap-bottom', '55px');

        const snapshot = readViewport(probe);

        expect(snapshot).toMatchObject({
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            screenHeight: window.screen.height,
            safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
            viewportGapBottom: '55px',
            miniPlayerOffsetPx: 8,
            miniPlayerGapPx: undefined,
        });
    });

    it('should measure how far the floating mini player sits above the window bottom', () => {
        const probe = document.createElement('div');
        mockStyles(probe);
        // mini player 用 portal 掛喺 body，外層係 ThemeScope（data-theme-scope）
        const mini = document.createElement('div');
        mini.setAttribute('data-theme-scope', '');
        document.body.append(mini);
        vi.spyOn(mini, 'getBoundingClientRect').mockReturnValue({
            bottom: window.innerHeight - 8,
        } as DOMRect);

        expect(readViewport(probe).miniPlayerGapPx).toBe(8);
    });
});

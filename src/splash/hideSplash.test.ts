import {
    SPLASH_HIDDEN_CLASS,
    SPLASH_ID,
    SPLASH_REMOVE_FALLBACK_MS,
    hideSplash,
} from './hideSplash';

const mountSplash = (): HTMLElement => {
    const splash = document.createElement('div');
    splash.id = SPLASH_ID;
    document.body.append(splash);
    return splash;
};

describe('hideSplash', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.useRealTimers();
    });

    it('should fade the splash out', () => {
        const splash = mountSplash();

        hideSplash(document);

        expect(splash).toHaveClass(SPLASH_HIDDEN_CLASS);
    });

    it('should remove the splash once the fade ends', () => {
        const splash = mountSplash();

        hideSplash(document);
        splash.dispatchEvent(new Event('transitionend'));

        expect(document.getElementById(SPLASH_ID)).toBeNull();
    });

    it('should still remove the splash when no transition runs', () => {
        vi.useFakeTimers();
        mountSplash();

        hideSplash(document);
        vi.advanceTimersByTime(SPLASH_REMOVE_FALLBACK_MS);

        expect(document.getElementById(SPLASH_ID)).toBeNull();
    });

    it('should do nothing when there is no splash', () => {
        expect(() => hideSplash(document)).not.toThrow();
    });
});

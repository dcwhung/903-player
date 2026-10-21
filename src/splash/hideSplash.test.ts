import {
    SPLASH_HIDDEN_CLASS,
    SPLASH_ID,
    SPLASH_MIN_VISIBLE_MS,
    SPLASH_REMOVE_FALLBACK_MS,
    hideSplash,
} from './hideSplash';

const LOADED_EARLY_MS = 500;
const LOADED_LATE_MS = 3_000;

const mountSplash = (): HTMLElement => {
    const splash = document.createElement('div');
    splash.id = SPLASH_ID;
    document.body.append(splash);
    return splash;
};

describe('hideSplash', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.useRealTimers();
    });

    it('should keep the splash until it has shown for the minimum time', () => {
        const splash = mountSplash();

        hideSplash(document, LOADED_EARLY_MS);
        vi.advanceTimersByTime(SPLASH_MIN_VISIBLE_MS - LOADED_EARLY_MS - 1);

        expect(splash).not.toHaveClass(SPLASH_HIDDEN_CLASS);
    });

    it('should fade the splash out once the minimum time is up', () => {
        const splash = mountSplash();

        hideSplash(document, LOADED_EARLY_MS);
        vi.advanceTimersByTime(SPLASH_MIN_VISIBLE_MS - LOADED_EARLY_MS);

        expect(splash).toHaveClass(SPLASH_HIDDEN_CLASS);
    });

    it('should fade straight away when the app loaded after the minimum time', () => {
        const splash = mountSplash();

        hideSplash(document, LOADED_LATE_MS);
        vi.advanceTimersByTime(0);

        expect(splash).toHaveClass(SPLASH_HIDDEN_CLASS);
    });

    it('should remove the splash once the fade ends', () => {
        const splash = mountSplash();

        hideSplash(document, LOADED_LATE_MS);
        vi.advanceTimersByTime(0);
        splash.dispatchEvent(new Event('transitionend'));

        expect(document.getElementById(SPLASH_ID)).toBeNull();
    });

    it('should still remove the splash when no transition runs', () => {
        mountSplash();

        hideSplash(document, LOADED_LATE_MS);
        vi.advanceTimersByTime(SPLASH_REMOVE_FALLBACK_MS);

        expect(document.getElementById(SPLASH_ID)).toBeNull();
    });

    it('should not fade after being cancelled', () => {
        const splash = mountSplash();

        const cancel = hideSplash(document, LOADED_EARLY_MS);
        cancel();
        vi.advanceTimersByTime(SPLASH_MIN_VISIBLE_MS);

        expect(splash).not.toHaveClass(SPLASH_HIDDEN_CLASS);
    });

    it('should do nothing when there is no splash', () => {
        expect(() => hideSplash(document)()).not.toThrow();
    });
});

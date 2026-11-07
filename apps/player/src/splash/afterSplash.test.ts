import { afterSplash } from './afterSplash';
import { SPLASH_ID } from './hideSplash';

describe('afterSplash', () => {
    afterEach(() => document.getElementById(SPLASH_ID)?.remove());

    it('should run straight away when there is no splash', () => {
        const run = vi.fn();
        afterSplash(document, run);
        expect(run).toHaveBeenCalledTimes(1);
    });

    it('should wait until the splash leaves the page', async () => {
        const splash = document.createElement('div');
        splash.id = SPLASH_ID;
        document.body.append(splash);
        const run = vi.fn();
        afterSplash(document, run);
        expect(run).not.toHaveBeenCalled();

        splash.remove();
        await Promise.resolve();
        expect(run).toHaveBeenCalledTimes(1);
    });

    it('should not run once cancelled', async () => {
        const splash = document.createElement('div');
        splash.id = SPLASH_ID;
        document.body.append(splash);
        const run = vi.fn();
        afterSplash(document, run)();
        splash.remove();
        await Promise.resolve();
        expect(run).not.toHaveBeenCalled();
    });
});

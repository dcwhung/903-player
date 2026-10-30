import { withViewTransition } from './viewTransition';

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query })),
    );

/** 假 startViewTransition：即刻叫 callback（真瀏覽器會先影低舊畫面），finished 由測試話幾時完 */
const stubStartViewTransition = () => {
    let finish = () => {};
    const finished = new Promise<void>((resolve) => {
        finish = resolve;
    });
    const start = vi.fn((update: () => void) => {
        update();
        return { finished, ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
    return { start, finish: () => finish() };
};

const removeStartViewTransition = () => {
    Reflect.deleteProperty(document, 'startViewTransition');
};

describe('withViewTransition', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        removeStartViewTransition();
        delete document.documentElement.dataset.viewTransition;
    });

    it('should update straight away when the browser has no view transitions', () => {
        stubReducedMotion(false);
        const update = vi.fn();

        withViewTransition(update, 'expand');

        expect(update).toHaveBeenCalledOnce();
        expect(document.documentElement.dataset.viewTransition).toBeUndefined();
    });

    it('should update straight away without a transition when the user prefers reduced motion', () => {
        stubReducedMotion(true);
        const { start } = stubStartViewTransition();
        const update = vi.fn();

        withViewTransition(update, 'close');

        expect(update).toHaveBeenCalledOnce();
        expect(start).not.toHaveBeenCalled();
    });

    it('should run the update inside a view transition tagged with its kind', () => {
        stubReducedMotion(false);
        const { start } = stubStartViewTransition();
        let kindDuringUpdate: string | undefined;

        withViewTransition(() => {
            kindDuringUpdate = document.documentElement.dataset.viewTransition;
        }, 'open');

        expect(start).toHaveBeenCalledOnce();
        expect(kindDuringUpdate).toBe('open');
    });

    it('should drop the kind tag once the transition has finished', async () => {
        stubReducedMotion(false);
        const { finish } = stubStartViewTransition();

        withViewTransition(() => {}, 'back');
        finish();
        await vi.waitFor(() =>
            expect(document.documentElement.dataset.viewTransition).toBeUndefined(),
        );
    });
});

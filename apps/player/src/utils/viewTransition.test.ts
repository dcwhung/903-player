import { isViewTransitionUpdating, tileTransitionName, withViewTransition } from './viewTransition';

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

interface NodeEvents {
    on: (event: string, listener: () => void) => void;
    off: (event: string, listener: () => void) => void;
}

describe('withViewTransition edge cases', () => {
    /** 似真嘅 startViewTransition：update 等下一個 tick 先行（瀏覽器要先影舊畫面），finished 跟 update 結果 */
    const stubDeferred = () => {
        const runs: (() => Promise<void>)[] = [];
        const finishers: (() => void)[] = [];
        const start = vi.fn((update: () => void) => {
            let run = () => Promise.resolve();
            const done = new Promise<void>((resolve, reject) => {
                run = () => {
                    try {
                        update();
                        resolve();
                    } catch (error) {
                        reject(error as Error);
                    }
                    return done.catch(() => undefined);
                };
            });
            runs.push(run);
            const finished = new Promise<void>((resolve, reject) => {
                finishers.push(() => void done.then(resolve, reject));
            });
            return { finished, ready: done, updateCallbackDone: done };
        });
        Object.defineProperty(document, 'startViewTransition', {
            value: start,
            configurable: true,
        });
        return { start, runs, finishers };
    };

    afterEach(() => {
        vi.unstubAllGlobals();
        removeStartViewTransition();
        delete document.documentElement.dataset.viewTransition;
    });

    it('should not leave an unhandled rejection when the update throws', async () => {
        stubReducedMotion(false);
        const { runs, finishers } = stubDeferred();
        const unhandled = vi.fn();
        // vitest 行喺 Node：unhandled rejection 由 Node process 報（app tsconfig 冇 Node 型別）
        const node = (globalThis as unknown as { process: NodeEvents }).process;
        node.on('unhandledRejection', unhandled);

        withViewTransition(() => {
            throw new Error('render failed');
        }, 'expand');
        await runs[0]?.();
        finishers[0]?.();
        await new Promise((resolve) => setTimeout(resolve, 0));

        node.off('unhandledRejection', unhandled);
        expect(unhandled).not.toHaveBeenCalled();
    });

    it('should ignore a second tap while the first transition has not updated yet', async () => {
        stubReducedMotion(false);
        const { start, runs } = stubDeferred();
        const update = vi.fn();

        expect(withViewTransition(update, 'expand')).toBe(true);
        expect(withViewTransition(update, 'expand')).toBe(false);
        await Promise.all(runs.map((run) => run()));

        expect(start).toHaveBeenCalledOnce();
        expect(update).toHaveBeenCalledOnce();
    });

    it('should keep the tag of a newer transition of the same kind when the older one finishes', async () => {
        stubReducedMotion(false);
        const { runs, finishers } = stubDeferred();

        withViewTransition(() => {}, 'close');
        await runs[0]?.();
        withViewTransition(() => {}, 'close');
        finishers[0]?.();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(document.documentElement.dataset.viewTransition).toBe('close');
        // 行埋第二個過場嘅 update，唔好留低「等緊」狀態畀下一個測試
        await runs[1]?.();
    });
});

describe('isViewTransitionUpdating', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        removeStartViewTransition();
        delete document.documentElement.dataset.viewTransition;
    });

    it('should be true only while the update of a transition runs', () => {
        stubReducedMotion(false);
        let pendingUpdate = () => {};
        let updatingInside = false;
        const finished = new Promise<void>(() => {});
        Object.defineProperty(document, 'startViewTransition', {
            value: (update: () => void) => {
                pendingUpdate = update;
                return { finished, ready: finished, updateCallbackDone: finished };
            },
            configurable: true,
        });

        withViewTransition(() => {
            updatingInside = isViewTransitionUpdating();
        }, 'switch');
        expect(isViewTransitionUpdating()).toBe(false);
        pendingUpdate();

        expect(updatingInside).toBe(true);
        expect(isViewTransitionUpdating()).toBe(false);
    });

    it('should be false when the update ran straight away without a transition', () => {
        stubReducedMotion(true);
        let updatingInside = true;

        withViewTransition(() => {
            updatingInside = isViewTransitionUpdating();
        }, 'open');

        expect(updatingInside).toBe(false);
    });
});

describe('withViewTransition when startViewTransition throws', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        removeStartViewTransition();
        delete document.documentElement.dataset.viewTransition;
    });

    it('should update without a transition and still accept the next call (S-641)', () => {
        stubReducedMotion(false);
        const start = vi.fn(() => {
            throw new DOMException('invalid state', 'InvalidStateError');
        });
        Object.defineProperty(document, 'startViewTransition', {
            value: start,
            configurable: true,
        });
        const first = vi.fn();
        const second = vi.fn();

        withViewTransition(first, 'expand');
        withViewTransition(second, 'expand');

        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();
        expect(document.documentElement.dataset.viewTransition).toBeUndefined();
    });
});

describe('tileTransitionName', () => {
    it('should give every position its own name a view transition accepts', () => {
        const names = Array.from({ length: 40 }, (_, i) => tileTransitionName(i));
        expect(new Set(names).size).toBe(names.length);
        names.forEach((name) => expect(name).toMatch(/^[a-z][a-z0-9-]*$/));
    });
});

describe('withViewTransition hooks', () => {
    /** update 等測試叫 run 先行；finish 先完；skipTransition 記低 */
    const stubControlled = () => {
        const calls: { run: () => void; finish: () => void; skip: ReturnType<typeof vi.fn> }[] = [];
        Object.defineProperty(document, 'startViewTransition', {
            value: (update: () => void) => {
                let finish = () => {};
                const finished = new Promise<void>((resolve) => {
                    finish = resolve;
                });
                const skip = vi.fn();
                calls.push({ run: update, finish, skip });
                return {
                    finished,
                    ready: finished,
                    updateCallbackDone: finished,
                    skipTransition: skip,
                };
            },
            configurable: true,
        });
        return calls;
    };

    afterEach(() => {
        vi.unstubAllGlobals();
        removeStartViewTransition();
        delete document.documentElement.dataset.viewTransition;
    });

    it('should end straight after the update when there is no transition', () => {
        stubReducedMotion(true);
        const order: string[] = [];

        withViewTransition(() => order.push('update'), 'zoom', { onEnd: () => order.push('end') });

        expect(order).toEqual(['update', 'end']);
    });

    it('should end once the transition has finished', async () => {
        stubReducedMotion(false);
        const calls = stubControlled();
        const onEnd = vi.fn();

        withViewTransition(() => {}, 'zoom', { onEnd });
        calls[0]?.run();
        expect(onEnd).not.toHaveBeenCalled();
        calls[0]?.finish();

        await vi.waitFor(() => expect(onEnd).toHaveBeenCalledOnce());
    });

    it('should end at once when it is turned away because an earlier one has not updated', () => {
        stubReducedMotion(false);
        const calls = stubControlled();
        const onEnd = vi.fn();

        withViewTransition(() => {}, 'zoom');
        expect(withViewTransition(() => {}, 'unzoom', { onEnd })).toBe(false);

        expect(onEnd).toHaveBeenCalledOnce();
        calls[0]?.run();
    });

    it.each([
        [false, 1],
        [true, 0],
    ])('should skip the animation when afterUpdate gives %s (skips %i)', (keep, skips) => {
        stubReducedMotion(false);
        const calls = stubControlled();
        const order: string[] = [];

        withViewTransition(() => order.push('update'), 'unzoom', {
            afterUpdate: () => {
                order.push('after');
                return keep;
            },
        });
        calls[0]?.run();

        expect(order).toEqual(['update', 'after']);
        expect(calls[0]?.skip).toHaveBeenCalledTimes(skips);
    });
});

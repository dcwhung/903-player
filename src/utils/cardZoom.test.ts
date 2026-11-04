import { unzoomHome, zoomFromState, zoomInto, zoomKey, zoomState } from './cardZoom';

const ON_SCREEN = { top: 300, right: 190, bottom: 400, left: 20 };
const OFF_SCREEN = { top: 900, right: 190, bottom: 1000, left: 20 };
const KEY = zoomKey.show('gongzi');

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query })),
    );

/** 似真嘅 startViewTransition：update 等測試叫 run 先行（瀏覽器要先影舊畫面），finish 先完 */
const stubTransition = () => {
    const calls: { run: () => void; finish: () => void; skip: ReturnType<typeof vi.fn> }[] = [];
    const start = vi.fn((update: () => void) => {
        let finish = () => {};
        const finished = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const skip = vi.fn();
        calls.push({ run: update, finish, skip });
        return { finished, ready: finished, updateCallbackDone: finished, skipTransition: skip };
    });
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
    return { start, calls };
};

const addTile = (key: string, rect: typeof ON_SCREEN) => {
    const tile = document.createElement('button');
    tile.setAttribute('data-zoom-key', key);
    tile.getBoundingClientRect = () => ({ ...rect }) as DOMRect;
    document.body.append(tile);
    return tile;
};

const insetVars = () => {
    const style = document.documentElement.style;
    return ['top', 'right', 'bottom', 'left'].map((side) =>
        style.getPropertyValue(`--zoom-inset-${side}`),
    );
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, 'startViewTransition');
    delete document.documentElement.dataset.viewTransition;
    document.documentElement.removeAttribute('style');
    document.body.innerHTML = '';
});

describe('zoomKey', () => {
    it('should give each kind of tile its own key', () => {
        expect(new Set([zoomKey.show('x'), zoomKey.drama('x'), zoomKey.today]).size).toBe(3);
    });
});

describe('zoomInto', () => {
    it('should zoom from the tapped tile: name it and write its box while the transition runs', () => {
        stubReducedMotion(false);
        const { start, calls } = stubTransition();
        const tile = addTile(KEY, ON_SCREEN);
        let during: { kind?: string; marked: boolean; inset: string[] } | null = null;

        let zoomedFlag: boolean | undefined;

        zoomInto(KEY, (zoomed) => {
            zoomedFlag = zoomed;
            during = {
                kind: document.documentElement.dataset.viewTransition,
                marked: tile.hasAttribute('data-zoom-source'),
                inset: insetVars(),
            };
        });
        calls[0]?.run();

        expect(start).toHaveBeenCalledOnce();
        expect(zoomedFlag).toBe(true);
        expect(during).toEqual({
            kind: 'zoom',
            marked: true,
            inset: [
                '300px',
                `${window.innerWidth - 190}px`,
                `${window.innerHeight - 400}px`,
                '20px',
            ],
        });
    });

    /**
     * S-681：瀏覽器喺 startViewTransition 之後下一格先影舊畫面，影完先行 update；
     * 撳格仔嗰下（開播）令版面喺過場行 update 之前變咗（例如闊橫版播放卡出咗、格仔移位），
     * 舊 snapshot 仍然係撳嗰刻嘅版面，所以格仔框要用撳嗰刻量嘅位置，update 入面唔可以再量
     */
    it('should keep the box measured at the tap when the layout moves the tile before the update (S-681)', () => {
        stubReducedMotion(false);
        const { calls } = stubTransition();
        const tile = addTile(KEY, ON_SCREEN);
        let inset: string[] = [];

        zoomInto(KEY, () => {
            inset = insetVars();
        });
        tile.getBoundingClientRect = () =>
            ({ top: 130, right: 1222, bottom: 330, left: 842 }) as DOMRect;
        calls[0]?.run();

        expect(inset).toEqual([
            '300px',
            `${window.innerWidth - 190}px`,
            `${window.innerHeight - 400}px`,
            '20px',
        ]);
    });

    it('should drop the mark and the box once the transition has finished', async () => {
        stubReducedMotion(false);
        const { calls } = stubTransition();
        const tile = addTile(KEY, ON_SCREEN);

        zoomInto(KEY, () => {});
        calls[0]?.run();
        calls[0]?.finish();
        await settle();

        expect(tile.hasAttribute('data-zoom-source')).toBe(false);
        expect(insetVars()).toEqual(['', '', '', '']);
    });

    it('should just update when the tile is not on screen', () => {
        stubReducedMotion(false);
        const { start } = stubTransition();
        addTile(KEY, OFF_SCREEN);
        const update = vi.fn();

        zoomInto(KEY, update);

        // 冇開到過場：唔記來源（返回唔好 unzoom）
        expect(update).toHaveBeenCalledExactlyOnceWith(false);
        expect(start).not.toHaveBeenCalled();
    });

    it('should still update when an earlier transition has not updated yet', () => {
        stubReducedMotion(false);
        const { start, calls } = stubTransition();
        addTile(KEY, ON_SCREEN);
        const other = addTile(zoomKey.today, ON_SCREEN);
        const update = vi.fn();

        zoomInto(KEY, () => {});
        zoomInto(zoomKey.today, update);

        expect(update).toHaveBeenCalledExactlyOnceWith(false);
        expect(start).toHaveBeenCalledOnce();
        // 第一個過場嘅格仔仲係來源，第二格唔好搶名（撞名成個過場會 abort）
        expect(other.hasAttribute('data-zoom-source')).toBe(false);
        calls[0]?.run();
    });

    it('should update without leaving a mark when the user prefers reduced motion', () => {
        stubReducedMotion(true);
        const { start } = stubTransition();
        const tile = addTile(KEY, ON_SCREEN);
        const update = vi.fn();

        zoomInto(KEY, update);

        expect(update).toHaveBeenCalledExactlyOnceWith(false);
        expect(start).not.toHaveBeenCalled();
        expect(tile.hasAttribute('data-zoom-source')).toBe(false);
        expect(insetVars()).toEqual(['', '', '', '']);
    });
});

describe('unzoomHome', () => {
    /** 撳格仔入咗頁（zoom 過場行完），之後返主頁 */
    const zoomedIn = async () => {
        const { start, calls } = stubTransition();
        const tile = addTile(KEY, ON_SCREEN);
        zoomInto(KEY, () => tile.remove());
        calls[0]?.run();
        calls[0]?.finish();
        await settle();
        return { start, calls };
    };

    it('should shrink back into the tile it zoomed from', async () => {
        stubReducedMotion(false);
        const { start, calls } = await zoomedIn();
        let tile: HTMLElement | null = null;

        unzoomHome(KEY, () => {
            tile = addTile(KEY, ON_SCREEN);
        });
        calls[1]?.run();

        expect(start).toHaveBeenCalledTimes(2);
        expect(document.documentElement.dataset.viewTransition).toBe('unzoom');
        expect(tile).not.toBeNull();
        expect(tile!.hasAttribute('data-zoom-source')).toBe(true);
        expect(insetVars()[0]).toBe('300px');
        expect(calls[1]?.skip).not.toHaveBeenCalled();
        calls[1]?.finish();
        await settle();
        expect(tile!.hasAttribute('data-zoom-source')).toBe(false);
        expect(document.documentElement.dataset.viewTransition).toBeUndefined();
    });

    it('should skip the animation when the tile is not on screen after going home', async () => {
        stubReducedMotion(false);
        const { calls } = await zoomedIn();

        unzoomHome(KEY, () => {
            addTile(KEY, OFF_SCREEN);
        });
        calls[1]?.run();

        expect(calls[1]?.skip).toHaveBeenCalledOnce();
        expect(document.querySelector('[data-zoom-source]')).toBeNull();
        expect(insetVars()).toEqual(['', '', '', '']);
        calls[1]?.finish();
    });

    it('should skip the animation when the tile is gone', async () => {
        stubReducedMotion(false);
        const { calls } = await zoomedIn();

        unzoomHome(KEY, () => {});
        calls[1]?.run();

        expect(calls[1]?.skip).toHaveBeenCalledOnce();
        calls[1]?.finish();
    });

    it('should just update when the page was not zoomed into (W-527)', async () => {
        stubReducedMotion(false);
        const { start } = await zoomedIn();
        const update = vi.fn();

        unzoomHome(null, update);

        expect(update).toHaveBeenCalledOnce();
        expect(start).toHaveBeenCalledOnce();
    });
});

/** 來源綁喺入頁嗰個 history entry（location.state）：系統返回 / mini player 入頁自然冇（W-527） */
describe('zoom history state', () => {
    it('should read back the tile key it was given', () => {
        expect(zoomFromState(zoomState(KEY))).toBe(KEY);
    });

    it.each([
        ['no state', null],
        ['another page state', { url: 'x' }],
        ['a key that is not text', { zoomFrom: 1 }],
    ])('should read no tile from %s', (_, state) => {
        expect(zoomFromState(state)).toBeNull();
    });
});

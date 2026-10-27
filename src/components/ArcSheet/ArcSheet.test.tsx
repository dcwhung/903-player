import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import type { ArcSummary } from '../../selectors/arcProgress';
import type { SeriesEpisode } from '../../types/drama';
import { ArcSheet } from './ArcSheet';
import { SHEET_SLIDE_MS } from './sheetDrag';

const ep = (arc: string, no: number, title?: string): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'chisee',
    url: `/${arc}-${no}.m4a`,
    arc,
    no,
    ...(title ? { title } : {}),
});

const summary = (
    arc: string,
    overrides: Partial<ArcSummary> & Pick<ArcSummary, 'state' | 'resume'>,
): ArcSummary => ({ arc, total: 4, watched: 0, isNew: false, resumeAt: 0, ...overrides });

const PLAYING = summary('好朋友手牽手', {
    watched: 1,
    state: 'started',
    resume: ep('好朋友手牽手', 2, '朋友不同'),
    resumeAt: 200,
});
const FRESH = summary('青春期眞神奇', {
    total: 3,
    state: 'new',
    isNew: true,
    resume: ep('青春期眞神奇', 1),
});
const UNPLAYED = summary('小苦妹撲水', { state: 'new', resume: ep('小苦妹撲水', 1) });
const NEXT = summary('青春期', { watched: 1, state: 'started', resume: ep('青春期', 2) });
const DONE = summary('大妒忌', {
    total: 3,
    watched: 3,
    state: 'done',
    resume: ep('大妒忌', 1),
});

const GROUPS = [
    { group: 'playing' as const, items: [PLAYING] },
    { group: 'new' as const, items: [FRESH] },
    { group: 'unfinished' as const, items: [UNPLAYED, NEXT] },
    { group: 'done' as const, items: [DONE] },
];

const renderSheet = (overrides: Partial<Parameters<typeof ArcSheet>[0]> = {}) => {
    const props = {
        open: true,
        groups: GROUPS,
        current: ep('好朋友手牽手', 2, '朋友不同'),
        isPlaying: true,
        onPick: vi.fn(),
        onPlay: vi.fn(),
        onClose: vi.fn(),
        coverOf: (s: ArcSummary) => `/covers/${s.arc}.webp`,
        ...overrides,
    };
    render(<ArcSheet {...props} />);
    return props;
};

const picks = () =>
    within(screen.getByRole('dialog'))
        .getAllByRole('button')
        .filter((b) => b.dataset.role === 'pick');

describe('ArcSheet', () => {
    it('renders nothing while closed', () => {
        renderSheet({ open: false });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('titles itself 全集 and counts finished 短篇', () => {
        renderSheet();

        const dialog = screen.getByRole('dialog', { name: '全集' });
        expect(within(dialog).getByText('聽完 1 / 5 個')).toBeInTheDocument();
    });

    it('lists the groups in order with their headings, playing first and finished last', () => {
        renderSheet();

        expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
            '播放中',
            '新上架',
            '未聽完',
            '已聽完',
        ]);
        expect(picks().map((b) => b.getAttribute('aria-label'))).toEqual([
            '好朋友手牽手，播緊第 2 集，聽完 1 / 4 集',
            '青春期眞神奇，未聽 · 3 集，新上架',
            '小苦妹撲水，未聽 · 4 集',
            '青春期，下一集係第 2 集，聽完 1 / 4 集',
            '大妒忌，聽完 · 3 集',
        ]);
        expect(picks()[0]).toHaveAttribute('aria-current', 'true');
        expect(picks()[1]).toHaveTextContent('新');
    });

    it('shows how far an unfinished episode got when it is not playing', () => {
        renderSheet({ current: undefined, isPlaying: false });

        expect(
            screen.getByRole('button', { name: '好朋友手牽手，聽到第 2 集 3:20，聽完 1 / 4 集' }),
        ).toBeInTheDocument();
    });

    it('gives each row a play button that starts, resumes or replays the 短篇', async () => {
        const { onPlay } = renderSheet({ current: undefined, isPlaying: false });

        expect(
            screen.getByRole('button', { name: '續聽 好朋友手牽手 第 2 集' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '播放 小苦妹撲水 第 1 集' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '由第 1 集重聽 大妒忌' }));

        expect(onPlay).toHaveBeenCalledWith(DONE);
    });

    it('turns the playing 短篇’s button into pause', async () => {
        const { onPlay } = renderSheet();

        await userEvent.click(screen.getByRole('button', { name: '暫停 好朋友手牽手' }));

        expect(onPlay).toHaveBeenCalledWith(PLAYING);
    });

    it('picks a 短篇 by its row, and closes with the button, the backdrop or Escape', async () => {
        const { onPick, onClose } = renderSheet();

        await userEvent.click(screen.getByRole('button', { name: '小苦妹撲水，未聽 · 4 集' }));
        expect(onPick).toHaveBeenCalledWith('小苦妹撲水');

        await userEvent.click(screen.getByRole('button', { name: '關閉' }));
        await userEvent.click(screen.getByTestId('arc-sheet-backdrop'));
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('shows each 短篇’s own cover inside its progress ring, hidden from screen readers', () => {
        renderSheet();

        // 碟面係裝飾：alt=""、唔入讀屏（狀態已經喺行嘅 aria-label）
        expect(picks().map((b) => b.querySelector('img')?.getAttribute('src'))).toEqual([
            '/covers/好朋友手牽手.webp',
            '/covers/青春期眞神奇.webp',
            '/covers/小苦妹撲水.webp',
            '/covers/青春期.webp',
            '/covers/大妒忌.webp',
        ]);
        picks().forEach((b) => expect(b.querySelector('img')).toHaveAttribute('alt', ''));
        expect(within(picks()[0]!).queryByRole('img')).not.toBeInTheDocument();
    });

    it('passes the whole summary to coverOf, so a 短篇 without a disc can fall back', () => {
        const coverOf = vi.fn(() => '/drama-disc.webp');
        renderSheet({ coverOf });

        expect(coverOf).toHaveBeenCalledWith(UNPLAYED);
        picks().forEach((b) =>
            expect(b.querySelector('img')).toHaveAttribute('src', '/drama-disc.webp'),
        );
    });

    it('counts watched / total in a pill under the cover until the 短篇 is finished', () => {
        renderSheet();
        const [playing, fresh, , , done] = picks();

        expect(within(playing!).getByText('1/4')).toHaveAttribute('data-role', 'count');
        expect(within(fresh!).getByText('0/3')).toHaveAttribute('data-role', 'count');
        // 聽完：冇 pill，改出 ✓
        expect(done!.querySelector('[data-role="count"]')).toBeNull();
        expect(done!.querySelector('[data-role="done"]')).not.toBeNull();
        expect(playing!.querySelector('[data-role="done"]')).toBeNull();
    });

    it('moves focus into the sheet when it opens', () => {
        renderSheet();
        expect(screen.getByRole('dialog')).toHaveFocus();
    });
});

describe('ArcSheet pull down to close', () => {
    const SHEET_HEIGHT = 400;
    /** 拉過 25% 表高（100px） */
    const FAR_PX = 150;
    /** 拉唔夠 25%，亦唔夠甩嘅最少距離 */
    const SHORT_PX = 20;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            height: SHEET_HEIGHT,
        } as DOMRect);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const dialog = () => screen.getByRole('dialog');
    const header = () => within(dialog()).getByRole('heading', { name: '全集' });
    const list = () => dialog().querySelector<HTMLElement>('[data-role="sheet-list"]')!;

    const pull = (target: HTMLElement, distance: number) => {
        fireEvent.pointerDown(target, { clientY: 100, pointerId: 1, button: 0 });
        fireEvent.pointerMove(target, { clientY: 100 + distance, pointerId: 1 });
        fireEvent.pointerUp(target, { clientY: 100 + distance, pointerId: 1 });
    };

    const touchPull = (target: HTMLElement, distance: number) => {
        const start = { identifier: 0, clientX: 50, clientY: 100 };
        const end = { ...start, clientY: 100 + distance };
        fireEvent.touchStart(target, { touches: [start], changedTouches: [start] });
        const move = fireEvent.touchMove(target, { touches: [end], changedTouches: [end] });
        fireEvent.touchEnd(target, { touches: [], changedTouches: [end] });
        return move;
    };

    const settle = () => act(() => vi.advanceTimersByTime(SHEET_SLIDE_MS));

    it('closes when the header is pulled down past a quarter of the sheet', () => {
        const { onClose } = renderSheet();

        pull(header(), FAR_PX);
        expect(onClose).not.toHaveBeenCalled();
        settle();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('follows the finger while pulling the header', () => {
        renderSheet();

        fireEvent.pointerDown(header(), { clientY: 100, pointerId: 1, button: 0 });
        fireEvent.pointerMove(header(), { clientY: 160, pointerId: 1 });

        expect(dialog().style.transform).toBe('translateY(60px)');
        expect(dialog()).toHaveAttribute('data-dragging', 'true');
    });

    it('springs back without closing after a short pull', () => {
        const { onClose } = renderSheet();

        pull(header(), SHORT_PX);
        settle();

        expect(onClose).not.toHaveBeenCalled();
        expect(dialog().style.transform).toBe('');
        expect(dialog()).not.toHaveAttribute('data-dragging');
    });

    it('does not lift the sheet when pushed upwards', () => {
        const { onClose } = renderSheet();

        pull(header(), -FAR_PX);
        settle();

        expect(onClose).not.toHaveBeenCalled();
    });

    it('does not fire the close button click after pulling from it', () => {
        const { onClose } = renderSheet();
        const close = within(dialog()).getByRole('button', { name: '關閉' });

        fireEvent.pointerDown(close, { clientY: 100, pointerId: 1, button: 0 });
        fireEvent.pointerMove(close, { clientY: 100 + SHORT_PX, pointerId: 1 });
        fireEvent.pointerUp(close, { clientY: 100 + SHORT_PX, pointerId: 1 });
        fireEvent.click(close, { detail: 1 });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('leaves pointer drags inside the list to scrolling', () => {
        const { onClose } = renderSheet();

        pull(list(), FAR_PX);
        settle();

        expect(onClose).not.toHaveBeenCalled();
    });

    it('takes over a downward touch pull in the list once it is scrolled to the top', () => {
        const { onClose } = renderSheet();

        const notCancelled = touchPull(list(), FAR_PX);
        settle();

        // touchmove preventDefault：瀏覽器唔會同時捲清單
        expect(notCancelled).toBe(false);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps scrolling the list when it is not at the top', () => {
        const { onClose } = renderSheet();
        list().scrollTop = 80;

        const notCancelled = touchPull(list(), FAR_PX);
        settle();

        expect(notCancelled).toBe(true);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('also pulls down to close when docked beside the player (landscape)', () => {
        const { onClose } = renderSheet({ docked: true });

        pull(header(), FAR_PX);
        settle();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    /** fireEvent 設唔到 timeStamp：自己砌 event 再定 timeStamp，計放手速度用（React 當 0 係冇，要 > 0） */
    const timed = (
        type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
        target: HTMLElement,
        clientY: number,
        t: number,
        pointerId = 1,
    ) => {
        const event = createEvent[type](target, { clientY, pointerId, button: 0 });
        Object.defineProperty(event, 'timeStamp', { value: t });
        fireEvent(target, event);
    };

    const finger = (identifier: number, clientY: number, clientX = 50) => ({
        identifier,
        clientX,
        clientY,
    });

    it('closes on a quick short downward flick', () => {
        const { onClose } = renderSheet();

        timed('pointerDown', header(), 100, 1000);
        timed('pointerMove', header(), 140, 1010);
        timed('pointerUp', header(), 140, 1012);
        settle();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('springs back when the finger rests before letting go after a quick pull', () => {
        const { onClose } = renderSheet();

        timed('pointerDown', header(), 100, 1000);
        timed('pointerMove', header(), 140, 1010);
        timed('pointerUp', header(), 140, 3000);
        settle();

        expect(onClose).not.toHaveBeenCalled();
    });

    it('springs back instead of closing when the browser cancels the pull', () => {
        const { onClose } = renderSheet();

        fireEvent.pointerDown(header(), { clientY: 100, pointerId: 1, button: 0 });
        fireEvent.pointerMove(header(), { clientY: 100 + FAR_PX, pointerId: 1 });
        fireEvent.pointerCancel(header(), { pointerId: 1 });
        settle();

        expect(onClose).not.toHaveBeenCalled();
        expect(dialog().style.transform).toBe('');
        expect(dialog()).not.toHaveAttribute('data-dragging');
    });

    it('ignores a second pointer and a cancel from another pointer while pulling', () => {
        renderSheet();

        fireEvent.pointerDown(header(), { clientY: 100, pointerId: 1, button: 0 });
        fireEvent.pointerDown(header(), { clientY: 300, pointerId: 2, button: 0 });
        fireEvent.pointerCancel(header(), { pointerId: 2 });
        fireEvent.pointerMove(header(), { clientY: 160, pointerId: 1 });

        expect(dialog().style.transform).toBe('translateY(60px)');
    });

    it('follows only the first finger in the list and finishes when that finger lifts', () => {
        const { onClose } = renderSheet();
        const first = finger(0, 100);

        fireEvent.touchStart(list(), { touches: [first], changedTouches: [first] });
        fireEvent.touchMove(list(), {
            touches: [finger(0, 250)],
            changedTouches: [finger(0, 250)],
        });
        // 第二隻手指：唔理
        const second = finger(1, 400);
        fireEvent.touchStart(list(), {
            touches: [finger(0, 250), second],
            changedTouches: [second],
        });
        fireEvent.touchMove(list(), {
            touches: [finger(0, 250), finger(1, 420)],
            changedTouches: [finger(1, 420)],
        });
        expect(dialog().style.transform).toBe('translateY(150px)');

        fireEvent.touchEnd(list(), { touches: [finger(1, 420)], changedTouches: [finger(0, 250)] });
        settle();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(dialog()).not.toHaveAttribute('data-dragging');
    });

    it('springs back when the list pull is cancelled by the system', () => {
        const { onClose } = renderSheet();
        const start = finger(0, 100);
        const far = finger(0, 100 + FAR_PX);

        fireEvent.touchStart(list(), { touches: [start], changedTouches: [start] });
        fireEvent.touchMove(list(), { touches: [far], changedTouches: [far] });
        fireEvent.touchCancel(list(), { touches: [], changedTouches: [far] });
        settle();

        expect(onClose).not.toHaveBeenCalled();
        expect(dialog().style.transform).toBe('');
    });

    it('leaves a sideways swipe at the top of the list alone', () => {
        renderSheet();
        const start = finger(0, 100, 50);
        const sideways = finger(0, 110, 150);

        fireEvent.touchStart(list(), { touches: [start], changedTouches: [start] });
        const notCancelled = fireEvent.touchMove(list(), {
            touches: [sideways],
            changedTouches: [sideways],
        });

        expect(notCancelled).toBe(true);
        expect(dialog().style.transform).toBe('');
    });

    it('blocks taps while sliding away after a pull', () => {
        renderSheet();

        pull(header(), FAR_PX);

        expect(dialog()).toHaveAttribute('data-closing', 'true');
    });

    it('closes straight away when reduced motion is on', () => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
        const { onClose } = renderSheet();

        pull(header(), FAR_PX);
        act(() => vi.advanceTimersByTime(0));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    /** 父層真係會將 open 變 false（Escape / ✕），亦可以再打開 */
    const Harness = ({ onClose }: { onClose: () => void }) => {
        const [open, setOpen] = useState(true);
        return (
            <>
                <button type="button" onClick={() => setOpen(true)}>
                    reopen
                </button>
                <ArcSheet
                    open={open}
                    groups={GROUPS}
                    current={undefined}
                    isPlaying={false}
                    onPick={vi.fn()}
                    onPlay={vi.fn()}
                    onClose={() => {
                        onClose();
                        setOpen(false);
                    }}
                    coverOf={() => '/cover.webp'}
                />
            </>
        );
    };

    it('does not close a second time when Escape lands during the slide-away', () => {
        const onClose = vi.fn();
        render(<Harness onClose={onClose} />);

        pull(header(), FAR_PX);
        fireEvent.keyDown(document, { key: 'Escape' });
        settle();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('starts a reopened sheet without the pull that was cut short by closing', () => {
        render(<Harness onClose={vi.fn()} />);

        fireEvent.pointerDown(header(), { clientY: 100, pointerId: 1, button: 0 });
        fireEvent.pointerMove(header(), { clientY: 140, pointerId: 1 });
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.click(screen.getByRole('button', { name: 'reopen' }));
        fireEvent.pointerMove(header(), { clientY: 200, pointerId: 1 });

        expect(dialog().style.transform).toBe('');
    });
});

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { DateStrip } from './DateStrip';
import type { StripNeighbours } from './dateStrip';

const ZONE = { description: '左右方向鍵或左右掃動轉集' };
const DATES = ['19/10（一）', '16/10（五）', '15/10（四）'];

const neighboursAt = (dates: readonly string[], index: number): StripNeighbours => ({
    ...(dates[index - 1] ? { newer: dates[index - 1] } : {}),
    ...(dates[index + 1] ? { older: dates[index + 1] } : {}),
});

interface HarnessProps {
    start?: number;
    onStep?: (d: SwipeDirection) => void;
    dates?: readonly string[];
    /** 模擬 onStep 轉唔到（例如 player 拒絕）：有隔籬集都返回 false */
    refuse?: boolean;
}

/** 模擬節目頁：next = 舊一集（index + 1），previous = 新一集 */
const Harness = ({ start = 1, onStep, dates = DATES, refuse = false }: HarnessProps) => {
    const [index, setIndex] = useState(start);
    const step = (direction: SwipeDirection) => {
        onStep?.(direction);
        const next = direction === 'next' ? index + 1 : index - 1;
        if (refuse || !dates[next]) return false;
        setIndex(next);
        return true;
    };
    return (
        <>
            <DateStrip
                title="Bad Girl大過佬"
                dateLabel={dates[index] ?? ''}
                neighbours={neighboursAt(dates, index)}
                onStep={step}
            />
            <button type="button" onClick={() => setIndex(0)}>
                外面轉集
            </button>
        </>
    );
};

// 慢慢拖（唔當係快速一撥），只靠距離決定轉唔轉
const DRAG_MS = 400;

const drag = (zone: HTMLElement, dx: number) => {
    fireEvent.pointerDown(zone, { clientX: 200, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(zone, { clientX: 200 + dx / 2, clientY: 21, pointerId: 1 });
    vi.advanceTimersByTime(DRAG_MS);
    fireEvent.pointerMove(zone, { clientX: 200 + dx, clientY: 22, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 200 + dx, clientY: 22, pointerId: 1 });
};
const zone = () => screen.getByRole('group', ZONE);
const track = () => zone().firstElementChild as HTMLElement;

describe('DateStrip', () => {
    // 只假 performance.now（量拖幾耐），setTimeout 照用真嘅
    beforeEach(() => vi.useFakeTimers({ toFake: ['performance'] }));
    afterEach(() => vi.useRealTimers());

    it('shows the newer date left, 現正播放 in the centre and the older date right', () => {
        render(<Harness />);

        const newer = screen.getByRole('button', { name: '新一集 19/10（一）' });
        const older = screen.getByRole('button', { name: '舊一集 15/10（四）' });
        expect(newer).toHaveTextContent(/^‹\s*19\/10（一）$/);
        expect(screen.getByText('現正播放：')).toBeInTheDocument();
        expect(older).toHaveTextContent(/^15\/10（四）\s*›$/);
        // 箭咀係裝飾（窄螢幕用 CSS 收埋），唔讀出嚟
        expect(within(newer).getByText('‹')).toHaveAttribute('aria-hidden', 'true');
        expect(within(older).getByText('›')).toHaveAttribute('aria-hidden', 'true');
        expect(zone()).toHaveAccessibleName('16/10（五） Bad Girl大過佬');
    });

    it('leaves the missing side empty at either end', () => {
        render(<Harness start={0} />);

        expect(screen.queryByRole('button', { name: /^新一集/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '舊一集 16/10（五）' })).toBeInTheDocument();
    });

    it('moves the strip with the finger while dragging', () => {
        render(<Harness />);
        fireEvent.pointerDown(zone(), { clientX: 200, clientY: 20, pointerId: 1 });
        fireEvent.pointerMove(zone(), { clientX: 170, clientY: 20, pointerId: 1 });

        expect(track().style.transform).toBe('translateX(-30px)');
    });

    it('plays the older episode on a left swipe and the newer one on a right swipe', async () => {
        const onStep = vi.fn();
        render(<Harness onStep={onStep} />);

        drag(zone(), -100);
        await waitFor(() => expect(zone()).toHaveAccessibleName(/^15\/10（四）/));
        drag(zone(), 100);
        await waitFor(() => expect(zone()).toHaveAccessibleName(/^16\/10（五）/));

        expect(onStep.mock.calls).toEqual([['next'], ['previous']]);
    });

    it('springs back from a short drag without changing episode', async () => {
        const onStep = vi.fn();
        render(<Harness onStep={onStep} />);

        drag(zone(), -20);

        expect(track().style.transform).toBe('translateX(0px)');
        expect(onStep).not.toHaveBeenCalled();
    });

    it('springs back at either end instead of stepping past it', () => {
        const onStep = vi.fn();
        render(<Harness start={0} onStep={onStep} />);

        drag(zone(), 120);

        expect(track().style.transform).toBe('translateX(0px)');
        expect(onStep).not.toHaveBeenCalled();
        expect(zone()).toHaveAccessibleName(/^19\/10（一）/);
    });

    it('changes episode when a side cell is tapped', async () => {
        render(<Harness />);

        await userEvent.click(screen.getByRole('button', { name: '新一集 19/10（一）' }));

        await waitFor(() => expect(zone()).toHaveAccessibleName(/^19\/10（一）/));
    });

    it('swallows the click after a swipe released without any pointermove', () => {
        const onStep = vi.fn();
        render(<Harness onStep={onStep} />);
        const newer = screen.getByRole('button', { name: '新一集 19/10（一）' });

        // 有啲瀏覽器 / 輔助工具冇 pointermove：撳喺側格向左撥，放手後仲會發 click
        fireEvent.pointerDown(newer, { clientX: 200, clientY: 20, pointerId: 1 });
        vi.advanceTimersByTime(DRAG_MS);
        fireEvent.pointerUp(newer, { clientX: 100, clientY: 20, pointerId: 1 });
        fireEvent.click(newer, { detail: 1 });

        expect(onStep.mock.calls).toEqual([['next']]);
    });

    it('steps with the arrow keys only when the strip itself is focused', async () => {
        const onStep = vi.fn();
        render(<Harness onStep={onStep} />);

        screen.getByRole('button', { name: '舊一集 15/10（四）' }).focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onStep).not.toHaveBeenCalled();

        zone().focus();
        await userEvent.keyboard('{ArrowRight}');
        await waitFor(() => expect(onStep).toHaveBeenCalledWith('next'));
    });

    it('announces only the changes the strip caused', async () => {
        render(<Harness />);
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');

        drag(zone(), -100);
        await waitFor(() => expect(status).toHaveTextContent('已轉到 15/10（四）'));

        await userEvent.click(screen.getByRole('button', { name: '外面轉集' }));
        expect(status).toBeEmptyDOMElement();
    });

    describe('on a measured 400px strip', () => {
        // jsdom 冇 layout：假裝日子條有 400px 闊，轉集時真係會滑 150px
        beforeEach(() => {
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
        });
        afterEach(() => vi.restoreAllMocks());

        it('settles and announces when the next episode has the same date label', async () => {
            // 同一日兩集（例如重播）：日期唔變都要歸位同讀出嚟
            render(<Harness dates={['19/10（一）', '16/10（五）', '16/10（五）']} />);
            const status = screen.getByRole('status');

            drag(zone(), -100);

            await waitFor(() => expect(status).toHaveTextContent('已轉到 16/10（五）'));
            expect(track().style.transform).toBe('translateX(0px)');
            expect(screen.queryByRole('button', { name: /^舊一集/ })).not.toBeInTheDocument();
        });

        it('switches on release and slides the new date in from where the old neighbour was', () => {
            const onStep = vi.fn();
            render(<Harness onStep={onStep} />);
            // 記低每次改 style 之前嘅值（同步讀 takeRecords，唔使等 observer callback）
            const observer = new MutationObserver(() => undefined);
            observer.observe(track(), { attributeFilter: ['style'], attributeOldValue: true });

            drag(zone(), -100);
            const moves = observer.takeRecords().map((record) => record.oldValue ?? '');
            observer.disconnect();

            // 即刻播（唔使等滑完）：新日期由舊一集原本位置（-100 + 150）滑返中間
            expect(onStep).toHaveBeenCalledWith('next');
            expect(zone()).toHaveAccessibleName(/^15\/10（四）/);
            expect(moves.some((style) => style.includes('translateX(50px)'))).toBe(true);
            expect(track().style.transform).toBe('translateX(0px)');
        });

        it('morphs the arriving cells from side-cell style while sliding in', () => {
            render(<Harness />);
            const observer = new MutationObserver(() => undefined);
            observer.observe(track(), { attributeFilter: ['data-arriving'] });

            drag(zone(), -100);
            const flips = observer.takeRecords().length;
            observer.disconnect();

            // 起點套用側格樣式（data-arriving），即刻拎走等 CSS transition 過渡返正常樣式
            expect(flips).toBe(2);
            expect(track()).not.toHaveAttribute('data-arriving');
        });

        it('settles back when onStep cannot switch', async () => {
            const onStep = vi.fn();
            render(<Harness refuse onStep={onStep} />);

            drag(zone(), -100);

            await waitFor(() => expect(onStep).toHaveBeenCalledWith('next'));
            await waitFor(() => expect(track().style.transform).toBe('translateX(0px)'));
            expect(zone()).toHaveAccessibleName(/^16\/10（五）/);
            expect(screen.getByRole('status')).toBeEmptyDOMElement();
        });
    });

    it('swaps instantly without a spin when reduced motion is requested', () => {
        const matchMedia = vi.fn().mockReturnValue({ matches: true });
        vi.stubGlobal('matchMedia', matchMedia);
        try {
            render(<Harness />);
            act(() => drag(zone(), -100));

            expect(zone()).toHaveAccessibleName(/^15\/10（四）/);
            expect(track().style.transform).toBe('translateX(0px)');
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

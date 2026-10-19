import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { DateStrip } from './DateStrip';
import type { StripNeighbours } from './dateStrip';

const ZONE = { description: '左右方向鍵或左右掃動轉集' };
const DATES = ['19/10（一）', '16/10（五）', '15/10（四）'];

const neighboursAt = (index: number): StripNeighbours => ({
    ...(DATES[index - 1] ? { newer: DATES[index - 1] } : {}),
    ...(DATES[index + 1] ? { older: DATES[index + 1] } : {}),
});

/** 模擬節目頁：next = 舊一集（index + 1），previous = 新一集 */
const Harness = ({
    start = 1,
    onStep,
}: {
    start?: number;
    onStep?: (d: SwipeDirection) => void;
}) => {
    const [index, setIndex] = useState(start);
    const step = (direction: SwipeDirection) => {
        onStep?.(direction);
        const next = direction === 'next' ? index + 1 : index - 1;
        if (!DATES[next]) return false;
        setIndex(next);
        return true;
    };
    return (
        <>
            <DateStrip
                title="Bad Girl大過佬"
                dateLabel={DATES[index] ?? ''}
                neighbours={neighboursAt(index)}
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

        expect(screen.getByRole('button', { name: '新一集 19/10（一）' })).toHaveTextContent(
            '‹ 19/10（一）',
        );
        expect(screen.getByText('現正播放：')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '舊一集 15/10（四）' })).toHaveTextContent(
            '15/10（四） ›',
        );
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

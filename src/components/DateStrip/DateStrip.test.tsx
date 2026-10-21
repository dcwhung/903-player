import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { recording } from '../../../tests/renderWithProviders';
import { formatDateLabel } from '../../utils/date';
import { DateStrip } from './DateStrip';
import { stripDays } from './dateStrip';

const ZONE = { description: '左右方向鍵或左右掃動轉集' };
// 新一集喺左：24–22/10 留空、21/10、20/10、19/10、18–17/10 冇節目、16/10、15/10、14–12/10 留空
const EPISODES = [
    recording('badgirl', '2026-10-21'),
    recording('badgirl', '2026-10-20'),
    recording('badgirl', '2026-10-19'),
    recording('badgirl', '2026-10-16'),
    recording('badgirl', '2026-10-15'),
];
const urlOn = (date: string) => EPISODES.find((r) => r.date === date)?.url ?? '';
const ON_19 = 5;

interface HarnessProps {
    start?: string;
    onPick?: (url: string) => void;
    onHold?: (held: boolean) => void;
}

/** 模擬節目頁：揀咗邊日就播嗰集 */
const Harness = ({ start = '2026-10-19', onPick, onHold }: HarnessProps) => {
    const [url, setUrl] = useState(urlOn(start));
    const { days, current } = stripDays(EPISODES, url);
    const date = EPISODES.find((r) => r.url === url)?.date ?? '';
    const pick = (next: string) => {
        onPick?.(next);
        setUrl(next);
    };
    return (
        <>
            <DateStrip
                title="Bad Girl大過佬"
                dateLabel={formatDateLabel(date)}
                days={days}
                current={current}
                onPick={pick}
                onHold={onHold}
            />
            <button type="button" onClick={() => setUrl(urlOn('2026-10-21'))}>
                外面轉集
            </button>
        </>
    );
};

// 慢慢拖（唔當係快速一撥），只靠停喺邊度決定轉去邊日
const DRAG_MS = 400;
// jsdom 冇 layout：日子條闊度係 0，一格用 56px 計
const CELL_PX = 56;

const drag = (zone: HTMLElement, dx: number) => {
    fireEvent.pointerDown(zone, { clientX: 200, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(zone, { clientX: 200 + dx / 2, clientY: 21, pointerId: 1 });
    vi.advanceTimersByTime(DRAG_MS);
    fireEvent.pointerMove(zone, { clientX: 200 + dx, clientY: 22, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 200 + dx, clientY: 22, pointerId: 1 });
};
const zone = () => screen.getByRole('group', ZONE);
const track = () => zone().firstElementChild as HTMLElement;
const settledAt = (index: number) => `translateX(calc(${3 - index} * 100% / 7 + 0px))`;

describe('DateStrip', () => {
    // 只假 performance.now（量拖幾耐），setTimeout 照用真嘅
    beforeEach(() => vi.useFakeTimers({ toFake: ['performance'] }));
    afterEach(() => vi.useRealTimers());

    it('lays the days out newest first with the playing day in the middle', () => {
        render(<Harness />);

        const cells = Array.from(track().children).map((cell) => cell.textContent);
        expect(cells).toEqual([
            ...['', '', ''],
            ...['三21/10', '二20/10', '一19/10', '日18/10', '六17/10', '五16/10', '四15/10'],
            ...['', '', ''],
        ]);
        expect(track().children[ON_19]).toHaveAttribute('aria-current', 'date');
        expect(track().style.transform).toBe(settledAt(ON_19));
        expect(zone()).toHaveAccessibleName('19/10（一） Bad Girl大過佬');
    });

    it('labels 現正播放 above the strip, without the date', () => {
        render(<Harness />);

        const label = screen.getByText('現正播放');
        expect(label).toHaveTextContent(/^現正播放$/);
        expect(zone()).not.toContainElement(label);
        expect(label.compareDocumentPosition(zone())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('greys out days without an episode so they cannot be picked', () => {
        render(<Harness />);

        const sunday = track().children[6] as HTMLElement;
        expect(sunday.tagName).toBe('SPAN');
        expect(sunday).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByRole('button', { name: '轉去 16/10（五）' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /18\/10/ })).not.toBeInTheDocument();
    });

    it('moves the strip with the finger while dragging', () => {
        render(<Harness />);
        fireEvent.pointerDown(zone(), { clientX: 200, clientY: 20, pointerId: 1 });
        fireEvent.pointerMove(zone(), { clientX: 170, clientY: 20, pointerId: 1 });

        expect(track().style.transform).toBe('translateX(calc(-2 * 100% / 7 + -30px))');
    });

    it('starts a fresh drag after a mouse press was released outside the strip', () => {
        render(<Harness />);
        const mouse = { pointerId: 1, pointerType: 'mouse', buttons: 1 };
        // 撳落未過 slop 就拖出去放手：pointerup 唔會返到日子條
        fireEvent.pointerDown(zone(), { clientX: 200, clientY: 20, ...mouse });
        fireEvent.pointerMove(zone(), { clientX: 203, clientY: 20, ...mouse });

        fireEvent.pointerDown(zone(), { clientX: 100, clientY: 20, ...mouse });
        fireEvent.pointerMove(zone(), { clientX: 70, clientY: 20, ...mouse });

        expect(track().style.transform).toBe('translateX(calc(-2 * 100% / 7 + -30px))');
    });

    it('ignores mouse hover moves after a press was released outside the strip', () => {
        const onHold = vi.fn();
        render(<Harness onHold={onHold} />);
        const mouse = { pointerId: 1, pointerType: 'mouse' };
        fireEvent.pointerDown(zone(), { clientX: 200, clientY: 20, buttons: 1, ...mouse });
        fireEvent.pointerMove(zone(), { clientX: 203, clientY: 20, buttons: 1, ...mouse });

        // 喺條外面放咗手（冇 pointerup），之後滑鼠冇撳掣咁經過
        fireEvent.pointerMove(zone(), { clientX: 240, clientY: 20, buttons: 0, ...mouse });

        expect(track().style.transform).toBe(settledAt(ON_19));
        expect(onHold).not.toHaveBeenCalled();
    });

    it('plays the day the strip is let go on, skipping days without an episode', async () => {
        const onPick = vi.fn();
        render(<Harness onPick={onPick} />);

        // 向左拖兩格停喺 17/10（冇節目）：最近有節目係 16/10
        drag(zone(), -2 * CELL_PX);
        await waitFor(() => expect(zone()).toHaveAccessibleName(/^16\/10（五）/));
        // 向右拖四格返去 20/10
        drag(zone(), 4 * CELL_PX);
        await waitFor(() => expect(zone()).toHaveAccessibleName(/^20\/10（二）/));

        expect(onPick.mock.calls).toEqual([[urlOn('2026-10-16')], [urlOn('2026-10-20')]]);
        expect(track().style.transform).toBe(settledAt(4));
    });

    it('animates back to the middle of the playing day after a short drag', () => {
        const onPick = vi.fn();
        render(<Harness onPick={onPick} />);

        drag(zone(), -20);

        expect(track().style.transform).toBe(settledAt(ON_19));
        expect(track().style.transition).toBe('');
        expect(onPick).not.toHaveBeenCalled();
    });

    it('springs back at the newest episode instead of stepping past it', () => {
        const onPick = vi.fn();
        render(<Harness start="2026-10-21" onPick={onPick} />);

        drag(zone(), 2 * CELL_PX);

        expect(track().style.transform).toBe(settledAt(3));
        expect(onPick).not.toHaveBeenCalled();
        expect(zone()).toHaveAccessibleName(/^21\/10（三）/);
    });

    it('plays a day that is tapped', async () => {
        const onPick = vi.fn();
        render(<Harness onPick={onPick} />);

        await userEvent.click(screen.getByRole('button', { name: '轉去 21/10（三）' }));

        expect(onPick).toHaveBeenCalledWith(urlOn('2026-10-21'));
        await waitFor(() => expect(zone()).toHaveAccessibleName(/^21\/10（三）/));
        expect(track().style.transform).toBe(settledAt(3));
    });

    it('swallows the click after a swipe released without any pointermove', () => {
        const onPick = vi.fn();
        render(<Harness onPick={onPick} />);
        const newer = screen.getByRole('button', { name: '轉去 20/10（二）' });

        // 有啲瀏覽器 / 輔助工具冇 pointermove：撳喺日子向左撥，放手後仲會發 click
        fireEvent.pointerDown(newer, { clientX: 200, clientY: 20, pointerId: 1 });
        vi.advanceTimersByTime(DRAG_MS);
        fireEvent.pointerUp(newer, { clientX: 200 - 3 * CELL_PX, clientY: 20, pointerId: 1 });
        fireEvent.click(newer, { detail: 1 });

        expect(onPick.mock.calls).toEqual([[urlOn('2026-10-16')]]);
    });

    it('steps to the newer day with ← and the older day with → when the strip is focused', async () => {
        const onPick = vi.fn();
        render(<Harness onPick={onPick} />);

        screen.getByRole('button', { name: '外面轉集' }).focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onPick).not.toHaveBeenCalled();

        zone().focus();
        await userEvent.keyboard('{ArrowRight}');
        await waitFor(() => expect(onPick).toHaveBeenLastCalledWith(urlOn('2026-10-16')));
        await userEvent.keyboard('{ArrowLeft}');
        await waitFor(() => expect(onPick).toHaveBeenLastCalledWith(urlOn('2026-10-19')));
    });

    it('announces only the changes the strip caused', async () => {
        render(<Harness />);
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');

        drag(zone(), -2 * CELL_PX);
        await waitFor(() => expect(status).toHaveTextContent('已轉到 16/10（五）'));

        await userEvent.click(screen.getByRole('button', { name: '外面轉集' }));
        expect(status).toBeEmptyDOMElement();
        expect(track().style.transform).toBe(settledAt(3));
    });

    it('settles instantly when reduced motion is requested', () => {
        const matchMedia = vi.fn().mockReturnValue({ matches: true });
        vi.stubGlobal('matchMedia', matchMedia);
        try {
            render(<Harness />);
            act(() => drag(zone(), -2 * CELL_PX));

            expect(zone()).toHaveAccessibleName(/^16\/10（五）/);
            expect(track().style.transform).toBe(settledAt(8));
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { saveProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { ShowPage } from './ShowPage';

const RECORDINGS = [
    recording('gongzi', '2026-10-17'),
    recording('gongzi', '2026-10-03'),
    recording('gongzi', '2026-10-10'),
    recording('badgirl', '2026-10-19', '1000'),
];
const ROUTE = { route: '/show/gongzi', path: '/show/:showId' };
const SWIPE_ZONE = { description: '左右方向鍵或左右掃動轉集' };
// 掃一格：jsdom 冇 layout，日子條一格當 56px（公子會逢星期六，一格一集）
const SWIPE_PX = 56;

/** 喺轉集區左右掃一下（dx < 0 = 向左） */
const swipe = (zone: HTMLElement, dx: number) => {
    fireEvent.pointerDown(zone, { clientX: 200, clientY: 100 });
    fireEvent.pointerUp(zone, { clientX: 200 + dx, clientY: 102 });
};
const currentRow = () => screen.getByRole('button', { current: true });

describe('ShowPage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    it('autoplays the latest episode when opened directly', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        expect(audio.play).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: '公子會' })).toBeInTheDocument();
    });

    it('puts the show name in the header instead of 正在播放 and under the disc', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));

        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('公子會');
        expect(headings[0]?.closest('header')).not.toBeNull();
        expect(screen.queryByText('正在播放')).not.toBeInTheDocument();
    });

    it('reads 現正播放 and lists only the Saturdays of a weekly show, without greyed-out days', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        await userEvent.click(screen.getByRole('button', { name: /^(?:播放|暫停) 10\/10/ }));
        act(() => audio.emitMetadata(2400));

        const zone = screen.getByRole('group', SWIPE_ZONE);
        expect(screen.getByText('現正播放')).toHaveTextContent(/^現正播放$/);
        expect(zone).toHaveAccessibleName(/^10\/10（六）/);
        // 公子會逢星期六：隔籬格就係 17/10 同 03/10，中間冇灰色平日
        const days = Array.from(zone.firstElementChild?.children ?? [])
            .map((cell) => cell.textContent)
            .filter(Boolean);
        expect(days).toEqual(['六17/10', '六10/10', '六03/10']);
        expect(screen.getByRole('button', { name: '轉去 17/10（六）' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '轉去 03/10（六）' })).toBeInTheDocument();
    });

    it('plays a newer episode when its day is tapped in the strip', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        await userEvent.click(screen.getByRole('button', { name: /^(?:播放|暫停) 03\/10/ }));

        await userEvent.click(screen.getByRole('button', { name: '轉去 10/10（六）' }));

        await waitFor(() => expect(audio.src).toBe(RECORDINGS[2]?.url));
        expect(audio.play).toHaveBeenLastCalledWith();
    });

    it('lists this show’s episodes newest first with their progress', async () => {
        saveProgress(RECORDINGS[1]?.url ?? '', 990, 1000);
        saveProgress(RECORDINGS[2]?.url ?? '', 600, 2400);
        renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        const rows = await screen.findAllByRole('button', { name: /^(?:播放|暫停) \d/ });
        expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
            // 未讀到時長：唔顯示 0:00 / 0:00
            '暫停 17/10 星期六，連線中…',
            '播放 10/10 星期六，聽到 10:00',
            '播放 03/10 星期六，已收聽',
        ]);
        expect(rows[0]).toHaveAttribute('aria-current', 'true');
        expect(screen.getByText('共 3 集')).toBeInTheDocument();
    });

    it('plays the episode that is tapped', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        await userEvent.click(await screen.findByRole('button', { name: /^(?:播放|暫停) 10\/10/ }));

        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(screen.getByRole('button', { name: /^(?:播放|暫停) 10\/10/ })).toHaveAttribute(
            'aria-current',
            'true',
        );
    });

    it('pauses when the playing episode row is tapped, and resumes on the next tap', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(currentRow()).toHaveAccessibleName(/^暫停 17\/10/));

        await userEvent.click(currentRow());

        expect(audio.pause).toHaveBeenCalled();
        expect(audio.src).toBe(RECORDINGS[0]?.url);
        await waitFor(() => expect(currentRow()).toHaveAccessibleName(/^播放 17\/10/));

        await userEvent.click(currentRow());

        await waitFor(() => expect(currentRow()).toHaveAccessibleName(/^暫停 17\/10/));
    });

    it('plays the next older episode on a left swipe under the player', async () => {
        saveProgress(RECORDINGS[2]?.url ?? '', 600, 2400);
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));

        swipe(screen.getByRole('group', SWIPE_ZONE), -SWIPE_PX);

        await waitFor(() => expect(audio.src).toBe(RECORDINGS[2]?.url));
        act(() => audio.emitMetadata(2400));
        // 同撳集數一樣：未聽完嘅續播並且即刻播
        expect(audio.currentTime).toBe(600);
        expect(audio.play).toHaveBeenLastCalledWith();
        expect(currentRow()).toHaveAccessibleName(/^(?:播放|暫停) 10\/10/);
    });

    it('names the swipe zone after the episode and announces each switch politely', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        const zone = screen.getByRole('group', SWIPE_ZONE);
        const announcer = screen.getByRole('status');
        expect(zone).toHaveAccessibleName('17/10（六） 公子會');
        expect(announcer).toHaveAttribute('aria-live', 'polite');
        expect(announcer).toBeEmptyDOMElement();

        swipe(zone, -SWIPE_PX);

        await waitFor(() => expect(announcer).toHaveTextContent('已轉到 10/10（六）'));
        expect(zone).toHaveAccessibleName('10/10（六） 公子會');
    });

    it('does not announce an episode change made by tapping a row after a swipe', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        const announcer = screen.getByRole('status');
        swipe(screen.getByRole('group', SWIPE_ZONE), -SWIPE_PX);
        await waitFor(() => expect(announcer).toHaveTextContent('已轉到 10/10（六）'));

        await userEvent.click(screen.getByRole('button', { name: /^(?:播放|暫停) 03\/10/ }));

        expect(currentRow()).toHaveAccessibleName(/^(?:播放|暫停) 03\/10/);
        expect(announcer).toBeEmptyDOMElement();
    });

    it('announces nothing when a swipe at either end changes nothing', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        const zone = screen.getByRole('group', SWIPE_ZONE);
        const announcer = screen.getByRole('status');

        // 最新一集再向右掃：唔郁，之後撳清單轉集都唔應該當係掃出嚟
        swipe(zone, SWIPE_PX);
        expect(announcer).toBeEmptyDOMElement();
        await userEvent.click(screen.getByRole('button', { name: /^(?:播放|暫停) 03\/10/ }));
        expect(announcer).toBeEmptyDOMElement();

        // 最舊一集再向左掃
        swipe(zone, -SWIPE_PX);
        expect(announcer).toBeEmptyDOMElement();
    });

    it('plays the next newer episode on a right swipe and stops at either end', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        const zone = screen.getByRole('group', SWIPE_ZONE);

        swipe(zone, SWIPE_PX);
        expect(audio.src).toBe(RECORDINGS[0]?.url);

        swipe(zone, -SWIPE_PX);
        swipe(zone, -SWIPE_PX);
        swipe(zone, -SWIPE_PX);
        await waitFor(() => expect(currentRow()).toHaveAccessibleName(/^(?:播放|暫停) 03\/10/));

        swipe(zone, SWIPE_PX);
        await waitFor(() => expect(currentRow()).toHaveAccessibleName(/^(?:播放|暫停) 10\/10/));
    });

    it('switches episodes with the arrow keys when the swipe zone is focused', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        const zone = screen.getByRole('group', SWIPE_ZONE);
        expect(zone).toHaveAttribute('aria-roledescription', '轉集');

        zone.focus();
        await userEvent.keyboard('{ArrowRight}');
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[2]?.url));
        await userEvent.keyboard('{ArrowLeft}');
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
    });

    it('scrolls the current episode inside the list panel, not the page', async () => {
        renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        const region = await screen.findByRole('region', { name: '集數' });
        const list = within(region).getByRole('list');
        await waitFor(() => expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled());
        const scrolled = vi.mocked(HTMLElement.prototype.scrollTo).mock.contexts;
        expect(scrolled.every((el) => el === list)).toBe(true);
        expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it('uses the show’s own colour theme', async () => {
        renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        const main = await screen.findByRole('main');
        expect(main.closest('[data-theme-scope]')).toHaveStyle({ '--theme-accent': '#d4af5a' });
    });

    it('goes back home (home itself pauses playback)', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.play).toHaveBeenCalled());

        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));

        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    });

    it('shows loading while the first probe runs, then the empty state without a retry button', async () => {
        let finishProbe: (found: Recording[]) => void = () => {};
        const prober = () =>
            new Promise<Recording[]>((resolve) => {
                finishProbe = resolve;
            });
        renderWithProviders(<ShowPage />, { ...ROUTE, prober });

        expect(screen.getByRole('status')).toHaveTextContent('載入中…');
        await act(async () => finishProbe([]));
        expect(await screen.findByText('暫時未有錄音')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '重試' })).not.toBeInTheDocument();
    });

    it('says it is still searching, not empty, while the first probe runs for a show with nothing stored', async () => {
        let finishProbe: (found: Recording[]) => void = () => {};
        const prober = () =>
            new Promise<Recording[]>((resolve) => {
                finishProbe = resolve;
            });
        const otherShowOnly = [recording('badgirl', '2026-10-19', '1000')];
        renderWithProviders(<ShowPage />, { ...ROUTE, recordings: otherShowOnly, prober });

        expect(screen.getByRole('status')).toHaveTextContent('搵緊最新錄音…');
        expect(screen.queryByText('暫時未有錄音')).not.toBeInTheDocument();
        await act(async () => finishProbe([]));
        expect(await screen.findByText('暫時未有錄音')).toBeInTheDocument();
    });

    it('handles unknown shows', () => {
        renderWithProviders(<ShowPage />, { route: '/show/nope', path: '/show/:showId' });

        expect(screen.getByText('找不到此節目')).toBeInTheDocument();
    });
});

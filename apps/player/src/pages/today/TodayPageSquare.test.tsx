import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShowConfig } from '@903-player/catalog';
import { stubViewport } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { TodayPage } from './TodayPage';

/** 示範資料：晴朗同 Bad Girl 有簡介（有 ⓘ），轉節目時 ⓘ 跟住換 */
vi.mock('../../catalog/shows', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/shows')>();
    const SUMMARIES: Record<string, string> = {
        sunnyday: '晴朗示範簡介',
        badgirl: 'Bad Girl 示範簡介',
    };
    const withInfo = (show: ShowConfig | undefined): ShowConfig | undefined =>
        show && SUMMARIES[show.id] ? { ...show, summary: SUMMARIES[show.id] } : show;
    return { ...actual, findShow: (id: string) => withInfo(actual.findShow(id)) };
});

// HomeView 方形螢幕（SQUARE_QUERY）；390×844 = 現有手機直版
const SQUARE = { width: 544, height: 544 };
const PHONE = { width: 390, height: 844 };
// 2026-10-19（一）節目表：晴朗 06:00、Bad Girl 10:00、雲妮 13:00、口水多過浪花 15:10、聖艾粒 17:10（後兩個未上架）
const TODAY = [
    recording('wanni', '2026-10-19', '1300'),
    recording('badgirl', '2026-10-19', '1000'),
    recording('sunnyday', '2026-10-19', '0600'),
];
const ROUTE = { route: '/today', path: '/today', recordings: TODAY };
const SCHEDULE = 5;
const LIST_BUTTON = `節目表，共 ${SCHEDULE} 個節目`;

const selector = () => screen.getByRole('list', { name: '揀今日節目' });

describe('TodayPage HomeView（P10 lane 7a）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        HTMLElement.prototype.scrollTo = vi.fn();
        Element.prototype.scrollIntoView = vi.fn();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should use the plain player with a show selector instead of the card stack and dots', async () => {
        stubViewport(SQUARE);
        renderWithProviders(<TodayPage />, ROUTE);

        await screen.findByRole('list', { name: '揀今日節目' });
        expect(document.querySelector('main')).toHaveAttribute('data-square-player');
        expect(
            screen.queryByRole('group', { name: '今日節目，左右滑動轉節目' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('group', { name: /^今日第/ })).not.toBeInTheDocument();
        expect(screen.getByRole('slider', { name: '播放進度' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '節目表' })).not.toBeInTheDocument();
        expect(within(selector()).getAllByRole('listitem')).toHaveLength(SCHEDULE);
    });

    it('should frame the playing show and grey out shows not up yet', async () => {
        stubViewport(SQUARE);
        const { audio } = renderWithProviders(<TodayPage />, ROUTE);
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));

        act(() => audio.emitMetadata(2400));

        const cells = within(selector()).getAllByRole('button');
        expect(cells.map((cell) => cell.getAttribute('aria-current'))).toEqual([
            'true',
            null,
            null,
            null,
            null,
        ]);
        expect(
            within(selector()).getByRole('button', { name: '口水多過浪花，未上架' }),
        ).toBeDisabled();
        expect(screen.getByText('現正播放：19/10（一）')).toBeInTheDocument();
    });

    it('should switch show when a selector cell is pressed', async () => {
        stubViewport(SQUARE);
        const { audio } = renderWithProviders(<TodayPage />, ROUTE);
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));

        await userEvent.click(within(selector()).getByRole('button', { name: 'Bad Girl大過佬' }));

        expect(audio.src).toBe(TODAY[1]?.url);
        expect(within(selector()).getByRole('button', { name: 'Bad Girl大過佬' })).toHaveAttribute(
            'aria-current',
            'true',
        );
    });

    it('should open today’s schedule from the header list button with the show count', async () => {
        stubViewport(SQUARE);
        renderWithProviders(<TodayPage />, ROUTE);
        const button = await screen.findByRole('button', { name: LIST_BUTTON });
        const header = button.closest('header') as HTMLElement;
        expect(within(header).getByText(String(SCHEDULE))).toBeInTheDocument();

        await userEvent.click(button);

        const sheet = screen.getByRole('dialog', { name: '節目表' });
        expect(within(sheet).getByText('2 個未上架')).toBeInTheDocument();
        expect(within(sheet).getAllByRole('listitem')).toHaveLength(SCHEDULE);
        expect(within(sheet).getByText('17:10 · 未上架')).toBeInTheDocument();
    });

    it('should put ⓘ after the list button and open the info of the current show', async () => {
        stubViewport(SQUARE);
        const { audio } = renderWithProviders(<TodayPage />, ROUTE);
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));
        const header = screen.getByRole('heading', { level: 1 }).closest('header') as HTMLElement;
        expect(
            within(header)
                .getAllByRole('button')
                .map((b) => b.getAttribute('aria-label')),
        ).toEqual(['返回主頁', LIST_BUTTON, '節目資料']);

        await userEvent.click(screen.getByRole('button', { name: '節目資料' }));
        const first = screen.getByRole('dialog', { name: '節目資料' });
        expect(within(first).getByText('晴朗示範簡介')).toBeInTheDocument();
        await userEvent.keyboard('{Escape}');
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: '節目資料' })).not.toBeInTheDocument(),
        );

        await userEvent.click(within(selector()).getByRole('button', { name: 'Bad Girl大過佬' }));
        await userEvent.click(screen.getByRole('button', { name: '節目資料' }));

        const second = screen.getByRole('dialog', { name: '節目資料' });
        expect(within(second).getByText('Bad Girl 示範簡介')).toBeInTheDocument();
    });

    it('should not show ⓘ when the current show has no info', async () => {
        stubViewport(SQUARE);
        const { audio } = renderWithProviders(<TodayPage />, ROUTE);
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));

        await userEvent.click(within(selector()).getByRole('button', { name: '雲妮鍾情' }));

        expect(screen.queryByRole('button', { name: '節目資料' })).not.toBeInTheDocument();
    });

    it('should keep the existing phone today page (card stack, schedule on page, no list button)', async () => {
        stubViewport(PHONE);
        renderWithProviders(<TodayPage />, ROUTE);

        expect(
            await screen.findByRole('group', { name: '今日節目，左右滑動轉節目' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '節目表' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: LIST_BUTTON })).not.toBeInTheDocument();
        expect(screen.queryByRole('list', { name: '揀今日節目' })).not.toBeInTheDocument();
    });
});

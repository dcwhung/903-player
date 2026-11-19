import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShowConfig } from '@903-player/catalog';
import { stubViewport } from '../../../tests/landscape';
import { openWhileOtherLoaded } from '../../../tests/otherPlayback';
import {
    recording,
    renderWithProviders,
    unavailableEpisode,
} from '../../../tests/renderWithProviders';
import { TODAY_INFO_SEEN_STORAGE_KEY } from '../../config/constants';
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
        // 第一次入會自動開今日節目資料（下面另外驗）；其他 test 當已經睇過
        localStorage.setItem(TODAY_INFO_SEEN_STORAGE_KEY, '1');
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
    it('should show the empty player when nothing today is up yet', async () => {
        vi.setSystemTime(new Date('2026-10-20T08:00:00Z'));
        stubViewport(SQUARE);
        renderWithProviders(<TodayPage />, {
            ...ROUTE,
            recordings: [...TODAY, recording('gongzi', '2026-10-17')],
            unavailable: [
                unavailableEpisode('wanni', '2026-10-20', '0708'),
                unavailableEpisode('badgirl', '2026-10-20', '1009'),
            ],
        });

        expect(await screen.findByText('今日節目未上架')).toBeInTheDocument();
        expect(screen.queryByRole('slider', { name: '播放進度' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '節目表，共 5 個節目' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '節目資料' })).not.toBeInTheDocument();
    });

    it('should only browse on a selector tap while something else plays (standby)', async () => {
        stubViewport(SQUARE);
        const other = recording('gongzi', '2026-10-17');
        const { audio } = await openWhileOtherLoaded(<TodayPage />, other, {
            ...ROUTE,
            recordings: [...TODAY, other],
        });
        await screen.findByRole('list', { name: '揀今日節目' });
        expect(audio.src).toBe(other.url);

        await userEvent.click(within(selector()).getByRole('button', { name: 'Bad Girl大過佬' }));

        expect(within(selector()).getByRole('button', { name: 'Bad Girl大過佬' })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(audio.src).toBe(other.url);
    });

    describe('first visit: all of today’s info（用戶 2026-11-18）', () => {
        const ALL_INFO = '節目表';
        const expandedRows = (sheet: HTMLElement) =>
            sheet.querySelectorAll('li[data-today-row][data-expanded="true"]').length;

        beforeEach(() => localStorage.removeItem(TODAY_INFO_SEEN_STORAGE_KEY));

        it('should auto-open today’s schedule with every show’s info and remember it', async () => {
            stubViewport(SQUARE);
            renderWithProviders(<TodayPage />, ROUTE);

            const sheet = await screen.findByRole('dialog', { name: ALL_INFO });
            // 晴朗、Bad Girl 有資料（mock），兩行都展開
            expect(expandedRows(sheet)).toBe(2);
            expect(within(sheet).getByText('晴朗示範簡介')).toBeInTheDocument();
            expect(within(sheet).getByText('Bad Girl 示範簡介')).toBeInTheDocument();
            expect(localStorage.getItem(TODAY_INFO_SEEN_STORAGE_KEY)).not.toBeNull();
            // 頁頭 ⓘ 唔係呢張：佢照舊係而家個節目嘅資料，冇自動彈
            expect(screen.queryByRole('dialog', { name: '節目資料' })).not.toBeInTheDocument();
        });

        it('should not auto-open again once seen', async () => {
            stubViewport(SQUARE);
            const first = renderWithProviders(<TodayPage />, ROUTE);
            await screen.findByRole('dialog', { name: ALL_INFO });
            first.unmount();

            renderWithProviders(<TodayPage />, ROUTE);

            await screen.findByRole('list', { name: '揀今日節目' });
            expect(screen.queryByRole('dialog', { name: ALL_INFO })).not.toBeInTheDocument();
        });

        it('should return focus to the list button when closed with Escape', async () => {
            stubViewport(SQUARE);
            renderWithProviders(<TodayPage />, ROUTE);
            await screen.findByRole('dialog', { name: ALL_INFO });

            await userEvent.keyboard('{Escape}');

            await waitFor(() =>
                expect(screen.queryByRole('dialog', { name: ALL_INFO })).not.toBeInTheDocument(),
            );
            expect(screen.getByRole('button', { name: LIST_BUTTON })).toHaveFocus();
        });

        it('should not move focus to the list button when closed by pointer', async () => {
            stubViewport(SQUARE);
            renderWithProviders(<TodayPage />, ROUTE);
            await screen.findByRole('dialog', { name: ALL_INFO });

            await userEvent.click(screen.getByTestId('list-sheet-backdrop'));

            await waitFor(() =>
                expect(screen.queryByRole('dialog', { name: ALL_INFO })).not.toBeInTheDocument(),
            );
            expect(screen.getByRole('button', { name: LIST_BUTTON })).not.toHaveFocus();
        });

        it('should keep ⓘ as the current show’s info after the auto-open sheet is closed', async () => {
            stubViewport(SQUARE);
            renderWithProviders(<TodayPage />, ROUTE);
            await screen.findByRole('dialog', { name: ALL_INFO });
            await userEvent.keyboard('{Escape}');

            await userEvent.click(screen.getByRole('button', { name: '節目資料' }));

            const info = screen.getByRole('dialog', { name: '節目資料' });
            expect(within(info).getByText('晴朗示範簡介')).toBeInTheDocument();
            expect(within(info).queryByText('Bad Girl 示範簡介')).not.toBeInTheDocument();
        });
    });
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    recording,
    renderWithProviders,
    unavailableEpisode,
} from '../../tests/renderWithProviders';
import { SHOW_THEMES } from '../config/showThemes';
import { saveProgress } from '../services/progressStore';
import { TodayPage } from './TodayPage';

const TODAY = [
    recording('wanni', '2026-10-19', '1300'),
    recording('badgirl', '2026-10-19', '1000'),
    recording('sunnyday', '2026-10-19', '0600'),
];
const RECORDINGS = [...TODAY, recording('gongzi', '2026-10-17')];
const ROUTE = { route: '/today', path: '/today' };

describe('TodayPage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    it('lists today’s shows in broadcast order', async () => {
        renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        const items = await screen.findAllByRole('button', { name: /^(?:播放|暫停) / });
        expect(items.map((i) => i.getAttribute('aria-label')?.split('，')[0])).toEqual([
            '暫停 在晴朗的一天出發',
            '播放 Bad Girl大過佬',
            '播放 雲妮鍾情',
        ]);
    });

    it('should title the page like the show page and keep the card to disc, ring, play and name', async () => {
        renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });
        await screen.findByRole('heading', { name: '在晴朗的一天出發' });

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('今日節目');
        expect(screen.queryByText('19/10（一）')).not.toBeInTheDocument();
        const stack = screen.getByRole('group', { name: '今日節目，左右掃動轉節目' });
        expect(within(stack).getByRole('slider', { name: '播放進度' })).toBeInTheDocument();
        expect(within(stack).getByRole('button', { name: /^(播放|暫停)$/ })).toBeInTheDocument();
        expect(within(stack).queryByRole('group', { name: /^今日第/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /秒$/ })).not.toBeInTheDocument();
    });

    it('autoplays the first show and marks it active', async () => {
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));
        expect(
            screen.getByRole('button', { name: /(?:播放|暫停) 在晴朗的一天出發/ }),
        ).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('heading', { name: '在晴朗的一天出發' })).toBeInTheDocument();
    });

    it('pauses when the playing show row is tapped', async () => {
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });
        const playing = await screen.findByRole('button', { name: /^暫停 在晴朗的一天出發/ });

        await userEvent.click(playing);

        expect(audio.pause).toHaveBeenCalled();
        expect(audio.src).toBe(TODAY[2]?.url);
        await screen.findByRole('button', { name: /^播放 在晴朗的一天出發/ });
    });

    it('leaves swiping to the card stack and renders no episode switcher', async () => {
        renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        await screen.findByRole('heading', { name: '在晴朗的一天出發' });
        expect(screen.getByRole('group', { name: '今日節目，左右掃動轉節目' })).toBeInTheDocument();
        expect(
            screen.queryByRole('group', { description: '左右方向鍵或左右掃動轉集' }),
        ).not.toBeInTheDocument();
        expect(document.querySelector('[aria-roledescription="轉集"]')).toBeNull();
    });

    it('shows watched status and plays the tapped show', async () => {
        saveProgress(TODAY[0]?.url ?? '', 990, 1000);
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        const wanni = await screen.findByRole('button', { name: /播放 雲妮鍾情，已收聽/ });
        await userEvent.click(wanni);

        expect(audio.src).toBe(TODAY[0]?.url);
    });

    it('shows broadcast times and switches show on swipe, in that show’s theme', async () => {
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));
        // 錄音由 storage 同步讀，autoplay 喺 mount 嘅 effect 已經開始，早過 PlayerProvider attach；
        // play event 同真瀏覽器一樣遲啲先發（FakeAudio 用 microtask），所以要等
        expect(await screen.findByText('06:00 · 播放中')).toBeInTheDocument();

        const stack = screen.getByRole('group', { name: '今日節目，左右掃動轉節目' });
        fireEvent.pointerDown(stack, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(stack, { clientX: 150, clientY: 100 });

        await waitFor(() => expect(audio.src).toBe(TODAY[1]?.url));
        expect(screen.getByRole('heading', { name: 'Bad Girl大過佬' })).toBeInTheDocument();
        const dots = screen.getByRole('group', { name: '今日第 2 個節目，共 3 個' });
        expect(within(dots).getByRole('button', { name: 'Bad Girl大過佬' })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.getByRole('main').closest('[data-theme-scope]')).toHaveStyle({
            '--theme-accent': '#f08a24',
        });
    });

    it('should follow the selected show in theme-color when the card stack changes', async () => {
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));
        const themeColor = () =>
            document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
        expect(themeColor()).toBe(SHOW_THEMES.sunnyday.bg);

        const stack = screen.getByRole('group', { name: '今日節目，左右掃動轉節目' });
        fireEvent.pointerDown(stack, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(stack, { clientX: 150, clientY: 100 });

        await waitFor(() => expect(themeColor()).toBe(SHOW_THEMES.badgirl.bg));
    });

    it('should switch show on the arrow keys from the dots below the card stack', async () => {
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));

        screen.getByRole('button', { name: '在晴朗的一天出發' }).focus();
        await userEvent.keyboard('{ArrowRight}');

        await waitFor(() => expect(audio.src).toBe(TODAY[1]?.url));
    });

    it('should wrap from the first show to the last on a right swipe', async () => {
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));

        const stack = screen.getByRole('group', { name: '今日節目，左右掃動轉節目' });
        fireEvent.pointerDown(stack, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(stack, { clientX: 250, clientY: 100 });

        await waitFor(() => expect(audio.src).toBe(TODAY[0]?.url));
        expect(screen.getByRole('heading', { name: '雲妮鍾情' })).toBeInTheDocument();
    });

    it('should stack the next show behind the player without a second player', async () => {
        renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });
        await screen.findByRole('heading', { name: '在晴朗的一天出發' });

        const stack = screen.getByRole('group', { name: '今日節目，左右掃動轉節目' });
        const backs = [...stack.querySelectorAll('[aria-hidden="true"][inert]')];
        expect(backs.map((card) => card.textContent)).toContain('Bad Girl大過佬');
        expect(screen.getAllByRole('slider')).toHaveLength(1);
        expect(document.querySelectorAll('audio')).toHaveLength(0);
    });

    it('falls back to the latest day with recordings', async () => {
        vi.setSystemTime(new Date('2026-10-18T08:00:00Z'));
        renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        expect(await screen.findByRole('heading', { name: '公子會' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /(?:播放|暫停) 公子會/ })).toBeInTheDocument();
    });

    it('lists the rest of today’s schedule as disabled rows in broadcast order', async () => {
        renderWithProviders(<TodayPage />, {
            ...ROUTE,
            recordings: RECORDINGS,
            unavailable: [unavailableEpisode('waves', '2026-10-19', '1510')],
        });

        const row = await screen.findByRole('button', { name: '口水多過浪花，15:10 · 未上架' });
        expect(row).toBeDisabled();
        expect(
            screen.getByRole('button', { name: '聖艾粒LaLaLaLa，17:10 · 未上架' }),
        ).toBeDisabled();
        expect(screen.getByText('2 個未上架')).toBeInTheDocument();
        const list = screen.getByRole('region', { name: '節目表' });
        expect(within(list).getAllByRole('button')).toHaveLength(TODAY.length + 2);
        const dots = screen.getByRole('group', { name: /^今日第/ });
        expect(within(dots).getAllByRole('button')).toHaveLength(TODAY.length);
    });

    describe('when nothing today is up yet', () => {
        const UNAVAILABLE_TODAY = [
            unavailableEpisode('wanni', '2026-10-20', '0708'),
            unavailableEpisode('badgirl', '2026-10-20', '1009'),
        ];
        beforeEach(() => vi.setSystemTime(new Date('2026-10-20T08:00:00Z')));

        it('lists the whole of today greyed out with an empty player instead of an older day', async () => {
            renderWithProviders(<TodayPage />, {
                ...ROUTE,
                recordings: RECORDINGS,
                unavailable: UNAVAILABLE_TODAY,
            });

            expect(await screen.findByText('今日節目未上架')).toBeInTheDocument();
            expect(screen.getByText('上架之後會自動顯示')).toBeInTheDocument();
            expect(screen.getByText('5 個未上架')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '雲妮鍾情，07:08 · 未上架' })).toBeDisabled();
            expect(
                screen.getByRole('button', { name: '聖艾粒LaLaLaLa，17:10 · 未上架' }),
            ).toBeDisabled();
            expect(
                screen.queryByRole('group', { name: '今日節目，左右掃動轉節目' }),
            ).not.toBeInTheDocument();
            expect(screen.queryByRole('group', { name: /^今日第/ })).not.toBeInTheDocument();
        });

        it('does not autoplay an older day', async () => {
            const { audio } = renderWithProviders(<TodayPage />, {
                ...ROUTE,
                recordings: RECORDINGS,
                unavailable: UNAVAILABLE_TODAY,
            });

            await screen.findByText('今日節目未上架');
            expect(audio.src).toBe('');
        });

        it('stays on today at 07:00 before any show has been probed', async () => {
            vi.setSystemTime(new Date('2026-10-19T23:00:00Z')); // 香港 20/10（二）07:00
            const { audio } = renderWithProviders(<TodayPage />, {
                ...ROUTE,
                recordings: TODAY,
            });

            expect(await screen.findByText('今日節目未上架')).toBeInTheDocument();
            expect(screen.getByText('5 個未上架')).toBeInTheDocument();
            expect(
                screen.queryByRole('heading', { name: '在晴朗的一天出發' }),
            ).not.toBeInTheDocument();
            expect(audio.src).toBe('');
        });
    });

    it('shows an empty state when no show airs today and nothing has been recorded', async () => {
        vi.setSystemTime(new Date('2026-10-18T08:00:00Z'));
        renderWithProviders(<TodayPage />, ROUTE);

        expect(await screen.findByText('暫時未有錄音')).toBeInTheDocument();
    });
});

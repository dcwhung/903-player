import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
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

    it('shows the Hong Kong date and today’s shows in broadcast order', async () => {
        renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        const items = await screen.findAllByRole('button', { name: /^播放 / });
        expect(items.map((i) => i.getAttribute('aria-label')?.split('，')[0])).toEqual([
            '播放 在晴朗的一天出發',
            '播放 Bad Girl大過佬',
            '播放 雲妮鍾情',
        ]);
        expect(screen.getByText('19/10（一）')).toBeInTheDocument();
    });

    it('autoplays the first show and marks it active', async () => {
        const { audio } = renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        await waitFor(() => expect(audio.src).toBe(TODAY[2]?.url));
        expect(screen.getByRole('button', { name: /播放 在晴朗的一天出發/ })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.getByRole('heading', { name: '在晴朗的一天出發' })).toBeInTheDocument();
    });

    it('leaves swiping to the carousel and renders no episode switcher', async () => {
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
        expect(screen.getByText('06:00 · 播放中')).toBeInTheDocument();

        const carousel = screen.getByRole('group', { name: '今日節目，左右掃動轉節目' });
        fireEvent.pointerDown(carousel, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(carousel, { clientX: 150, clientY: 100 });

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

    it('falls back to the latest day with recordings', async () => {
        vi.setSystemTime(new Date('2026-10-18T08:00:00Z'));
        renderWithProviders(<TodayPage />, { ...ROUTE, recordings: RECORDINGS });

        expect(await screen.findByText('17/10（六）')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /播放 公子會/ })).toBeInTheDocument();
    });

    it('shows an empty state when nothing has been recorded', async () => {
        renderWithProviders(<TodayPage />, ROUTE);

        expect(await screen.findByText('暫時未有錄音')).toBeInTheDocument();
    });
});

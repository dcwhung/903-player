import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { saveProgress } from '../services/progressStore';
import { ShowPage } from './ShowPage';

const RECORDINGS = [
    recording('gongzi', '2026-10-17'),
    recording('gongzi', '2026-10-03'),
    recording('gongzi', '2026-10-10'),
    recording('badgirl', '2026-10-19', '1000'),
];
const ROUTE = { route: '/show/gongzi', path: '/show/:showId' };

describe('ShowPage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    it('autoplays the latest episode when opened directly', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        await waitFor(() => expect(audio.src).toBe(RECORDINGS[0]?.url));
        expect(audio.play).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: '公子會' })).toBeInTheDocument();
    });

    it('lists only this show’s dates, oldest first, with ticks for watched ones', async () => {
        saveProgress(RECORDINGS[1]?.url ?? '', 990, 1000);
        renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        const dates = await screen.findAllByRole('button', { name: /\/10（/ });
        expect(dates.map((d) => d.textContent)).toEqual([
            '03/10（六）',
            '10/10（六）',
            '17/10（六）',
        ]);
        expect(dates[2]).toHaveAttribute('aria-current', 'date');
        expect(screen.getAllByRole('img', { name: '已收聽' })).toHaveLength(1);
    });

    it('plays the date that is tapped', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });

        await userEvent.click(await screen.findByRole('button', { name: '10/10（六）' }));

        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(screen.getByRole('button', { name: '10/10（六）' })).toHaveAttribute(
            'aria-current',
            'date',
        );
    });

    it('stops playback when going back home', async () => {
        const { audio } = renderWithProviders(<ShowPage />, { ...ROUTE, recordings: RECORDINGS });
        await waitFor(() => expect(audio.play).toHaveBeenCalled());

        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));

        expect(audio.pause).toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    });

    it('shows loading, error with retry, and empty states', async () => {
        const loader = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([]);
        renderWithProviders(<ShowPage />, { ...ROUTE, loader });

        expect(screen.getByRole('status')).toHaveTextContent('載入中…');
        await userEvent.click(await screen.findByRole('button', { name: '重試' }));
        expect(await screen.findByText('暫時未有錄音')).toBeInTheDocument();
    });

    it('handles unknown shows', () => {
        renderWithProviders(<ShowPage />, { route: '/show/nope', path: '/show/:showId' });

        expect(screen.getByText('找不到此節目')).toBeInTheDocument();
    });
});

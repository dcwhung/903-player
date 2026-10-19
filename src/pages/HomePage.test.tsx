import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { HomePage } from './HomePage';

const RECORDINGS = [
    recording('gongzi', '2026-10-10'),
    recording('gongzi', '2026-10-17'),
    recording('badgirl', '2026-10-19', '1000'),
    recording('wanni', '2026-10-19', '1300'),
];

describe('HomePage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    });
    afterEach(() => vi.useRealTimers());

    it('lists five artwork tiles plus today, in order', () => {
        renderWithProviders(<HomePage />);

        expect(screen.getByRole('heading', { name: '收聽節目' })).toBeInTheDocument();
        const nav = screen.getByRole('navigation');
        expect(
            [...nav.querySelectorAll('button')].map(
                (b) => b.getAttribute('aria-label') ?? b.textContent,
            ),
        ).toEqual([
            'Bad Girl大過佬',
            '公子會',
            '雲妮鍾情',
            '在晴朗的一天出發',
            '西加航空',
            '今日節目',
        ]);
    });

    it('pauses playback when home is shown without a today recording', () => {
        const { audio } = renderWithProviders(<HomePage />);

        expect(audio.pause).toHaveBeenCalled();
    });

    it('shows a mini player for today’s first show and plays it on demand', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        const mini = await screen.findByRole('region', { name: '正在播放（今日節目）' });
        expect(mini).toHaveTextContent('Bad Girl大過佬');
        expect(mini).toHaveTextContent('今日 19/10（一）');

        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(audio.play).toHaveBeenCalled();
    });

    it('swipes the mini player to the next show of today', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        const mini = await screen.findByRole('region', { name: '正在播放（今日節目）' });

        fireEvent.pointerDown(mini, { clientX: 300, clientY: 10 });
        fireEvent.pointerUp(mini, { clientX: 150, clientY: 10 });

        expect(mini).toHaveTextContent('雲妮鍾情');
    });

    it('opens the show page from the mini player', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        await userEvent.click(
            await screen.findByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }),
        );

        expect(screen.getByTestId('location')).toHaveTextContent('/show/badgirl');
    });

    it('starts the latest episode and opens the show page', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await waitFor(() =>
            expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'false'),
        );

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));

        expect(audio.src).toBe(RECORDINGS[1]?.url);
        expect(audio.play).toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/show/gongzi');
    });

    it('starts the first show of today and opens the today page', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await waitFor(() =>
            expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'false'),
        );

        await userEvent.click(screen.getByRole('button', { name: '今日節目' }));

        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(screen.getByTestId('location')).toHaveTextContent('/today');
    });

    it('still navigates when recordings are not loaded yet', async () => {
        const { audio } = renderWithProviders(<HomePage />, {
            loader: () => new Promise(() => {}),
        });

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));

        expect(audio.play).not.toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/show/gongzi');
    });
});

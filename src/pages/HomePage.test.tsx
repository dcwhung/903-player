import { screen, waitFor } from '@testing-library/react';
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

    it('lists five shows plus today, in order', () => {
        renderWithProviders(<HomePage />);

        expect(screen.getByRole('heading', { name: '收聽節目' })).toBeInTheDocument();
        expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
            'Bad Girl大過佬',
            '公子會',
            '雲妮鍾情',
            '在晴朗的一天出發',
            '西加航空',
            '今日節目',
        ]);
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

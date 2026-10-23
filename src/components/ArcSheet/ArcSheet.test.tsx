import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArcSummary } from '../../selectors/arcProgress';
import type { SeriesEpisode } from '../../types/drama';
import { ArcSheet } from './ArcSheet';

const ep = (arc: string, no: number, title?: string): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'chisee',
    url: `/${arc}-${no}.m4a`,
    arc,
    no,
    ...(title ? { title } : {}),
});

const SUMMARIES: ArcSummary[] = [
    {
        arc: '好朋友手牽手',
        total: 4,
        watched: 1,
        state: 'started',
        resume: ep('好朋友手牽手', 2, '朋友不同'),
        resumeAt: 200,
    },
    {
        arc: '小苦妹撲水',
        total: 4,
        watched: 0,
        state: 'new',
        resume: ep('小苦妹撲水', 1),
        resumeAt: 0,
    },
    { arc: '青春期', total: 4, watched: 1, state: 'started', resume: ep('青春期', 2), resumeAt: 0 },
    { arc: '大妒忌', total: 3, watched: 3, state: 'done', resume: ep('大妒忌', 1), resumeAt: 0 },
];

const renderSheet = (overrides: Partial<Parameters<typeof ArcSheet>[0]> = {}) => {
    const props = {
        open: true,
        summaries: SUMMARIES,
        current: ep('好朋友手牽手', 2, '朋友不同'),
        isPlaying: true,
        onPick: vi.fn(),
        onPlay: vi.fn(),
        onClose: vi.fn(),
        ...overrides,
    };
    render(<ArcSheet {...props} />);
    return props;
};

describe('ArcSheet', () => {
    it('renders nothing while closed', () => {
        renderSheet({ open: false });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('lists every 短篇 with its progress, finished ones as given (last)', () => {
        renderSheet();

        const dialog = screen.getByRole('dialog', { name: '全部短篇' });
        expect(within(dialog).getByText('聽完 1 / 4 個')).toBeInTheDocument();
        const picks = within(dialog)
            .getAllByRole('button')
            .filter((b) => b.dataset.role === 'pick');
        expect(picks.map((b) => b.getAttribute('aria-label'))).toEqual([
            '好朋友手牽手，播緊第 2 集',
            '小苦妹撲水，未聽 · 4 集',
            '青春期，下一集係第 2 集',
            '大妒忌，聽完 · 3 集',
        ]);
        expect(picks[0]).toHaveAttribute('aria-current', 'true');
    });

    it('shows how far an unfinished episode got when it is not playing', () => {
        renderSheet({ current: undefined, isPlaying: false });

        expect(
            screen.getByRole('button', { name: '好朋友手牽手，聽到第 2 集 3:20' }),
        ).toBeInTheDocument();
    });

    it('gives each row a play button that starts, resumes or replays the 短篇', async () => {
        const { onPlay } = renderSheet({ current: undefined, isPlaying: false });

        expect(
            screen.getByRole('button', { name: '續聽 好朋友手牽手 第 2 集' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '播放 小苦妹撲水 第 1 集' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '由第 1 集重聽 大妒忌' }));

        expect(onPlay).toHaveBeenCalledWith(SUMMARIES[3]);
    });

    it('turns the playing 短篇’s button into pause', async () => {
        const { onPlay } = renderSheet();

        await userEvent.click(screen.getByRole('button', { name: '暫停 好朋友手牽手' }));

        expect(onPlay).toHaveBeenCalledWith(SUMMARIES[0]);
    });

    it('picks a 短篇 by its row, and closes with the button, the backdrop or Escape', async () => {
        const { onPick, onClose } = renderSheet();

        await userEvent.click(screen.getByRole('button', { name: '小苦妹撲水，未聽 · 4 集' }));
        expect(onPick).toHaveBeenCalledWith('小苦妹撲水');

        await userEvent.click(screen.getByRole('button', { name: '關閉' }));
        await userEvent.click(screen.getByTestId('arc-sheet-backdrop'));
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('moves focus into the sheet when it opens', () => {
        renderSheet();
        expect(screen.getByRole('dialog')).toHaveFocus();
    });
});

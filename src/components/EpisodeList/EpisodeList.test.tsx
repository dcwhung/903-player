import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EpisodeList, type EpisodeItem } from './EpisodeList';

const ITEMS: EpisodeItem[] = [
    {
        key: 'a',
        dayMonth: '19/10',
        weekday: '星期一',
        current: true,
        isPlaying: true,
        status: { kind: 'playing', ratio: 0.1, text: '播放中 · 12:40 / 1:58:30' },
    },
    {
        key: 'b',
        dayMonth: '16/10',
        weekday: '星期五',
        current: false,
        isPlaying: false,
        status: { kind: 'watched', ratio: 1, text: '已收聽' },
    },
    {
        key: 'c',
        dayMonth: '15/10',
        weekday: '星期四',
        current: false,
        isPlaying: false,
        status: { kind: 'resume', ratio: 0.38, text: '聽到 45:10' },
    },
];

describe('EpisodeList', () => {
    beforeEach(() => {
        HTMLElement.prototype.scrollTo = vi.fn();
    });

    it('lists episodes with their count and status', () => {
        render(<EpisodeList items={ITEMS} onSelect={() => {}} />);

        expect(screen.getByRole('heading', { name: '集數' })).toBeInTheDocument();
        expect(screen.getByText('共 3 集')).toBeInTheDocument();
        expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
            '暫停 19/10 星期一，播放中 · 12:40 / 1:58:30',
            '播放 16/10 星期五，已收聽',
            '播放 15/10 星期四，聽到 45:10',
        ]);
    });

    it('marks the current episode and shows progress bars', () => {
        render(<EpisodeList items={ITEMS} onSelect={() => {}} />);

        expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true');
        expect(screen.getAllByRole('button')[1]).not.toHaveAttribute('aria-current');
        expect(
            screen.getAllByRole('progressbar').map((p) => p.getAttribute('aria-valuenow')),
        ).toEqual(['10', '100', '38']);
        expect(screen.getAllByRole('img', { name: '已收聽' })).toHaveLength(1);
    });

    it('scrolls the current episode into view inside the list panel', () => {
        render(<EpisodeList items={ITEMS} onSelect={() => {}} />);

        const scrollTo = vi.mocked(HTMLElement.prototype.scrollTo);
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
        expect(scrollTo.mock.contexts).toEqual([screen.getByRole('list')]);
    });

    it('jumps instead of scrolling smoothly when reduced motion is preferred', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => ({ matches: query.includes('reduce'), media: query })),
        );
        render(<EpisodeList items={ITEMS} onSelect={() => {}} />);

        expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ behavior: 'auto' }),
        );
        vi.unstubAllGlobals();
    });

    it('shows a pause icon on the playing episode and play on the paused current one', () => {
        const paused = ITEMS.map((item) => ({ ...item, isPlaying: false }));
        const { rerender } = render(<EpisodeList items={ITEMS} onSelect={() => {}} />);

        expect(screen.getByRole('button', { name: /^暫停 19\/10/ })).toBeInTheDocument();

        rerender(<EpisodeList items={paused} onSelect={() => {}} />);

        expect(screen.getByRole('button', { name: /^播放 19\/10/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^暫停/ })).not.toBeInTheDocument();
    });

    it('reports the tapped episode', async () => {
        const onSelect = vi.fn();
        render(<EpisodeList items={ITEMS} onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: /15\/10/ }));

        expect(onSelect).toHaveBeenCalledWith('c');
    });
});

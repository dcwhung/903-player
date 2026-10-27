import { render, screen, within } from '@testing-library/react';
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

    describe('unavailable episodes', () => {
        const UNAVAILABLE: EpisodeItem = {
            key: 'missing',
            dayMonth: '21/10',
            weekday: '星期三',
            current: false,
            isPlaying: false,
            status: { kind: 'unavailable', ratio: 0, text: '未上架' },
        };
        const withUnavailable = [UNAVAILABLE, ...ITEMS];

        /** 未上架嗰行：唔係掣，用可見文字搵 */
        const unavailableRow = (): HTMLElement => {
            const row = screen.getByText('21/10').closest('li');
            if (!row) throw new Error('unavailable row not found');
            return row;
        };

        it('lists them as plain rows, not buttons, without a play icon or progress bar', () => {
            render(<EpisodeList items={withUnavailable} onSelect={() => {}} />);

            const row = unavailableRow();
            expect(row).toHaveTextContent('21/10星期三未上架');
            expect(within(row).queryByRole('button')).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /21\/10/ })).not.toBeInTheDocument();
            expect(row.querySelector('svg')).toBeNull();
            expect(screen.getAllByRole('progressbar')).toHaveLength(ITEMS.length);
        });

        it('counts only playable episodes and adds how many are unavailable', () => {
            render(<EpisodeList items={withUnavailable} onSelect={() => {}} />);

            expect(screen.getByText('共 3 集 · 1 集未上架')).toBeInTheDocument();
        });

        it('does not report a tap on an unavailable episode', async () => {
            const onSelect = vi.fn();
            render(<EpisodeList items={withUnavailable} onSelect={onSelect} />);

            await userEvent.click(unavailableRow());

            expect(onSelect).not.toHaveBeenCalled();
        });
    });

    it('reports the tapped episode', async () => {
        const onSelect = vi.fn();
        render(<EpisodeList items={ITEMS} onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: /15\/10/ }));

        expect(onSelect).toHaveBeenCalledWith('c');
    });

    it('shows a tag (e.g. 重溫) beside the date and reads it out', () => {
        const rerun: EpisodeItem = {
            key: 'r',
            dayMonth: '11/08',
            weekday: '星期一',
            tag: '重溫',
            current: false,
            isPlaying: false,
            status: { kind: 'unwatched', ratio: 0, text: '未收聽' },
        };
        render(<EpisodeList items={[rerun]} onSelect={() => {}} />);

        const row = screen.getByRole('button', { name: '播放 11/08 星期一 重溫，未收聽' });
        expect(within(row).getByText('重溫')).toBeInTheDocument();
    });

    it('gives every row the same label column, sized for the kind of list', () => {
        const { container, rerender } = render(<EpisodeList items={ITEMS} onSelect={() => {}} />);
        const section = () => container.querySelector('section') as HTMLElement;
        expect(section().dataset.labels).toBe('date');

        rerender(<EpisodeList items={ITEMS} onSelect={() => {}} labels="title" />);
        expect(section().dataset.labels).toBe('title');
    });

    it('scrolls a long title only on the row that is playing; paused or other rows end in …', () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(180);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120);
        const staticFlags = (container: HTMLElement) =>
            [...container.querySelectorAll('[data-overflow]')].map((b) =>
                b.hasAttribute('data-static'),
            );
        const { container, rerender } = render(<EpisodeList items={ITEMS} onSelect={() => {}} />);
        expect(staticFlags(container)).toEqual([false, true, true]);

        const paused = ITEMS.map((item) => ({ ...item, isPlaying: false }));
        rerender(<EpisodeList items={paused} onSelect={() => {}} />);
        expect(staticFlags(container)).toEqual([true, true, true]);
        vi.restoreAllMocks();
    });

    describe('scrollAlign="top" (series drama)', () => {
        const LIST_TOP = 100;
        const ROW_HEIGHT = 60;

        /** 清單頂喺 100px，每行 60px（未捲）；current 係第 3 行 */
        beforeEach(() => {
            vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
                this: Element,
            ) {
                if (this.tagName === 'UL') return { top: LIST_TOP, height: 300 } as DOMRect;
                const li = this.closest('li');
                const index = li ? Array.from(li.parentElement?.children ?? []).indexOf(li) : 0;
                return { top: LIST_TOP + index * ROW_HEIGHT, height: ROW_HEIGHT } as DOMRect;
            });
        });

        afterEach(() => vi.restoreAllMocks());

        const at = (index: number): EpisodeItem[] =>
            ITEMS.map((item, i) => ({ ...item, current: i === index }));

        it('jumps on entry so the playing episode sits at the top, with half of the one before showing', () => {
            render(<EpisodeList items={at(2)} onSelect={() => {}} scrollAlign="top" />);

            // 第 3 行：120px 下面，減半行（30px）露出上一集
            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({
                top: 2 * ROW_HEIGHT - ROW_HEIGHT / 2,
                behavior: 'auto',
            });
        });

        it('scrolls smoothly to the same place when the next episode starts in the same list', () => {
            const { rerender } = render(
                <EpisodeList items={at(1)} onSelect={() => {}} scrollAlign="top" />,
            );

            rerender(<EpisodeList items={at(2)} onSelect={() => {}} scrollAlign="top" />);

            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({
                top: 2 * ROW_HEIGHT - ROW_HEIGHT / 2,
                behavior: 'smooth',
            });
        });

        it('jumps again when a different 短篇 replaces the list', () => {
            const { rerender } = render(
                <EpisodeList items={at(1)} onSelect={() => {}} scrollAlign="top" />,
            );
            const other = at(2).map((item) => ({ ...item, key: `other-${item.key}` }));

            rerender(<EpisodeList items={other} onSelect={() => {}} scrollAlign="top" />);

            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith(
                expect.objectContaining({ behavior: 'auto' }),
            );
        });

        it('keeps the first episode flush at the top', () => {
            render(<EpisodeList items={at(0)} onSelect={() => {}} scrollAlign="top" />);

            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({
                top: 0,
                behavior: 'auto',
            });
        });
    });
});

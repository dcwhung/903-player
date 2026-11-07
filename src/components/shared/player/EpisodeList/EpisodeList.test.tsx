import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasBookmark } from '../../../../services/bookmarkStore';
import type { Recording } from '../../../../types/recording';
import { EpisodeList, type EpisodeItem } from './EpisodeList';
import { FOCUS_FLASH_MS } from './useFocusRow';

const ITEMS: EpisodeItem[] = [
    {
        key: 'a',
        dayMonth: '19/10',
        weekday: '星期一',
        current: true,
        isPlaying: true,
        status: {
            kind: 'playing',
            ratio: 0.1,
            text: '12:40 / 1:58:30',
            spokenText: '播放中，12:40 / 1:58:30',
            onAir: true,
            time: '12:40 / 1:58:30',
        },
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
            '暫停 19/10 星期一，播放中，12:40 / 1:58:30',
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

    // ON AIR combo：播緊 = 紅 pill +「12:40 / 1:58:30」+ 左邊紅條；揀中底框照留
    it('should show the on-air pill and live bar on the playing row only', () => {
        render(<EpisodeList items={ITEMS} onSelect={() => {}} />);
        const [playing, other] = screen.getAllByRole('button');

        expect(within(playing as HTMLElement).getByText('播放中')).toHaveAttribute(
            'data-on-air-badge',
        );
        expect(playing).toHaveTextContent('播放中12:40 / 1:58:30');
        expect(playing?.querySelector('[data-on-air-lamp]')).toHaveAttribute(
            'data-on-air-lamp',
            'live',
        );
        expect(playing?.className).toMatch(/current/);
        expect(other?.querySelector('[data-on-air-lamp]')).toBeNull();
        expect(screen.getAllByText('播放中')).toHaveLength(1);
    });

    // 用戶決定（暫停）：揀中但暫停照係揀中（底框留低），左邊條變灰、靜止，冇 pill，字照寫聽到邊
    it('should keep a paused current row selected with a grey bar and no pill', () => {
        const paused: EpisodeItem = {
            ...(ITEMS[0] as EpisodeItem),
            isPlaying: false,
            status: { kind: 'playing', ratio: 0.1, text: '聽到 12:40 / 1:58:30' },
        };
        render(<EpisodeList items={[paused]} onSelect={() => {}} />);
        const row = screen.getByRole('button', { name: /^播放 19\/10/ });

        expect(row.className).toMatch(/current/);
        expect(row.querySelector('[data-on-air-lamp]')).toHaveAttribute('data-on-air-lamp', 'idle');
        expect(screen.queryByText('播放中')).not.toBeInTheDocument();
        expect(row).toHaveTextContent('聽到 12:40 / 1:58:30');
    });

    // 窄欄換行時時間成段落下一行（「13:32 /」「13:46」唔准斷開）：字眼同時間分開兩粒，時間 nowrap
    it('should render the status word and the whole time as separate pieces', () => {
        const status = {
            kind: 'playing' as const,
            ratio: 0.98,
            text: '未開始 · 13:32 / 13:46',
            lead: '未開始',
            separator: 'dot' as const,
            time: '13:32 / 13:46',
        };
        render(
            <EpisodeList
                items={[{ ...(ITEMS[0] as EpisodeItem), isPlaying: false, status }]}
                onSelect={() => {}}
            />,
        );
        const row = screen.getByRole('button', { name: /^播放 19\/10/ });
        const time = row.querySelector('[data-status-time]');

        expect(row.querySelector('[data-status-lead]')).toHaveTextContent('未開始');
        expect(time?.parentElement?.className).toMatch(/timedLine/);
        expect(time).toHaveTextContent('· 13:32 / 13:46');
        // 分隔符跟時間走：換咗行就喺行頭被剪走，唔會吊喺第一行尾 / 第二行頭
        expect(time?.firstElementChild).toHaveAttribute('aria-hidden', 'true');
        expect(row).toHaveTextContent('未開始 · 13:32 / 13:46');
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

    it('does not pull a show page back to the current episode when a new one is added on top', () => {
        const { rerender } = render(<EpisodeList items={ITEMS} onSelect={() => {}} />);
        vi.mocked(HTMLElement.prototype.scrollTo).mockClear();
        const fresh: EpisodeItem = { ...ITEMS[1]!, key: '/new.aac', current: false };

        rerender(<EpisodeList items={[fresh, ...ITEMS]} onSelect={() => {}} />);

        expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
    });

    describe('bookmark star (P7 #7)', () => {
        const TRACK: Recording = {
            showId: 'gongzi',
            date: '2026-10-15',
            time: '2300',
            id: 'id:c',
            url: 'c',
        };
        const withTrack = ITEMS.map((item) =>
            item.key === 'c' ? { ...item, track: TRACK } : item,
        );

        it('should put a star beside the play icon of rows that know their episode', () => {
            render(<EpisodeList items={withTrack} onSelect={() => {}} />);

            const star = screen.getByRole('button', { name: '收藏 15/10 星期四' });
            expect(star).toHaveAttribute('aria-pressed', 'false');
            expect(screen.getAllByRole('button', { name: /^收藏/ })).toHaveLength(1);
            // 星同播放掣喺同一行（li）
            expect(star.closest('li')).toBe(
                screen.getByRole('button', { name: /^播放 15\/10/ }).closest('li'),
            );
        });

        it('should bookmark without playing the row', async () => {
            const onSelect = vi.fn();
            render(<EpisodeList items={withTrack} onSelect={onSelect} />);

            await userEvent.click(screen.getByRole('button', { name: '收藏 15/10 星期四' }));

            expect(hasBookmark('id:c')).toBe(true);
            expect(onSelect).not.toHaveBeenCalled();
        });
    });

    describe('focused episode (entered from 我的收藏)', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        const focused = (container: HTMLElement) =>
            [...container.querySelectorAll('li[data-focused]')].map((li) =>
                li.getAttribute('data-episode-key'),
            );

        it('should scroll to the focused episode and highlight it briefly', () => {
            const { container } = render(
                <EpisodeList items={ITEMS} onSelect={() => {}} focusKey="c" />,
            );

            expect(focused(container)).toEqual(['c']);
            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith(
                expect.objectContaining({ behavior: 'auto' }),
            );

            act(() => vi.advanceTimersByTime(FOCUS_FLASH_MS));
            expect(focused(container)).toEqual([]);
        });

        it('should wait until the focused episode is listed (recordings still loading)', () => {
            const { container, rerender } = render(
                <EpisodeList items={[]} onSelect={() => {}} focusKey="c" />,
            );
            expect(focused(container)).toEqual([]);

            rerender(<EpisodeList items={ITEMS} onSelect={() => {}} focusKey="c" />);
            expect(focused(container)).toEqual(['c']);
        });

        it('should highlight only once per focus', () => {
            const { container, rerender } = render(
                <EpisodeList items={ITEMS} onSelect={() => {}} focusKey="c" />,
            );
            act(() => vi.advanceTimersByTime(FOCUS_FLASH_MS));

            rerender(
                <EpisodeList
                    items={ITEMS.map((i) => ({ ...i }))}
                    onSelect={() => {}}
                    focusKey="c"
                />,
            );
            expect(focused(container)).toEqual([]);
        });
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

        it('starts a fresh list from the top when its episodes are not the playing ones', () => {
            const { rerender } = render(
                <EpisodeList items={at(1)} onSelect={() => {}} scrollAlign="top" />,
            );
            const otherArc = at(-1).map((item) => ({ ...item, key: `other-${item.key}` }));

            rerender(<EpisodeList items={otherArc} onSelect={() => {}} scrollAlign="top" />);

            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({
                top: 0,
                behavior: 'auto',
            });
        });

        it('stays put when the episode moves on in a 短篇 that is not on screen', () => {
            const otherArc = at(-1).map((item) => ({ ...item, key: `other-${item.key}` }));
            const { rerender } = render(
                <EpisodeList items={otherArc} onSelect={() => {}} scrollAlign="top" />,
            );
            vi.mocked(HTMLElement.prototype.scrollTo).mockClear();

            // 播緊嗰個短篇自動跳下一集：呢張清單冇嗰集，唔使捲
            rerender(
                <EpisodeList
                    items={otherArc.map((item) => ({ ...item }))}
                    onSelect={() => {}}
                    scrollAlign="top"
                />,
            );

            expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
        });

        it('jumps back to the playing episode after the screen is rotated', async () => {
            const listeners = new Set<() => void>();
            const media = { matches: false };
            vi.stubGlobal('matchMedia', (query: string) => ({
                get matches() {
                    return query.includes('orientation') && media.matches;
                },
                media: query,
                addEventListener: (_: string, listener: () => void) => listeners.add(listener),
                removeEventListener: (_: string, listener: () => void) =>
                    listeners.delete(listener),
            }));
            render(<EpisodeList items={at(2)} onSelect={() => {}} scrollAlign="top" />);
            vi.mocked(HTMLElement.prototype.scrollTo).mockClear();

            // 打橫：等新 layout 排好（下一個 frame）先再捲
            media.matches = true;
            act(() => listeners.forEach((listener) => listener()));
            await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({
                top: 2 * ROW_HEIGHT - ROW_HEIGHT / 2,
                behavior: 'auto',
            });
            vi.unstubAllGlobals();
        });

        it('leaves show pages alone when the screen is rotated', async () => {
            const listeners = new Set<() => void>();
            const media = { matches: false };
            vi.stubGlobal('matchMedia', (query: string) => ({
                get matches() {
                    return media.matches;
                },
                media: query,
                addEventListener: (_: string, listener: () => void) => listeners.add(listener),
                removeEventListener: (_: string, listener: () => void) =>
                    listeners.delete(listener),
            }));
            render(<EpisodeList items={at(2)} onSelect={() => {}} />);
            vi.mocked(HTMLElement.prototype.scrollTo).mockClear();

            media.matches = true;
            act(() => listeners.forEach((listener) => listener()));
            await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

            expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
            vi.unstubAllGlobals();
        });

        it('keeps the first episode flush at the top', () => {
            render(<EpisodeList items={at(0)} onSelect={() => {}} scrollAlign="top" />);

            expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({
                top: 0,
                behavior: 'auto',
            });
        });
    });

    it('should mark the list with its variant so the narrow home card can keep its own row layout', () => {
        const { container, rerender } = render(<EpisodeList items={ITEMS} onSelect={() => {}} />);
        expect(container.querySelector('section')).toHaveAttribute('data-variant', 'page');

        rerender(<EpisodeList items={ITEMS} onSelect={() => {}} variant="card" />);
        expect(container.querySelector('section')).toHaveAttribute('data-variant', 'card');
    });
});

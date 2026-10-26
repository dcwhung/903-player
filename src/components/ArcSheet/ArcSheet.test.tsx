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

const summary = (
    arc: string,
    overrides: Partial<ArcSummary> & Pick<ArcSummary, 'state' | 'resume'>,
): ArcSummary => ({ arc, total: 4, watched: 0, isNew: false, resumeAt: 0, ...overrides });

const PLAYING = summary('好朋友手牽手', {
    watched: 1,
    state: 'started',
    resume: ep('好朋友手牽手', 2, '朋友不同'),
    resumeAt: 200,
});
const FRESH = summary('青春期眞神奇', {
    total: 3,
    state: 'new',
    isNew: true,
    resume: ep('青春期眞神奇', 1),
});
const UNPLAYED = summary('小苦妹撲水', { state: 'new', resume: ep('小苦妹撲水', 1) });
const NEXT = summary('青春期', { watched: 1, state: 'started', resume: ep('青春期', 2) });
const DONE = summary('大妒忌', {
    total: 3,
    watched: 3,
    state: 'done',
    resume: ep('大妒忌', 1),
});

const GROUPS = [
    { group: 'playing' as const, items: [PLAYING] },
    { group: 'new' as const, items: [FRESH] },
    { group: 'unfinished' as const, items: [UNPLAYED, NEXT] },
    { group: 'done' as const, items: [DONE] },
];

const renderSheet = (overrides: Partial<Parameters<typeof ArcSheet>[0]> = {}) => {
    const props = {
        open: true,
        groups: GROUPS,
        current: ep('好朋友手牽手', 2, '朋友不同'),
        isPlaying: true,
        onPick: vi.fn(),
        onPlay: vi.fn(),
        onClose: vi.fn(),
        coverOf: (s: ArcSummary) => `/covers/${s.arc}.webp`,
        ...overrides,
    };
    render(<ArcSheet {...props} />);
    return props;
};

const picks = () =>
    within(screen.getByRole('dialog'))
        .getAllByRole('button')
        .filter((b) => b.dataset.role === 'pick');

describe('ArcSheet', () => {
    it('renders nothing while closed', () => {
        renderSheet({ open: false });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('titles itself 全集 and counts finished 短篇', () => {
        renderSheet();

        const dialog = screen.getByRole('dialog', { name: '全集' });
        expect(within(dialog).getByText('聽完 1 / 5 個')).toBeInTheDocument();
    });

    it('lists the groups in order with their headings, playing first and finished last', () => {
        renderSheet();

        expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
            '播放中',
            '新上架',
            '未聽完',
            '已聽完',
        ]);
        expect(picks().map((b) => b.getAttribute('aria-label'))).toEqual([
            '好朋友手牽手，播緊第 2 集，聽完 1 / 4 集',
            '青春期眞神奇，未聽 · 3 集，新上架',
            '小苦妹撲水，未聽 · 4 集',
            '青春期，下一集係第 2 集，聽完 1 / 4 集',
            '大妒忌，聽完 · 3 集',
        ]);
        expect(picks()[0]).toHaveAttribute('aria-current', 'true');
        expect(picks()[1]).toHaveTextContent('新');
    });

    it('shows how far an unfinished episode got when it is not playing', () => {
        renderSheet({ current: undefined, isPlaying: false });

        expect(
            screen.getByRole('button', { name: '好朋友手牽手，聽到第 2 集 3:20，聽完 1 / 4 集' }),
        ).toBeInTheDocument();
    });

    it('gives each row a play button that starts, resumes or replays the 短篇', async () => {
        const { onPlay } = renderSheet({ current: undefined, isPlaying: false });

        expect(
            screen.getByRole('button', { name: '續聽 好朋友手牽手 第 2 集' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '播放 小苦妹撲水 第 1 集' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '由第 1 集重聽 大妒忌' }));

        expect(onPlay).toHaveBeenCalledWith(DONE);
    });

    it('turns the playing 短篇’s button into pause', async () => {
        const { onPlay } = renderSheet();

        await userEvent.click(screen.getByRole('button', { name: '暫停 好朋友手牽手' }));

        expect(onPlay).toHaveBeenCalledWith(PLAYING);
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

    it('shows each 短篇’s own cover inside its progress ring, hidden from screen readers', () => {
        renderSheet();

        // 碟面係裝飾：alt=""、唔入讀屏（狀態已經喺行嘅 aria-label）
        expect(picks().map((b) => b.querySelector('img')?.getAttribute('src'))).toEqual([
            '/covers/好朋友手牽手.webp',
            '/covers/青春期眞神奇.webp',
            '/covers/小苦妹撲水.webp',
            '/covers/青春期.webp',
            '/covers/大妒忌.webp',
        ]);
        picks().forEach((b) => expect(b.querySelector('img')).toHaveAttribute('alt', ''));
        expect(within(picks()[0]!).queryByRole('img')).not.toBeInTheDocument();
    });

    it('passes the whole summary to coverOf, so a 短篇 without a disc can fall back', () => {
        const coverOf = vi.fn(() => '/drama-disc.webp');
        renderSheet({ coverOf });

        expect(coverOf).toHaveBeenCalledWith(UNPLAYED);
        picks().forEach((b) =>
            expect(b.querySelector('img')).toHaveAttribute('src', '/drama-disc.webp'),
        );
    });

    it('counts watched / total in a pill under the cover until the 短篇 is finished', () => {
        renderSheet();
        const [playing, fresh, , , done] = picks();

        expect(within(playing!).getByText('1/4')).toHaveAttribute('data-role', 'count');
        expect(within(fresh!).getByText('0/3')).toHaveAttribute('data-role', 'count');
        // 聽完：冇 pill，改出 ✓
        expect(done!.querySelector('[data-role="count"]')).toBeNull();
        expect(done!.querySelector('[data-role="done"]')).not.toBeNull();
        expect(playing!.querySelector('[data-role="done"]')).toBeNull();
    });

    it('moves focus into the sheet when it opens', () => {
        renderSheet();
        expect(screen.getByRole('dialog')).toHaveFocus();
    });
});

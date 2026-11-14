import { summarizeChanges, type ChangeDocument, type ChangeItem } from '@903-player/catalog';
import { render, screen, within } from '@testing-library/react';
import { hasIcon } from '../../../tests/icons';
import type { LoadedEntry } from '../../api/types';
import { Timeline } from './Timeline';

/** shortDate / fullDate 跨年會加年份（S-830）：固定「今日」喺 2026，唔跟真實時鐘 */
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T04:00:00Z'));
});

afterEach(() => {
    vi.useRealTimers();
});

type Images = Record<string, string>;

const drama = (arcs: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        addedAt: '2026-10-01',
        disc: 'disc.webp',
        arcs,
        ...extra,
    },
    images: {} as Images,
});

const loaded = (doc: ChangeDocument): LoadedEntry[] =>
    doc.dramas.map((entry) => ({
        kind: 'dramas',
        id: entry.id,
        definition: entry.definition as LoadedEntry['definition'],
        images: entry.images as Images,
        draft: false,
        updatedAt: 'v',
        etag: null,
    }));

const groupsOf = () => screen.getAllByRole('listitem').filter((li) => li.matches('.timeline > li'));
const cardsIn = (group: HTMLElement) =>
    within(group)
        .getAllByRole('listitem')
        .filter((li) => li.matches('.tl-entry'));
const rowsIn = (card: HTMLElement) =>
    within(card)
        .getAllByRole('listitem')
        .map((li) => li.textContent);
const discOf = (el: Element | null) => (el as HTMLElement | null)?.style.backgroundImage;

describe('Timeline', () => {
    it('should group by when: 即時上線 (按「發佈」後) first, then dated groups with the weekday', () => {
        const prev: ChangeDocument = {
            shows: [],
            dramas: [drama([{ id: 'half', name: '戀愛二分一', episodes: 30 }])],
        };
        const next: ChangeDocument = {
            shows: [],
            dramas: [
                drama([
                    { id: 'half', name: '戀愛二分一', episodes: 32 },
                    { id: 'heart', name: '我心不死', episodes: 10, addedAt: '2026-11-16' },
                ]),
            ],
        };
        const summary = summarizeChanges(prev, next, '2026-11-10');
        render(<Timeline groups={summary.timeline} entries={[]} />);
        const [now, later] = groupsOf();
        expect(now).toHaveClass('now');
        expect(now).toHaveTextContent('即時上線按「發佈」後');
        expect(rowsIn(cardsIn(now!)[0]!)).toEqual(['新集數戀愛二分一第 31–32 集']);
        expect(later).toHaveClass('later');
        expect(later).toHaveTextContent('11 月 16 日星期一');
        expect(cardsIn(later!)[0]).toHaveTextContent('蘭茜夫人劇場');
        expect(rowsIn(cardsIn(later!)[0]!)).toEqual(['新短篇我心不死第 1–10 集']);
    });

    it('should put a drama edit and an arc edit in one card (real summarizeChanges, image changes)', () => {
        const arc = { id: 'love', name: '戀愛二分一', episodes: 30, tile: 'arcs/love/tile.webp' };
        const images = { 'disc.webp': 'old-disc.webp', 'arcs/love/tile.webp': 'old-tile.webp' };
        const prev: ChangeDocument = {
            shows: [],
            dramas: [{ ...drama([arc]), images }],
        };
        const next: ChangeDocument = {
            shows: [],
            dramas: [
                {
                    ...drama([arc]),
                    images: { 'disc.webp': 'new-disc.webp', 'arcs/love/tile.webp': 'new.webp' },
                },
            ],
        };
        const summary = summarizeChanges(prev, next, '2026-11-12');
        render(<Timeline groups={summary.timeline} entries={loaded(next)} />);
        const cards = cardsIn(groupsOf()[0]!);
        expect(cards).toHaveLength(1);
        expect(cards[0]!.querySelector('.tl-entry-title')).toHaveTextContent('蘭茜夫人劇場');
        expect(rowsIn(cards[0]!)).toEqual(['修改劇集碟面', '修改戀愛二分一橫圖']);
        expect(within(cards[0]!).getAllByText('修改')[0]).toHaveClass('tl-tag', 'edit');
        expect(within(cards[0]!).getByText('碟面')).toHaveClass('tl-chip');
    });

    it("should show the arc's own disc on arc rows, falling back to the drama disc", () => {
        const lancy = {
            kind: 'dramas',
            id: 'lancy',
            name: '蘭茜夫人劇場',
        } as const;
        const items: ChangeItem[] = [
            {
                kind: 'unlist',
                when: 'now',
                entry: lancy,
                arc: { id: 'own', name: 'A', label: 'A' },
                detail: {},
            },
            {
                kind: 'unlist',
                when: 'now',
                entry: lancy,
                arc: { id: 'bare', name: 'B', label: 'B' },
                detail: {},
            },
        ];
        const entries = loaded({
            shows: [],
            dramas: [
                {
                    ...drama([
                        { id: 'own', name: 'A', disc: 'arcs/own/disc.webp' },
                        { id: 'bare', name: 'B' },
                    ]),
                    images: { 'disc.webp': 'drama.webp', 'arcs/own/disc.webp': 'arc.webp' },
                },
            ],
        });
        render(<Timeline groups={[{ when: 'now', items }]} entries={entries} />);
        const card = cardsIn(groupsOf()[0]!)[0]!;
        expect(discOf(card.querySelector('.tl-entry-head .thumb'))).toContain('drama.webp');
        const [own, bare] = within(card).getAllByRole('listitem');
        expect(own).toHaveTextContent('下架A');
        expect(discOf(own!.querySelector('.thumb'))).toContain('arc.webp');
        expect(discOf(bare!.querySelector('.thumb'))).toContain('drama.webp');
        expect(within(own!).getByText('下架')).toHaveClass('tl-tag', 'off');
    });

    it('should give a new drama one 新劇 row with the episode total, and label show-level rows 節目', () => {
        const next: ChangeDocument = {
            shows: [
                { id: 'waves', definition: { name: '口水多過浪花', enabled: false }, images: {} },
            ],
            dramas: [
                drama([
                    { id: 'a', name: 'A', episodes: 12 },
                    { id: 'b', name: 'B', episodes: 8 },
                ]),
            ],
        };
        const prev: ChangeDocument = {
            shows: [{ id: 'waves', definition: { name: '口水多過浪花' }, images: {} }],
            dramas: [],
        };
        const summary = summarizeChanges(prev, next, '2026-11-12');
        render(<Timeline groups={summary.timeline} entries={loaded(next)} />);
        const [waves, lancy] = cardsIn(groupsOf()[0]!);
        expect(rowsIn(waves!)).toEqual(['下架節目']);
        expect(rowsIn(lancy!)).toEqual(['新劇全 20 集']);
        expect(within(lancy!).getByText('新劇')).toHaveClass('tl-tag', 'new');
    });

    it('should put App 外觀 cards first in 即時上線, with the redeploy line for icon / text', () => {
        const item: ChangeItem = {
            kind: 'edit',
            when: 'now',
            entry: { kind: 'shows', id: 'waves', name: '口水多過浪花' },
            detail: { fields: ['summary'] },
        };
        render(
            <Timeline
                groups={[{ when: 'now', items: [item] }]}
                entries={[]}
                appearance={['text', 'banner']}
            />,
        );
        const [text, banner, waves] = cardsIn(groupsOf()[0]!);
        expect(text).toHaveTextContent('App 外觀名稱與簡介重新部署播放器後生效');
        expect(within(text!).getByText('App 外觀')).toHaveClass('tl-tag', 'look');
        expect(banner).toHaveTextContent('App 外觀首頁 Banner');
        expect(banner).not.toHaveTextContent('重新部署');
        expect(rowsIn(waves!)).toEqual(['修改節目簡介']);
    });

    it('should show an appearance-only publish as a 即時上線 group', () => {
        render(<Timeline groups={[]} entries={[]} appearance={['icon']} />);
        const [now] = groupsOf();
        expect(now).toHaveTextContent('即時上線');
        expect(now).toHaveTextContent('App 外觀App 圖示重新部署播放器後生效');
    });

    it('should show a chevron on 查看全部 when the timeline is collapsed', () => {
        const dates = Object.fromEntries(
            [2, 3, 4, 5, 6, 7, 8].map((no) => [no, `2026-11-${10 + no}`]),
        );
        const next: ChangeDocument = {
            shows: [],
            dramas: [
                drama([
                    {
                        id: 'heart',
                        name: '我心不死',
                        episodes: 8,
                        addedAt: '2026-11-11',
                        episodeDates: dates,
                    },
                ]),
            ],
        };
        const summary = summarizeChanges({ shows: [], dramas: [] }, next, '2026-11-10');
        render(<Timeline groups={summary.timeline} entries={[]} />);
        const all = screen.getByRole('button', { name: /查看全部/ });
        expect(hasIcon(all, 'chevron-down')).toBe(true);
    });
});

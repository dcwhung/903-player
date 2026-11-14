import { summarizeChanges, type ChangeDocument, type ChangeItem } from '@903-player/catalog';
import { render, screen, within } from '@testing-library/react';
import { hasIcon } from '../../../tests/icons';
import { Timeline } from './Timeline';
import { cardsIn, drama, fixToday, groupsOf, rowsIn } from './timelineTestKit';

fixToday();

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
        expect(text).toHaveTextContent(
            'App 外觀名稱與簡介發佈後自動重新部署播放器（約 5 分鐘）；已安裝的 App 須重新安裝方會更新圖示',
        );
        expect(within(text!).getByText('App 外觀')).toHaveClass('tl-tag', 'look');
        expect(banner).toHaveTextContent('App 外觀首頁 Banner');
        expect(banner).not.toHaveTextContent('重新部署');
        expect(rowsIn(waves!)).toEqual(['修改節目簡介']);
    });

    it('should show an appearance-only publish as a 即時上線 group', () => {
        render(<Timeline groups={[]} entries={[]} appearance={['icon']} />);
        const [now] = groupsOf();
        expect(now).toHaveTextContent('即時上線');
        expect(now).toHaveTextContent('App 外觀App 圖示發佈後自動重新部署播放器（約 5 分鐘）');
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

import type { ChangeItem, ChangeTimelineGroup } from '@903-player/catalog';
import { render, screen, within } from '@testing-library/react';
import type { TodoRow } from '../../api/types';
import { Timeline } from './Timeline';
import { cardsIn, discOf, drama, fixToday, groupsOf, loaded, rowsIn } from './timelineTestKit';

fixToday();

const NA = { state: 'na' } as const;
const DONE = { state: 'done' } as const;
const CAMP: TodoRow = {
    key: 'newArc/lancy/camp',
    publish: 'incomplete',
    kind: 'newArc',
    findingIds: [2],
    dramaId: 'lancy',
    arcId: 'camp',
    name: '蘭茜夫人劇場 · 大衛營',
    cells: {
        folder: DONE,
        id: DONE,
        images: DONE,
        schedule: { state: 'must', target: '/dramas/lancy/schedule#camp' },
        summary: NA,
    },
};
const EDIT: ChangeItem = {
    kind: 'edit',
    when: 'now',
    entry: { kind: 'shows', id: 'waves', name: '口水多過浪花' },
    detail: { fields: ['summary'] },
};
const ENTRIES = loaded({
    shows: [],
    dramas: [
        {
            ...drama([{ id: 'camp', name: '大衛營', disc: 'camp.webp' }]),
            images: { 'disc.webp': 'lancy.webp', 'camp.webp': 'camp.webp' },
        },
    ],
});

const NOW: ChangeTimelineGroup[] = [{ when: 'now', items: [EDIT] }];

describe('Timeline 不會在本次發佈', () => {
    it('should list incomplete rows last, grouped by drama, with the reason', () => {
        render(<Timeline groups={NOW} entries={ENTRIES} skipped={[CAMP]} />);
        const skip = groupsOf().at(-1)!;
        expect(skip).toHaveClass('skip');
        expect(within(skip).getByText('不會在本次發佈')).toBeInTheDocument();
        expect(skip.querySelector('.when')).toHaveTextContent('不會在本次發佈設定完成後可再發佈');
        const [card] = cardsIn(skip);
        expect(card).toHaveClass('skipped');
        expect(card).toHaveTextContent('蘭茜夫人劇場');
        expect(rowsIn(card!)).toEqual(['未完成大衛營尚未設定排期']);
        expect(within(card!).getByText('未完成')).toHaveClass('tl-tag', 'skip');
        expect(discOf(card!.querySelector('.tl-entry-head .thumb'))).toContain('lancy.webp');
        expect(discOf(card!.querySelector('.tl-row .thumb'))).toContain('camp.webp');
    });

    it('should not show the group when nothing is skipped', () => {
        render(<Timeline groups={NOW} entries={ENTRIES} skipped={[]} />);
        expect(groupsOf()).toHaveLength(1);
        expect(screen.queryByText('不會在本次發佈')).not.toBeInTheDocument();
    });

    it('should show only the skip group when nothing else goes out', () => {
        render(<Timeline groups={[]} entries={ENTRIES} skipped={[CAMP]} />);
        const groups = groupsOf();
        expect(groups).toHaveLength(1);
        expect(groups[0]).toHaveClass('skip');
    });

    it('should label a whole new drama row 劇集, without an arc disc (S-1005)', () => {
        const golden: TodoRow = {
            ...CAMP,
            key: 'newDrama/golden',
            kind: 'newDrama',
            dramaId: 'golden',
            arcId: null,
            name: '黃金少年',
        };
        render(<Timeline groups={NOW} entries={ENTRIES} skipped={[golden]} />);
        const [card] = cardsIn(groupsOf().at(-1)!);
        expect(card).toHaveTextContent('黃金少年');
        expect(rowsIn(card!)).toEqual(['未完成劇集尚未設定排期']);
        expect(card!.querySelector('.tl-row .thumb')).toBeNull();
    });
});

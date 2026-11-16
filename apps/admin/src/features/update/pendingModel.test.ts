import type { ChangeItem } from '@903-player/catalog';
import type { ChangesResponse, TodoRow } from '../../api/types';
import { pendingEdits, pendingPublishCount } from './pendingModel';

const SHOW = { kind: 'shows', id: 'waves', name: '口水多過浪花' } as const;
const edit = (fields: string[]): ChangeItem => ({
    kind: 'edit',
    when: 'now',
    entry: SHOW,
    detail: { fields },
});
const UNLIST: ChangeItem = { kind: 'unlist', when: 'now', entry: SHOW, detail: {} };
const ROW = { key: 'newArc/lancy/love-after' } as TodoRow;

const changes = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    appearance: { icon: false, text: false, banner: false },
    others: { items: [], timeline: [] },
    ...over,
});

describe('pendingEdits', () => {
    it('should return the 修改 items among the other saved changes', () => {
        const summary = { items: [edit(['airTime']), UNLIST, edit(['theme'])], timeline: [] };
        expect(pendingEdits(changes({ others: summary }))).toEqual([
            edit(['airTime']),
            edit(['theme']),
        ]);
    });

    it('should return nothing when changes have not loaded or come from an old API', () => {
        expect(pendingEdits(undefined)).toEqual([]);
        expect(pendingEdits(changes({ others: undefined }))).toEqual([]);
    });
});

describe('pendingPublishCount', () => {
    it('should add new-content rows, edited items and changed App 外觀 items', () => {
        const data = changes({
            appearance: { icon: true, text: false, banner: true },
            others: { items: [edit(['hosts']), edit(['summary']), UNLIST], timeline: [] },
        });
        expect(pendingPublishCount([ROW, ROW], data)).toBe(6);
    });

    it('should count only the todo rows while changes have not loaded', () => {
        expect(pendingPublishCount([ROW], undefined)).toBe(1);
    });

    it('should be zero when nothing is pending', () => {
        expect(pendingPublishCount([], changes())).toBe(0);
    });
});

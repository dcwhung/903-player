import type { ChangeItem } from '@903-player/catalog';
import type { ChangesResponse, TodoRow } from '../../api/types';
import { pendingOthers, pendingPublishCount } from './pendingModel';

const SHOW = { kind: 'shows', id: 'waves', name: '口水多過浪花' } as const;
const edit = (fields: string[]): ChangeItem => ({
    kind: 'edit',
    when: 'now',
    entry: SHOW,
    detail: { fields },
});
const UNLIST: ChangeItem = { kind: 'unlist', when: 'now', entry: SHOW, detail: {} };
const REORDER: ChangeItem = { kind: 'reorder', when: 'now', detail: { list: 'shows' } };
const ROW = { key: 'newArc/lancy/love-after' } as TodoRow;

const changes = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    appearance: { icon: false, text: false, banner: false },
    others: { items: [], timeline: [] },
    ...over,
});

describe('pendingOthers', () => {
    it('should return every other saved change of any kind (all published together)', () => {
        const items = [edit(['airTime']), UNLIST, REORDER, edit(['theme'])];
        expect(pendingOthers(changes({ others: { items, timeline: [] } }))).toEqual(items);
    });

    it('should return nothing when changes have not loaded or come from an old API', () => {
        expect(pendingOthers(undefined)).toEqual([]);
        expect(pendingOthers(changes({ others: undefined }))).toEqual([]);
    });
});

describe('pendingPublishCount', () => {
    it('should add new-content rows, every other saved change and changed App 外觀 items', () => {
        const data = changes({
            appearance: { icon: true, text: false, banner: true },
            others: { items: [edit(['hosts']), edit(['summary']), UNLIST, REORDER], timeline: [] },
        });
        expect(pendingPublishCount([ROW, ROW], data)).toBe(8);
    });

    it('should count only the todo rows while changes have not loaded', () => {
        expect(pendingPublishCount([ROW], undefined)).toBe(1);
    });

    it('should be zero when nothing is pending', () => {
        expect(pendingPublishCount([], changes())).toBe(0);
    });
});

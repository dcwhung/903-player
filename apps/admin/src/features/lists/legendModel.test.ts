import type { LoadedEntry } from '../../api/types';
import type { ChangeFlags } from '../../model/listModel';
import { legendOf } from './legendModel';

const TODAY = '2026-11-11';
const drama = (id: string, definition: LoadedEntry['definition'], draft = false): LoadedEntry => ({
    kind: 'dramas',
    id,
    definition,
    images: {},
    draft,
    updatedAt: 'v',
    etag: null,
});
const flags = (over: Partial<ChangeFlags> = {}): ChangeFlags => ({
    pending: new Set(),
    never: new Set(),
    newArcs: new Set(),
    ...over,
});

describe('legendOf', () => {
    it('should list only the dot colours that appear, in live / soon / off order', () => {
        const entries = [
            drama('off', { enabled: false }),
            drama('live', { enabled: true, addedAt: '2026-01-01' }),
        ];
        expect(legendOf(entries, flags(), TODAY)).toEqual({
            dots: ['live', 'off'],
            pending: false,
            newArcs: false,
        });
        const soon = drama('soon', { enabled: true, addedAt: '2099-01-01' });
        expect(legendOf([soon], flags(), TODAY).dots).toEqual(['soon']);
    });

    it('should add the grey 未上架 dot after 已下架 for never-published disabled entries', () => {
        const entries = [
            { ...drama('fresh', { enabled: false }), published: false },
            { ...drama('old', { enabled: false }), published: true },
        ];
        expect(legendOf(entries, flags(), TODAY).dots).toEqual(['off', 'unlisted']);
    });

    it('should explain 待發佈 / 新 only when the list shows them', () => {
        const entries = [drama('lancy', { enabled: true, arcs: [{ id: 'a2' }] })];
        const shown = flags({ pending: new Set(['dramas:lancy']), newArcs: new Set(['lancy:a2']) });
        expect(legendOf(entries, shown, TODAY)).toMatchObject({ pending: true, newArcs: true });
        // 從未發佈嘅劇顯示「從未發佈」唔係「待發佈」；新短篇屬於唔喺列表嘅劇就唔計
        const hidden = flags({
            pending: new Set(['dramas:other']),
            never: new Set(['dramas:lancy']),
            newArcs: new Set(['other:a1']),
        });
        expect(legendOf(entries, hidden, TODAY)).toMatchObject({ pending: false, newArcs: false });
    });
});

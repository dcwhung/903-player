import type { ChangeItem } from '@903-player/catalog';
import type { PublishSelection, TodoRow } from '../../api/types';
import {
    EMPTY_UNPICKED,
    changedAppearance,
    decodeSelection,
    encodeSelection,
    hasAnythingToPublish,
    incompleteRows,
    pickedCount,
    selectionOf,
} from './selectionModel';

const NA = { state: 'na' } as const;
const CELLS = { folder: NA, id: NA, images: NA, schedule: NA, summary: NA };
const row = (key: string, publish: TodoRow['publish']): TodoRow => ({
    key,
    publish,
    kind: 'newArc',
    findingIds: [1],
    dramaId: 'lancy',
    arcId: key.split('/')[2] ?? null,
    name: `蘭茜夫人劇場 · ${key}`,
    cells: CELLS,
});

const ROWS = [
    row('newArc/lancy/love-after', 'selectable'),
    row('newArc/sammy/camp', 'incomplete'),
    row('newEpisodes/golden/s1', 'always'),
    row('newDrama/fresh', 'selectable'),
];
const APPEARANCE = { icon: false, text: true, banner: true };
const EDIT = { kind: 'edit', when: 'now', detail: {} } as unknown as ChangeItem;

describe('selectionModel', () => {
    it('should list only the appearance items that changed, in card order', () => {
        expect(changedAppearance(APPEARANCE)).toEqual(['text', 'banner']);
        expect(changedAppearance(undefined)).toEqual([]);
    });

    it('should pick every selectable row and changed appearance item by default (Q1)', () => {
        expect(selectionOf(ROWS, APPEARANCE, EMPTY_UNPICKED)).toEqual({
            content: ['newArc/lancy/love-after', 'newDrama/fresh'],
            branding: { icon: false, text: true },
            banner: true,
        });
    });

    it('should leave out what was unticked and never pick incomplete / always rows', () => {
        const unpicked = {
            content: new Set(['newDrama/fresh', 'newArc/sammy/camp']),
            appearance: new Set(['banner'] as const),
        };
        expect(selectionOf(ROWS, APPEARANCE, unpicked)).toEqual({
            content: ['newArc/lancy/love-after'],
            branding: { icon: false, text: true },
            banner: false,
        });
    });

    it('should count picked items and incomplete rows for the footer', () => {
        const selection = selectionOf(ROWS, APPEARANCE, EMPTY_UNPICKED);
        expect(pickedCount(selection)).toBe(4);
        expect(incompleteRows(ROWS).map((r) => r.key)).toEqual(['newArc/sammy/camp']);
    });

    it('should have nothing to publish with no pick and no other change (Q4)', () => {
        const none: PublishSelection = {
            content: [],
            branding: { icon: false, text: false },
            banner: false,
        };
        expect(hasAnythingToPublish(none, [])).toBe(false);
        expect(hasAnythingToPublish(none, [EDIT])).toBe(true);
        expect(hasAnythingToPublish({ ...none, banner: true }, [])).toBe(true);
    });

    it('should round-trip a selection through the URL and reject a malformed one', () => {
        const selection = selectionOf(ROWS, APPEARANCE, EMPTY_UNPICKED);
        expect(decodeSelection(new URLSearchParams(encodeSelection(selection)))).toEqual(selection);
        expect(decodeSelection(new URLSearchParams(''))).toBeUndefined();
        expect(decodeSelection(new URLSearchParams('selection=%7Bbad'))).toBeUndefined();
        expect(
            decodeSelection(new URLSearchParams({ selection: '{"content":[1]}' })),
        ).toBeUndefined();
    });
});

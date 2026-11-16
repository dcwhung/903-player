import type { ChangeItem } from '@903-player/catalog';
import type { ChangesResponse, PublishSelection, TodoRow } from '../../api/types';
import {
    EMPTY_UNPICKED,
    changedAppearance,
    decodeSelection,
    encodeSelection,
    hasAnythingToPublish,
    incompleteRows,
    pickedCount,
    publishedAppearance,
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

describe('publishedAppearance (本次發佈 + 時間線 App 外觀卡)', () => {
    const ALL = { content: [], branding: { icon: true, text: true }, banner: true };
    const data = (over: Partial<ChangesResponse>): ChangesResponse => ({
        base: 1,
        changes: { items: [], timeline: [] },
        validation: { ok: true, episodeCount: 1 },
        appearance: { icon: true, text: true, banner: true },
        brandingChanged: true,
        bannerChanged: true,
        ...over,
    });

    it('should list picked items that changed, in App 外觀 page order', () => {
        expect(publishedAppearance(data({}), ALL)).toEqual(['icon', 'text', 'banner']);
        const textOnly = { ...ALL, branding: { icon: false, text: true }, banner: false };
        expect(publishedAppearance(data({}), textOnly)).toEqual(['text']);
    });

    it('should drop items the draft does not change', () => {
        const appearance = { icon: false, text: true, banner: false };
        expect(publishedAppearance(data({ appearance }), ALL)).toEqual(['text']);
        expect(publishedAppearance(data({ appearance: undefined }), ALL)).toEqual([]);
    });

    it('should drop items the server says will not change with this selection', () => {
        expect(publishedAppearance(data({ brandingChanged: false }), ALL)).toEqual(['banner']);
        expect(publishedAppearance(data({ bannerChanged: undefined }), ALL)).toEqual([
            'icon',
            'text',
        ]);
    });
});

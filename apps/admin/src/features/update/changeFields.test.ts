import type { ChangeItem } from '@903-player/catalog';
import type { LoadedEntry } from '../../api/types';
import { editFieldsText } from './changeFields';

const lancy = { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' } as const;

const edit = (fields: string[]): ChangeItem => ({
    kind: 'edit',
    when: 'now',
    entry: lancy,
    detail: { fields },
});

const ENTRIES = [
    {
        kind: 'dramas',
        id: 'lancy',
        etag: null,
        definition: {
            name: '蘭茜夫人劇場',
            arcs: [{ id: 'love', name: '戀愛二分一' }, { name: '我心不死' }],
        },
        images: {},
        draft: false,
        updatedAt: 'v1',
    },
] as unknown as LoadedEntry[];

describe('editFieldsText', () => {
    it('should list the changed entry fields with the editor labels', () => {
        expect(editFieldsText(edit(['theme', 'summary', 'images']), ENTRIES)).toBe(
            '配色、簡介、圖片',
        );
    });

    it('should name the arc for arc fields, grouping fields of the same arc', () => {
        const item = edit(['name', 'arcs.love.summary', 'arcs.love.cast', 'arcs.我心不死.titles']);
        expect(editFieldsText(item, ENTRIES)).toBe(
            '名稱；戀愛二分一：簡介、聲演；我心不死：各集標題',
        );
    });

    it('should fall back to the arc id and to 其他 for unknown fields, without repeats', () => {
        const item = edit(['arcs.gone.mystery', 'arcs.gone.other2', 'tile', 'disc']);
        expect(editFieldsText(item, [])).toBe('橫圖、碟面；gone：其他');
    });

    it('should be empty when there is nothing to show', () => {
        expect(editFieldsText(edit([]), ENTRIES)).toBe('');
        expect(editFieldsText({ ...edit([]), kind: 'unlist', detail: {} }, ENTRIES)).toBe('');
    });
});

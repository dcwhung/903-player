import type { LoadedEntry, PublishWarning } from '../../api/types';
import { warningRows } from './warningModel';

const entry = (kind: 'shows' | 'dramas', id: string, name: string): LoadedEntry => ({
    kind,
    id,
    definition: { name },
    images: {},
    draft: false,
    updatedAt: 'v1',
    etag: null,
});

const ENTRIES = [entry('dramas', 'lancy', '蘭茜'), entry('shows', 'waves', '口水多過浪花')];

describe('warningRows', () => {
    it('should describe a contrast warning with names, ratio and minimum, linking to 配色', () => {
        const warning: PublishWarning = {
            kind: 'contrast',
            target: 'dramas/lancy',
            foreground: 'muted',
            background: 'surface',
            ratio: 3.948,
            minimum: 4.5,
        };
        expect(warningRows([warning], ENTRIES)).toEqual([
            {
                key: 'dramas/lancy:muted:surface',
                text: '蘭茜：muted 與 surface 對比度 3.9:1（需 ≥ 4.5:1）',
                scope: '廣播劇 · 配色',
                href: '/dramas/lancy/theme',
                action: '前往修改',
            },
        ]);
    });

    it('should describe an unset theme and send shows to their editor', () => {
        const rows = warningRows([{ kind: 'neutralTheme', target: 'shows/waves' }], ENTRIES);
        expect(rows[0]).toMatchObject({
            text: '口水多過浪花：未設定配色，現正使用中性灰',
            scope: '節目 · 配色',
            href: '/shows/waves',
            action: '前往選擇',
        });
    });

    it('should fall back to the ID and explain unreadable colours', () => {
        const rows = warningRows(
            [
                {
                    kind: 'contrast',
                    target: 'dramas/fresh',
                    foreground: 'onAccent',
                    background: 'accent',
                    ratio: null,
                    minimum: 4.5,
                },
            ],
            ENTRIES,
        );
        expect(rows[0]?.text).toBe('fresh：onAccent 與 accent 色值無法辨認（需 ≥ 4.5:1）');
    });

    it('should skip warnings with a target it cannot read', () => {
        expect(warningRows([{ kind: 'neutralTheme', target: 'banner' }], ENTRIES)).toEqual([]);
    });
});

/* 收藏 tab 播緊嗰行（用戶截圖，v1.28.2）：冇深色底框，日期 / 狀態用嗰個節目 / 劇嘅主題色 */
import { render, screen } from '@testing-library/react';
import { SavedTab } from './SavedTab';
import type { SavedRowView, SavedTabView } from './savedTypes';

const row = (extra: Partial<SavedRowView>): SavedRowView => ({
    key: '/chisee/1',
    label: '第 1 集',
    spokenLabel: '第 1 集',
    status: '播放中',
    ratio: 0.1,
    playing: true,
    name: '芝See菇Bi Family，三十六計',
    zoomKey: 'episode:/chisee/1',
    onOpen: vi.fn(),
    onPlay: vi.fn(),
    onRemove: vi.fn(),
    ...extra,
});

const view = (rows: SavedRowView[]): SavedTabView => ({
    mode: 'saved',
    recentColumns: 1,
    layout: 'phone',
    columns: 1,
    solo: false,
    boxes: [
        {
            key: 'drama:chisee',
            kind: 'drama',
            title: '芝See菇Bi Family',
            banner: '/banner.webp',
            sections: [{ key: 's', art: '/disc.webp', heading: '三十六計', rows }],
        },
    ],
    recent: [],
});

describe('SavedTab playing row colour', () => {
    it('should hand the row its own theme colour for the playing highlight', () => {
        render(<SavedTab view={view([row({ accent: '#f7901e' })])} />);
        const li = screen.getByText('第 1 集').closest('li');

        expect(li).toHaveAttribute('data-playing', 'true');
        expect(li?.style.getPropertyValue('--saved-row-accent')).toBe('#f7901e');
    });

    it('should not set a colour on a row without one', () => {
        render(<SavedTab view={view([row({ playing: false })])} />);
        const li = screen.getByText('第 1 集').closest('li');

        expect(li?.style.getPropertyValue('--saved-row-accent')).toBe('');
    });
});

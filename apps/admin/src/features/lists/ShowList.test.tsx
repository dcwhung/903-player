import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LoadedEntry } from '../../api/types';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import { ShowList } from './ShowList';

const show = (over: Partial<LoadedEntry['definition']> = {}): LoadedEntry => ({
    kind: 'shows',
    id: 'waves',
    definition: { name: '口水多過浪花', airDays: [1, 2, 3, 4, 5], order: 1, ...over },
    images: {},
    draft: false,
    updatedAt: 'v1',
    etag: '"v1"',
});

const renderList = (entry = show()) =>
    renderAt('/shows', '/shows', <ShowList />, fakeData({ entries: resource([entry]) }));

describe('ShowList', () => {
    it('should show the air days and air time in the row meta', () => {
        renderList(show({ airTime: { start: '15:00', end: '16:30' } }));
        expect(screen.getByText('星期一至五（15:00 - 16:30）')).toBeInTheDocument();
    });

    it('should list a new show saved without images (draft, disabled) under 已下架', () => {
        renderList({ ...show({ name: '新節目', enabled: false }), id: 'abc', draft: true });
        expect(screen.getByText('新節目')).toBeInTheDocument();
    });

    it('should show 未上架 for a disabled show that was never published, 已下架 otherwise', () => {
        const fresh = { ...show({ name: '新節目', enabled: false }), id: 'abc', published: false };
        const old = { ...show({ name: '舊節目', enabled: false }), id: 'old', published: true };
        renderAt('/shows', '/shows', <ShowList />, fakeData({ entries: resource([fresh, old]) }));
        const freshRow = screen.getByText('新節目').closest('li') as HTMLElement;
        const oldRow = screen.getByText('舊節目').closest('li') as HTMLElement;
        expect(within(freshRow).getByText('未上架', { selector: '.pill' })).toHaveClass('unlisted');
        expect(within(oldRow).getByText('已下架', { selector: '.pill' })).toHaveClass('bad');
    });

    it('should open the editor when the row background is clicked', async () => {
        renderList();
        await userEvent.click(screen.getByText('星期一至五'));
        expect(screen.getByText('other page')).toBeInTheDocument();
    });

    it('should not open the editor when the drag handle is used', async () => {
        renderList();
        await userEvent.click(
            screen.getByRole('button', { name: '拖曳以調整「口水多過浪花」的次序' }),
        );
        expect(screen.queryByText('other page')).not.toBeInTheDocument();
    });

    it('should only explain what the list shows, and always the drag hint', () => {
        renderList();
        const legend = within(screen.getByRole('group', { name: '圖例' }));
        expect(legend.getByText('上架中')).toBeInTheDocument();
        // 冇已下架節目、冇待發佈 → 唔出
        expect(legend.queryByText('已下架')).not.toBeInTheDocument();
        expect(legend.queryByText('更新過但未公開')).not.toBeInTheDocument();
        const drag = legend.getByText('拖曳調整播放器顯示次序');
        // ⠿ icon 排第一，跟住先係字
        expect(drag.firstChild?.nodeName.toLowerCase()).toBe('svg');
        expect(drag.textContent).toBe('拖曳調整播放器顯示次序');
        expect(legend.queryByText('從未發佈的短篇')).not.toBeInTheDocument();
    });
});

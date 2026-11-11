import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LoadedEntry } from '../../api/types';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import { DramaList } from './DramaList';

const drama: LoadedEntry = {
    kind: 'dramas',
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        order: 1,
        addedAt: '2026-01-01',
        arcs: [{ id: 'half', name: '戀愛二分一', episodes: 30 }],
    },
    images: {},
    draft: false,
    updatedAt: 'v1',
    etag: '"v1"',
};

describe('DramaList', () => {
    it('should open the drama editor from anywhere on the row except its controls', async () => {
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([drama]) }));
        await userEvent.click(screen.getByText('短篇集 · 30 集'));
        expect(screen.getByText('other page')).toBeInTheDocument();
    });

    it('should explain the coloured dots, 待發佈 and 新 in the legend', () => {
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([drama]) }));
        const legend = within(screen.getByRole('group', { name: '圖例' }));
        for (const text of ['上架中', '上架日期未到', '已下架', '有已儲存但未發佈的改動'])
            expect(legend.getByText(text)).toBeInTheDocument();
        expect(legend.getByText('從未發佈的短篇')).toBeInTheDocument();
    });
});

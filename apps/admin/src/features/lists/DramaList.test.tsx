import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChangesResponse, LoadedEntry } from '../../api/types';
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
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dramas\/lancy$/);
    });

    it('should open the arc in the arcs tab when its name is clicked, not the drama editor', async () => {
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([drama]) }));
        const arc = screen.getByRole('link', { name: '戀愛二分一' });
        expect(arc).toHaveAttribute('href', '/dramas/lancy/arcs#half');
        await userEvent.click(arc);
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dramas\/lancy\/arcs#half$/);
    });

    it('should open the arc from the keyboard (Enter on the arc link)', async () => {
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([drama]) }));
        screen.getByRole('link', { name: '戀愛二分一' }).focus();
        await userEvent.keyboard('{Enter}');
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dramas\/lancy\/arcs#half$/);
    });

    it('should trap Tab in the ＋ dialog, close on Esc and return focus to ＋ (S-811)', async () => {
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([drama]) }));
        const add = screen.getByRole('button', { name: '新增廣播劇' });
        await userEvent.click(add);
        const dialog = within(screen.getByRole('dialog', { name: '新增廣播劇' }));
        const close = dialog.getByRole('button', { name: '關閉' });
        const rescan = dialog.getByRole('button', { name: '重新掃描' });
        expect(close).toHaveFocus();
        await userEvent.tab();
        expect(rescan).toHaveFocus();
        await userEvent.tab();
        expect(close).toHaveFocus();
        await userEvent.tab({ shift: true });
        expect(rescan).toHaveFocus();
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(add).toHaveFocus();
    });

    it('should return focus to ＋ after 關閉 too (S-811)', async () => {
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([drama]) }));
        const add = screen.getByRole('button', { name: '新增廣播劇' });
        await userEvent.click(add);
        await userEvent.click(screen.getByRole('button', { name: '關閉' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(add).toHaveFocus();
    });

    it('should explain 待發佈 and 新 once the list has them, and only the dots that appear', () => {
        const changes = {
            base: null,
            changes: {
                items: [
                    {
                        kind: 'newArc',
                        when: 'now',
                        entry: { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' },
                        arc: { id: 'half', name: '戀愛二分一', label: '戀愛二分一' },
                        detail: {},
                    },
                ],
                timeline: [],
            },
            validation: { ok: true, episodeCount: 30 },
        };
        renderAt(
            '/dramas',
            '/dramas',
            <DramaList />,
            fakeData({
                entries: resource([drama]),
                changes: resource(changes as unknown as ChangesResponse),
            }),
        );
        const legend = within(screen.getByRole('group', { name: '圖例' }));
        expect(legend.getByText('上架中')).toBeInTheDocument();
        expect(legend.queryByText('上架日期未到')).not.toBeInTheDocument();
        expect(legend.queryByText('已下架')).not.toBeInTheDocument();
        expect(legend.getByText('更新過但未公開')).toBeInTheDocument();
        expect(legend.getByText('從未發佈的短篇')).toBeInTheDocument();
    });
});

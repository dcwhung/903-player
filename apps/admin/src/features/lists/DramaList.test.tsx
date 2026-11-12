import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChangesResponse, LoadedEntry } from '../../api/types';
import { hasIcon } from '../../../tests/icons';
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

    it('should show chevrons (not ▾ / ▴) on 展開全部 / 收起', async () => {
        const many: LoadedEntry = {
            ...drama,
            definition: {
                ...drama.definition,
                arcs: [1, 2, 3, 4, 5, 6].map((n) => ({
                    id: `a${n}`,
                    name: `短篇${n}`,
                    episodes: 3,
                })),
            },
        };
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([many]) }));
        const expand = screen.getByRole('button', { name: '展開全部 6 個短篇' });
        expect(hasIcon(expand, 'chevron-down')).toBe(true);
        await userEvent.click(expand);
        const collapse = screen.getByRole('button', { name: '收起' });
        expect(hasIcon(collapse, 'chevron-up')).toBe(true);
    });

    it('should show 未上架 for never-published arcs and keep 已下架 for published ones', () => {
        const mixed: LoadedEntry = {
            ...drama,
            definition: {
                ...drama.definition,
                arcs: [
                    ...[1, 2, 3, 4].map((n) => ({ id: `a${n}`, name: `短篇${n}`, episodes: 3 })),
                    { id: 'fantasy', name: '森美幻想劇', episodes: 5, enabled: false },
                    { id: 'old', name: '舊短篇', episodes: 5, enabled: false },
                ],
            },
            published: true,
            publishedArcs: ['a1', 'a2', 'a3', 'a4', 'old'],
        };
        renderAt('/dramas', '/dramas', <DramaList />, fakeData({ entries: resource([mixed]) }));
        const row = screen.getByRole('link', { name: '森美幻想劇' }).closest('li');
        expect(row).not.toBeNull();
        const fantasy = within(row as HTMLElement);
        const unlisted = fantasy.getByText('未上架', { selector: '.pill' });
        expect(unlisted).toHaveClass('unlisted');
        expect(fantasy.getByText('已下架', { selector: '.pill' })).toHaveClass('bad');
        // 收埋嘅淨係已上架嗰啲，摘要字眼照舊
        expect(fantasy.getByText('其餘 4 個已上架')).toBeInTheDocument();
    });

    it('should grey out a never-published disabled drama and label its section 未上架 / 已下架', () => {
        const fresh: LoadedEntry = {
            ...drama,
            id: 'fresh',
            definition: { ...drama.definition, name: '新劇', enabled: false },
            published: false,
            publishedArcs: [],
        };
        const { container } = renderAt(
            '/dramas',
            '/dramas',
            <DramaList />,
            fakeData({ entries: resource([drama, fresh]) }),
        );
        expect(container.querySelector('.thumb.st-unlisted')).not.toBeNull();
        expect(screen.getByText(/^未上架 \/ 已下架（1）/)).toHaveClass('section-divider');
        const legend = within(screen.getByRole('group', { name: '圖例' }));
        expect(legend.getByText('未上架')).toBeInTheDocument();
        expect(legend.queryByText('已下架')).not.toBeInTheDocument();
    });
});

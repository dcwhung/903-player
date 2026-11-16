import type { ChangeItem } from '@903-player/catalog';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse, TodoRow } from '../../api/types';
import { UpdatePage } from './UpdatePage';

const DONE = { state: 'done', target: '/dramas/lancy/arcs#love-after' } as const;
const READY: TodoRow = {
    key: 'newArc/lancy/love-after',
    publish: 'selectable',
    kind: 'newArc',
    findingIds: [1],
    dramaId: 'lancy',
    arcId: 'love-after',
    name: '蘭茜夫人劇場 · 戀愛後二分一',
    cells: { folder: DONE, id: DONE, images: DONE, schedule: DONE, summary: DONE },
};
const CAMP: TodoRow = {
    ...READY,
    key: 'newArc/sammy/camp',
    publish: 'incomplete',
    dramaId: 'sammy',
    arcId: 'camp',
    name: '森美小儀系列 · 大衛營',
    cells: { ...READY.cells, schedule: { state: 'must', target: '/dramas/sammy/schedule#camp' } },
};
const EDIT = { kind: 'edit', when: 'now', detail: {} } as unknown as ChangeItem;
const SHOW_EDIT: ChangeItem = {
    kind: 'edit',
    when: 'now',
    entry: { kind: 'shows', id: 'waves', name: '口水多過浪花' },
    detail: { fields: ['airTime', 'hosts', 'theme'] },
};
const UNLIST: ChangeItem = { ...SHOW_EDIT, kind: 'unlist', detail: {} };
const REORDER: ChangeItem = { kind: 'reorder', when: 'now', detail: { list: 'shows' } };

const changes = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    appearance: { icon: false, text: true, banner: false },
    others: { items: [], timeline: [] },
    ...over,
});

const show = (rows: TodoRow[], over: Partial<ChangesResponse> = {}) => {
    mockApi({
        'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
        'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
    });
    return renderAt(
        '/',
        '/',
        <UpdatePage />,
        fakeData({
            todos: resource({ rows, blocking: 1 }),
            changes: resource(changes(over)),
        }),
    );
};

describe('UpdatePage', () => {
    it('should keep 下一步 disabled until GET /api/changes has loaded (S-987)', () => {
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
            'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
        });
        renderAt(
            '/',
            '/',
            <UpdatePage />,
            fakeData({ todos: resource({ rows: [READY], blocking: 0 }) }),
        );
        // App 外觀未知：照撳會靜靜雞唔發佈預設勾咗嘅 App 外觀
        expect(screen.getByRole('button', { name: '下一步：確認發佈' })).toBeDisabled();
        expect(screen.getByText('載入中…')).toBeInTheDocument();
    });

    it('should show the load error and keep 下一步 disabled when GET /api/changes fails (S-988)', () => {
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
            'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
        });
        const failed = { ...resource<ChangesResponse>(undefined), error: new Error('HTTP 500') };
        renderAt(
            '/',
            '/',
            <UpdatePage />,
            fakeData({ todos: resource({ rows: [READY], blocking: 0 }), changes: failed }),
        );
        expect(screen.getByRole('button', { name: '下一步：確認發佈' })).toBeDisabled();
        expect(screen.getByText('載入失敗：HTTP 500')).toBeInTheDocument();
        expect(screen.queryByText('載入中…')).not.toBeInTheDocument();
    });

    it('should let you publish while a row still needs work, carrying the selection', async () => {
        show([READY, CAMP]);
        expect(screen.getByRole('heading', { name: /App 外觀/ })).toBeInTheDocument();
        expect(screen.getByText('已選擇 2 項發佈 · 1 項未完成（不會發佈）')).toBeInTheDocument();
        const next = screen.getByRole('button', { name: '下一步：確認發佈' });
        expect(next).toBeEnabled();
        await userEvent.click(screen.getByRole('checkbox', { name: '發佈名稱與簡介' }));
        expect(screen.getByText('已選擇 1 項發佈 · 1 項未完成（不會發佈）')).toBeInTheDocument();
        await userEvent.click(next);
        const location = decodeURIComponent(screen.getByTestId('location').textContent ?? '');
        expect(location).toBe(
            '/publish?selection={"content":["newArc/lancy/love-after"],"branding":{"icon":false,"text":false},"banner":false}',
        );
    });

    it('should hide the App 外觀 section when nothing in it changed', () => {
        show([READY], { appearance: { icon: false, text: false, banner: false } });
        expect(screen.queryByRole('heading', { name: /App 外觀/ })).not.toBeInTheDocument();
        expect(screen.getByText('已選擇 1 項發佈')).toBeInTheDocument();
    });

    it('should grey out 下一步 with 未選擇任何內容 when nothing is picked (Q4)', async () => {
        show([READY, CAMP], { appearance: { icon: false, text: false, banner: false } });
        await userEvent.click(screen.getByRole('checkbox', { name: '發佈戀愛後二分一' }));
        expect(screen.getByText('未選擇任何內容')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '下一步：確認發佈' })).toBeDisabled();
    });

    it('should still go on with only other saved changes', async () => {
        show([READY], {
            appearance: { icon: false, text: false, banner: false },
            others: { items: [EDIT], timeline: [] },
        });
        await userEvent.click(screen.getByRole('checkbox', { name: '發佈戀愛後二分一' }));
        expect(screen.getByText('只發佈其他已儲存的改動')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '下一步：確認發佈' })).toBeEnabled();
    });

    it('should list every other saved change like the publish page, published together', () => {
        show([READY], { others: { items: [SHOW_EDIT, UNLIST, REORDER], timeline: [] } });
        const section = screen.getByRole('region', { name: /其他改動/ });
        expect(within(section).getByText('以下改動將一併發佈')).toBeInTheDocument();
        expect(within(section).getByText('口水多過浪花')).toBeInTheDocument();
        const chips = [...section.querySelectorAll('.tl-chip')].map((chip) => chip.textContent);
        expect(chips).toEqual(['播放時間', '主持', '配色']);
        // 修改、下架、排序全部列出（一定一併發佈）；冇勾選、冇還原
        const tags = [...section.querySelectorAll('.tl-tag')].map((tag) => tag.textContent);
        expect(tags).toEqual(['修改', '下架', '修改']);
        expect(within(section).getByText('節目排序已更改')).toBeInTheDocument();
        expect(within(section).queryByRole('checkbox')).not.toBeInTheDocument();
        expect(within(section).queryByRole('button')).not.toBeInTheDocument();
    });

    it('should show an unlist-only change in the section too', () => {
        show([READY], { others: { items: [UNLIST], timeline: [] } });
        const section = screen.getByRole('region', { name: /其他改動/ });
        expect(within(section).getByText('下架')).toBeInTheDocument();
    });

    it('should not render the section when there are no other saved changes', () => {
        show([READY]);
        expect(screen.queryByRole('region', { name: /其他改動/ })).not.toBeInTheDocument();
    });

    it('should carry the same selection from the stepper 確認發佈 step as from 下一步', async () => {
        show([READY, CAMP]);
        await userEvent.click(screen.getByRole('checkbox', { name: '發佈名稱與簡介' }));
        await userEvent.click(screen.getByRole('link', { name: /確認發佈/ }));
        const location = decodeURIComponent(screen.getByTestId('location').textContent ?? '');
        expect(location).toBe(
            '/publish?selection={"content":["newArc/lancy/love-after"],"branding":{"icon":false,"text":false},"banner":false}',
        );
    });
});

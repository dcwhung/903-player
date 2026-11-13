import type { ChangeItem } from '@903-player/catalog';
import { screen } from '@testing-library/react';
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
});

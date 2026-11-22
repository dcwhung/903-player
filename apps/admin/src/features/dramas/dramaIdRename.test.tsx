/* 改劇集 ID 再儲存（AU-013）：server 跟住改嘅短篇 ID（<舊 ID>-NN）唔可以畀 PUT 寫返舊嘅 */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TodoRow } from '../../api/types';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import { DramaEditorPage } from './DramaEditor';

const ARCS = [
    { id: 'drama-01-01', name: '第一輯', episodes: 3 },
    { id: 'special', name: '特別篇', episodes: 1 },
];
const RENAMED_ARCS = [{ ...ARCS[0], id: 'lancy-01' }, ARCS[1]];

const definitionOf = (arcs: unknown[]) => ({
    name: '新劇',
    kind: 'series',
    enabled: false,
    audio: { host: 'r2', folder: '新劇', file: '{no2} - {arc}.m4a' },
    arcs,
});

const detail = (updatedAt: string, arcs: unknown[]) => ({
    body: { definition: definitionOf(arcs), images: {}, draft: true, updatedAt },
    etag: `"${updatedAt}"`,
});

const RENAME = 'POST /api/entries/dramas/drama-01/rename';
const PUT_NEW = 'PUT /api/entries/dramas/lancy';
const GET_NEW = 'GET /api/entries/dramas/lancy';
const ARC_SCHEDULED = {
    status: 409,
    body: { error: 'arc drama-01-01 has a schedule', arcId: 'drama-01-01', reason: 'arcScheduled' },
};
const SCHEDULED_MESSAGE = '此短篇已有排程，請先移除排程再修改 ID。';

const saved = (updatedAt: string) => ({
    body: { updatedAt, draft: true, warnings: { missingEpisodeIds: [] } },
});

type Api = ReturnType<typeof mockApi>;

const callsOf = (api: Api, key: string) =>
    api.mock.calls.filter(([path, init]) => `${init?.method ?? 'GET'} ${path}` === key);

const putOf = (api: Api, index: number) => {
    const init = callsOf(api, PUT_NEW)[index]?.[1];
    return {
        definition: (JSON.parse(String(init?.body)) as { definition: Record<string, unknown> })
            .definition,
        ifMatch: new Headers(init?.headers).get('if-match'),
    };
};

const idBox = () => screen.findByRole('textbox', { name: /^ID/ });

const renameTo = async (newId: string) => {
    const id = await idBox();
    await userEvent.clear(id);
    await userEvent.type(id, newId);
};

const save = () => userEvent.click(screen.getByRole('button', { name: /^儲存/ }));

const SUMMARY = '未儲存的簡介';
const typeSummary = async () =>
    userEvent.type(await screen.findByRole('textbox', { name: /簡介/ }), SUMMARY);

/** 待辦「新劇」行（由待辦入嚟：?from=todos&todo=newDrama:drama-01:） */
const TODO_ROW: TodoRow = {
    key: 'newDrama/drama-01',
    publish: 'incomplete',
    kind: 'newDrama',
    findingIds: [1],
    dramaId: 'drama-01',
    arcId: null,
    name: '新劇',
    cells: {
        folder: { state: 'done' },
        id: { state: 'must', target: '/dramas/drama-01' },
        images: { state: 'optional' },
        schedule: { state: 'must' },
        summary: { state: 'optional' },
    },
};
const FROM_TODOS = '?from=todos&todo=newDrama%3Adrama-01%3A';
const MOVED_FROM_TODOS = '?from=todos&todo=newDrama%3Alancy%3A';

const open = (url = '/dramas/drama-01', data = fakeData()) => {
    renderAt(url, '/dramas/:id', <DramaEditorPage tab="basic" />, data);
    return data;
};

describe('DramaEditor: renaming the drama ID', () => {
    it('should PUT the arc IDs the server renamed when the save also changes a field', async () => {
        const api = mockApi({
            'GET /api/entries/dramas/drama-01': () => detail('v1', ARCS),
            [RENAME]: () => ({ body: { id: 'lancy', updatedAt: 'v2' }, etag: '"v2"' }),
            [PUT_NEW]: () => saved('v3'),
            [GET_NEW]: () => detail('v3', RENAMED_ARCS),
        });
        open();
        await typeSummary();
        await renameTo('lancy');
        await save();
        await waitFor(() => expect(callsOf(api, GET_NEW)).toHaveLength(1));
        expect(callsOf(api, RENAME)).toHaveLength(1);
        expect(putOf(api, 0)).toEqual({
            definition: { ...definitionOf(RENAMED_ARCS), summary: SUMMARY },
            ifMatch: '"v2"',
        });
    });

    it('should only rename (no PUT that could fail) and move to the new ID on a rename-only save (S-1396)', async () => {
        const api = mockApi({
            'GET /api/entries/dramas/drama-01': () => detail('v1', ARCS),
            [RENAME]: () => ({ body: { id: 'lancy', updatedAt: 'v2' }, etag: '"v2"' }),
            // PUT 一定失敗：rename-only 唔應該送
            [PUT_NEW]: () => ARC_SCHEDULED,
            [GET_NEW]: () => detail('v2', RENAMED_ARCS),
        });
        const data = open('/dramas/drama-01#drama-01-01');
        await renameTo('lancy');
        await save();
        await waitFor(() => expect(callsOf(api, GET_NEW)).toHaveLength(1));
        expect(callsOf(api, RENAME)).toHaveLength(1);
        expect(callsOf(api, PUT_NEW)).toHaveLength(0);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());
        expect(await idBox()).toHaveValue('lancy');
        // 記住嘅短篇（#drama-01-01）跟住改：短篇 tab 連結帶新 ID
        expect(screen.getByRole('link', { name: /^短篇/ })).toHaveAttribute(
            'href',
            '/dramas/lancy/arcs#lancy-01',
        );
    });

    it('should stay on the renamed entry with the draft when the PUT fails, then save with a plain PUT', async () => {
        let puts = 0;
        const api = mockApi({
            'GET /api/entries/dramas/drama-01': () => detail('v1', ARCS),
            [RENAME]: () => ({ body: { id: 'lancy', updatedAt: 'v2' }, etag: '"v2"' }),
            [PUT_NEW]: () => {
                puts += 1;
                return puts === 1 ? ARC_SCHEDULED : saved('v3');
            },
            [GET_NEW]: () => detail('v2', RENAMED_ARCS),
        });
        const data = open();
        await typeSummary();
        await renameTo('lancy');
        await save();

        // 錯誤照出；editor 已經喺新 ID（URL、ID 欄），草稿仲喺度，冇重新載入
        await waitFor(() =>
            expect(screen.getByRole('link', { name: '配色' })).toHaveAttribute(
                'href',
                '/dramas/lancy/theme',
            ),
        );
        expect(screen.getByText(SCHEDULED_MESSAGE)).toHaveAttribute('role', 'alert');
        expect(await idBox()).toHaveValue('lancy');
        expect(screen.getByRole('textbox', { name: /簡介/ })).toHaveValue(SUMMARY);
        expect(callsOf(api, GET_NEW)).toHaveLength(0);
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());

        await save();
        await waitFor(() => expect(callsOf(api, PUT_NEW)).toHaveLength(2));
        // 第二次：直接 PUT 新 ID（rename 之後嘅 ETag），冇再 rename
        expect(callsOf(api, RENAME)).toHaveLength(1);
        expect(putOf(api, 1)).toEqual({
            definition: { ...definitionOf(RENAMED_ARCS), summary: SUMMARY },
            ifMatch: '"v2"',
        });
        await waitFor(() => expect(screen.queryByText(SCHEDULED_MESSAGE)).not.toBeInTheDocument());
    });

    it('should keep the todo flow on the renamed entry when the PUT fails, then go back to the todos after a successful save (S-1395)', async () => {
        let puts = 0;
        const api = mockApi({
            'GET /api/entries/dramas/drama-01': () => detail('v1', ARCS),
            [RENAME]: () => ({ body: { id: 'lancy', updatedAt: 'v2' }, etag: '"v2"' }),
            [PUT_NEW]: () => {
                puts += 1;
                return puts === 1 ? ARC_SCHEDULED : saved('v3');
            },
        });
        const data = fakeData({ todos: resource({ rows: [TODO_ROW], blocking: 1 }) });
        // 搬咗之後重新攞待辦：嗰行已經喺新 ID
        vi.mocked(data.refresh).mockImplementation(() => {
            data.todos = resource({ rows: [{ ...TODO_ROW, dramaId: 'lancy' }], blocking: 1 });
            return Promise.resolve();
        });
        open(`/dramas/drama-01${FROM_TODOS}`, data);
        await typeSummary();
        await renameTo('lancy');
        await save();

        // 搬去新 ID：todo 參數跟住改（flow bar 對返新 ID 嗰行），仲係「儲存並返回待辦」
        await waitFor(() =>
            expect(screen.getByRole('link', { name: '配色' })).toHaveAttribute(
                'href',
                `/dramas/lancy/theme${MOVED_FROM_TODOS}`,
            ),
        );
        expect(screen.getByText(SCHEDULED_MESSAGE)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '儲存並返回待辦' })).toBeEnabled();
        await waitFor(() => expect(data.refresh).toHaveBeenCalledTimes(1));

        await save();
        // 第二次：直接 PUT → afterSave（刷新 + 返待辦）
        expect(await screen.findByText('other page')).toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
        expect(callsOf(api, RENAME)).toHaveLength(1);
        expect(callsOf(api, PUT_NEW)).toHaveLength(2);
        expect(data.refresh).toHaveBeenCalledTimes(2);
    });
});

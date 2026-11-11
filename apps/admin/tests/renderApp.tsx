/* 測試用：包 AdminData（假資料）+ MemoryRouter + Toast，喺指定路徑 render */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { ChangesResponse } from '../src/api/types';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AdminDataContext, type AdminData } from '../src/data/AdminData';
import type { Resource } from '../src/data/useResource';
import { ToastProvider } from '../src/ui/Toast';

export const resource = <T,>(data: T | undefined): Resource<T> => ({
    data,
    error: undefined,
    loading: false,
    reload: vi.fn(() => Promise.resolve(data)),
});

export const fakeData = (over: Partial<AdminData> = {}): AdminData => ({
    scan: { status: 'done', scannedAt: '2026-11-10T01:41:00.000Z' },
    rescan: vi.fn(() => Promise.resolve()),
    todos: resource({ rows: [], blocking: 0 }),
    entries: resource([]),
    changes: resource<ChangesResponse>(undefined),
    refresh: vi.fn(() => Promise.resolve()),
    ...over,
});

/** 其他路由：「other page」+ 去咗邊（pathname + search + hash，畀 test 對 target） */
function OtherPage() {
    const { pathname, search, hash } = useLocation();
    return (
        <>
            <p>other page</p>
            <output data-testid="location">{`${pathname}${search}${hash}`}</output>
        </>
    );
}

export const renderAt = (
    url: string,
    path: string,
    element: ReactElement,
    data: AdminData = fakeData(),
) =>
    render(
        <AdminDataContext.Provider value={data}>
            <ToastProvider>
                <MemoryRouter initialEntries={[url]}>
                    <Routes>
                        <Route path={path} element={element} />
                        <Route path="*" element={<OtherPage />} />
                    </Routes>
                </MemoryRouter>
            </ToastProvider>
        </AdminDataContext.Provider>,
    );

/** fetch mock：按 method + path 回 JSON */
export const mockApi = (
    routes: Record<
        string,
        (init: RequestInit) => { status?: number; body?: unknown; etag?: string }
    >,
) => {
    const fetchMock = vi.fn((input: string, init: RequestInit = {}) => {
        const key = `${init.method ?? 'GET'} ${input}`;
        const handler = routes[key];
        if (!handler) return Promise.resolve(new Response('{"error":"no route"}', { status: 404 }));
        const { status = 200, body = {}, etag } = handler(init);
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (etag) headers.etag = etag;
        return Promise.resolve(new Response(JSON.stringify(body), { status, headers }));
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

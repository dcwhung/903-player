/* 編輯頁「未儲存就離開」守衛（AU-023）：app 內跳轉問一問（ConfirmDialog），重新整理 / 關分頁靠 beforeunload */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider, useNavigate } from 'react-router-dom';
import { LeaveGuard } from './LeaveGuard';
import { ownNavigation } from './leaveRules';

function Editor({ dirty }: { dirty: boolean }) {
    const navigate = useNavigate();
    return (
        <>
            <LeaveGuard dirty={dirty} />
            <p>editor page</p>
            <Link to="/shows">節目列表</Link>
            <Link to="/dramas/lancy/arcs#half">短篇分頁</Link>
            <button
                type="button"
                onClick={() => void navigate('/dramas/renamed', ownNavigation({ replace: true }))}
            >
                儲存後搬去新 ID
            </button>
            <button type="button" onClick={() => void navigate(-1)}>
                上一頁
            </button>
        </>
    );
}

type Entries = NonNullable<Parameters<typeof createMemoryRouter>[1]>['initialEntries'];

const open = (dirty: boolean, initialEntries: Entries = ['/start', '/dramas/lancy']) => {
    const editor = <Editor dirty={dirty} />;
    const router = createMemoryRouter(
        [
            { path: '/dramas/lancy', element: editor },
            { path: '/dramas/lancy/arcs', element: editor },
            { path: '*', element: <p>other page</p> },
        ],
        { initialEntries, initialIndex: (initialEntries?.length ?? 1) - 1 },
    );
    const view = render(<RouterProvider router={router} />);
    return { router, view };
};

const click = (role: 'link' | 'button', name: string) =>
    userEvent.click(screen.getByRole(role, { name }));

const dialog = () => screen.findByRole('dialog', { name: '放棄未儲存的變更？' });

describe('LeaveGuard — in-app navigation', () => {
    it('should ask before leaving with unsaved changes and stay on 留下', async () => {
        const { router } = open(true);
        await click('link', '節目列表');

        expect(await dialog()).toHaveTextContent('此頁有未儲存的變更，離開後將會遺失。');
        expect(router.state.location.pathname).toBe('/dramas/lancy');
        await click('button', '留下');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('editor page')).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/dramas/lancy');
    });

    it('should leave on 離開', async () => {
        const { router } = open(true);
        await click('link', '節目列表');
        await dialog();
        await click('button', '離開');

        expect(await screen.findByText('other page')).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/shows');
    });

    it('should ask on browser back too', async () => {
        const { router } = open(true);
        await click('button', '上一頁');

        expect(await dialog()).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/dramas/lancy');
    });

    it('should not ask when there is nothing unsaved', async () => {
        const { router } = open(false);
        await click('link', '節目列表');

        expect(await screen.findByText('other page')).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/shows');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not ask when switching tabs of the same editor (the draft is kept)', async () => {
        const { router } = open(true);
        await click('link', '短篇分頁');

        expect(router.state.location.pathname).toBe('/dramas/lancy/arcs');
        expect(router.state.location.hash).toBe('#half');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it("should not ask for the editor's own navigation after a save", async () => {
        const { router } = open(true);
        await click('button', '儲存後搬去新 ID');

        expect(await screen.findByText('other page')).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/dramas/renamed');
    });

    it('should still ask when going back to a history entry an editor navigated to itself', async () => {
        const own = { pathname: '/dramas/renamed', state: ownNavigation().state as unknown };
        const { router } = open(true, [own, '/dramas/lancy']);
        await click('button', '上一頁');

        expect(await dialog()).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/dramas/lancy');
    });
});

describe('LeaveGuard — beforeunload', () => {
    /** 瀏覽器原生提示：handler 要 preventDefault */
    const unloadPrevented = () => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
    };

    it('should ask the browser to confirm only while there are unsaved changes', () => {
        const dirty = open(true);
        expect(unloadPrevented()).toBe(true);
        dirty.view.unmount();

        open(false);
        expect(unloadPrevented()).toBe(false);
    });

    it('should remove the handler on unmount', () => {
        const { view } = open(true);
        view.unmount();
        expect(unloadPrevented()).toBe(false);
    });
});

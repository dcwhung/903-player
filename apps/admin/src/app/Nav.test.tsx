import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDataContext } from '../data/AdminData';
import { fakeData, resource } from '../../tests/renderApp';
import { Nav } from './Nav';

const renderNav = (mini: boolean) =>
    render(
        <AdminDataContext.Provider value={fakeData({ todos: resource({ rows: [], blocking: 3 }) })}>
            <MemoryRouter initialEntries={['/']}>
                <Nav email="admin@example.com" onLogout={vi.fn()} mini={mini} onToggle={vi.fn()} />
            </MemoryRouter>
        </AdminDataContext.Provider>,
    );

const following = (a: Element, b: Element) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Nav v4', () => {
    it('should put 更新 first under 內容, before 節目 and 廣播劇, keeping the todo count', () => {
        renderNav(false);
        const nav = within(screen.getByRole('navigation', { name: '主選單' }));
        const links = nav
            .getAllByRole('link')
            .filter((link) => !link.classList.contains('brand-link'));
        expect(links.map((link) => link.textContent)).toEqual([
            '更新3',
            '節目',
            '廣播劇',
            '首頁 Banner',
            '上下架記錄',
        ]);
        expect(following(nav.getByText('內容'), links[0] as Element)).toBe(true);
        expect(nav.getByRole('link', { name: '更新（3 項待辦）' })).toBeInTheDocument();
    });

    it('should put the theme switch and an icon-only collapse button on one row, collapse last', () => {
        renderNav(false);
        const toggle = screen.getByRole('button', { name: '收合選單' });
        const theme = screen.getByRole('group', { name: '顯示模式' });
        expect(toggle.closest('.nav-tools')).toBe(theme.closest('.nav-tools'));
        expect(following(theme, toggle)).toBe(true);
        expect(toggle).toHaveTextContent('');
    });

    it('should end with email + icon-only 登出 on the last row', () => {
        renderNav(false);
        const logout = screen.getByRole('button', { name: '登出' });
        const row = logout.closest('.foot-row');
        expect(row).toHaveTextContent('admin@example.com');
        expect(logout).toHaveTextContent('');
        expect(following(screen.getByRole('button', { name: '收合選單' }), logout)).toBe(true);
    });

    it('should show one cycling theme button with the expand button below it when collapsed', () => {
        renderNav(true);
        const cycle = screen.getByRole('button', { name: /主題：跟系統/ });
        const toggle = screen.getByRole('button', { name: '展開選單' });
        expect(toggle.closest('.nav-tools')).toBe(cycle.closest('.nav-tools'));
        expect(following(cycle, toggle)).toBe(true);
        expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
    });

    it('should show the app icon (not a 903 text circle) as the collapsed brand link', () => {
        renderNav(true);
        const link = screen.getByRole('link', { name: /^903 Player Admin Admin v/ });
        const icon = link.querySelector('img');
        expect(icon).toHaveAttribute('src', '/icon-192.png');
        expect(link).not.toHaveTextContent('903');
    });
});

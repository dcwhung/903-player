/* Data router 嘅 errorElement（S-1434）：render 出錯唔出 React Router 預設嘅英文畫面 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { appRoutes } from './routerRoutes';

function Broken(): never {
    throw new Error('boom');
}

const renderBroken = () => {
    // React 會將 render error 印去 console.error：測試唔使睇
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RouterProvider router={createMemoryRouter(appRoutes(<Broken />))} />);
};

describe('RouteError', () => {
    it('should show a written-Chinese message instead of the router default screen', () => {
        renderBroken();

        expect(screen.getByRole('alert')).toHaveTextContent('頁面發生錯誤：boom');
        expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument();
    });

    it('should reload the page on 重新載入', async () => {
        const reload = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload });
        renderBroken();
        await userEvent.click(screen.getByRole('button', { name: '重新載入' }));

        expect(reload).toHaveBeenCalledTimes(1);
    });
});

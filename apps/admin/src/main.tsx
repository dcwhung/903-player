import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/mockup.css';
import './styles/app.css';
import './styles/theme.css';
import './styles/phase4.css';
import './styles/selective.css';
import './styles/publish.css';
import './styles/publishCards.css';
import './styles/revert.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing in index.html');

/*
 * Data router（AU-023）：useBlocker（編輯頁「未儲存就離開」守衛）要 data router 先用得。
 * 成個 App 掛喺一條 splat route，入面照舊用 <Routes>（app/AppRoutes.tsx），路由表冇變
 */
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(root).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);

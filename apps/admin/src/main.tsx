import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './app/App';
import { appRoutes } from './app/routerRoutes';
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

const router = createBrowserRouter(appRoutes(<App />));

createRoot(root).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);

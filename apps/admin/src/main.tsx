import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/mockup.css';
import './styles/app.css';
import './styles/theme.css';
import './styles/phase4.css';
import './styles/selective.css';
import './styles/publish.css';
import './styles/publishCards.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing in index.html');

createRoot(root).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
);

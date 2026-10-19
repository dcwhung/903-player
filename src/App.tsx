import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RecordingsProvider } from './data/RecordingsProvider';
import { HomePage } from './pages/HomePage';
import { ShowPage } from './pages/ShowPage';
import { TodayPage } from './pages/TodayPage';
import { PlayerProvider } from './player/PlayerProvider';

// GitHub Pages 冇 server-side rewrite，所以用 hash routing
export const App = () => (
    <RecordingsProvider>
        <PlayerProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/show/:showId" element={<ShowPage />} />
                    <Route path="/today" element={<TodayPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </HashRouter>
        </PlayerProvider>
    </RecordingsProvider>
);

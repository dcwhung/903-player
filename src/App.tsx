import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RecordingsProvider } from './data/RecordingsProvider';
import { DramaPage } from './pages/DramaPage';
import { HomePage } from './pages/HomePage';
import { ShowPage } from './pages/ShowPage';
import { TodayPage } from './pages/TodayPage';
import type { AudioController } from './player/AudioController';
import { nextTrack } from './player/nextTrack';
import { PlayerProvider } from './player/PlayerProvider';
import { hideSplash } from './splash/hideSplash';

// GitHub Pages 冇 server-side rewrite，所以用 hash routing
interface AppProps {
    /** main.tsx 建立嘅共用 controller，PWA 更新要喺 React 以外讀播放狀態 */
    playerController?: AudioController;
}

export const App = ({ playerController }: AppProps) => {
    // 第一次 commit 完先收 index.html 嘅啟動畫面（最少顯示夠時間），唔會見到中間嘅空白
    useEffect(() => hideSplash(document), []);
    return (
        <RecordingsProvider>
            <PlayerProvider controller={playerController} nextTrack={nextTrack}>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/show/:showId" element={<ShowPage />} />
                        <Route path="/today" element={<TodayPage />} />
                        <Route path="/drama/:dramaId" element={<DramaPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </HashRouter>
            </PlayerProvider>
        </RecordingsProvider>
    );
};

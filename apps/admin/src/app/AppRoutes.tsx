/* 路由：同 GET /api/todos 嘅跳轉目標一致（/dramas/:id、/dramas/:id/arcs、/dramas/:id/schedule） */
import { Navigate, Route, Routes } from 'react-router-dom';
import { BannerPage } from '../features/banner/BannerPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { DramaEditorPage } from '../features/dramas/DramaEditor';
import { DramaList } from '../features/lists/DramaList';
import { ShowList } from '../features/lists/ShowList';
import { ShowEditorPage } from '../features/shows/ShowEditor';
import { PublishPage } from '../features/update/PublishPage';
import { UpdatePage } from '../features/update/UpdatePage';

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<UpdatePage />} />
            <Route path="/publish" element={<PublishPage />} />
            <Route path="/shows" element={<ShowList />} />
            <Route path="/shows/new" element={<ShowEditorPage />} />
            <Route path="/shows/:id" element={<ShowEditorPage />} />
            <Route path="/dramas" element={<DramaList />} />
            <Route path="/dramas/:id" element={<DramaEditorPage tab="basic" />} />
            <Route path="/dramas/:id/arcs" element={<DramaEditorPage tab="arcs" />} />
            <Route path="/dramas/:id/schedule" element={<DramaEditorPage tab="schedule" />} />
            <Route path="/dramas/:id/theme" element={<DramaEditorPage tab="theme" />} />
            <Route path="/banner" element={<BannerPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

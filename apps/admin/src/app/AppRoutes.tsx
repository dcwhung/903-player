/* 路由：同 GET /api/todos 嘅跳轉目標一致（/dramas/:id、/dramas/:id/arcs、/dramas/:id/schedule） */
import { Navigate, Route, Routes } from 'react-router-dom';
import { HistoryPage } from '../features/history/HistoryPage';
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
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

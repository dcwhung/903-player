/* 路由：同 GET /api/todos 嘅跳轉目標一致（/dramas/:id、/dramas/:id/arcs、/dramas/:id/schedule） */
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublishPage } from '../features/update/PublishPage';
import { UpdatePage } from '../features/update/UpdatePage';

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<UpdatePage />} />
            <Route path="/publish" element={<PublishPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

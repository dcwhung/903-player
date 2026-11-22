/*
 * Data router 嘅路由（AU-023）：useBlocker（編輯頁「未儲存就離開」守衛）要 data router 先用得。
 * 成個 App 掛喺一條 splat route，入面照舊用 <Routes>（AppRoutes.tsx），路由表冇變；
 * render 出錯就出 RouteError（S-1434）
 */
import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RouteError } from './RouteError';

export const appRoutes = (app: ReactNode): RouteObject[] => [
    { path: '*', element: app, errorElement: <RouteError /> },
];

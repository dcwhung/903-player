import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/** 返主頁；暫停播放由 HomePage 負責，令系統返回手勢都一樣處理 */
export const useGoHome = () => {
    const navigate = useNavigate();
    return useCallback(() => navigate('/'), [navigate]);
};

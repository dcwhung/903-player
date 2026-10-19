import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../player/usePlayer';

/** 返主頁：主頁冇 mini player，所以先暫停並存低進度 */
export const useGoHome = () => {
    const navigate = useNavigate();
    const { stop } = usePlayer();
    return useCallback(() => {
        stop();
        navigate('/');
    }, [stop, navigate]);
};

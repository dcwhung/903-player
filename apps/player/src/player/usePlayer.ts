import { useContext } from 'react';
import { PlayerContext, type PlayerContextValue } from './playerContext';

export const usePlayer = (): PlayerContextValue => {
    const value = useContext(PlayerContext);
    if (!value) {
        throw new Error('usePlayer must be used inside <PlayerProvider>');
    }
    return value;
};

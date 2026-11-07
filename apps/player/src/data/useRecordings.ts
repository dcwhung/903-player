import { useContext } from 'react';
import { RecordingsContext, type RecordingsContextValue } from './recordingsContext';

export const useRecordings = (): RecordingsContextValue => {
    const value = useContext(RecordingsContext);
    if (!value) {
        throw new Error('useRecordings must be used inside <RecordingsProvider>');
    }
    return value;
};

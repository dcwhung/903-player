import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Recording } from '../types/recording';
import { RecordingsProvider } from './RecordingsProvider';
import { useRecordings } from './useRecordings';

const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/a.aac',
};

const wrap = (loader: () => Promise<Recording[]>) =>
    function Wrapper({ children }: { children: ReactNode }) {
        return <RecordingsProvider loader={loader}>{children}</RecordingsProvider>;
    };

describe('RecordingsProvider', () => {
    it('loads recordings on mount', async () => {
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(async () => [RECORDING]),
        });

        expect(result.current.status).toBe('loading');
        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.recordings).toEqual([RECORDING]);
    });

    it('exposes errors and can retry', async () => {
        const loader = vi
            .fn<() => Promise<Recording[]>>()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce([RECORDING]);
        const { result } = renderHook(() => useRecordings(), { wrapper: wrap(loader) });

        await waitFor(() => expect(result.current.status).toBe('error'));
        await act(async () => result.current.reload());

        expect(result.current.status).toBe('ready');
    });

    it('throws when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useRecordings())).toThrow();
    });
});

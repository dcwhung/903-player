import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Recording } from '../types/recording';
import { RecordingsProvider } from './RecordingsProvider';
import { useRecordings } from './useRecordings';

const STORED: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/a.aac',
};

const PROBED: Recording = {
    showId: 'badgirl',
    date: '2026-10-19',
    time: '1009',
    url: 'https://audio.hkfm903.live/b.aac',
};

type Prober = (onFound?: (recording: Recording) => void) => Promise<Recording[]>;

const noProbe = async (): Promise<Recording[]> => [];
const neverFinishes = (): Promise<Recording[]> => new Promise<Recording[]>(() => {});
const nothingStored = (): Recording[] => [];

const wrap = (prober: Prober = noProbe, readStored: () => Recording[] = nothingStored) =>
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <RecordingsProvider prober={prober} readStored={readStored}>
                {children}
            </RecordingsProvider>
        );
    };

describe('RecordingsProvider', () => {
    it('shows stored recordings right away, before probing finishes', () => {
        const readStored = vi.fn(() => [STORED]);
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(neverFinishes, readStored),
        });

        expect(result.current.status).toBe('ready');
        expect(result.current.recordings).toEqual([STORED]);
    });

    it('stays loading while the store is empty and the first probe is running', () => {
        const { result } = renderHook(() => useRecordings(), { wrapper: wrap(neverFinishes) });

        expect(result.current.status).toBe('loading');
        expect(result.current.recordings).toEqual([]);
    });

    it('becomes ready once the probe finishes, even if it found nothing', async () => {
        const { result } = renderHook(() => useRecordings(), { wrapper: wrap(noProbe) });

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.recordings).toEqual([]);
    });

    it('becomes ready as soon as the first find lands on an empty store', async () => {
        const prober = vi.fn<Prober>((onFound) => {
            onFound?.(PROBED);
            return neverFinishes();
        });
        const { result } = renderHook(() => useRecordings(), { wrapper: wrap(prober) });

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.recordings).toEqual([PROBED]);
    });

    it('becomes ready when the probe fails', async () => {
        const failing = async (): Promise<Recording[]> => {
            throw new Error('blocked');
        };
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(failing, () => [STORED]),
        });

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.recordings).toEqual([STORED]);
    });

    it('adds recordings the prober finds on top of the stored ones', async () => {
        const prober = vi.fn(async () => [STORED, PROBED]);
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(prober, () => [STORED]),
        });

        await waitFor(() => expect(result.current.recordings).toEqual([STORED, PROBED]));
        expect(prober).toHaveBeenCalledWith(expect.any(Function));
    });

    it('does not duplicate a find reported through onFound and again in the final result', async () => {
        const prober = vi.fn<Prober>(async (onFound) => {
            onFound?.(PROBED);
            return [STORED, PROBED];
        });
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(prober, () => [STORED]),
        });

        await waitFor(() => expect(prober).toHaveBeenCalled());
        await waitFor(() => expect(result.current.recordings).toEqual([STORED, PROBED]));
    });

    it('ignores finds reported after unmounting', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        let report: (recording: Recording) => void = () => {};
        const prober = vi.fn<Prober>((onFound) => {
            report = onFound ?? report;
            return neverFinishes();
        });
        const { result, unmount } = renderHook(() => useRecordings(), {
            wrapper: wrap(prober, () => [STORED]),
        });
        await waitFor(() => expect(prober).toHaveBeenCalled());

        unmount();
        act(() => report(PROBED));

        expect(result.current.recordings).toEqual([STORED]);
        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('ignores probe results that arrive after unmounting', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        let resolveProbe: (found: Recording[]) => void = () => {};
        const prober = vi.fn(
            () =>
                new Promise<Recording[]>((resolve) => {
                    resolveProbe = resolve;
                }),
        );
        const { result, unmount } = renderHook(() => useRecordings(), {
            wrapper: wrap(prober, () => [STORED]),
        });
        await waitFor(() => expect(prober).toHaveBeenCalled());

        unmount();
        await act(async () => resolveProbe([PROBED]));

        expect(result.current.recordings).toEqual([STORED]);
        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('throws when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useRecordings())).toThrow();
    });
});

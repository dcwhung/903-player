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

const PROBED: Recording = {
    showId: 'badgirl',
    date: '2026-10-19',
    time: '1009',
    url: 'https://audio.hkfm903.live/b.aac',
};

type Prober = (
    known: Recording[],
    onFound?: (recording: Recording) => void,
) => Promise<Recording[]>;

const noProbe = async (): Promise<Recording[]> => [];
const noCache = (): Recording[] => [];

const wrap = (
    loader: () => Promise<Recording[]>,
    prober: Prober = noProbe,
    readCached: (known: Recording[]) => Recording[] = noCache,
) =>
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <RecordingsProvider loader={loader} prober={prober} readCached={readCached}>
                {children}
            </RecordingsProvider>
        );
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

    it('adds recordings the prober finds on top of the feed', async () => {
        const prober = vi.fn(async () => [PROBED]);
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(async () => [RECORDING], prober),
        });

        await waitFor(() => expect(result.current.recordings).toEqual([RECORDING, PROBED]));
        expect(prober).toHaveBeenCalledWith([RECORDING], expect.any(Function));
    });

    it('shows each recording the prober finds before the whole run completes', async () => {
        const prober = vi.fn<Prober>((_known, onFound) => {
            onFound?.(PROBED);
            return new Promise<Recording[]>(() => {});
        });
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(async () => [RECORDING], prober),
        });

        await waitFor(() => expect(result.current.recordings).toEqual([RECORDING, PROBED]));
    });

    it('does not duplicate a find reported through onFound and again in the final result', async () => {
        const prober = vi.fn<Prober>(async (_known, onFound) => {
            onFound?.(PROBED);
            return [PROBED];
        });
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(
                async () => [RECORDING],
                prober,
                () => [PROBED],
            ),
        });

        await waitFor(() => expect(prober).toHaveBeenCalled());
        await waitFor(() => expect(result.current.recordings).toEqual([RECORDING, PROBED]));
    });

    it('ignores finds reported after unmounting', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        let report: (recording: Recording) => void = () => {};
        const prober = vi.fn<Prober>((_known, onFound) => {
            report = onFound ?? report;
            return new Promise<Recording[]>(() => {});
        });
        const { result, unmount } = renderHook(() => useRecordings(), {
            wrapper: wrap(async () => [RECORDING], prober),
        });
        await waitFor(() => expect(prober).toHaveBeenCalled());

        unmount();
        act(() => report(PROBED));

        expect(result.current.recordings).toEqual([RECORDING]);
        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('shows cached recordings as soon as the feed loads, before probing finishes', async () => {
        const pending = new Promise<Recording[]>(() => {});
        const readCached = vi.fn(() => [PROBED]);
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(
                async () => [RECORDING],
                () => pending,
                readCached,
            ),
        });

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.recordings).toEqual([RECORDING, PROBED]);
        expect(readCached).toHaveBeenCalledWith([RECORDING]);
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
            wrapper: wrap(async () => [RECORDING], prober),
        });
        await waitFor(() => expect(prober).toHaveBeenCalled());

        unmount();
        await act(async () => resolveProbe([PROBED]));

        expect(result.current.recordings).toEqual([RECORDING]);
        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('keeps the feed when probing fails', async () => {
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(
                async () => [RECORDING],
                async () => {
                    throw new Error('blocked');
                },
            ),
        });

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.recordings).toEqual([RECORDING]);
    });

    it('throws when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useRecordings())).toThrow();
    });
});

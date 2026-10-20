import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
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

    it('reports isProbing while the probe runs, keeping status ready when something is stored', async () => {
        let finishProbe: (found: Recording[]) => void = () => {};
        const prober = () =>
            new Promise<Recording[]>((resolve) => {
                finishProbe = resolve;
            });
        const { result } = renderHook(() => useRecordings(), {
            wrapper: wrap(prober, () => [STORED]),
        });

        expect(result.current).toMatchObject({ status: 'ready', isProbing: true });
        await act(async () => finishProbe([]));
        expect(result.current).toMatchObject({ status: 'ready', isProbing: false });
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

    describe('probing again later', () => {
        const goOnline = (): void => {
            act(() => {
                window.dispatchEvent(new Event('online'));
            });
        };
        const becomeVisible = (state: DocumentVisibilityState = 'visible'): void => {
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
            act(() => {
                document.dispatchEvent(new Event('visibilitychange'));
            });
        };
        /** 等第一輪 probe 完 */
        const renderSettled = async (prober: Prober) => {
            const rendered = renderHook(() => useRecordings(), { wrapper: wrap(prober) });
            await waitFor(() => expect(rendered.result.current.isProbing).toBe(false));
            return rendered;
        };
        afterEach(() => vi.restoreAllMocks());

        it('starts another run when the device comes back online', async () => {
            const prober = vi.fn<Prober>(noProbe);
            await renderSettled(prober);

            goOnline();

            expect(prober).toHaveBeenCalledTimes(2);
        });

        it('starts another run when the page becomes visible', async () => {
            const prober = vi.fn<Prober>(noProbe);
            await renderSettled(prober);

            becomeVisible();

            expect(prober).toHaveBeenCalledTimes(2);
        });

        it('does not start a run when the page is hidden', async () => {
            const prober = vi.fn<Prober>(noProbe);
            await renderSettled(prober);

            becomeVisible('hidden');

            expect(prober).toHaveBeenCalledTimes(1);
        });

        it('adds finds from a later run', async () => {
            const prober = vi.fn<Prober>(noProbe).mockResolvedValueOnce([]);
            const { result } = await renderSettled(prober);
            prober.mockResolvedValueOnce([PROBED]);

            goOnline();

            await waitFor(() => expect(result.current.recordings).toEqual([PROBED]));
        });

        it('never starts a second run while one is in flight', () => {
            const prober = vi.fn<Prober>(neverFinishes);
            renderHook(() => useRecordings(), { wrapper: wrap(prober) });

            goOnline();
            becomeVisible();

            expect(prober).toHaveBeenCalledTimes(1);
        });

        it('stops listening after unmounting', async () => {
            const prober = vi.fn<Prober>(noProbe);
            const { unmount } = await renderSettled(prober);

            unmount();
            goOnline();

            expect(prober).toHaveBeenCalledTimes(1);
        });

        it('runs a single probe under StrictMode and still shows its finds', async () => {
            // 用 render 而唔用 renderHook：renderHook 個 wrapper 入面嘅 StrictMode 唔會重複行 effect
            const prober = vi.fn<Prober>(async () => [PROBED]);
            const Urls = () => <p>{useRecordings().recordings.map((r) => r.url)}</p>;
            render(
                <StrictMode>
                    <RecordingsProvider prober={prober} readStored={nothingStored}>
                        <Urls />
                    </RecordingsProvider>
                </StrictMode>,
            );

            expect(await screen.findByText(PROBED.url)).toBeInTheDocument();
            expect(prober).toHaveBeenCalledTimes(1);
        });
    });

    it('throws when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useRecordings())).toThrow();
    });
});

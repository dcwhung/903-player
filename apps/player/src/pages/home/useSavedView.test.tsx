import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { recording } from '../../../tests/renderWithProviders';
import { RecordingsProvider } from '../../data/RecordingsProvider';
import { PlayerContext, type PlayerContextValue } from '../../player/playerContext';
import { recentListens } from '../../selectors/bookmarks';
import { addBookmark } from '../../services/bookmarkStore';
import { saveProgress } from '../../services/progressStore';
import { useSavedView, useThirdTab } from './useSavedView';

// 數 recentListens 叫咗幾多次（成個進度 map Object.entries + sort），行為照用真嘅
vi.mock('../../selectors/bookmarks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../selectors/bookmarks')>();
    return { ...actual, recentListens: vi.fn(actual.recentListens) };
});

const HEARD = recording('gongzi', '2026-10-17');
const OTHER = recording('badgirl', '2026-10-15', '1000');
const RECORDINGS = [HEARD, OTHER];
const RIGHT = { side: 'none', card: null } as const;
/** 模擬播緊時 timeupdate 嘅次數（約 4Hz，幾秒） */
const TICKS = 20;
const DURATION = 3600;
const HEARD_AT = 60;

const playerValue = (state: Partial<PlayerContextValue> = {}): PlayerContextValue => ({
    recording: null,
    isPlaying: false,
    isAudible: false,
    isStalled: false,
    currentTime: 0,
    duration: 0,
    watchedRevision: 0,
    progressRevision: 0,
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    restart: vi.fn(),
    seek: vi.fn(),
    skip: vi.fn(),
    stop: vi.fn(),
    ...state,
});

const ThirdTabProbe = () => <p data-testid="third">{useThirdTab() ?? 'none'}</p>;

const SavedProbe = () => {
    const view = useSavedView('phone', RIGHT);
    return <p data-testid="saved">{`${view.mode}:${view.recent.length}`}</p>;
};

const Harness = ({ player, saved }: { player: PlayerContextValue; saved: boolean }) => (
    <RecordingsProvider
        prober={async () => []}
        readStored={() => RECORDINGS}
        readUnavailable={() => []}
    >
        <PlayerContext.Provider value={player}>
            <MemoryRouter>
                <ThirdTabProbe />
                {saved && <SavedProbe />}
            </MemoryRouter>
        </PlayerContext.Provider>
    </RecordingsProvider>
);

type Rerender = (state: Partial<PlayerContextValue>) => void;

/** 直接畀 context：每次 rerender 都係一個新 value（同 PlayerProvider 每個 tick 一樣） */
const mount = (saved = false): { rerender: Rerender } => {
    const view = render(<Harness player={playerValue()} saved={saved} />);
    return {
        rerender: (state) => view.rerender(<Harness player={playerValue(state)} saved={saved} />),
    };
};

/** 播緊 HEARD：淨係 currentTime 行 */
const tick = (rerender: Rerender) => {
    for (let i = 1; i <= TICKS; i += 1) {
        rerender({ recording: HEARD, isPlaying: true, currentTime: i, duration: DURATION });
    }
};

const recentCalls = () => vi.mocked(recentListens).mock.calls.length;

describe('useSavedView / useThirdTab', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T14:30:00Z'));
        vi.mocked(recentListens).mockClear();
    });
    afterEach(() => vi.useRealTimers());

    describe('memoised recent list (S-709)', () => {
        it('should not recompute recent listens when only the playback position ticks', () => {
            saveProgress(OTHER.id, HEARD_AT, DURATION);
            const { rerender } = mount(true);
            rerender({ recording: HEARD, isPlaying: true, duration: DURATION });
            const before = recentCalls();

            tick(rerender);

            expect(recentCalls()).toBe(before);
            expect(screen.getByTestId('saved')).toHaveTextContent('recent:1');
        });

        it('should recompute recent listens when bookmarks change', () => {
            saveProgress(OTHER.id, HEARD_AT, DURATION);
            mount();
            expect(screen.getByTestId('third')).toHaveTextContent('recent');
            const before = recentCalls();

            act(() => addBookmark(OTHER, 1));

            expect(recentCalls()).toBeGreaterThan(before);
            expect(screen.getByTestId('third')).toHaveTextContent('saved');
        });

        it('should recompute recent listens when progress is saved', () => {
            const { rerender } = mount();
            const before = recentCalls();

            saveProgress(OTHER.id, HEARD_AT, DURATION);
            rerender({ progressRevision: 1 });

            expect(recentCalls()).toBeGreaterThan(before);
            expect(screen.getByTestId('third')).toHaveTextContent('recent');
        });
    });

    describe('progress revision (S-710)', () => {
        it('should re-read progress when the progress revision moves without an isPlaying edge', () => {
            const { rerender } = mount();
            rerender({ recording: HEARD });
            expect(screen.getByTestId('third')).toHaveTextContent('none');

            // controller 存咗進度先 bump：isPlaying 由頭到尾都係 false
            saveProgress(HEARD.id, HEARD_AT, DURATION);
            rerender({ recording: HEARD, progressRevision: 1 });

            expect(screen.getByTestId('third')).toHaveTextContent('recent');
        });

        it('should not depend on the isPlaying edge to re-read progress', () => {
            const { rerender } = mount();
            rerender({ recording: HEARD, isPlaying: true });

            // revision 未郁：就算 storage 有咗，都唔靠 isPlaying 嘅 edge 讀（呢個 edge 同 persist 有次序依賴）
            saveProgress(HEARD.id, HEARD_AT, DURATION);
            rerender({ recording: HEARD, isPlaying: false });

            expect(screen.getByTestId('third')).toHaveTextContent('none');
        });
    });
});

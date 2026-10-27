import { FakeAudio } from '../../tests/fakeAudio';
import { PLAYBACK_LOG_MAX_ENTRIES, PLAYBACK_LOG_TICK_MS } from '../config/constants';
import { attachPlaybackLog, copyPlaybackLog, readPlaybackLog, recordPlayback } from './playbackLog';

const SRC =
    'https://example.r2.dev/%E6%A3%AE/04%20-%20%E5%85%AC%E5%AD%90%E6%A3%AE%E6%9E%97%20-%20%E7%AC%AC%E5%9B%9B%E9%9B%86.m4a';

describe('playbackLog', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('records an event with the audio state and a note', () => {
        const audio = new FakeAudio();
        audio.currentTime = 12.34;
        audio.duration = 789;

        recordPlayback('advance', audio.asAudio(), 'early');

        const [line] = readPlaybackLog();
        expect(line).toMatch(/^\d\d:\d\d:\d\d\.\d{3} advance /);
        expect(line).toContain('ct=12.3');
        expect(line).toContain('dur=789.0');
        expect(line).toContain('paused=1');
        expect(line).toContain('vis=');
        expect(line).toMatch(/ early$/);
    });

    it('keeps only the newest entries', () => {
        const audio = new FakeAudio().asAudio();
        for (let i = 0; i < PLAYBACK_LOG_MAX_ENTRIES + 5; i += 1) recordPlayback(`e${i}`, audio);

        const log = readPlaybackLog();
        expect(log).toHaveLength(PLAYBACK_LOG_MAX_ENTRIES);
        expect(log.at(-1)).toContain(` e${PLAYBACK_LOG_MAX_ENTRIES + 4} `);
    });

    it('never throws when storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });

        expect(() => recordPlayback('play', new FakeAudio().asAudio())).not.toThrow();
    });

    describe('attachPlaybackLog', () => {
        it('logs media events, naming the file on loadstart', () => {
            const audio = new FakeAudio();
            audio.src = SRC;
            const detach = attachPlaybackLog(audio.asAudio());

            audio.dispatchEvent(new Event('loadstart'));
            audio.dispatchEvent(new Event('stalled'));
            detach();
            audio.dispatchEvent(new Event('suspend'));

            const log = readPlaybackLog();
            expect(log).toHaveLength(2);
            expect(log[0]).toContain('loadstart');
            expect(log[0]).toContain('04 - 公子森林 - 第四集.m4a');
            expect(log[1]).toContain('stalled');
        });

        it('logs timeupdate at most once per tick', () => {
            const now = vi.spyOn(Date, 'now').mockReturnValue(0);
            const audio = new FakeAudio();
            const detach = attachPlaybackLog(audio.asAudio());

            audio.emitTime(1);
            audio.emitTime(2);
            now.mockReturnValue(PLAYBACK_LOG_TICK_MS);
            audio.emitTime(3);
            detach();

            expect(readPlaybackLog().filter((l) => l.includes('timeupdate'))).toHaveLength(2);
        });

        it('logs the page being hidden or shown', () => {
            const detach = attachPlaybackLog(new FakeAudio().asAudio());

            document.dispatchEvent(new Event('visibilitychange'));
            detach();

            expect(readPlaybackLog()[0]).toContain('visibilitychange');
        });
    });

    describe('copyPlaybackLog', () => {
        it('copies every line to the clipboard and reports the count', async () => {
            const writeText = vi.fn(async () => undefined);
            vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
            recordPlayback('a', new FakeAudio().asAudio());
            recordPlayback('b', new FakeAudio().asAudio());

            await expect(copyPlaybackLog()).resolves.toBe(2);
            expect(writeText).toHaveBeenCalledWith(readPlaybackLog().join('\n'));
            vi.unstubAllGlobals();
        });

        it('falls back to a prompt the user can copy from when the clipboard fails', async () => {
            vi.stubGlobal('navigator', {
                ...navigator,
                clipboard: { writeText: () => Promise.reject(new Error('denied')) },
            });
            const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
            recordPlayback('a', new FakeAudio().asAudio());

            await expect(copyPlaybackLog()).resolves.toBe(1);
            expect(prompt).toHaveBeenCalledWith(expect.any(String), readPlaybackLog().join('\n'));
            vi.unstubAllGlobals();
        });
    });
});

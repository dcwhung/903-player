import { FakeAudio } from '../../tests/fakeAudio';
import { PROGRESS_STORAGE_KEY, STALL_MAX_WAIT_MS } from '../config/constants';
import { getProgress, saveProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { AudioController } from './AudioController';

/*
 * AU-026：淨係載入過（preload = metadata 自己嚟）、冇播過亦冇 seek 過嘅一集，
 * 離開（pagehide / 背景 / 換集 / stop）唔可以寫進度
 */

const recordingOf = (day: string): Recording => ({
    showId: 'gongzi',
    date: `2026-10-${day}`,
    time: '2308',
    id: `show:gongzi:202610${day}`,
    url: `https://audio.hkfm903.live/gongzi/202610${day}.aac`,
});
const A = recordingOf('17');
const B = recordingOf('18');
const DURATION = 1000;
const LISTENED_TO = 12;
const STORED_POSITION = 300;
const STORED_AT = Date.parse('2026-11-01T10:00:00Z');
const NOW = Date.parse('2026-11-22T10:00:00Z');

const detachers: (() => void)[] = [];
const setup = () => {
    const audio = new FakeAudio({ strictPlayEvents: true });
    const controller = new AudioController(audio.asAudio());
    detachers.push(controller.attach());
    return { audio, controller };
};
const hidePage = (): void => {
    window.dispatchEvent(new Event('pagehide'));
};
const storedRaw = (): string | null => localStorage.getItem(PROGRESS_STORAGE_KEY);

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});
afterEach(() => {
    detachers.splice(0).forEach((detach) => detach());
    vi.useRealTimers();
});

/** 之前聽到一半嘅 A：進度喺 STORED_AT 存低 */
const storeEarlierProgress = (): string => {
    vi.setSystemTime(STORED_AT);
    saveProgress(A.id, STORED_POSITION, DURATION);
    vi.setSystemTime(NOW);
    return storedRaw() ?? '';
};

describe('AudioController progress of an episode that was only loaded', () => {
    it('should write nothing when the page hides after a load without play', async () => {
        const { audio, controller } = setup();
        await controller.load(A);
        audio.emitMetadata(DURATION);
        hidePage();
        expect(getProgress(A.id)).toBeUndefined();
    });

    it('should write nothing when the tab goes to the background after a load without play', async () => {
        const { audio, controller } = setup();
        await controller.load(A);
        audio.emitMetadata(DURATION);
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        visibility.mockRestore();
        expect(getProgress(A.id)).toBeUndefined();
    });

    it('should write nothing for the first episode when another one is picked', async () => {
        const { audio, controller } = setup();
        await controller.load(A);
        audio.emitMetadata(DURATION);
        await controller.load(B);
        audio.emitMetadata(DURATION);
        controller.stop();
        expect(storedRaw()).toBeNull();
    });

    it('should write nothing when the player is closed without playing', async () => {
        const { audio, controller } = setup();
        await controller.load(A);
        audio.emitMetadata(DURATION);
        controller.stop();
        expect(getProgress(A.id)).toBeUndefined();
    });

    it('should leave an existing record untouched when it is resumed but not played', async () => {
        const before = storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A);
        audio.emitMetadata(DURATION);
        // 真 element：續播位置套用嗰下會發一次（暫停中嘅）timeupdate
        audio.emitTime(STORED_POSITION);
        hidePage();
        await controller.load(B);
        controller.stop();
        expect(storedRaw()).toBe(before);
    });

    it('should write nothing when the browser blocks autoplay', async () => {
        const { audio, controller } = setup();
        audio.rejectPlay = true;
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        hidePage();
        expect(getProgress(A.id)).toBeUndefined();
    });

    it('should write nothing when play was pressed but the position never moved', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(0);
        controller.pause();
        hidePage();
        expect(getProgress(A.id)).toBeUndefined();
    });
});

describe('AudioController progress of an episode that was listened to', () => {
    it('should save when the page hides after playing', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(LISTENED_TO);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO, updatedAt: NOW });
    });

    it('should save a short listen when another episode is picked', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(1);
        await controller.load(B);
        expect(getProgress(A.id)).toMatchObject({ position: 1, watched: false });
    });

    it('should save the new position when the user seeks while paused', async () => {
        const { audio, controller } = setup();
        await controller.load(A);
        audio.emitMetadata(DURATION);
        controller.seek(LISTENED_TO);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO, updatedAt: NOW });
    });

    it('should save a seek made before the metadata arrived', async () => {
        const { audio, controller } = setup();
        await controller.load(A);
        controller.seek(LISTENED_TO);
        audio.emitMetadata(DURATION);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO });
    });

    it('should not carry the listened state over to the next episode', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(LISTENED_TO);
        controller.pause();
        await controller.load(B);
        audio.emitMetadata(DURATION);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO });
        expect(getProgress(B.id)).toBeUndefined();
    });

    it('should update the record when a resumed episode is played on', async () => {
        storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION + LISTENED_TO);
        controller.pause();
        expect(getProgress(A.id)).toMatchObject({
            position: STORED_POSITION + LISTENED_TO,
            updatedAt: NOW,
        });
    });
});

/*
 * W-859：鎖屏時 timeupdate 可能冇發。真 element 嘅暫停步驟係 paused 變 true → timeupdate → pause，
 * 嗰下 timeupdate 到嘅時候已經係暫停，但都係播緊行出嚟嘅位置
 */
describe('AudioController progress when no playing timeupdate fired (locked screen)', () => {
    it('should save when the pause steps deliver the first timeupdate (P1)', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.currentTime = LISTENED_TO;
        audio.pause();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO, updatedAt: NOW });
    });

    it('should save when the page hides while playing before any timeupdate (P2)', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.currentTime = LISTENED_TO;
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO, updatedAt: NOW });
    });

    it('should save when the tab goes to the background while playing before any timeupdate', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.currentTime = LISTENED_TO;
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        visibility.mockRestore();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO });
    });

    it('should update a resumed episode played from the lock screen and paused (P3)', async () => {
        storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A);
        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION);
        await controller.resume();
        audio.currentTime = STORED_POSITION + LISTENED_TO;
        audio.pause();
        expect(getProgress(A.id)).toMatchObject({
            position: STORED_POSITION + LISTENED_TO,
            updatedAt: NOW,
        });
    });

    it('should save when a playing timeupdate came before the pause (P4 control)', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(LISTENED_TO);
        audio.pause();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO, updatedAt: NOW });
    });

    it('should leave a resumed record untouched when play is pressed, never moves and is paused', async () => {
        const before = storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION);
        hidePage();
        controller.pause();
        hidePage();
        expect(storedRaw()).toBe(before);
    });

    it('should write nothing when the page hides while a first play has not moved', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        hidePage();
        controller.stop();
        expect(getProgress(A.id)).toBeUndefined();
    });

    it('should mark the episode watched when it plays to the end', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        expect(getProgress(A.id)).toMatchObject({ watched: true });
    });
});

/*
 * S-1423：長度已經知、但 loadedmetadata 未處理（續播位置未套用，element 仲喺 0）嗰一刻，
 * 位置唔可信：唔可以當播過，亦唔可以存
 */
describe('AudioController progress while the resume position is not applied yet', () => {
    const MEDIA_ERR_NETWORK_CODE = 2;
    /** 長度到咗但 loadedmetadata 未發 */
    const exposeDurationOnly = (audio: FakeAudio): void => {
        audio.duration = DURATION;
    };

    it('should keep the stored record when the page hides before the resume position is applied', async () => {
        const before = storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        exposeDurationOnly(audio);
        hidePage();
        expect(storedRaw()).toBe(before);
    });

    it('should save the advanced position once the resume position is applied (control)', async () => {
        storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION + LISTENED_TO);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({
            position: STORED_POSITION + LISTENED_TO,
            updatedAt: NOW,
        });
    });

    it('should save a lock-screen listen with no timeupdate once the resume position is applied', async () => {
        storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        exposeDurationOnly(audio);
        hidePage();
        audio.emitMetadata(DURATION);
        audio.currentTime = STORED_POSITION + LISTENED_TO;
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: STORED_POSITION + LISTENED_TO });
    });

    it('should keep the stored record when a timeupdate at 0 slips in before the resume position and nothing is played', async () => {
        const before = storeEarlierProgress();
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        exposeDurationOnly(audio);
        audio.emitTime(0);
        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION);
        controller.pause();
        hidePage();
        expect(storedRaw()).toBe(before);
    });

    it('should keep the listened position when the page hides while a failed source is reloading', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION);
        hidePage();
        audio.fail(MEDIA_ERR_NETWORK_CODE);
        await controller.play();
        expect(audio.load).toHaveBeenCalledTimes(1);
        exposeDurationOnly(audio);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: STORED_POSITION });

        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION + LISTENED_TO);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: STORED_POSITION + LISTENED_TO });
    });

    it('should keep the listened position when the page hides while the stall watchdog reloads', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(STORED_POSITION);
        controller.pause();
        await controller.play();
        await vi.advanceTimersByTimeAsync(STALL_MAX_WAIT_MS);
        expect(audio.load).toHaveBeenCalled();
        exposeDurationOnly(audio);
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: STORED_POSITION });
    });

    it('should save a first listen of an episode with no stored progress', async () => {
        const { audio, controller } = setup();
        await controller.load(A, { autoplay: true });
        exposeDurationOnly(audio);
        audio.currentTime = LISTENED_TO;
        hidePage();
        expect(getProgress(A.id)).toMatchObject({ position: LISTENED_TO });
    });
});

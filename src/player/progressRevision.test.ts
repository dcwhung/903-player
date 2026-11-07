import { FakeAudio } from '../../tests/fakeAudio';
import { PROGRESS_SAVE_INTERVAL_MS } from '../config/constants';
import { getProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { AudioController } from './AudioController';

const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    id: 'id:https://audio.hkfm903.live/gongzi/20261017.aac',
    url: 'https://audio.hkfm903.live/gongzi/20261017.aac',
};
const DURATION = 3600;
const HEARD_AT = 120;
/** 上次定時存完之後再行咗少少（未夠 PROGRESS_SAVE_INTERVAL_MS 唔會自動存）：停低先會存到呢個位 */
const STOPPED_AT = HEARD_AT + 3;

/**
 * 播緊一段時間：之後無論點停，progressRevision 一郁，storage 入面一定已經係停低嗰陣嘅位置。
 * 每次 notify 都記低「revision、嗰刻 storage 嘅位置」，證明冇靠 update / persist 嘅先後（S-710）
 */
const playing = async () => {
    const audio = new FakeAudio();
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    await controller.load(RECORDING, { autoplay: true });
    audio.emitMetadata(DURATION);
    // 過咗定時存嘅間距：呢個 tick 會存低 HEARD_AT
    vi.setSystemTime(Date.now() + PROGRESS_SAVE_INTERVAL_MS);
    audio.emitTime(HEARD_AT);
    audio.emitTime(STOPPED_AT);
    // 前提：storage 仲係舊位置，revision 早過 persist 郁就會讀到 HEARD_AT
    expect(getProgress(RECORDING.id)?.position).toBe(HEARD_AT);
    const seen: { revision: number; saved: number | undefined }[] = [];
    controller.subscribe(() =>
        seen.push({
            revision: controller.getSnapshot().progressRevision,
            saved: getProgress(RECORDING.id)?.position,
        }),
    );
    return { audio, controller, detach, seen };
};

/** revision 第一次郁嗰個 notify：storage 已經存咗停低位置 */
const firstBump = (seen: { revision: number; saved: number | undefined }[], from: number) =>
    seen.find((s) => s.revision > from);

describe('AudioController.progressRevision (S-710)', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
    afterEach(() => vi.useRealTimers());

    it('should bump the progress revision only after saving progress on a native pause', async () => {
        const { audio, controller, detach, seen } = await playing();
        const from = controller.getSnapshot().progressRevision;

        audio.pause(); // 例如拔耳筒、來電、鎖屏 Pause

        expect(firstBump(seen, from)).toEqual({ revision: from + 1, saved: STOPPED_AT });
        detach();
    });

    it('should bump the progress revision only after saving progress on stop', async () => {
        const { controller, detach, seen } = await playing();
        const from = controller.getSnapshot().progressRevision;

        controller.stop();

        expect(firstBump(seen, from)).toEqual({ revision: from + 1, saved: STOPPED_AT });
        detach();
    });

    it('should not bump the progress revision on a playback tick', async () => {
        const { audio, controller, detach } = await playing();
        const from = controller.getSnapshot().progressRevision;

        audio.emitTime(STOPPED_AT + 1);

        expect(controller.getSnapshot().progressRevision).toBe(from);
        detach();
    });
});

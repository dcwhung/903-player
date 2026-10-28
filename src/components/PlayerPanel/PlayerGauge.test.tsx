import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import {
    DISC_SCRUB_FAST_DEGREES_PER_MS,
    DISC_SCRUB_SLOW_DEGREES_PER_MS,
} from '../../config/constants';
import { usePlayer } from '../../player/usePlayer';
import { PlayerGauge } from './PlayerGauge';

const REC = recording('gongzi', '2026-10-17');
const OTHER_REC = recording('gongzi', '2026-10-10');
const DURATION = 600;
/** 碟擺喺畫面 (0, 0)，200px 大：圓心 (100, 100)，半徑 100 */
const DISC_SIZE = 200;
const CENTER = DISC_SIZE / 2;
const TURN_STEP = 30;
/**
 * 捽碟計手指轉速用 event.timeStamp（jsdom = Date.now()）：每步之間推前假時鐘。
 * 慢 = 啱啱好喺微調轉速（每圈 60 秒）；快 = 加速上限（每圈 600 秒）
 */
const SLOW_STEP_MS = TURN_STEP / DISC_SCRUB_SLOW_DEGREES_PER_MS;
const FAST_STEP_MS = TURN_STEP / DISC_SCRUB_FAST_DEGREES_PER_MS;
/** spindle 嗰個 test 每步 45°，都要慢 */
const SPINDLE_TEST_STEP = 45;
const SPINDLE_TEST_STEP_MS = SPINDLE_TEST_STEP / DISC_SCRUB_SLOW_DEGREES_PER_MS;

const Harness = ({ onOuterPointer }: { onOuterPointer: () => void }) => {
    const player = usePlayer();
    return (
        <>
            <button type="button" onClick={() => void player.load(REC)}>
                load
            </button>
            <button type="button" onClick={() => void player.load(OTHER_REC)}>
                load other
            </button>
            <button type="button" onClick={() => void player.toggle()}>
                toggle
            </button>
            <div onPointerDown={onOuterPointer}>
                <PlayerGauge art="/art/gongzi.jpg" />
            </div>
        </>
    );
};

/** 圓周上某個角度（0° 指向右，順時針為正） */
const rim = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return {
        clientX: CENTER + CENTER * Math.cos(radians),
        clientY: CENTER + CENTER * Math.sin(radians),
    };
};

const setup = async (currentTime = 100) => {
    const onOuterPointer = vi.fn();
    const { audio, container } = renderWithProviders(<Harness onOuterPointer={onOuterPointer} />);
    await userEvent.click(screen.getByRole('button', { name: 'load' }));
    act(() => audio.emitMetadata(DURATION));
    act(() => audio.emitTime(currentTime));
    const disc = container.querySelector<HTMLElement>('[class*="scrubbable"]');
    const face = container.querySelector<HTMLElement>('[class*="face"]');
    if (!disc || !face) throw new Error('disc not rendered');
    disc.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: DISC_SIZE, height: DISC_SIZE }) as DOMRect;
    const slider = screen.getByRole('slider', { name: '播放進度' });
    slider.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 300 }) as DOMRect;
    return { audio, disc, face, slider, onOuterPointer };
};

/** 隔 stepMs 先郁（假時鐘推前），默認慢慢郁 */
const move = (
    disc: HTMLElement,
    point: { clientX: number; clientY: number },
    stepMs = SLOW_STEP_MS,
) => {
    vi.advanceTimersByTime(stepMs);
    fireEvent.pointerMove(disc, { ...point, pointerId: 1 });
};

/** 由 from 度轉去 to 度（相差係 30° 倍數），每步 30°，唔放手；順時針為正 */
const turn = (disc: HTMLElement, from: number, to: number, stepMs = SLOW_STEP_MS) => {
    const step = Math.sign(to - from) * TURN_STEP;
    fireEvent.pointerDown(disc, { ...rim(from), pointerId: 1 });
    for (let angle = from; angle !== to;) {
        angle += step;
        move(disc, rim(angle), stepMs);
    }
};

/** 碟面手動角度（inline transform 嘅 rotate） */
const faceDegrees = (face: HTMLElement): number =>
    Number(/rotate\((-?[\d.e-]+)deg\)/.exec(face.style.transform)?.[1]);

const release = (disc: HTMLElement, at: number) =>
    fireEvent.pointerUp(disc, { ...rim(at), pointerId: 1 });

// 只假 Date（event.timeStamp），setTimeout 照用真嘅
beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('PlayerGauge disc scrub', () => {
    it('previews while the disc is turned slowly and seeks on release (a turn is 60 seconds)', async () => {
        const { audio, disc, face, slider } = await setup();

        turn(disc, 0, 90);
        expect(screen.getByText('1:55')).toBeInTheDocument();
        expect(slider).toHaveAttribute('aria-valuenow', '115');
        expect(faceDegrees(face)).toBeCloseTo(90);
        expect(audio.currentTime).toBe(100);

        release(disc, 90);
        expect(audio.currentTime).toBeCloseTo(115);
    });

    it('speeds up to 10 minutes a turn when the disc is flicked fast', async () => {
        const { audio, disc, face } = await setup();

        turn(disc, 0, 90, FAST_STEP_MS);
        release(disc, 90);

        expect(audio.currentTime).toBeCloseTo(250);
        expect(faceDegrees(face)).toBeCloseTo(90);
    });

    it('turns backwards when rubbed anticlockwise', async () => {
        const { audio, disc } = await setup();

        turn(disc, 0, -180);
        release(disc, -180);

        expect(audio.currentTime).toBeCloseTo(70);
    });

    it('stops at the end of the recording', async () => {
        const { audio, disc } = await setup(590);

        turn(disc, 0, 180);
        release(disc, 180);

        expect(audio.currentTime).toBe(DURATION);
    });

    it('treats a tiny turn as a tap and does not seek', async () => {
        const { audio, disc } = await setup();

        fireEvent.pointerDown(disc, { ...rim(0), pointerId: 1 });
        move(disc, rim(3));
        release(disc, 3);

        expect(audio.currentTime).toBe(100);
    });

    it('ignores samples near the spindle', async () => {
        const { audio, disc } = await setup();

        fireEvent.pointerDown(disc, { clientX: CENTER + 5, clientY: CENTER, pointerId: 1 });
        move(disc, { clientX: CENTER, clientY: CENTER + 5 });
        move(disc, rim(0));
        move(disc, rim(SPINDLE_TEST_STEP), SPINDLE_TEST_STEP_MS);
        move(disc, rim(SPINDLE_TEST_STEP * 2), SPINDLE_TEST_STEP_MS);
        release(disc, 90);

        expect(audio.currentTime).toBeCloseTo(115);
    });

    it('cancels without seeking and turns the disc back', async () => {
        const { audio, disc, face } = await setup();

        turn(disc, 0, 90);
        fireEvent.pointerCancel(disc, { pointerId: 1 });

        expect(audio.currentTime).toBe(100);
        expect(screen.getByText('1:40')).toBeInTheDocument();
        expect(faceDegrees(face)).toBeCloseTo(0);
    });

    it('keeps the disc where it was let go for the next turn', async () => {
        const { disc, face } = await setup();

        turn(disc, 0, 90);
        release(disc, 90);
        turn(disc, 90, 120);

        expect(faceDegrees(face)).toBeCloseTo(120);
    });

    it('blocks native drag and drop of the disc artwork (mouse)', async () => {
        const { disc } = await setup();

        // fireEvent 返回 false = 已經 preventDefault
        expect(fireEvent.dragStart(disc)).toBe(false);
    });

    it('does not pass disc touches on to the card stack', async () => {
        const { disc, onOuterPointer } = await setup();

        fireEvent.pointerDown(disc, { ...rim(0), pointerId: 1 });

        expect(onOuterPointer).not.toHaveBeenCalled();
    });

    it('locks the ring while the disc is being turned', async () => {
        const { audio, disc, slider } = await setup();

        turn(disc, 0, 90);
        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 2 });
        fireEvent.pointerUp(slider, { clientX: 150, clientY: 10, pointerId: 2 });

        expect(audio.currentTime).toBe(100);
        expect(slider).toHaveAttribute('aria-valuenow', '115');
    });

    it('locks the ring as soon as the disc is pressed, before it turns', async () => {
        const { audio, disc, slider } = await setup();

        fireEvent.pointerDown(disc, { ...rim(0), pointerId: 1 });
        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 2 });
        fireEvent.pointerUp(slider, { clientX: 150, clientY: 10, pointerId: 2 });

        expect(audio.currentTime).toBe(100);
        expect(slider).toHaveAttribute('aria-valuenow', '100');
    });

    it('unlocks the ring when a tap on the disc ends', async () => {
        const { audio, disc, slider } = await setup();

        fireEvent.pointerDown(disc, { ...rim(0), pointerId: 1 });
        release(disc, 0);
        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 2 });
        fireEvent.pointerUp(slider, { clientX: 150, clientY: 10, pointerId: 2 });

        expect(audio.currentTime).toBe(DURATION / 2);
    });
});

describe('PlayerGauge disc motion', () => {
    it('turns the disc with the finger while the ring is dragged', async () => {
        const { face, slider } = await setup();

        // 頂部 = 一半（300 秒），右邊 = 5/6（500 秒）：弧形掃過 90°
        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 290, clientY: 150, pointerId: 1 });

        expect(faceDegrees(face)).toBeCloseTo(90);
    });

    it('keeps the disc where a ring drag let go and follows the next drag from its own start', async () => {
        const { face, slider } = await setup();

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 290, clientY: 150, pointerId: 1 });
        fireEvent.pointerUp(slider, { clientX: 290, clientY: 150, pointerId: 1 });
        expect(faceDegrees(face)).toBeCloseTo(90);

        // 第二次由左邊（1/6）起手：唔跳，由起手位置再跟住轉
        fireEvent.pointerDown(slider, { clientX: 10, clientY: 150, pointerId: 2 });
        expect(faceDegrees(face)).toBeCloseTo(90);
        fireEvent.pointerMove(slider, { clientX: 150, clientY: 10, pointerId: 2 });
        expect(faceDegrees(face)).toBeCloseTo(180);
    });

    it('turns the disc back when a ring drag is cancelled', async () => {
        const { audio, face, slider } = await setup();

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 290, clientY: 150, pointerId: 1 });
        fireEvent.pointerCancel(slider, { pointerId: 1 });

        expect(audio.currentTime).toBe(100);
        expect(faceDegrees(face)).toBeCloseTo(0);
    });

    it('spins only while playing and nobody holds the disc', async () => {
        const { audio, disc, face } = await setup();
        expect(face.className).not.toMatch(/spinning/);

        await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
        act(() => audio.emitPlaying());
        expect(face.className).toMatch(/spinning/);

        turn(disc, 0, 90);
        expect(face.className).not.toMatch(/spinning/);

        release(disc, 90);
        expect(face.className).toMatch(/spinning/);
    });

    it('stops spinning right when the disc is pressed and spins again after a tap or cancel', async () => {
        const { audio, disc, face } = await setup();
        await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
        act(() => audio.emitPlaying());

        fireEvent.pointerDown(disc, { ...rim(0), pointerId: 1 });
        expect(face.className).not.toMatch(/spinning/);
        release(disc, 0);
        expect(face.className).toMatch(/spinning/);

        fireEvent.pointerDown(disc, { ...rim(0), pointerId: 1 });
        fireEvent.pointerCancel(disc, { pointerId: 1 });
        expect(face.className).toMatch(/spinning/);
    });

    it('keeps the disc upright and still until the duration is known', async () => {
        const { container } = renderWithProviders(<Harness onOuterPointer={vi.fn()} />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        const face = container.querySelector<HTMLElement>('[class*="face"]');

        expect(face?.className).toMatch(/upright/);
        expect(container.querySelector('[class*="scrubbable"]')).not.toBeInTheDocument();
    });

    it('turns the disc back upright when switching to an episode with no duration yet', async () => {
        const { disc, face } = await setup();
        turn(disc, 0, 90);
        release(disc, 90);
        expect(faceDegrees(face)).toBeCloseTo(90);

        await userEvent.click(screen.getByRole('button', { name: 'load other' }));

        expect(face.className).toMatch(/upright/);
        expect(faceDegrees(face)).toBeCloseTo(0);
    });
});

/** 播緊另一樣嘢，個唱片格係其他頁嘅（未載入呢頁嘅嘢） */
const OtherPlayingHarness = ({ onStart }: { onStart: () => void }) => {
    const player = usePlayer();
    return (
        <>
            <button type="button" onClick={() => void player.load(REC, { autoplay: true })}>
                play other
            </button>
            <PlayerGauge onStart={onStart} />
        </>
    );
};

describe('PlayerGauge not started (onStart)', () => {
    it('ignores what the player plays and starts its own page from play', async () => {
        const onStart = vi.fn();
        const { audio } = renderWithProviders(<OtherPlayingHarness onStart={onStart} />);
        await userEvent.click(screen.getByRole('button', { name: 'play other' }));
        act(() => audio.emitPlaying());
        act(() => audio.emitMetadata(DURATION));
        act(() => audio.emitTime(100));
        const plays = audio.play.mock.calls.length;

        expect(screen.getAllByText('--:--')).toHaveLength(2);
        expect(screen.getByRole('slider', { name: '播放進度' })).toHaveAttribute(
            'aria-valuenow',
            '0',
        );
        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(plays);
        expect(audio.pause).not.toHaveBeenCalled();
    });

    // S-485：未載入時「由頭播放」其實係續播，講錯嘢，所以收埋
    it('hides restart until its page is loaded', () => {
        renderWithProviders(<PlayerGauge onStart={vi.fn()} />);

        expect(screen.queryByRole('button', { name: '由頭播放' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    });
});

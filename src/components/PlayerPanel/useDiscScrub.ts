import { useRef, type DragEvent, type PointerEvent } from 'react';
import {
    DISC_SCRUB_DEAD_ZONE_RATIO,
    DISC_SCRUB_MIN_DEGREES,
    DISC_SCRUB_SECONDS_PER_TURN,
} from '../../config/constants';
import { angleDelta, clampTurn, pointerAngle, turnSeconds } from '../../utils/discScrub';
import type { DiscTurn } from './useDiscTurn';

type DiscPointerEvent = PointerEvent<HTMLElement>;

interface DiscScrubOptions {
    max: number;
    /** 起手時嘅播放位置 */
    currentTime: number;
    /** 其他手勢（拖弧形）進行緊：唔開始新嘅捽碟 */
    locked: boolean;
    onSeek: (seconds: number) => void;
    /** 捽緊預覽嘅時間（放手 / 取消時 null） */
    onPreview: (seconds: number | null) => void;
    /** 撳落碟（未轉夠門檻都算）/ 放手或取消：畀外面鎖住弧形、停自轉 */
    onHold: (held: boolean) => void;
    motion: DiscTurn;
}

interface ScrubSession {
    pointerId: number;
    startSeconds: number;
    /** 上一個有效樣本嘅角度；spindle 附近嘅樣本唔計（null） */
    lastAngle: number | null;
    /** 累積轉咗幾多度（順時針為正，已 clamp 喺錄音頭尾） */
    degrees: number;
    /** 轉過 DISC_SCRUB_MIN_DEGREES 先算捽，否則當 tap */
    scrubbing: boolean;
}

/** 指標喺碟面嘅角度；喺 spindle 附近返回 null */
const angleOnDisc = (event: DiscPointerEvent): number | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
    if (distance < (rect.width / 2) * DISC_SCRUB_DEAD_ZONE_RATIO) return null;
    return pointerAngle(event.clientX, event.clientY, centerX, centerY);
};

const secondsAt = (session: ScrubSession): number =>
    session.startSeconds + turnSeconds(session.degrees, DISC_SCRUB_SECONDS_PER_TURN);

/** 跟手指累積角度；過咗門檻先開始預覽同轉碟 */
const advance = (session: ScrubSession, angle: number, options: DiscScrubOptions) => {
    const { lastAngle } = session;
    session.lastAngle = angle;
    if (lastAngle === null) return;
    const range = {
        startSeconds: session.startSeconds,
        max: options.max,
        secondsPerTurn: DISC_SCRUB_SECONDS_PER_TURN,
    };
    session.degrees = clampTurn(session.degrees + angleDelta(lastAngle, angle), range);
    if (Math.abs(session.degrees) >= DISC_SCRUB_MIN_DEGREES) session.scrubbing = true;
    if (!session.scrubbing) return;
    options.onPreview(secondsAt(session));
    options.motion.turn(session.degrees);
};

/** 撳落碟：capture 住，記低起手位置；一撳落就算捉住碟（唔使等過門檻） */
const begin = (event: DiscPointerEvent, options: DiscScrubOptions): ScrubSession => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    options.onHold(true);
    return {
        pointerId: event.pointerId,
        startSeconds: options.currentTime,
        lastAngle: angleOnDisc(event),
        degrees: 0,
        scrubbing: false,
    };
};

/**
 * 捽碟 seek（好似 DJ jog wheel）：順時針向前、逆時針向後，轉一圈 = DISC_SCRUB_SECONDS_PER_TURN 秒。
 * 拖緊只預覽，放手先 seek；取消唔 seek。撳落碟就係自己嘅手勢（唔郁今日節目卡疊）
 */
export const useDiscScrub = (options: DiscScrubOptions) => {
    const session = useRef<ScrubSession | null>(null);
    const end = (event: DiscPointerEvent, commit: boolean) => {
        const current = session.current;
        if (!current || current.pointerId !== event.pointerId) return;
        event.stopPropagation();
        session.current = null;
        // tap（未過門檻）完都要放返碟
        options.onHold(false);
        if (!current.scrubbing) return;
        if (commit) options.onSeek(secondsAt(current));
        options.onPreview(null);
        if (commit) options.motion.settle();
        else options.motion.revert();
    };
    return {
        onPointerDown: (event: DiscPointerEvent) => {
            event.stopPropagation();
            if (session.current || options.locked || options.max <= 0) return;
            session.current = begin(event, options);
        },
        onPointerMove: (event: DiscPointerEvent) => {
            const current = session.current;
            if (!current || current.pointerId !== event.pointerId) return;
            event.stopPropagation();
            const angle = angleOnDisc(event);
            if (angle === null) current.lastAngle = null;
            else advance(current, angle, options);
        },
        onPointerUp: (event: DiscPointerEvent) => end(event, true),
        onPointerCancel: (event: DiscPointerEvent) => end(event, false),
        // 滑鼠拖節目圖會觸發原生拖放（之後 pointercancel），要擋住
        onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    };
};

export type DiscScrubHandlers = ReturnType<typeof useDiscScrub>;

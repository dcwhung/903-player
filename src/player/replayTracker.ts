import { REPLAY_RESET_SECONDS } from '../config/constants';

/**
 * 聽過嘅錄音由頭重播：累計真正播放時間（暫停、seek 唔計），夠 REPLAY_RESET_SECONDS 就報一次，
 * 等 AudioController 清走「已收聽」。只計時，唔掂 storage / state。
 */
export class ReplayTracker {
    /** 重播累計秒數；undefined = 唔係重播，唔使計 */
    private replayedSeconds: number | undefined;
    /** 上一次 timeupdate 嘅位置，用嚟計兩次之間播咗幾耐 */
    private lastTickPosition = 0;

    /** 聽過嘅錄音由頭播：開始計重播時間；未聽過就唔使計 */
    arm(watched: boolean): void {
        this.replayedSeconds = watched ? 0 : undefined;
    }

    /** seek / 換集 / 重新載入：由新位置重新起計，跳過嘅唔算收聽時間 */
    moveTo(position: number): void {
        this.lastTickPosition = position;
    }

    /** 每次 timeupdate 叫；啱啱夠鐘就返回 true 並停止計（每次 arm 最多報一次） */
    track(position: number, paused: boolean): boolean {
        const delta = position - this.lastTickPosition;
        this.lastTickPosition = position;
        if (this.replayedSeconds === undefined || paused || delta <= 0) {
            return false;
        }
        this.replayedSeconds += delta;
        if (this.replayedSeconds < REPLAY_RESET_SECONDS) {
            return false;
        }
        this.replayedSeconds = undefined;
        return true;
    }
}

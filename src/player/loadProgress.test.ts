import { STALL_DATA_AHEAD_SECONDS } from '../config/constants';
import { isLoadProgressing, type LoadProbe } from './loadProgress';

const POSITION = 521.4;
const probe = (overrides: Partial<LoadProbe> = {}): LoadProbe => ({
    bufferedEnd: undefined,
    readyState: 0,
    currentTime: POSITION,
    playingFired: false,
    ...overrides,
});

describe('isLoadProgressing', () => {
    it('should be progressing when the buffer grows but is not yet far ahead', () => {
        const before = probe({ bufferedEnd: POSITION + 1, readyState: 2 });
        const after = probe({ bufferedEnd: POSITION + 2, readyState: 2 });

        expect(isLoadProgressing(before, after)).toBe(true);
    });

    it('should be progressing when the ready state reaches playable data', () => {
        expect(isLoadProgressing(probe({ readyState: 1 }), probe({ readyState: 2 }))).toBe(true);
    });

    // W-500：HAVE_METADATA 冇任何可播數據，唔算下載有進展（S-551 情境 1 要喺 4 秒重試）
    it('should not be progressing when only metadata arrives', () => {
        expect(isLoadProgressing(probe(), probe({ readyState: 1 }))).toBe(false);
    });

    it('should be progressing when a buffered range appears around the position', () => {
        expect(isLoadProgressing(probe(), probe({ bufferedEnd: POSITION + 1 }))).toBe(true);
    });

    // S-551 情境 1：轉網絡後 stalled，乜都冇增長
    it('should not be progressing when nothing grows', () => {
        const same = probe({ bufferedEnd: POSITION + 1, readyState: 2 });

        expect(isLoadProgressing(same, { ...same })).toBe(false);
    });

    // S-551 情境 2：數據已經喺前面但位置凍結（pipeline 死咗），即使仲增長都唔算
    it('should not be progressing when plenty of data is ahead of a frozen position', () => {
        const before = probe({ bufferedEnd: POSITION + STALL_DATA_AHEAD_SECONDS, readyState: 4 });
        const after = probe({
            bufferedEnd: POSITION + STALL_DATA_AHEAD_SECONDS + 1,
            readyState: 4,
        });

        expect(isLoadProgressing(before, after)).toBe(false);
    });

    /** S-583：playing 已發（數據話可以播）而位置唔行，readyState 升唔再算下載有進展 */
    describe('after playing has fired', () => {
        const HAVE_CURRENT_DATA = 2;
        const HAVE_FUTURE_DATA = 3;
        const HAVE_ENOUGH_DATA = 4;

        // S-551 情境 2（實機）：playing + play() resolve、rs=4、只載到少量、位置凍結 → 首個 deadline 重試
        it('should not be progressing when only the ready state rises to playable', () => {
            const before = probe();
            const after = probe({
                bufferedEnd: POSITION + 1,
                readyState: HAVE_ENOUGH_DATA,
                playingFired: true,
            });

            expect(isLoadProgressing(before, after)).toBe(false);
        });

        it('should not be progressing when the ready state rises without a playable claim', () => {
            const before = probe({ playingFired: true });
            const after = probe({ readyState: HAVE_CURRENT_DATA, playingFired: true });

            expect(isLoadProgressing(before, after)).toBe(false);
        });

        // 個 element 自己話數據夠播（rs ≥ 3）而位置唔行：唔係下載問題，等落去都冇用
        it('should not be progressing when the buffer grows while the element claims it can play', () => {
            const before = probe({
                bufferedEnd: POSITION + 1,
                readyState: HAVE_FUTURE_DATA,
                playingFired: true,
            });
            const after = probe({
                bufferedEnd: POSITION + 2,
                readyState: HAVE_FUTURE_DATA,
                playingFired: true,
            });

            expect(isLoadProgressing(before, after)).toBe(false);
        });

        // 開咗播之後數據唔夠（waiting，rs 跌返 ≤ 2）而 buffer 仲增長：真係慢網，唔好 abort（W-498）
        it('should be progressing when the buffer grows while the element waits for data', () => {
            const before = probe({
                bufferedEnd: POSITION + 1,
                readyState: HAVE_CURRENT_DATA,
                playingFired: true,
            });
            const after = probe({
                bufferedEnd: POSITION + 2,
                readyState: HAVE_CURRENT_DATA,
                playingFired: true,
            });

            expect(isLoadProgressing(before, after)).toBe(true);
        });
    });
});

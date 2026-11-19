import { homeLayoutMode } from './homeLayoutMode';

describe('homeLayoutMode', () => {
    it.each([
        // 闊橫版, 有 mini player, 卡閂咗, 版面
        [false, false, false, 'stack'],
        [false, true, false, 'stack'],
        [false, true, true, 'stack'],
        [true, false, false, 'fill'],
        // ✕ 停咗播、收埋 mini player：冇 mini player 都要留把手畀用戶開返
        [true, false, true, 'fillWithHandle'],
        [true, true, false, 'split'],
        [true, true, true, 'fillWithHandle'],
    ] as const)(
        'should pick the layout for wide %s, mini player %s, card closed %s',
        (wide, hasMiniPlayer, cardClosed, expected) => {
            expect(homeLayoutMode({ wide, hasMiniPlayer, cardClosed })).toBe(expected);
        },
    );
});

// HomeView 由內頁返主頁（P10 v2.0.1 用戶反饋）：播放卡收埋（唔停播），全闊格 + 右邊把手
describe('homeLayoutMode with the card folded away', () => {
    it.each([
        // 闊版, 有 mini player, 卡閂咗, 卡收埋, 版面
        [true, true, false, true, 'fillWithHandle'],
        // 冇嘢播：收埋都冇卡可以收，照舊填滿
        [true, false, false, true, 'fill'],
        [true, true, true, true, 'fillWithHandle'],
        [false, true, false, true, 'stack'],
    ] as const)(
        'should pick the layout for wide %s, mini player %s, closed %s, folded %s',
        (wide, hasMiniPlayer, cardClosed, cardFolded, expected) => {
            expect(homeLayoutMode({ wide, hasMiniPlayer, cardClosed, cardFolded })).toBe(expected);
        },
    );
});

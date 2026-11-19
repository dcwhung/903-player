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

// HomeView（P10 v2.0.2 用戶反饋）：永遠唔出卡，有 mini player 就全闊格 + 右邊把手
describe('homeLayoutMode on HomeView (handle only)', () => {
    it.each([
        // 闊版, 有 mini player, 卡閂咗, 淨係把手, 版面
        [true, true, false, true, 'fillWithHandle'],
        // 冇嘢播：冇把手，照舊填滿
        [true, false, false, true, 'fill'],
        [true, true, true, true, 'fillWithHandle'],
        [false, true, false, true, 'stack'],
    ] as const)(
        'should pick the layout for wide %s, mini player %s, closed %s, handle only %s',
        (wide, hasMiniPlayer, cardClosed, handleOnly, expected) => {
            expect(homeLayoutMode({ wide, hasMiniPlayer, cardClosed, handleOnly })).toBe(expected);
        },
    );
});

import { homeLayoutMode } from './homeLayoutMode';

describe('homeLayoutMode', () => {
    it.each([
        // 闊橫版, 有 mini player, 卡閂咗, 版面
        [false, false, false, 'stack'],
        [false, true, false, 'stack'],
        [false, true, true, 'stack'],
        [true, false, false, 'fill'],
        [true, false, true, 'fill'],
        [true, true, false, 'split'],
        [true, true, true, 'fillWithHandle'],
    ] as const)(
        'should pick the layout for wide %s, mini player %s, card closed %s',
        (wide, hasMiniPlayer, cardClosed, expected) => {
            expect(homeLayoutMode({ wide, hasMiniPlayer, cardClosed })).toBe(expected);
        },
    );
});

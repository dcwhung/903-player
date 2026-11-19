import { transitionSide } from './useWideHome';

// W-787：內頁冇把手（HomeView）就當主頁右邊乜都冇，過場同窄版一樣淨係 zoom / unzoom
describe('transitionSide', () => {
    it.each([
        ['split', 'card'],
        ['fillWithHandle', 'handle'],
        ['fill', 'none'],
        ['stack', 'none'],
    ] as const)(
        'should follow the layout (%s → %s) when inner pages have a handle',
        (mode, side) => {
            expect(transitionSide(mode, true)).toBe(side);
        },
    );

    it.each(['split', 'fillWithHandle', 'fill', 'stack'] as const)(
        'should be none in %s when inner pages have no handle',
        (mode) => {
            expect(transitionSide(mode, false)).toBe('none');
        },
    );
});

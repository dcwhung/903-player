import { act, renderHook } from '@testing-library/react';
import { clearShowPick, markShowPicked, pickedShow, usePickedShow } from './showPick';

describe('showPick', () => {
    afterEach(() => clearShowPick());

    it('starts with no show picked', () => {
        const { result } = renderHook(() => usePickedShow());
        expect(result.current).toBeNull();
        expect(pickedShow()).toBeNull();
    });

    it('tells every listener which show the user picked, and when it is cleared', () => {
        const first = renderHook(() => usePickedShow());
        const second = renderHook(() => usePickedShow());

        act(() => markShowPicked('gongzi'));
        expect(first.result.current).toBe('gongzi');
        expect(second.result.current).toBe('gongzi');
        expect(pickedShow()).toBe('gongzi');

        act(() => clearShowPick());
        expect(first.result.current).toBeNull();
    });

    it('keeps only the latest show', () => {
        markShowPicked('gongzi');
        markShowPicked('badgirl');
        expect(pickedShow()).toBe('badgirl');
    });
});

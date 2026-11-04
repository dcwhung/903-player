import { dismissData, offsetStyle } from './dismissView';
import type { DismissView } from './useDismissGesture';

const idle: DismissView = {
    pressing: false,
    armed: false,
    dragging: false,
    revealed: false,
    offset: 0,
    closing: false,
};

describe('dismissData', () => {
    it('should set no data attributes when idle, so CSS selectors stay off', () => {
        expect(Object.values(dismissData(idle)).every((value) => value === undefined)).toBe(true);
    });

    it('should mirror each view flag as a data attribute', () => {
        const data = dismissData({ ...idle, pressing: true, dragging: true, closing: true });
        expect(data['data-pressing']).toBe(true);
        expect(data['data-dragging']).toBe(true);
        expect(data['data-closing']).toBe(true);
        expect(data['data-revealed']).toBeUndefined();
    });

    it('should be lifted only when armed and not dragging, revealed or closing', () => {
        const armed = { ...idle, armed: true };
        expect(dismissData(armed)['data-lifted']).toBe(true);
        expect(dismissData({ ...armed, dragging: true })['data-lifted']).toBeUndefined();
        expect(dismissData({ ...armed, revealed: true })['data-lifted']).toBeUndefined();
        expect(dismissData({ ...armed, closing: true })['data-lifted']).toBeUndefined();
    });
});

describe('offsetStyle', () => {
    it('should expose the card offset as a px CSS variable', () => {
        expect(offsetStyle({ ...idle, offset: -42 })).toEqual({ '--mini-dismiss-offset': '-42px' });
    });
});

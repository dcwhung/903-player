import { durationMs, motionTiming } from './motion';

describe('durationMs', () => {
    it('should read a motion token in ms or s (the build minifies 220ms to .22s)', () => {
        expect(durationMs('220ms')).toBe(220);
        expect(durationMs(' .22s')).toBe(220);
        expect(durationMs('')).toBeUndefined();
        expect(durationMs('fast')).toBeUndefined();
    });
});

describe('motionTiming (S-806: JS animations follow tokens.css)', () => {
    afterEach(() => {
        document.documentElement.style.removeProperty('--motion-base');
        document.documentElement.style.removeProperty('--motion-ease');
    });

    it('should read the duration token and --motion-ease from the root', () => {
        document.documentElement.style.setProperty('--motion-base', '.2s');
        document.documentElement.style.setProperty('--motion-ease', 'cubic-bezier(0.2, 0, 0, 1)');
        expect(motionTiming('--motion-base')).toEqual({
            duration: 200,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
        });
    });

    it('should not animate when the tokens are missing', () => {
        expect(motionTiming('--motion-base')).toEqual({ duration: 0, easing: 'linear' });
    });
});

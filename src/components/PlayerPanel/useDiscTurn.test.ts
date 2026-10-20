import { renderHook } from '@testing-library/react';
import { useDiscTurn } from './useDiscTurn';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 模擬系統設定減少動畫 */
const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: reduce && query === REDUCED_MOTION_QUERY,
            media: query,
        })),
    );

const renderTurn = () => {
    const { result } = renderHook(() => useDiscTurn());
    const face = document.createElement('span');
    result.current.faceRef.current = face;
    return { motion: result.current, face };
};

describe('useDiscTurn', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('turns from where the disc was let go', () => {
        stubReducedMotion(false);
        const { motion, face } = renderTurn();

        motion.turn(90);
        motion.settle();
        motion.turn(30);

        expect(face.style.transform).toBe('rotate(120deg)');
    });

    it('turns back to the starting angle on cancel', () => {
        stubReducedMotion(false);
        const { motion, face } = renderTurn();

        motion.turn(90);
        motion.settle();
        motion.turn(45);
        motion.revert();

        expect(face.style.transform).toBe('rotate(90deg)');
    });

    it('does not turn the disc when reduced motion is requested', () => {
        stubReducedMotion(true);
        const { motion, face } = renderTurn();

        motion.turn(90);
        expect(face.style.transform).toBe('');

        // 放手都唔會累積角度：之後轉返正常動畫，碟由 0° 開始
        motion.settle();
        stubReducedMotion(false);
        motion.turn(10);
        expect(face.style.transform).toBe('rotate(10deg)');
    });
});

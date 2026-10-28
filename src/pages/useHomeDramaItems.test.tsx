import { renderHook } from '@testing-library/react';
import { createHookWrapper } from '../../tests/renderWithProviders';
import { dramaShelfOrder } from '../selectors/dramaShelf';
import { useDramaItems } from './useHomeDramaItems';

// 包住真嘅 dramaShelfOrder，數佢俾人叫咗幾多次
vi.mock('../selectors/dramaShelf', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../selectors/dramaShelf')>();
    return { ...actual, dramaShelfOrder: vi.fn(actual.dramaShelfOrder) };
});

describe('useDramaItems', () => {
    it('should not re-sort the shelf when the home page re-renders for an unrelated reason', () => {
        const { wrapper } = createHookWrapper();
        const { result, rerender } = renderHook(() => useDramaItems(), { wrapper });
        const firstOrder = result.current.map((item) => item.id);
        vi.mocked(dramaShelfOrder).mockClear();

        // 播放中 mini player 跟 currentTime 成日 re-render，進度冇變就唔使重新排（S-481）
        rerender();
        rerender();

        expect(dramaShelfOrder).not.toHaveBeenCalled();
        expect(result.current.map((item) => item.id)).toEqual(firstOrder);
    });
});

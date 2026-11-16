import { act, renderHook } from '@testing-library/react';
import { mockApi } from '../../../tests/renderApp';
import { useBannerFlow } from './useBannerFlow';

describe('useBannerFlow', () => {
    it('should fail without saving when confirm runs before both crops are ready', async () => {
        const api = mockApi({});
        const onSaved = vi.fn();
        const { result } = renderHook(() => useBannerFlow(vi.fn(), onSaved));

        await act(async () => result.current.confirm());

        expect(onSaved).not.toHaveBeenCalled();
        expect(api).not.toHaveBeenCalled();
        expect(result.current.error).toBe('兩張 Banner 未裁切好，請重新選擇圖片。');
    });
});

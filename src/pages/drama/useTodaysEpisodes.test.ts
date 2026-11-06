/* S-699：留喺劇集頁過咗香港午夜，集數要跟新日子重新攞 */
import { renderHook } from '@testing-library/react';
import { findDrama } from '../../catalog/dramas';
import { useTodaysEpisodes } from './useDramaPage';

describe('useTodaysEpisodes', () => {
    afterEach(() => vi.useRealTimers());

    it('should read the episodes again once the Hong Kong date changes', () => {
        const drama = findDrama('chisee');
        if (!drama) throw new Error('missing fixture');
        const read = vi.fn((id: string, today: string) => `${id}@${today}`);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-30T15:59:00Z')); // 香港 30/11 23:59
        const { result, rerender } = renderHook(() => useTodaysEpisodes(drama, read));
        expect(result.current).toBe('chisee@2026-11-30');

        rerender();
        expect(read).toHaveBeenCalledTimes(1);

        vi.setSystemTime(new Date('2026-11-30T16:00:00Z')); // 香港 01/12 00:00
        rerender();
        expect(result.current).toBe('chisee@2026-12-01');
    });
});

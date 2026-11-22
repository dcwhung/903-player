import { ApiError, UnauthorizedError } from './client';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
    it('should explain an expired session in Chinese', () => {
        expect(errorMessage(new UnauthorizedError(401, 'not logged in'))).toBe(
            '登入已逾時，請重新登入後再試（未儲存的變更會保留）。',
        );
    });

    it('should pass other errors through', () => {
        expect(errorMessage(new Error('boom'))).toBe('boom');
        expect(errorMessage('x')).toBe('x');
    });

    it('should explain a rename that would duplicate an arc id (W-711)', () => {
        const error = new ApiError(409, 'arc id lancy-01 would exist twice after the rename', {
            error: 'arc id lancy-01 would exist twice after the rename',
            arcId: 'lancy-01',
        });
        expect(errorMessage(error)).toBe('改名後短篇 ID「lancy-01」會重複，請先修改該短篇 ID。');
    });

    it('should explain an arc ID change refused because the arc has a schedule (S-804)', () => {
        const error = new ApiError(409, 'arc arc-01 has a schedule; remove it first', {
            error: 'arc arc-01 has a schedule; remove it first',
            arcId: 'arc-01',
            reason: 'arcScheduled',
        });
        expect(errorMessage(error)).toBe('此短篇已有排程，請先移除排程再修改 ID。');
    });

    it('should explain a publish or restore that lost to another publish (AU-018)', () => {
        const error = new ApiError(409, 'another publish finished or is in progress', {
            error: 'another publish finished or is in progress',
            reason: 'publishConflict',
        });
        expect(errorMessage(error)).toBe(
            '另一次發佈或還原剛剛完成或仍在進行，此操作未有執行。請重新載入後再試。',
        );
    });
});

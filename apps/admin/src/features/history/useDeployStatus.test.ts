import { act, renderHook } from '@testing-library/react';
import { getDeployStatus } from '../../api/brandingEndpoints';
import type { DeployStatus } from '../../api/types';
import { DEPLOY_POLL_MAX, DEPLOY_POLL_MS } from './deployModel';
import { useDeployStatus } from './useDeployStatus';

vi.mock('../../api/brandingEndpoints', () => ({ getDeployStatus: vi.fn() }));

const ID = 9;
const FIRST_REQUEST = '2026-11-13T01:00:00Z';
const SECOND_REQUEST = '2026-11-13T02:00:00Z';
const RUNNING: DeployStatus = { status: 'in_progress', url: 'https://gh/run/1' };
const FAILED: DeployStatus = { status: 'failure', url: 'https://gh/run/1' };
const SUCCEEDED: DeployStatus = { status: 'success', url: 'https://gh/run/2' };

const statusMock = vi.mocked(getDeployStatus);

const renderStatus = (requestedAt: string | null, enabled = true) =>
    renderHook(
        (props: { requestedAt: string | null }) => useDeployStatus(ID, enabled, props.requestedAt),
        { initialProps: { requestedAt } },
    );

/** 等 pending 嘅 fetch promise resolve + 行 n 個 poll 間隔 */
const advancePolls = async (count: number) => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(DEPLOY_POLL_MS * count);
    });
};

describe('useDeployStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        statusMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not poll when the row is not triggered', async () => {
        renderStatus(FIRST_REQUEST, false);
        await advancePolls(2);
        expect(statusMock).not.toHaveBeenCalled();
    });

    it('should poll again from scratch when the row is redeployed', async () => {
        statusMock.mockResolvedValue(FAILED);
        const { result, rerender } = renderStatus(FIRST_REQUEST);
        await advancePolls(1);
        expect(result.current).toEqual(FAILED);
        expect(statusMock).toHaveBeenCalledTimes(1);

        statusMock.mockResolvedValueOnce(RUNNING).mockResolvedValue(SUCCEEDED);
        rerender({ requestedAt: SECOND_REQUEST });
        // 新一次部署：舊結果唔可以留喺畫面
        expect(result.current).toBeUndefined();
        await advancePolls(0);
        expect(result.current).toEqual(RUNNING);
        await advancePolls(1);
        expect(result.current).toEqual(SUCCEEDED);
        expect(statusMock).toHaveBeenCalledTimes(3);
    });

    it('should stop polling at the limit', async () => {
        statusMock.mockResolvedValue(RUNNING);
        renderStatus(FIRST_REQUEST);
        await advancePolls(DEPLOY_POLL_MAX + 3);
        expect(statusMock).toHaveBeenCalledTimes(DEPLOY_POLL_MAX);
    });

    // S-967：到上限仲未有結論 → 狀態不明（畫面有重新部署入口），保留最後一個 run 連結
    it('should report unknown with the last run url when the limit is reached', async () => {
        statusMock.mockResolvedValue(RUNNING);
        const { result } = renderStatus(FIRST_REQUEST);
        await advancePolls(DEPLOY_POLL_MAX - 2);
        expect(result.current).toEqual(RUNNING);
        await advancePolls(3);
        expect(result.current).toEqual({ status: 'unknown', url: RUNNING.url });
    });

    it('should report unknown without a url when every poll failed', async () => {
        statusMock.mockRejectedValue(new Error('offline'));
        const { result } = renderStatus(FIRST_REQUEST);
        await advancePolls(DEPLOY_POLL_MAX + 1);
        expect(result.current).toEqual({ status: 'unknown', url: null });
    });

    it('should restart the poll limit for a redeploy', async () => {
        statusMock.mockResolvedValue(RUNNING);
        const { rerender } = renderStatus(FIRST_REQUEST);
        await advancePolls(DEPLOY_POLL_MAX + 1);
        rerender({ requestedAt: SECOND_REQUEST });
        await advancePolls(DEPLOY_POLL_MAX + 1);
        expect(statusMock).toHaveBeenCalledTimes(DEPLOY_POLL_MAX * 2);
    });

    it('should stop polling after leaving the page', async () => {
        statusMock.mockResolvedValue(RUNNING);
        const { unmount } = renderStatus(FIRST_REQUEST);
        await advancePolls(1);
        const calls = statusMock.mock.calls.length;
        unmount();
        await advancePolls(5);
        expect(statusMock).toHaveBeenCalledTimes(calls);
    });
});

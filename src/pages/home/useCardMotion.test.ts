import { act, renderHook } from '@testing-library/react';
import type { PlayerItem } from '../../types/playerItem';
import { withViewTransition } from '../../utils/viewTransition';
import type { WideLayoutMode } from './cardMotion';
import { useCardMotion } from './useCardMotion';

const BADGIRL: PlayerItem = { kind: 'show', id: 'badgirl', date: '2026-10-19' };
const CHISEE: PlayerItem = { kind: 'drama', id: 'chisee' };
const JIM: PlayerItem = { kind: 'drama', id: 'jim' };

interface Face {
    mode: WideLayoutMode;
    item: PlayerItem | undefined;
}

/**
 * 似真嘅 startViewTransition：update 等測試 flush 先行（真瀏覽器影完舊畫面先叫），
 * 中間 render 嘅應該仲係舊畫面
 */
const stubViewTransitions = () => {
    const updates: (() => void)[] = [];
    const never = new Promise<void>(() => {});
    const start = vi.fn((update: () => void) => {
        updates.push(update);
        return { finished: never, ready: never, updateCallbackDone: never };
    });
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
    const flush = () => act(() => updates.splice(0).forEach((update) => update()));
    return { start, flush };
};

const renderCardMotion = (initial: Face) =>
    renderHook(({ mode, item }: Face) => useCardMotion(mode, item), { initialProps: initial });

describe('useCardMotion', () => {
    let vt: ReturnType<typeof stubViewTransitions>;

    beforeEach(() => {
        vt = stubViewTransitions();
    });
    afterEach(() => {
        // 清走 viewTransition 嘅 pending，唔好影響下一個測試
        vt.flush();
        Reflect.deleteProperty(document, 'startViewTransition');
        delete document.documentElement.dataset.viewTransition;
    });

    it('should keep the old card frozen and start one transition when the card changes again before the update', () => {
        const { result, rerender } = renderCardMotion({ mode: 'split', item: BADGIRL });

        rerender({ mode: 'split', item: CHISEE });
        rerender({ mode: 'split', item: JIM });

        // 瀏覽器仲未影舊畫面：舊卡要定住，唔可以即刻轉去 JIM（W-526）
        expect(result.current).toEqual({ mode: 'split', frozen: true, holding: true });
        expect(vt.start).toHaveBeenCalledOnce();
        vt.flush();
        expect(result.current).toEqual({ mode: 'split', frozen: false, holding: false });
        // update 用最新嗰個：之後唔會再為 CHISEE → JIM 開多一個過場
        expect(vt.start).toHaveBeenCalledOnce();
    });

    it('should keep the layout without the card when the card opens and then switches before the update', () => {
        const { result, rerender } = renderCardMotion({ mode: 'fill', item: undefined });

        rerender({ mode: 'split', item: CHISEE });
        rerender({ mode: 'split', item: JIM });

        // 舊畫面仲係冇卡，O1 slide 入先中（唔會變 cross-fade）
        expect(result.current.mode).toBe('fill');
        expect(vt.start).toHaveBeenCalledOnce();
        vt.flush();
        expect(result.current.mode).toBe('split');
        expect(vt.start).toHaveBeenCalledOnce();
    });

    it('should switch straight away when another transition is still waiting for its update', () => {
        const { result, rerender } = renderCardMotion({ mode: 'split', item: BADGIRL });
        withViewTransition(() => undefined, 'expand');

        rerender({ mode: 'split', item: JIM });

        // ⤢ 嗰個過場等緊：唔做動畫，即刻轉
        expect(result.current).toEqual({ mode: 'split', frozen: false, holding: false });
        expect(vt.start).toHaveBeenCalledOnce();
    });

    it('should animate the next change after its own transition has updated', () => {
        const { result, rerender } = renderCardMotion({ mode: 'split', item: BADGIRL });
        rerender({ mode: 'split', item: CHISEE });
        vt.flush();

        rerender({ mode: 'split', item: JIM });

        expect(result.current).toEqual({ mode: 'split', frozen: true, holding: true });
        expect(vt.start).toHaveBeenCalledTimes(2);
    });

    it('should hold the previous layout (and its handle) while the card opens from the handle', () => {
        const { result, rerender } = renderCardMotion({ mode: 'fillWithHandle', item: undefined });

        rerender({ mode: 'split', item: CHISEE });

        // 舊畫面仲有把手：HomeWide 照顯示佢，O1 開卡時先跟舊 snapshot 淡走
        expect(result.current).toEqual({ mode: 'fillWithHandle', frozen: false, holding: true });
        vt.flush();
        expect(result.current).toEqual({ mode: 'split', frozen: false, holding: false });
    });
});

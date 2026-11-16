import { act, renderHook } from '@testing-library/react';
import { useItemInfoSheet } from './useItemInfoSheet';

const SECTIONS = [{ title: '公子會', summary: '簡介' }];

describe('useItemInfoSheet', () => {
    it('should start open when told to auto-open on entry', () => {
        const { result } = renderHook(() => useItemInfoSheet(SECTIONS, true, '節目資料'));
        expect(result.current.sheet.open).toBe(true);
    });

    it('should open from the gauge info button and close again', () => {
        const { result } = renderHook(() => useItemInfoSheet(SECTIONS, false, '節目資料'));
        expect(result.current.sheet.open).toBe(false);
        expect(result.current.gaugeInfo?.infoLabel).toBe('節目資料');
        act(() => result.current.gaugeInfo?.onInfo());
        expect(result.current.sheet.open).toBe(true);
        act(() => result.current.sheet.close());
        expect(result.current.sheet.open).toBe(false);
    });

    it('should give no gauge info button and stay closed without info', () => {
        const { result } = renderHook(() => useItemInfoSheet([], true, '節目資料'));
        expect(result.current.gaugeInfo).toBeUndefined();
        expect(result.current.sheet.open).toBe(false);
    });
});

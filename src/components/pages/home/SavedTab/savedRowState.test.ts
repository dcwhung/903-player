/* 收藏行純函數（S-732 由 SavedRow 抽出嚟）：左邊條狀態 + 開行掣讀屏名 */
import { lampState, openLabel } from './savedRowState';
import type { SavedRowView } from './savedTypes';

const row = (extra: Partial<SavedRowView> = {}): SavedRowView => ({
    key: '/half/3',
    label: '3/10（五）',
    spokenLabel: '3/10 星期五',
    status: '已收聽',
    ratio: 1,
    playing: false,
    current: false,
    onAir: false,
    name: '晴天',
    zoomKey: 'episode:/half/3',
    onOpen: () => undefined,
    onPlay: () => undefined,
    onRemove: () => undefined,
    ...extra,
});

describe('lampState', () => {
    it('should give no lamp when the row is not loaded in the player', () => {
        expect(lampState(row())).toBeNull();
    });

    it('should give a live lamp when the current row is on air', () => {
        expect(lampState(row({ current: true, onAir: true }))).toBe('live');
    });

    it('should give an idle lamp when the current row is paused or connecting', () => {
        expect(lampState(row({ current: true }))).toBe('idle');
    });

    it('should give no lamp when the current row has been removed', () => {
        expect(lampState(row({ current: true, onAir: true, removed: true }))).toBeNull();
    });
});

describe('openLabel', () => {
    it('should read the spoken date and status when the row is available', () => {
        expect(openLabel(row())).toBe('開啟 晴天 3/10 星期五，已收聽');
    });

    it('should add the leaving date when the row is leaving soon', () => {
        const leaving = { text: '05/12 下架', label: '05/12 星期六 下架' };
        expect(openLabel(row({ leaving }))).toBe(
            '開啟 晴天 3/10 星期五，已收聽，05/12 星期六 下架',
        );
    });

    it('should say removed when the row has been taken down', () => {
        expect(openLabel(row({ removed: true }))).toBe('晴天 3/10 星期五，已下架');
    });
});

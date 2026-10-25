import type { DramaId, DramaKind } from '../types/drama';

export interface DramaConfig {
    id: DramaId;
    /** 顯示名稱（頁頭、mini player、鎖屏） */
    name: string;
    kind: DramaKind;
    /** 停用：主頁唔出、劇集頁當搵唔到（code 同 config 照留，之後改返 true 就得） */
    enabled: boolean;
    /** 短篇劇集主頁角落點數：season →「全 N 季」；冇就「N 個短篇」 */
    arcUnit?: 'season';
}

/** 全部劇集（包括停用咗嘅），按顯示次序 */
export const DRAMAS: readonly DramaConfig[] = [
    { id: 'chisee', name: '芝See菇Bi Family', kind: 'series', enabled: true },
    // 錄音未 host、資料仲係假：暫時停用
    { id: 'c18', name: '18 樓 C 座', kind: 'daily', enabled: false },
    { id: 'golden', name: '黃金少年', kind: 'series', enabled: true, arcUnit: 'season' },
];

/** 主頁「廣播劇」tab 列出嘅劇集 */
export const enabledDramas = (): readonly DramaConfig[] => DRAMAS.filter((d) => d.enabled);

/** 劇名（mini player / 鎖屏用）：停用咗都搵到 */
export const findDrama = (id: string): DramaConfig | undefined =>
    DRAMAS.find((drama) => drama.id === id);

/** 劇集頁用：停用咗嘅當搵唔到 */
export const findEnabledDrama = (id: string): DramaConfig | undefined =>
    enabledDramas().find((drama) => drama.id === id);

import type { DramaId, DramaKind } from '../types/drama';

export interface DramaConfig {
    id: DramaId;
    /** 顯示名稱（頁頭、mini player、鎖屏） */
    name: string;
    kind: DramaKind;
}

/** 主頁「廣播劇」tab 嘅劇集，按顯示次序 */
export const DRAMAS: readonly DramaConfig[] = [
    { id: 'chisee', name: '芝-See-菇-Bi-Family', kind: 'series' },
    { id: 'c18', name: '18-樓-C-座', kind: 'daily' },
];

export const findDrama = (id: string): DramaConfig | undefined =>
    DRAMAS.find((drama) => drama.id === id);

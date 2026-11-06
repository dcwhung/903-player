import type { useShelfFocus } from './useShelfFocus';

/** 格上面嘅字（text）同讀屏句（label，長版日子） */
export interface TileNotice {
    text: string;
    label: string;
}

export interface DramaShelfItem {
    id: string;
    name: string;
    /** 劇集原圖（16:9，已經有劇名） */
    art: string;
    /** 角落細字（例如「10 個短篇」/「每日更新」）：平時右下，有「繼續收聽」就讓去右上 */
    meta: string;
    /** 有新嘢先有：左上角出「新」，讀屏講呢句（例如「有新短篇」/「今日有新一集」） */
    newLabel?: string;
    /** 快將下架先有：左上角（「新」後面）琥珀色「⏳ 05/12 下架」/「部分短篇 …」/「部分集數 …」 */
    /** tag / short：格窄時嘅短版（short「05/12 下架」先，再窄 tag「05/12」，E2） */
    leaving?: (TileNotice & { tag?: string | undefined; short?: string | undefined }) | undefined;
    /**
     * 即將上架字尾（H2「新短篇 後日上架」/ E1「全新集數 …」）：接喺短篇數後面，獨立一截唔收尾（W-533）；
     * 格窄（--drama-tile-compact 以下）出 tag（「⏱ 後日上架」）；讀屏名加 label（S-700）
     */
    release?: (TileNotice & { tag: string }) | undefined;
    /**
     * 聽過先有：繼續收聽邊集（「短篇 · 第 N 集 集名」）同嗰集聽到幾多（0–1）；
     * 嗰集快將下架就集名後面加琥珀字（LC2）
     */
    resume?:
        | {
              label: string;
              /** 讀屏版集名（唔讀「·」，S-717） */
              spokenLabel: string;
              ratio: number;
              /** 放唔落（集名優先）就成段收埋；date：同左上角同一日就唔出（去重） */
              leaving?: (TileNotice & { date?: string | undefined }) | undefined;
          }
        | undefined;
    /** 整套劇即將上架：灰階 + 底部深色條「⏱ 即將上架 · 01/12」，aria-disabled，撳唔到（書架最尾） */
    upcoming?: TileNotice | undefined;
    /** 撳格（「繼續收聽」條以外）：入劇集頁 */
    onOpen: () => void;
    /** 撳「繼續收聽」條：唔入頁，淨係播續聽嗰集（有 resume 先用到） */
    onResume: () => void;
}

export type TileProps = ReturnType<typeof useShelfFocus>['tileProps'];

/** 疊卡 focus 用嘅掣屬性（useShelfFocus 嘅 tileProps）；冇就撳落即做 */
export type TileFocusProps = ReturnType<TileProps>;

export interface ContinueButtonProps {
    name: string;
    resume: NonNullable<DramaShelfItem['resume']>;
    onResume: () => void;
    focusProps?: TileFocusProps | undefined;
}

/** 疊卡先有：卡係咪 focus，同兩粒掣各自嘅 focus 屬性（撳暗咗嘅卡任何位都係先 focus） */
export interface TileFocus {
    focused: boolean;
    open: TileFocusProps;
    resume: TileFocusProps;
}

export interface DramaTileProps {
    item: DramaShelfItem;
    focus?: TileFocus | undefined;
}

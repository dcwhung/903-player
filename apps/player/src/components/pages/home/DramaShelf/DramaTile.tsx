import { zoomKey } from '../../../../utils/cardZoom';
import styles from './DramaShelf.module.css';
import { ContinueButton, CornerNotes, MetaText, tileLabel } from './DramaTileParts';
import { UpcomingTile } from './UpcomingTile';
import type { DramaShelfItem, DramaTileProps, TileFocus, TileProps } from './dramaTileTypes';
import { fitsWithoutOverflow, useHideWhenTight } from './useHideWhenTight';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';

export type { DramaShelfItem, TileNotice, TileProps } from './dramaTileTypes';

/*
 * 角落字放唔落逐步收（每步一定短過上一步）：第 1 步收埋短篇數；同一條頂行嘅話
 * 第 2 步左上角下架字換短版「⏳ 19/12 下架」、第 3 步淨日期「⏳ 19/12」（E2 / W-538）
 */
const META_STEPS = 1;
const TOP_BAR_STEPS = 3;

/**
 * 角落字：左上「新」+ 快將下架、短篇數（平時右下）。有「繼續收聽」短篇數讓去右上：
 * 同左上角放同一條頂行，唔會疊住；放唔落就逐步收（META_STEPS / TOP_BAR_STEPS）
 */
const TileCorners = ({ item }: { item: DramaShelfItem }) => {
    const sharesRow = item.resume !== undefined && item.leaving?.short !== undefined;
    const metaRef = useHideWhenTight<HTMLSpanElement>(
        item.release !== undefined,
        fitsWithoutOverflow,
        sharesRow ? TOP_BAR_STEPS : META_STEPS,
    );
    const meta = (
        <span
            ref={metaRef}
            className={`${styles.meta} ${item.resume ? styles.metaTop : ''}`}
            data-corner={item.resume ? 'top' : 'bottom'}
            aria-hidden="true"
        >
            <MetaText item={item} />
        </span>
    );
    if (!item.resume) {
        return (
            <>
                <CornerNotes item={item} />
                {meta}
            </>
        );
    }
    return (
        <span className={styles.topBar}>
            <CornerNotes item={item} />
            {meta}
        </span>
    );
};

/**
 * 劇集格：底層一粒入頁掣（成格，圖上冇字，劇名喺圖入面，靠 aria-label），同節目格一樣有「New」；
 * 聽過就喺圖底疊一粒「繼續收聽」掣（同入頁掣並排，唔可以掣包掣）
 */
const OpenTile = ({ item, focus }: DramaTileProps) => (
    // data-zoom-key：撳入頁時由成格（連繼續收聽條）zoom 入劇集頁（utils/cardZoom）
    <div
        className={styles.tile}
        data-focused={focus?.focused ? '' : undefined}
        data-zoom-key={zoomKey.drama(item.id)}
    >
        <button
            type="button"
            className={styles.open}
            aria-label={tileLabel(item)}
            onClick={item.onOpen}
            {...focus?.open}
        >
            {/* 唔畀拖圖片：滑鼠撳住捽書架會變咗 HTML5 拖放（CUI-0004） */}
            <img
                className={styles.art}
                src={item.art}
                alt=""
                draggable={false}
                crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
            />
            <TileCorners item={item} />
        </button>
        {item.resume && (
            <ContinueButton
                name={item.name}
                resume={item.resume}
                onResume={item.onResume}
                focusProps={focus?.resume}
            />
        )}
    </div>
);

/** 劇集格：即將上架就係灰格（撳唔到），否則正常入頁格 */
export const DramaTile = ({ item, focus }: DramaTileProps) => {
    const { upcoming } = item;
    return upcoming ? (
        <UpcomingTile item={{ ...item, upcoming }} focus={focus} />
    ) : (
        <OpenTile item={item} focus={focus} />
    );
};

/** 疊卡第 index 張嘅 focus 屬性：兩粒掣共用同一套「撳暗卡先 focus、撳 focus 卡先做」 */
export const tileFocus = (
    tileProps: TileProps,
    focused: boolean,
    index: number,
    item: DramaShelfItem,
): TileFocus => ({
    focused,
    open: tileProps(index, item.onOpen),
    resume: tileProps(index, item.onResume),
});

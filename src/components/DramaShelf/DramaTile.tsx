import { toPercent } from '../../utils/ratio';
import { PlayIcon } from '../icons/icons';
import { Marquee } from '../Marquee/Marquee';
import { NewBadge } from '../NewBadge/NewBadge';
import { t } from '../../i18n/t';
import styles from './DramaShelf.module.css';
import type { useShelfFocus } from './useShelfFocus';

export interface DramaShelfItem {
    id: string;
    name: string;
    /** 劇集原圖（16:9，已經有劇名） */
    art: string;
    /** 角落細字（例如「10 個短篇」/「每日更新」）：平時右下，有「繼續收聽」就讓去右上 */
    meta: string;
    /** 有新嘢先有：左上角出「新」，讀屏講呢句（例如「有新短篇」/「今日有新一集」） */
    newLabel?: string;
    /** 聽過先有：繼續收聽邊集（「短篇 · 第 N 集 集名」）同嗰集聽到幾多（0–1） */
    resume?: { label: string; ratio: number };
    /** 撳格（「繼續收聽」條以外）：入劇集頁 */
    onOpen: () => void;
    /** 撳「繼續收聽」條：唔入頁，淨係播續聽嗰集（有 resume 先用到） */
    onResume: () => void;
}

const CONTINUE_ICON_SIZE = 16;

/** 入頁掣讀屏名：劇名（+ 有新嘢） */
const tileLabel = ({ name, newLabel }: DramaShelfItem): string =>
    newLabel ? t('drama.tileNew', { name, label: newLabel }) : name;

export type TileProps = ReturnType<typeof useShelfFocus>['tileProps'];

/** 疊卡 focus 用嘅掣屬性（useShelfFocus 嘅 tileProps）；冇就撳落即做 */
type TileFocusProps = ReturnType<TileProps>;

interface ContinueButtonProps {
    name: string;
    resume: NonNullable<DramaShelfItem['resume']>;
    onResume: () => void;
    focusProps?: TileFocusProps | undefined;
}

/** 圖底「繼續收聽」條（獨立一粒掣）：短篇 · 集數、進度線、▶；撳落淨係播，唔入頁 */
const ContinueButton = ({ name, resume, onResume, focusProps }: ContinueButtonProps) => (
    <button
        type="button"
        className={styles.continue}
        aria-label={t('drama.tileContinue', { name, label: resume.label })}
        onClick={onResume}
        {...focusProps}
    >
        <span className={styles.continueTitle}>{t('drama.continue')}</span>
        <Marquee className={styles.continueLabel} text={resume.label} />
        <span className={styles.continueBar}>
            <span data-continue-fill="" style={{ width: `${toPercent(resume.ratio)}%` }} />
        </span>
        <span className={styles.continuePlay}>
            <PlayIcon size={CONTINUE_ICON_SIZE} />
        </span>
    </button>
);

/** 疊卡先有：卡係咪 focus，同兩粒掣各自嘅 focus 屬性（撳暗咗嘅卡任何位都係先 focus） */
interface TileFocus {
    focused: boolean;
    open: TileFocusProps;
    resume: TileFocusProps;
}

interface DramaTileProps {
    item: DramaShelfItem;
    focus?: TileFocus | undefined;
}

/**
 * 劇集格：底層一粒入頁掣（成格，圖上冇字，劇名喺圖入面，靠 aria-label），同節目格一樣有「New」；
 * 聽過就喺圖底疊一粒「繼續收聽」掣（同入頁掣並排，唔可以掣包掣）
 */
export const DramaTile = ({ item, focus }: DramaTileProps) => (
    <div className={styles.tile} data-focused={focus?.focused ? '' : undefined}>
        <button
            type="button"
            className={styles.open}
            aria-label={tileLabel(item)}
            onClick={item.onOpen}
            {...focus?.open}
        >
            <img className={styles.art} src={item.art} alt="" />
            {item.newLabel && <NewBadge className={styles.newBadge} />}
            <span
                className={`${styles.meta} ${item.resume ? styles.metaTop : ''}`}
                data-corner={item.resume ? 'top' : 'bottom'}
                aria-hidden="true"
            >
                {item.meta}
            </span>
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

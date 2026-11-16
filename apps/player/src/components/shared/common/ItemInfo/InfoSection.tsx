import type { ItemInfoSection } from '../../../../selectors/itemInfo';
import { Disc } from '../Disc/Disc';
import { ItemInfoFields } from './ItemInfoFields';
import styles from './ItemInfoSheet.module.css';

interface InfoSectionProps {
    section: ItemInfoSection;
    /** banner 已經係呢段（名疊喺圖上）：唔再出標題 / 碟面；節目段唔再出播放時間（banner 細字） */
    underBanner: boolean;
}

/** 段標題：短篇有碟面就放喺名前面（圓形 + track 色外框） */
const SectionTitle = ({ section }: { section: ItemInfoSection }) => {
    const title = <h2 className={styles.title}>{section.title}</h2>;
    if (!section.art) return title;
    return (
        <div className={styles.titleRow}>
            <span className={styles.titleDisc}>
                <Disc size="small" art={section.art} />
            </span>
            {title}
        </div>
    );
};

/** banner 拎走標題（同節目段嘅播放時間）之後仲有冇嘢出 */
const hasBody = (section: ItemInfoSection, omitAirTime: boolean): boolean =>
    Boolean(section.hosts || section.cast || section.summary || (section.airTime && !omitAirTime));

/**
 * 一段（節目 / 劇集 / 短篇）：data-kind 畀 CSS 揀標題大細（短篇細過劇集名）。
 * S-1019：banner 代替咗標題而且淨低冇欄位（例如節目淨有播放時間）就唔出空 <section>
 */
export const InfoSection = ({ section, underBanner }: InfoSectionProps) => {
    const omitAirTime = underBanner && section.kind === 'show';
    if (underBanner && !hasBody(section, omitAirTime)) return null;
    return (
        <section className={styles.section} data-kind={section.kind}>
            {!underBanner && <SectionTitle section={section} />}
            <ItemInfoFields section={section} omitAirTime={omitAirTime} />
        </section>
    );
};

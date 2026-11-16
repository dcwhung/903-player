import type { ReactNode } from 'react';
import { t } from '../../../../i18n/t';
import type { ItemInfoSection } from '../../../../selectors/itemInfo';
import { InfoChips } from './InfoChips';
import styles from './ItemInfoSheet.module.css';

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className={styles.field}>
        <p className={styles.label}>{label}</p>
        {children}
    </div>
);

/** 資料 sheet 一段嘅欄位：播放時間 → 主持 → 聲演 → 簡介；冇嘅唔出 */
export const ItemInfoFields = ({ section }: { section: ItemInfoSection }) => (
    <>
        {section.airTime && (
            <Field label={t('info.airTime')}>
                <p className={styles.text}>{section.airTime}</p>
            </Field>
        )}
        {section.hosts && (
            <InfoChips label={t('info.hosts')} names={section.hosts} layout="stacked" />
        )}
        {section.cast && <InfoChips label={t('info.cast')} names={section.cast} layout="stacked" />}
        {section.summary && (
            <Field label={t('info.summary')}>
                <p className={styles.text}>{section.summary}</p>
            </Field>
        )}
    </>
);

/*
 * 名稱與簡介卡嘅表格 + 預覽（WhatsApp 分享 / 主畫面）：Design Origin: mockup: _mockups_/admin-appearance/index.html#c
 * 短名 > 12 字元黃色提示；簡介顯示字數；App 名 / 簡介即時更新預覽
 */
import { t } from '../../i18n/t';
import { BRANDING_DESCRIPTION_MAX_LENGTH } from '@903-player/catalog';
import ogIcon from '../../assets/icon/og-icon.jpg';
import {
    SHORT_NAME_WARN_LENGTH,
    charCount,
    homeName,
    iconUrls,
    type TextDraft,
} from './brandingModel';
import type { BrandingIcon } from '../../api/types';

interface TextFieldsProps {
    draft: TextDraft;
    onChange: (field: keyof TextDraft, value: string) => void;
}

export function TextFields({ draft, onChange }: TextFieldsProps) {
    const shortLen = charCount(draft.shortName);
    const long = shortLen > SHORT_NAME_WARN_LENGTH;
    const descLen = charCount(draft.description);
    return (
        <div className="brand-form">
            <label htmlFor="brand-name">{t('appearance.text.name')}</label>
            <div className="ctl">
                <input
                    id="brand-name"
                    type="text"
                    value={draft.name}
                    onChange={(event) => onChange('name', event.target.value)}
                />
                <span className="hint">{t('appearance.text.nameHint')}</span>
            </div>
            <label htmlFor="brand-short">{t('appearance.text.shortName')}</label>
            <div className="ctl">
                <input
                    id="brand-short"
                    type="text"
                    value={draft.shortName}
                    onChange={(event) => onChange('shortName', event.target.value)}
                />
                <span className={`hint${long ? ' warn' : ''}`}>
                    {long
                        ? t('appearance.text.shortLong', { count: shortLen })
                        : t('appearance.text.shortHint')}
                </span>
            </div>
            <label htmlFor="brand-desc">{t('appearance.text.description')}</label>
            <div className="ctl">
                <textarea
                    id="brand-desc"
                    value={draft.description}
                    onChange={(event) => onChange('description', event.target.value)}
                />
                <span className="hint">
                    {t('appearance.text.descriptionHint', {
                        count: descLen,
                        max: BRANDING_DESCRIPTION_MAX_LENGTH,
                    })}
                </span>
            </div>
        </div>
    );
}

export function TextPreviews({ draft, icon }: { draft: TextDraft; icon: BrandingIcon | null }) {
    const urls = iconUrls(icon);
    const name = draft.name.trim();
    return (
        <div className="brand-previews">
            <div>
                <p className="state-label">{t('appearance.text.shareLabel')}</p>
                <div className="share">
                    <img src={icon ? urls.appleTouch : ogIcon} alt="" />
                    <div>
                        <b>{name || t('appearance.text.blank')}</b>
                        <span>{draft.description.trim()}</span>
                    </div>
                </div>
            </div>
            <div>
                <p className="state-label">{t('appearance.text.homeLabel')}</p>
                <div className="home">
                    <img src={urls.maskable} alt="" />
                    <span>{homeName(draft)}</span>
                </div>
            </div>
        </div>
    );
}

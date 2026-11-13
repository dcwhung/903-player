/*
 * App 外觀頁（品牌 → App 外觀）：卡次序 App 圖示 → 名稱與簡介 → 首頁 Banner（mockup ①）。
 * 三張卡各自讀 / 寫 branding，全部草稿，發佈先上線
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#a
 */
import { t } from '../../i18n/t';
import { BannerCard } from '../banner/BannerCard';
import { IconCard } from './IconCard';
import { TextCard } from './TextCard';

export function AppearancePage() {
    return (
        <>
            <div className="title-row">
                <h1>{t('appearance.title')}</h1>
            </div>
            <div className="appearance-stack">
                <IconCard />
                <TextCard />
                <BannerCard />
            </div>
        </>
    );
}

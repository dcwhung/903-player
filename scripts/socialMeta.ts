import type { HtmlTagDescriptor } from 'vite';

/**
 * 分享預覽圖：滿版 app icon（scripts/generateIcons.mjs 生成）。
 * WhatsApp 只顯示細正方縮圖，用闊圖 logo 會細到睇唔清
 */
export const OG_IMAGE_PATH = 'og-icon.jpg';
const OG_IMAGE_SIZE = 512;
const OG_IMAGE_ALT = '903 叱咤 Player';

/** build 環境變數：Vercel 嘅正式網域 / GitHub Actions 嘅 repo owner */
interface SiteEnv {
    VERCEL_PROJECT_PRODUCTION_URL?: string;
    GITHUB_REPOSITORY_OWNER?: string;
}

/**
 * og:image / og:url 一定要完整網址，但 Vercel 同 GitHub Pages 網域唔同，所以 build 時按環境揀。
 * 本機 build 估唔到網域，回傳 undefined，唔加呢兩個 tag
 */
export const resolveSiteUrl = (env: SiteEnv, basePath: string): string | undefined => {
    if (env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}${basePath}`;
    }
    if (env.GITHUB_REPOSITORY_OWNER) {
        return `https://${env.GITHUB_REPOSITORY_OWNER}.github.io${basePath}`;
    }
    return undefined;
};

const metaProperty = (property: string, content: string): HtmlTagDescriptor => ({
    tag: 'meta',
    attrs: { property, content },
    injectTo: 'head',
});

/** 要網域先寫到嘅 Open Graph tag（description 等固定內容直接寫喺 index.html） */
export const buildSocialTags = (siteUrl: string): HtmlTagDescriptor[] => [
    metaProperty('og:url', siteUrl),
    metaProperty('og:image', `${siteUrl}${OG_IMAGE_PATH}`),
    metaProperty('og:image:width', String(OG_IMAGE_SIZE)),
    metaProperty('og:image:height', String(OG_IMAGE_SIZE)),
    metaProperty('og:image:alt', OG_IMAGE_ALT),
];

/*
 * D1 branding（migration 0006）：branding_icon / branding_text 各自單行（id = 1），各自 updated_at；
 * 冇行 = 還原（catalog.json 冇嗰部分，player 用 repo 內建）
 */
import type { IconImageKey } from '@903-player/catalog';

/** 五個 R2 圖檔名 <hash>.png + maskable 底色 #rrggbb（細楷） */
export type BrandingIcon = Record<IconImageKey, string> & { maskableBackground: string };

/** 已 trim；shortName 冇 = 用 name */
export interface BrandingText {
    name: string;
    shortName?: string;
    description: string;
}

/** publish / changes 用嘅草稿 */
export interface BrandingDraft {
    icon: BrandingIcon | null;
    text: BrandingText | null;
}

export interface StoredBranding extends BrandingDraft {
    /** 兩部分最新嗰個 updated_at；兩個都冇 = null */
    updatedAt: string | null;
}

const ROW_ID = 1;

interface IconRow extends BrandingIcon {
    updatedAt: string;
}

interface TextRow {
    name: string;
    shortName: string | null;
    description: string;
    updatedAt: string;
}

const ICON_SELECT = `SELECT favicon, apple_touch AS appleTouch, icon_192 AS icon192, icon_512 AS icon512,
    maskable, maskable_background AS maskableBackground, updated_at AS updatedAt
    FROM branding_icon WHERE id = ?`;
const TEXT_SELECT = `SELECT name, short_name AS shortName, description, updated_at AS updatedAt
    FROM branding_text WHERE id = ?`;

const iconOf = (row: IconRow): BrandingIcon => ({
    favicon: row.favicon,
    appleTouch: row.appleTouch,
    icon192: row.icon192,
    icon512: row.icon512,
    maskable: row.maskable,
    maskableBackground: row.maskableBackground,
});

const textOf = ({ name, shortName, description }: TextRow): BrandingText =>
    shortName === null ? { name, description } : { name, shortName, description };

const latest = (...times: (string | undefined)[]): string | null =>
    times
        .filter((time): time is string => time !== undefined)
        .sort()
        .at(-1) ?? null;

export const getBranding = async (db: D1Database): Promise<StoredBranding> => {
    const [icon, text] = await Promise.all([
        db.prepare(ICON_SELECT).bind(ROW_ID).first<IconRow>(),
        db.prepare(TEXT_SELECT).bind(ROW_ID).first<TextRow>(),
    ]);
    return {
        icon: icon && iconOf(icon),
        text: text && textOf(text),
        updatedAt: latest(icon?.updatedAt, text?.updatedAt),
    };
};

export const saveIcon = async (db: D1Database, icon: BrandingIcon, updatedAt: string) => {
    await db
        .prepare(
            `INSERT INTO branding_icon (id, favicon, apple_touch, icon_192, icon_512, maskable,
                 maskable_background, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET favicon = excluded.favicon,
                 apple_touch = excluded.apple_touch, icon_192 = excluded.icon_192,
                 icon_512 = excluded.icon_512, maskable = excluded.maskable,
                 maskable_background = excluded.maskable_background, updated_at = excluded.updated_at`,
        )
        .bind(
            ROW_ID,
            icon.favicon,
            icon.appleTouch,
            icon.icon192,
            icon.icon512,
            icon.maskable,
            icon.maskableBackground,
            updatedAt,
        )
        .run();
};

export const saveText = async (db: D1Database, text: BrandingText, updatedAt: string) => {
    await db
        .prepare(
            `INSERT INTO branding_text (id, name, short_name, description, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET name = excluded.name, short_name = excluded.short_name,
                 description = excluded.description, updated_at = excluded.updated_at`,
        )
        .bind(ROW_ID, text.name, text.shortName ?? null, text.description, updatedAt)
        .run();
};

export const deleteIcon = async (db: D1Database) => {
    await db.prepare('DELETE FROM branding_icon WHERE id = ?').bind(ROW_ID).run();
};

export const deleteText = async (db: D1Database) => {
    await db.prepare('DELETE FROM branding_text WHERE id = ?').bind(ROW_ID).run();
};

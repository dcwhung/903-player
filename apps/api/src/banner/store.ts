/* D1 banner（migration 0005）：單行（id = 1）；冇行 = 還原預設（catalog.json 冇 banner） */

/** 兩張都係 R2 圖檔名 <hash>.webp（同 entries.images 嘅值一樣） */
export interface BannerImages {
    standard: string;
    long: string;
}

export interface StoredBanner extends BannerImages {
    updatedAt: string;
}

const BANNER_ROW_ID = 1;

export const getBanner = async (db: D1Database): Promise<StoredBanner | null> =>
    db
        .prepare('SELECT standard, long, updated_at AS updatedAt FROM banner WHERE id = ?')
        .bind(BANNER_ROW_ID)
        .first<StoredBanner>();

export const saveBanner = async (
    db: D1Database,
    { standard, long }: BannerImages,
    updatedAt: string,
): Promise<void> => {
    await db
        .prepare(
            `INSERT INTO banner (id, standard, long, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET
                 standard = excluded.standard, long = excluded.long, updated_at = excluded.updated_at`,
        )
        .bind(BANNER_ROW_ID, standard, long, updatedAt)
        .run();
};

export const deleteBanner = async (db: D1Database): Promise<void> => {
    await db.prepare('DELETE FROM banner WHERE id = ?').bind(BANNER_ROW_ID).run();
};

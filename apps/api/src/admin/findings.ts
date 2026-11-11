/* scan_findings（migration 0004）讀寫：掃描發現 → admin 待辦矩陣；發佈成功就標 resolved */

export type FindingKind = 'newDrama' | 'newArc' | 'newEpisodes' | 'missingFolder';

export interface NewFinding {
    kind: FindingKind;
    dramaId: string;
    arcId?: string | undefined;
    detail: Record<string, unknown>;
}

export interface FindingRow {
    id: number;
    kind: FindingKind;
    drama_id: string;
    arc_id: string | null;
    detail: string;
    created_at: string;
    resolved_publish_id: number | null;
}

/** API 回應用嘅 camelCase */
export const findingView = (row: FindingRow) => ({
    id: row.id,
    kind: row.kind,
    dramaId: row.drama_id,
    arcId: row.arc_id,
    detail: JSON.parse(row.detail) as Record<string, unknown>,
    createdAt: row.created_at,
});

export type FindingView = ReturnType<typeof findingView>;

/**
 * 寫 finding：同一個 batch 入面緊接 entry 寫入之後；guard = entry 寫入後應有嘅 updated_at，
 * 寫唔到（樂觀鎖輸咗）就唔記 finding。
 * 已經有一模一樣（kind、劇、短篇、detail）嘅 open finding 就唔再寫（S-802）：兩個 scan 喺同一 ms
 * 計到同一個 guard 時，輸咗嗰個都過到 guard。D1 batch 逐個 transaction 行，後嚟嗰個一定睇到前一個。
 * 唔用 unique index：production 可能已經有重複行，加 index 嘅 migration 會失敗
 */
export const insertFindingStatement = (
    db: D1Database,
    finding: NewFinding,
    { createdAt, guard }: { createdAt: string; guard?: string },
) =>
    db
        .prepare(
            `INSERT INTO scan_findings (kind, drama_id, arc_id, detail, created_at)
             SELECT ?1, ?2, ?3, ?4, ?5
             WHERE (?6 IS NULL OR EXISTS
                 (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ?2 AND updated_at = ?6))
               AND NOT EXISTS
                 (SELECT 1 FROM scan_findings WHERE kind = ?1 AND drama_id = ?2 AND arc_id IS ?3
                    AND detail = ?4 AND resolved_publish_id IS NULL)
             RETURNING *`,
        )
        .bind(
            finding.kind,
            finding.dramaId,
            finding.arcId ?? null,
            JSON.stringify(finding.detail),
            createdAt,
            guard ?? null,
        );

export const openFindings = async (db: D1Database): Promise<FindingRow[]> =>
    (
        await db
            .prepare('SELECT * FROM scan_findings WHERE resolved_publish_id IS NULL ORDER BY id')
            .all<FindingRow>()
    ).results;

/**
 * 發佈成功：搞掂咗（待辦行冇「必須」）嘅新劇 / 新短篇 / 新集數 finding 標 resolved；
 * draft 劇（publish 唔包）同「資料夾唔見」唔郁
 */
export const resolveFindings = async (
    db: D1Database,
    publishId: number,
    ids: readonly number[],
): Promise<void> => {
    if (ids.length === 0) return;
    await db.batch(
        ids.map((id) =>
            db
                .prepare(
                    `UPDATE scan_findings SET resolved_publish_id = ?
                     WHERE id = ? AND resolved_publish_id IS NULL AND kind != 'missingFolder'
                       AND drama_id IN (SELECT id FROM entries WHERE kind = 'dramas' AND draft = 0)`,
                )
                .bind(publishId, id),
        ),
    );
};

/** 資料夾配對咗：嗰套劇嘅「資料夾唔見」finding 刪走（entry 真係寫咗先刪） */
export const deleteMissingFolderStatement = (db: D1Database, dramaId: string, updatedAt: string) =>
    db
        .prepare(
            `DELETE FROM scan_findings WHERE kind = 'missingFolder' AND drama_id = ? AND EXISTS
             (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ? AND updated_at = ?)`,
        )
        .bind(dramaId, dramaId, updatedAt);

/** 改 ID：finding 跟住改（同 entries 一個 batch；entry 真係改咗先郁） */
export const renameFindingsStatement = (
    db: D1Database,
    from: string,
    to: string,
    updatedAt: string,
) =>
    db
        .prepare(
            `UPDATE scan_findings SET drama_id = ? WHERE drama_id = ? AND EXISTS
             (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ? AND updated_at = ?)`,
        )
        .bind(to, from, to, updatedAt);

-- Backend Phase 2b-1：短篇排程規則（admin 改 → PUT /api/dramas/:id/arcs/:arcId/schedule）
--   rule：ScheduleRule JSON（packages/catalog/src/schedule/rule.ts）
--   儲存時已經展開寫入 entries.definition 嗰個 arc 嘅 addedAt / episodeDates / episodeRemovedAt；
--   呢度只係記低規則（admin 再改時用），刪咗規則 definition 入面嘅日子照留
CREATE TABLE schedules (
    drama_id TEXT NOT NULL,
    arc_id TEXT NOT NULL,
    rule TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (drama_id, arc_id)
);

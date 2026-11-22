// Admin e2e 假 API：確認發佈頁版本守衛（AU-021，同 apps/api catalog/fingerprint.ts 嘅簡化版）——
// GET /api/changes 回 fingerprint（最新 publish + 而家會發佈嘅摘要 + 每個 entry 嘅版本），
// POST /api/publish 帶返佢；對唔上（中間有人儲存咗）→ 412、乜都唔寫

/** fingerprint 係 opaque 字串：真 API 用 sha256，呢度淨係要「內容一變就唔同」 */
export const fingerprintOf = (state, body) =>
    JSON.stringify([
        state.publishes.length,
        body.changes.items,
        body.bannerChanged,
        body.brandingChanged,
        state.entries.map((entry) => [entry.kind, entry.id, entry.updatedAt]),
    ]);

/** 有帶 fingerprint 而同而家唔同 = 過時（冇帶 = 舊行為，唔檢查） */
export const isStaleFingerprint = (state, body, sent) =>
    sent !== undefined && sent !== fingerprintOf(state, body);

/** 第二個 admin / tab 儲存咗一個已上架節目（e2e check 用）：版本變，fingerprint 跟住變 */
export const saveElsewhere = (state, kind, id) => {
    const entry = state.entries.find((e) => e.kind === kind && e.id === id);
    entry.updatedAt = `${entry.updatedAt}-elsewhere`;
};

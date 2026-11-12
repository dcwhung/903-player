-- Phase 4：首頁 banner（document 式，同 entries 一樣：PUT 存 D1，POST /api/publish 先寫入 catalog.json）
--   只會有一行（id = 1）；冇行 =「還原預設」（catalog.json 冇 banner，player 用內建圖）
--   standard / long：R2 圖檔名 <sha256 前 16 hex>.webp（catalog/v1/img/ 底下，同 entries.images 嘅值一樣）
CREATE TABLE banner (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    standard TEXT NOT NULL,
    long TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

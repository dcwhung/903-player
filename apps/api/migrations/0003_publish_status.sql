-- Backend Phase 2b-2（S-786）：publish 寫 R2 失敗、連刪返嗰行都失敗時，嗰行標 'failed'
--   unchanged 比較、episode ID 守衛、「而家 publish 緊」都只睇最新一行 status = 'ok'
--   舊行全部係成功寫咗 R2 嘅（S-767 失敗路徑會刪行），所以預設 'ok'
ALTER TABLE publishes ADD COLUMN status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failed'));

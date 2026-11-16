-- App 圖示原圖 + 裁切框（icon recrop，用戶 2026-11-16 決定：存原圖 + 裁切框，重新裁切唔會越裁越差）
--   source_image：R2 原圖檔名 <sha256 前 16 hex>.<png|jpg|webp>（PUT /api/assets/source 上載，或者舊圖示嘅 icon512）
--   source_crop：JSON { same, boxes: { ios, android, tab } }（每個 box = 原圖像素 { x, y, width, height }）
--   兩個都 NULL = 冇原圖（呢個功能之前上載嘅圖示）；只係 admin 草稿資料，唔寫入 catalog.json
ALTER TABLE branding_icon ADD COLUMN source_image TEXT;
ALTER TABLE branding_icon ADD COLUMN source_crop TEXT;

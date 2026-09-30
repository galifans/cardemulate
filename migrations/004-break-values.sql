-- =====================================================================
--  v3 -> v4：breaks 补上开盒的购入与售出口径
-- =====================================================================
--  只能执行一次。重复执行会报 duplicate column name，忽略即可。
--  新建库不需要本文件，schema.sql 已经带上这两列。
--
--  为什么要存结果而不是存价格表引用：
--    价格表会随市场调整，历史记录一旦跟着变，「我的统计」里的累计盈亏
--    就会每次刷新都不一样。存结果之后，历史是历史。
-- =====================================================================

ALTER TABLE breaks ADD COLUMN cost_rmb  REAL NOT NULL DEFAULT 0;
ALTER TABLE breaks ADD COLUMN value_rmb REAL NOT NULL DEFAULT 0;

UPDATE meta
   SET value = '4', updated_at = datetime('now')
 WHERE key = 'schema_version';

# 增量迁移

`schema.sql` 是**全量结构**，新建库跑它一个就够。库里已经有数据、不能重建时，
才来这里找增量脚本。

规则：

- 文件名 `<版本号>-<说明>.sql`，版本号与 `schema.sql` 里的 `schema_version` 对齐。
- 每个脚本**只能执行一次**，脚本里不写 `IF NOT EXISTS`（SQLite 的 `ALTER TABLE`
  不支持它）。重复执行会报「duplicate column name」，看到这个报错说明已经执行过了，
  忽略即可。
- 执行完新库的 `schema.sql` 必须同步更新，让新建库和迁移后的库结构完全一致。
- 改完结构记得在 `PROGRESS.md` 里记一笔，并写清线上库要执行哪条命令。

## 004-break-values.sql

`breaks` 表补两列：`cost_rmb`（这一次开盒花了多少）与 `value_rmb`（开出来值多少），
单位都是 RMB。老记录两列取默认值 0，前端显示成「—」。

本地库直接重建即可（会清空本地数据）：

```bash
npm run db:local
```

线上库执行一次：

```bash
npx wrangler d1 execute cardemulate --remote --file=migrations/004-break-values.sql
```

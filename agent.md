# Agent 行为约束（agent.md）

> 本文件约束 AI 编程助手（如 GitHub Copilot / Cursor 等 Agent）在本仓库中的行为规范。
> 目的是让 Agent 的输出与站点风格、架构、流程保持一致，避免破坏性改动。

---

## 1. 工作前必读

- **先读 `README.md`**：了解站点定位、技术栈、目录结构、扩展约定与部署步骤。
- **再读 `PROGRESS.md`**：了解项目进展、已完成的改动与踩坑记录，避免重复劳动或破坏已有成果。
- 涉及「品类 / 发行商 / 系列 / 盒型」的展示逻辑时，再读 `src/catalog/index.ts`（派生逻辑）与
  `src/catalog/taxonomy.ts`（预置种子）。
- 涉及拆包概率计算时，先读 `src/engine/rip.ts` 顶部的注释（模型说明），
  再读目标盒型目录下的 `box.ts`（配率定义）。
- 涉及账号、统计、目录同步接口时，先读 `functions/api/[[path]].js` 顶部的路由注释。

## 2. 语言与风格

- 与用户交流**使用简体中文**；代码、标识符、commit message 用英文。
- 站内所有用户可见文案一律**简体中文**（页面标题、按钮、提示、空状态）。
- 代码风格：TypeScript + 4 空格缩进；Vue 组件用 `<script setup lang="ts">`。
- 注释用中文，只解释「为什么」和取舍，不复述代码本身。
- **全站禁止出现 emoji**（含代码注释、commit message、文档）。

## 3. 品牌约束（不可破坏）

- 站点名恒为 **CardEmulate**，归属 **WikiAndroid** 的娱乐功能。
- 品牌色：Android 绿渐变 `#3DDC84 → #0B7A3B`（`src/styles/main.css` 的 `:root` 变量）。
- 版权署名：`Copyright © 2026 WikiAndroid`（如用户未明确要求，不得更改）。
- 页脚免责声明必须保留：不涉及真实交易、与各发行商无关联、卡面为占位图。
- **严禁**把本站描述为可交易、可兑换、可抽奖的平台。

## 4. 架构约束（核心）

本站为「多站点 / 多品类 / 多发行商 / 多盒型」预留了扩展能力，改动时必须顺着这套结构走：

- **目录层 `src/catalog/`**：唯一真相是 TypeScript 定义，运行时**不查数据库**即可渲染页面。
  - `apps.ts` 站点注册表（多站点用 `app_key` 隔离）
  - `registry.ts` 盒型注册表（`registerBox` / `boxByKey` / `boxesWhere`）
  - `define.ts` 命名规则 + `validateBox()` + `defineBox()`
  - `taxonomy.ts` 品类 / 发行商 / 系列的预置种子（未上线的占位条目）
  - `index.ts` 由注册表 + 种子派生出 `CATEGORIES / MAKERS / findProducts`
  - `db.ts` 目录 → D1 镜像负载
- **视图只读派生结果**：`HomeView` / `CategoryView` / `MakerView` / `ProductView` /
  `BreakView` / `StatsView` 一律 `import { ... } from "../catalog"`，
  **禁止**在视图里硬编码品类、发行商、盒型列表。
- **引擎与卡盒解耦**：`src/engine/` 不认识任何具体卡盒；盒型数据只出现在
  `src/data/sets/` 下。新增盒型不需要改 `engine/`。
- **命名规则**：每个盒型的 key 由四段拼成，这个 key 同时就是数据库的 `box_key`：

  ```
  <category>.<maker>.<productKey>.<slug>
  ```

  例如 `basketball.topps.tcu26-basketball.value-box`。
  四段合法字符均为 `[a-z0-9-]`，不允许大写、空格、下划线。
- **新增盒型**：在 `src/data/sets/<品类>/<发行商>/<系列>/` 建 `roster.ts` + `box.ts` +
  `index.ts`，用 `defineBox({...})` 产出定义，最后在 `src/data/sets/index.ts` 的
  `registerBoxes([...])` 中追加。品类页的盒数、「已上线」标记、面包屑会自动更新。
- **新增品类**：在 `taxonomy.ts` 的 `CATEGORY_SEED` 追加，并在
  `src/components/CategoryIcon.vue` 补一个 inline SVG。没有已上线盒型时，
  首页与品类页会自动显示「待上线，敬请期待！」，**不要**写死灰化文案。
- 结构性变更完成后，同步更新 `README.md` 的「目录结构」与「扩展约定」两节。

## 5. 概率模型约束

- 配率必须来自发行商**公开的 Pack Odds 表**，不得凭空估算；来源变化时在 `box.ts`
  头部注释里说明。
- 抽样模型：`weight = 1/odds`；`premiumWeight = Σ(1/odds)`；
  `baseWeight = max(0.5, cardsPerPack − premiumWeight)`；每包按槽位做加权抽样。
  **不要**改成「先掷概率再补足张数」，会破坏每包张数恒定。
- 随机数必须确定性可复现：`fnv1a(seed)` → `mulberry32`，
  种子文本固定为 `` `${box.key}|${seed}` ``。改动此处会让历史种子失效。
- `defineBox()` 在开发环境校验失败会直接抛错（配率、编号、子集引用、卡号重复都会被拦），
  **不要**为了让数据通过而放宽 `validateBox()` 的规则，应修数据。

## 6. 数据库约束

- Cloudflare D1，绑定变量名**必须**是 `DB`，不可改名。
- 表结构变更必须同时更新 `schema.sql`（全为 `CREATE TABLE IF NOT EXISTS` /
  `CREATE INDEX IF NOT EXISTS`，可重复执行）与 `meta.schema_version`。
- 所有表都带 `app_key` 列用于多站点隔离，新增表必须带上。
- 维度表（`categories/makers/products/boxes/subsets/variants`）是 TS 目录的镜像；
  事实表（`breaks/pull_stats`）冗余 `category_key / maker_key / product_key`，
  以便任意维度切片统计。新增维度时同步补冗余列。
- `box_key` / `variant_key` 是**软引用**（不加外键），允许数据先于目录同步落地。
- 写批量 upsert 时用 `INSERT ... ON CONFLICT (...) DO UPDATE SET col = excluded.col`，
  **严禁** `INSERT OR REPLACE`——它是先删后插，会触发子表的 `ON DELETE CASCADE`。
- 前端渲染永远不依赖数据库；数据库不可用时自动降级为「本机统计」。

## 7. 质量与验证（每次修改必做）

```bash
npm run typecheck   # vue-tsc --noEmit，必须零错误
npm run build       # 必须 Success，且 dist/_routes.json 存在
```

- 改动概率模型或盒型数据后，必须在浏览器里实际拆几盒核对：张数恒定（`cardsPerPack × packsPerBox`）、
  配率表数字与 `box.ts` 一致、同一种子可复现同一盒。
- 改动后端后，用 `npm run dev:cf` 起本地全栈（wrangler + 本地 D1）做接口冒烟。
- 终端 PATH 偶发丢失时（PowerShell 5.1），先执行：
  `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
- PowerShell 5.1 用 `;` 串联命令，不要用 `&&`；输出中文前先 `chcp 65001`。
- 含 `[` `]` 的路径（如 `functions/api/[[path]].js`）必须用 `-LiteralPath`。

## 8. Git 与发布

- commit message 格式：`type(scope): 描述`，如 `feat(basketball): 新增 Mega Box 配率`、
  `fix(engine): 修正最优卡比较`。type ∈ `feat / fix / docs / chore / refactor / perf / test`。
- 推送 `origin main` 即触发 **Cloudflare Pages 自动构建部署**（仓库根目录即站点，
  构建命令 `npm run build`，输出目录 `dist`），无需其他发布步骤。
- 首次推送需要完成 GitHub 设备码授权（Git Credential Manager 会打开浏览器）。
- 严禁提交任何密钥、token、敏感配置；`CE_SYNC_TOKEN` 只放 Cloudflare Pages 环境变量。
- 不提交 `node_modules/`、`dist/`、`.wrangler/`、`.dev.vars`。

## 9. 技术栈约束（勿随意升级）

- 保持现有大版本，**不要**引入新框架：
  - Vue 3.5 / Vite 6 / TypeScript 5.7 / Vue Router 4
  - **不引入 Pinia**，状态用 `src/stores/app.ts` 的手写 reactive 单例
  - **不引入 UI 组件库**，样式统一写在 `src/styles/main.css` + 组件 scoped 样式
- 不新增运行时依赖前先确认能否用现有工具实现；新增依赖需在 `PROGRESS.md` 记录理由。
- 别名 `@` 指向 `src`（`vite.config.ts` 与 `tsconfig.json` 各配一份，改一处要同步另一处）。

## 10. 文档同步（强制）

- **任何改动完成后必须更新 `PROGRESS.md`**（进展时间线 + 待办），格式见该文件顶部说明。
- 新增品类 / 发行商 / 盒型后，同步更新 `README.md` 的「扩展约定」示例。
- 本文档（`agent.md`）若因架构调整需要修改，改动前先向用户说明原因。

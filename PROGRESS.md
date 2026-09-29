# CardEmulate 项目进展（PROGRESS.md）

> **本文档是项目进展与记忆的「权威记录」（Single Source of Truth）。**
> 所有对本站的改动（新增品类、新增盒型、修复、部署）完成后，
> **必须同步更新本文档**，确保任何时间打开仓库都能快速恢复上下文。
> 由 `agent.md` 第 11 节约束强制同步。

---

## 1. 项目概览

| 项目 | 值 |
| --- | --- |
| 站点名称 | CardEmulate |
| 域名 | https://cardemulate.wikiandroid.com（备用：https://cardemulate.pages.dev） |
| 仓库 | https://github.com/galifans/cardemulate（分支 main） |
| 归属 | WikiAndroid 的娱乐功能，独立仓库维护 |
| 部署方式 | Cloudflare Pages：`git push main` 自动触发构建部署（约 1.5～2 分钟） |
| 构建命令 | `npm run build` → 输出 `dist` |
| 本地预览 | `npm run dev`（仅前端，端口 5174）/ `npm run dev:cf`（全栈 + 本地 D1） |
| 数据库 | Cloudflare D1，库名 `cardemulate`，绑定变量名 `DB` |
| 当前状态 | 骨架完成（篮球 1 个盒型），前后端已在本地 D1 上全链路跑通；待部署上线与内容扩展 |

## 2. 站点定位

按发行商公开的 **Pack Odds 表**逐包还原真实卡盒的配率结构，让用户「按盒拆卡」，
看看这一盒里到底有什么。首页按卡品分类（篮球 / 棒球 / 足球 / 橄榄球 / 网球 / UFC / 宝可梦），
逐层进入「品类 → 发行商 → 系列 → 盒型」。

**红线**：只还原概率结构，不涉及任何真实交易；卡面统一使用占位图并按稀有度做色彩区分；
与 Topps、Panini、Fanatics、The Pokémon Company 等发行商无任何关联。

## 3. 架构速览

```
src/catalog/     目录层（唯一真相，运行时渲染不查库）
src/data/sets/   盒型数据（按 品类/发行商/系列 分目录）
src/engine/      拆包引擎（与具体卡盒完全解耦）
src/api/         后端接口封装（含降级）
src/stores/      用户会话 + 本地历史 + 服务端统计
functions/api/   Pages Functions（鉴权 / 统计 / 目录同步）
schema.sql       D1 建表脚本（维度表 + 事实表分离）
```

**盒型 key 命名规则**（同时就是数据库的 `box_key`）：

```
<category>.<maker>.<productKey>.<slug>
例：basketball.topps.tcu26-basketball.value-box
```

详见 `agent.md` 第 4 节与 `README.md` 的「扩展约定」。

## 4. 进展时间线

### 2026-09-29（项目立项：从 WikiAndroid 主站仓库独立，骨架与篮球站完成）

- ✓ 用户需求演变：最初只需「2025-26 Topps Chrome Updates Basketball Value Box 的
  checklist 与单卡概率」→ 演变为「仿照 Topps 官网电子拆卡做拆卡模拟器」→
  演变为「要考虑后续多品类、多发行商、多盒型扩展，目录与数据库都要提前设计」→
  最终「独立成仓库 `galifans/cardemulate`，主站仓库保持原样，域名不变」
- ✓ **Phase A 数据调研**：Topps 官方 PDF → `pypdf` 提取 → 整理出
  checklist、子集清单、Pack Odds 表（中间产物在 `$env:TEMP\tcu\{edu,cl,odds}.txt`）
- ✓ **Phase B 站点骨架**：Vue 3.5 + Vite 6 + TS 5.7 + Vue Router 4（**无 Pinia、无 UI 库**）
  - 引擎：`rng.ts`（`fnv1a` + `mulberry32`，种子可复现）、`rip.ts`（加权抽样 /
    期望值 / 单卡概率 / 最优卡）、`tiers.ts`（6 档稀有度 + 配色）、`types.ts`
  - 页面：`HomeView`（品类宫格）/ `CategoryView` / `MakerView` / `ProductView` /
    `BreakView`（拆盒模拟 + 配率表 + Checklist 三标签）/ `StatsView` / `AuthView` /
    `NotFoundView`
  - 组件：`CardFace.vue`（同一张 `card-art.svg` 用 CSS `filter` 按稀有度变色，
    绕开无实物卡图的问题）、`CategoryIcon.vue`（inline SVG）
  - 状态：`stores/app.ts` 手写 reactive 单例；未登录 / 后端不可用时自动降级为
    localStorage 本机统计，站点永不白屏
- ✓ **Phase C 扩展性重构**（关键决策）
  - 新增 `src/catalog/` 目录层：`types / apps / registry / define / taxonomy / index / db`
  - 命名规则落地：`box.key = <category>.<maker>.<productKey>.<slug>`，与数据库 `box_key` 同一套
  - `defineBox()` 自带 `validateBox()`：校验 slug 格式、key 命名规则、配率合理性、
    编号合理性、子集引用、卡号重复、`premiumWeight ≤ cardsPerPack`；**开发环境校验失败直接抛错**
  - 视图全部改为从 `../catalog` 读派生结果（`CATEGORIES / MAKERS / findProducts`），
    新增盒型不需要改任何视图代码
  - 删除旧的 `src/data/boxes.ts` 与 `src/data/catalog.ts`（被 catalog 层取代）
- ✓ **数据库 schema v2**：维度表（`apps/categories/makers/products/boxes/subsets/variants`）
  与事实表（`breaks/pull_stats`）分离，全部表带 `app_key` 便于多站点共用同一数据库；
  事实表冗余 `category_key / maker_key / product_key` 以支持任意维度切片；
  `box_key / variant_key` 为软引用（无外键），数据可先于目录同步落地
- ✓ **Pages Functions 重写**：PBKDF2-SHA256（150,000 次迭代）密码哈希、
  会话 token SHA-256 后入库（Cookie `ce_session`，HttpOnly + Secure + SameSite=Lax，30 天）、
  拆盒记录与按盒统计、排行榜、全站统计、目录镜像同步（`x-sync-token`）；
  查询统一走 `compileFilters()`，批量写统一走 `buildUpserts()` + `runBatches()`
- ✓ **独立仓库**：代码迁至 `d:\CodeStuff\cardemulate`，从
  `galifans_vibe_coding\cardemulate` 删除（该目录在 WikiAndroid 仓库中本就是未跟踪状态，
  删除后主站仓库 `git status` 干净，未改动主站任何已有文件）
- ✓ 校验：`npm run typecheck` 零错误；`npm run build` 成功；
  浏览器实测首页 → 篮球 → Topps → 系列 → 按盒拆开，28 张卡正确开出，本机统计已记录

### 2026-09-29（注册收敛 + 后端全链路实测通过）

- ✓ **注册方式收敛为「邮箱 + 密码」**（用户明确要求，不要其他注册方式）
  - 后端：`MIN_PASSWORD_LENGTH = 6`、`MAX_PASSWORD_LENGTH = 200`；
    移除昵称采集，展示名由服务端从邮箱前缀派生
  - 前端：`AuthView.vue` 删除昵称输入框，`MIN_PASSWORD = 6` 与后端对齐；
    去掉 `minlength` 原生属性（会弹出浏览器原生提示，盖掉中文错误文案）
  - 登录失败文案不区分「邮箱不存在」与「密码错误」，避免账号枚举
- ✓ **本地 D1 实测**：新增 `wrangler.toml`（绑定变量名 `DB`）；
  `npx wrangler d1 execute DB --local --file=schema.sql` 建出 11 张表，
  `meta.schema_version = 2`
- ✓ **全链路接口冒烟**（`wrangler pages dev dist --port 8788` + 本地 D1）：
  注册（5 位密码被拒 / 6 位通过）→ 登录 → `/api/me` → `/api/break` 记录拆盒 →
  `/api/stats` → `/api/leaderboard` → `/api/global` → 退出登录后 `/api/me` 返回 null
- ✓ **修复：卡种维度丢失**（真 bug，非环境问题）
  - 现象：`/api/stats` 的 `byTier` 恒为空，`bySubset` 返回的其实是卡种 key
  - 根因：后端用 `variantKey.split(":")` 从 key 里拆子集与稀有度，
    而前端发的 key 里根本没有冒号
  - 修复：`byVariant` 的每项改为 `{ count, subsetKey, tier }`，后端直接入库；
    同时把 `subset_key / tier` 加进 `ON CONFLICT DO UPDATE` 的更新列
  - 验证：`byTier = [common 25, rare 3]`、`bySubset = [base 25, clutch-city 3]`，均正确
- ✓ **排查经验**：`ce_session` Cookie 里是**原始 token**，数据库 `sessions` 存的是它的
  SHA-256。早期手工测试把哈希当 Cookie 发出去，导致 `/api/me` 一直返回 `user: null`，
  一度误判为鉴权 bug。**结论：应用代码一直是对的，是测试姿势错了。**
  另：Cookie 带 `Secure`，本地 HTTP 下 HTTP 客户端不会自动回传，必须手动带 Cookie 头。

### 关键取舍记录

- **不用 Pinia**：只有一个全局 store，手写 reactive 单例省一个依赖。
- **卡面用占位图 + CSS filter**：实物卡图缺失且涉及版权，按稀有度做色彩区分即可，
  后续补图只需替换 `public/card-art.svg` 与 `CardFace.vue` 的取图逻辑。
- **本地优先（local-first）**：未登录或后端不可用时全部走 localStorage，
  服务器只做跨设备统计与排行榜，站点可用性不依赖 D1。
- **目录真相在 TS 而非数据库**：页面渲染永远不查库，D1 里的维度表只是镜像，
  用于跨维度对账与后续后台分析。
- **目录同步手动触发**：不做构建时自动同步，避免部署流程耦合数据库写权限。

## 5. 待办（TODO）

### P0 上线前必须完成
- [ ] 在 Cloudflare 创建 Pages 项目并关联 `galifans/cardemulate`，绑定自定义域名
      `cardemulate.wikiandroid.com`
- [ ] 创建 D1 数据库 `cardemulate`（把真实 `database_id` 回填到 `wrangler.toml`），
      并执行 `schema.sql`（本地已实测通过，线上待执行）
- [x] 本地全栈冒烟：注册 → 登录 → 拆盒 → `/api/stats` 与 `/api/global` 数据正确
- [ ] 线上冒烟（部署完成后重跑一遍本地那套 `/api/*` 验证）
- [ ] 首次 `git push -u origin main`（需在浏览器完成 GitHub 设备码授权）

### P1 内容扩展
- [ ] 篮球：补齐 `tcu26-basketball` 的 Hobby Box / Jumbo Box / Mega Box 配率
- [ ] 品类：棒球、足球、橄榄球、网球、UFC、宝可梦的种子数据与首批盒型
- [ ] 卡面：替换统一占位图为按品类区分的背景图（仍不涉及实物卡）

### P2 功能增强
- [ ] 目录同步脚本 `scripts/sync-catalog.mjs`（用 `buildCatalogPayload()` 生成并推送）
- [ ] 把 `scripts/smoke-api.mjs` 改造成正式回归脚本（目前是临时冒烟脚本）
- [ ] 排行版 / 全站统计的前端筛选联动（接口已支持 `?category=&maker=&box=`）
- [ ] 拆盒历史分享（种子可复现，适合做成分享链接）
- [ ] 拆盒动画与音效（目前是逐张揭开）

## 6. 已知问题

- 无实物卡图，所有卡面共用一张占位图（按稀有度变色），属**预期行为**。
- 本地 `npm run dev` 下 `/api/*` 必然失败（无 Functions 运行时），
  控制台会出现一条连接失败的告警，属**预期行为**；要联调后端请用 `npm run dev:cf`。
- `wrangler.toml` 的 `database_id` 仍是 `local-dev-placeholder`，
  仅够本地 `--local` 开发使用；Cloudflare Pages **不读**该文件，
  D1 绑定必须在 Dashboard（或 `wrangler pages` 命令）里单独配置。
- `esbuild` 的 postinstall 脚本被 npm 的 allow-scripts 策略拦截，会出现一条 warning；
  不影响构建（Vite 6 用 Rollup 打包，esbuild 仅用于依赖预构建）。

## 7. 环境备忘（本机）

- OS：Windows；shell：PowerShell 5.1（用 `;` 串联；中文输出前先 `chcp 65001`）
- Node.js v24.19.0 / npm；若终端找不到 `npm` 先刷新 PATH：
  `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
- 含 `[` `]` 的路径（`functions/api/[[path]].js`）必须用 `-LiteralPath`
- git 身份：`galifans <55650639+galifans@users.noreply.github.com>`
- 首次 push 需要完成 GitHub 设备码授权（Git Credential Manager 打开浏览器）

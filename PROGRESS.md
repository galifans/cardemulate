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
| 官方资料归档 | `sources/<品类>/<发行商>/<系列产品>/`（登记册见 `sources/README.md`） |
| 价格来源登记 | `sources/prices/README.md`（实测可达矩阵 + 定价方法与复核命令） |
| 名册核对 | `npm run roster:check`：把 `roster.ts` 逐行对回归档的官方 Checklist |
| 盒型行为快照 | `snapshots/boxes.json`；`npm run boxes:snapshot` 写 / `npm run boxes:check` 比 |
| 价格表核对 | `npm run prices:check`：盒价覆盖率 + 分级表拼写 + 回本率区间三段校验 |
| 数据库迁移 | `migrations/NNN-*.sql`（约定见 `migrations/README.md`，改完要同步 `schema.sql`） |
| 历史金额回填 | `npm run db:backfill`（本地）/ `npm run db:backfill -- --remote`（线上） |
| 数据库 | Cloudflare D1，库名 `cardemulate`，绑定变量名 `DB`，
`database_id = 51265817-c1ed-4e09-98fd-a3d1709fb0c3`（区域 WNAM） |
| 云端账号 | Cloudflare `2092878237@qq.com`，Account ID `88a2dc4c1e2c8652fd444ea1a65dec76` |
| 当前状态 | 已上线：Pages + 线上 D1 全链路验证通过，自定义域名 `cardemulate.wikiandroid.com` 已 active；已上线拆盒金额（盒价 + 卡面估值 + 统计收益）；待内容扩展。**注意：线上 D1 还没跑 `migrations/004-break-values.sql`，不跑的话新开的盒写不进金额列** |
| 价格口径 | 盒价 = 发行商官方发售价（原价卡盒，`basis` 标出口径）；卡价 = 规则推导价；两者都不是成交价，`PRICE_AS_OF` 标出登记日期 |
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
src/data/prices/ 价格层（盒价表 + 卡价规则 + 系列系数，纯函数、不联网）
src/engine/      拆包引擎（与具体卡盒完全解耦）
src/api/         后端接口封装（含降级）
src/stores/      用户会话 + 云端拆盒记录 + 服务端统计
functions/api/   Pages Functions（鉴权 / 统计 / 目录同步）
schema.sql       D1 建表脚本（维度表 + 事实表分离）
migrations/      增量迁移（线上只跑增量，`schema.sql` 是新库的全量）
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
  - 组件：`CardFace.vue`（同一张 `card-art.svg` 按稀有度变色，
    绕开无实物卡图的问题；当时用 CSS `filter`，后已换成 `--tier` 混色，
    见 2026-09-30「卡图颜色改由稀有度混色」）、`CategoryIcon.vue`（inline SVG）
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

### 2026-09-29（认证页收敛为「登录优先」，账号密码对齐常见约束）

- ✓ **认证页精简**（用户明确要求：页面简洁、只要账号密码、没账号就提示去注册）
  - 默认模式从「注册」改为「登录」；标签顺序改为「登录 / 注册」
  - 删除营销式描述段与 PBKDF2 技术说明段，只留标题 + 标签 + 两个输入框 + 一行互跳提示
  - 底部提示随模式切换：登录页「还没有账号？立即注册」，
    注册页「已有账号？直接登录」
  - 注册失败且提示含「已注册」时，**自动切到登录模式**，用户不用自己找入口
- ✓ **账号密码改用常见站点约束**（此前是 6 位下限 + 200 位上限，只有下限有提示）
  - 邮箱：格式校验 + 长度上限 100
  - 密码：`MIN_PASSWORD_LENGTH = 6`、`MAX_PASSWORD_LENGTH = 32`、不能包含空格
  - 后端抽出 `passwordProblem()` 统一校验；登录侧只校验上限，
    避免用新规则把历史账号锁在门外
- ✓ 再次确认：**不要在输入框上用原生校验属性**。这次踩到 `type="email"`，
  它和之前的 `minlength` 一样会弹浏览器原生提示、盖掉我们的中文文案；
  邮箱框改为 `type="text" inputmode="email"`（保留手机端邮箱键盘），校验全部自己写
- ✓ 浏览器实测（`wrangler pages dev` + 本地 D1）：
  空邮箱 / 格式错 / 密码 5 位 / 密码 33 位 / 密码含空格 / 两次不一致，
  六条中文提示全部正确显示；注册成功 → 自动跳 `/stats`；
  退出后重复注册 → 「该邮箱已注册，请直接登录」且自动切到登录页 →
  密码错误提示「邮箱或密码不正确」（不暴露账号是否存在）→ 正确密码登录成功
- ✓ 端到端复测维度统计：界面拆一盒（28 张）后，
  云端稀有度 `普卡 23 / 反射卡 3 / 插入卡 1 / 编号平行 1`、
  云端子集 `Base Set 26 / Clutch City 1 / Stratospheric Stars 1`，
  本机与云端数字一致 —— 证明上一轮的 `byVariant` 维度修复在真实链路上生效

### 2026-09-29（拆卡改为登录后云端记录，统计页只读数据库）

- ✓ **取消本地拆卡**（用户明确要求：不要本地拆卡，只能云端拆卡，需要登录才能使用）
  - `src/stores/app.ts` 删光 `HISTORY_KEY` / `MAX_LOCAL_HISTORY` / `LocalBreak`
    / `localSummary` / `clearHistory` / `state.history`，改成纯粹的云端记录 store
  - store 新增 `breaks` / `breakTotal` / `hasMoreBreaks` 与
    `loadBreaks()` / `loadMoreBreaks()` / `resetCloud()`，登出时一并清空
  - `recordBreak()` 改为 `Promise<boolean>`：未登录直接报错返回 false，
    只有真正写入 D1 成功才算「已记录」（`BreakView` 的 `recorded` 之前无条件置 true，
    会把失败当成成功，已修）
- ✓ **拆卡入口加登录门**：`BreakView` 未登录时不渲染拆盒面板，
  只显示「登录后才能拆卡」卡片 + `/auth` 链接；点拆卡也会兜底跳 `/auth`
- ✓ **后端新增 `GET /api/breaks`**（需登录，按 id 倒序分页）
  - 参数：`limit`（默认 20，最大 100）、`offset`，以及
    `category` / `maker` / `box` 切片，复用 `compileFilters()`
  - 返回 `{ total, limit, offset, breaks[] }`，`byTier` / `bySubset` 存的是 JSON 文本，
    用 `parseJsonObject()` 解析，脏数据一律当空对象，不让一行坏数据扝掉整个列表
  - `client.ts` 新增 `BreakRecord` 类型与 `api.breaks(filter, limit, offset)`
- ✓ **统计页 `StatsView` 改为纯云端**
  - 删掉整个「本机」层（localBoxRows / localTierRows / localSubsetRows /
    localRarest / localRecent / localCards）
  - 汇总格改为拆盒数 / 出卡数 / 已拆盒型 / 编号卡，全部来自 `/api/stats`
  - 新增「拆盒记录」明细表（时间 / 盒子 / 种子 / 张数 / 编号卡 / 最佳卡 / 配率），
    底部「显示更多」调 `loadMoreBreaks()`，由 `hasMoreBreaks` 控显隐
  - 未登录不再展示空统计，改为一张登录引导卡；
    全站累计与拆盒排行 Top 20 仍对匿名访客开放并**移到登录门外面**
  - 库里只存 `best_variant` 这类 key，新增 `variantIndex` 查表把 key 还原成卡种全名
  - `App.vue` 导航角标从 `state.history.length` 改为 `state.breakTotal`
- ✓ 冒烟脚本扩容：新增「未登录 `GET /api/breaks` 必须 401」与
  「登录后 total=1 且 seed / cardCount / best / bySubset 全部正确」两条断言
- ✓ 本地全栈实测（`wrangler pages dev` + 本地 D1）：注册 6 条约束、登录、
  拆盒、记录接口全部通过；浏览器实测登出后拆盒面板消失、
  重新登录后拆一盒 28 张 → 导航角标 1→2、提示「本次拆盒已记入统计。」、
  `/stats` 汇总 2 盒 / 56 张 / 1 盒型 / 2 编号卡，明细两行种子可对得上

- ✓ **文案去技术化**（用户提出：页面上写「云端数据库」「breaks 表」这些技术细节
  对用户没意义）
  - 抹掉所有渲染给用户看的实现细节：`云端数据库` / `breaks 表` / `后端服务` /
    `npm run dev:cf` / 「注册只需要邮箱和密码」这类擦鞋式描述
  - 拆卡登录门：标题「登录后才能拆卡」+ 一行「拆盒记录与个人统计都归入你的账号，
    登录后即可开拆。」；统计页登录门同理只留一行「登录后可以看到自己的全部拆盒统计与记录。」
  - 统计页描述改为「这里汇总你的全部拆盒记录；排行榜与全站统计对所有访客开放。」
  - 分区小标题「数据来自云端 breaks 表」→「按盒型汇总」，
    「按配率倒序」→「从最稀有开始」
  - 按钮「刷新云端数据 / 清空云端记录」→「刷新数据 / 清空拆盒记录」
  - 提示语统一用用户语言：写入成功 →「本次拆盒已记入统计。」，
    写失败 →「本次拆盒未能保存，请稍后重试。」，
    拿不到数据 →「统计数据暂时不可用，请稍后重试。」
  - 首页「同步到云端」→「会自动记入你的统计」
- ✓ **把这条约束写进 `agent.md` 第 2.1 节**（用户要求：加入项目约束），
  同时在第 8 节加了一条文案自检命令：
  `Get-ChildItem -Recurse -Include '*.vue' -Path 'src' |`
  `Select-String -Pattern '云端|数据库|后端|接口|写入|同步|聚合|分页'`
  （约束只针对渲染字符串，注释与文档不受限）
- ✓ 浏览器复测（登录 / 登出两种状态 × 拆卡页 + 统计页）：
  四个位置的文案全部正确，无一条命中禁用词，typecheck 与 build 均通过

#### 本地 D1 踩坑：`pages dev --d1=DB` 会另建一个空库

`npm run dev:cf` 原本带 `--d1=DB`，它绑定出来的库叫 `local-DB`，
而 `wrangler d1 execute DB --local` 写的是 `wrangler.toml` 里的 `cardemulate` 库。
两者不是同一个 sqlite 文件，于是注册接口报 `D1_ERROR: no such table: users`。
**修法：去掉 `--d1=DB`，让 `pages dev` 直接读 `wrangler.toml` 的 D1 绑定**；
另补了 `npm run db:local` 与 `npm run smoke` 两个脚本。

### 2026-09-29（上线 Cloudflare Pages，线上全链路跑通）

- ✓ **wrangler 登录并创建线上 D1**：账号 `2092878237@qq.com`
  （ID `88a2dc4c1e2c8652fd444ea1a65dec76`）；创建库 `cardemulate`
  （`database_id = 51265817-c1ed-4e09-98fd-a3d1709fb0c3`，区域 WNAM），
  已回填 `wrangler.toml`，并对其执行 `schema.sql`（35 条语句 / 12 张表）
- ✓ **`wrangler.toml` 补 `pages_build_output_dir = "dist"`**：声明本项目是 Pages 项目，
  构建时 Cloudflare 会读本文件里的绑定，因此 **D1 绑定跟着仓库走**，
  不需要在面板里手工维护
- ✓ **Pages 项目 `cardemulate`**（构建命令 `npm run build`、输出 `dist`、生产分支 `main`）
- ✗ **自定义域名 `cardemulate.wikiandroid.com` 当时并未真正生效**
  （当时误记为「已添到项目上、证书签发中」，实际只把域名加进了项目，
  区域里的 CNAME 记录从没建过，域名一直卡在 `pending`，证书从未签发。
  详见下方 2026-09-30 的收尾记录）
- ✓ **线上冒烟全通过**：注册 5 条约束 → 注册 → 重复邮箱 409 → 登录（错/对）→
  `/api/me` → `/api/break` → `/api/stats`（稀有度 / 子集维度正确）→
  `/api/breaks`（未登录 401、登录后 total / seed / cardCount / best 正确）→
  `/api/leaderboard` → `/api/global` → 退出登录
- ✓ 冒烟脚本现在可指定目标站点：
  `node scripts/smoke-api.mjs https://cardemulate.pages.dev`
- ✓ 验证后清空线上测试数据（`DELETE FROM users WHERE email LIKE '%@example.com'`，
  外键级联带走 sessions / breaks / pull_stats），全站统计回到 0

#### 线上踩坑 1：Cloudflare 的 PBKDF2 迭代次数上限是 100000

- 现象：本地全链路正常，线上 `POST /api/auth/register` 一律 500，
  返回 Pages 的 `Error 1101` HTML 页；只读接口（`/api/config`、`/api/global`）全部正常
- 定位过程：
  1. 用 D1 REST API 以**同样的绑定参数**直接跑注册用的 SQL，
     `INSERT ... VALUES (?1..?6, ?6) RETURNING ...` 全部成功 → 排除 SQL 与绑定问题
  2. 再让 API 把异常信息吐出来，拿到真凶：
     `Pbkdf2 failed: iteration counts above 100000 are not supported (requested 150000).`
- 根因：**Cloudflare 的 WebCrypto 对 PBKDF2 有 100000 次迭代的硬上限**，
  超限直接抛异常；本地 miniflare 不做这个校验，所以只在线上暴露。
  登录接口此前没暴露它，是因为用户不存在会提前返回，根本走不到哈希那一步
- 修法：`PBKDF2_ITERATIONS` 由 150000 降为 **100000**（平台允许的最大值），
  `schema.sql` 默认值同步改，并写进 `agent.md` 第 6 节

#### 线上踩坑 2：`try { return handleX() }` 捕不到异常

`onRequest` 里原本是 `return handleRegister(request, env)`，
返回 Promise 并不会让 `try/catch` 捕获它的拒绝，
于是任何异步失败都变成未处理异常，线上只看到 `Error 1101` HTML 页，
统一错误处理完全失效。**修法：全部改成 `return await handleXxx(...)`。**
同时把 catch 的文案收敛为固定的「服务暂时不可用，请稍后重试。」，
细节只走 `console.error`（Pages 面板实时日志可见），
符合 2.1 节「不向用户暴露实现细节」的约束。

### 2026-09-30（自定义域名收尾：补齐 DNS 记录，域名正式生效）

上一轮在验证自定义域名时遇到 `Error: connect ETIMEDOUT 199.59.148.97:443`
后中断，本轮把它做完。

#### 定位：域名加进了项目，但 DNS 记录从来没建过

- 自查结果：`Resolve-DnsName cardemulate.wikiandroid.com` 在公共 DNS 上**无任何记录**；
  而 `wikiandroid.com` 本身 NS 指向 `leah/tanner.ns.cloudflare.com`、A 记录正常，
  说明区域健康，只是缺子域名记录
- 用 `GET /accounts/<id>/pages/projects` 查真实绑定：`cardemulate` 项目当时只有
  `cardemulate.pages.dev`；再查 `GET .../pages/projects/cardemulate/domains` 才看到
  自定义域名**其实早就在项目里**，状态 `pending`，
  原因 `verification_data.error_message = "CNAME record not set"`
  → **「在面板加域名」这步上轮已完成，缺的是 DNS 记录这一步**
- 结论：上轮记的「已添到项目上、证书签发中」只对了一半，
  域名确实加进了项目，但证书从来没开始签发

#### 修法：在区域里补一条代理 CNAME

- 在 `wikiandroid.com` 区域（zone_tag `2c4973d6590e1a2ade0c71b0ffcf34bb`）加：
  `CNAME cardemulate -> cardemulate.pages.dev`，Proxy status = **Proxied**，TTL = Auto
  （必须是橙色云朵，DNS only 会让证书签发一直 pending）
- 记录生效后 Pages 侧状态推进：`verification_data.status` 由 `pending` 转 **`active`**
  （CNAME 校验通过）、`validation_data`（method `http`）随后也转 **`active`**，
  域名整体状态由 `pending` 转 **`active`**
- **注意 522 过渡期**：CNAME 刚建好、Pages 还没挂上路由时，
  自定义域名会返回 `522 Connection timed out`（页面与 `/api/*` 都是 522）。
  这不是配置错，等几分钟就好，不要因为看到 522 就去改记录
- **另一个现象**：过渡期内 `curl -4` 可能是 200、而 `Invoke-WebRequest` 报 522，
  造成「命令行能通、脚本打不通」的假象（本机到 Cloudflare 的 IPv6 路径不通，
  `curl -6` 直接 000）。验证域名是否生效，**优先用 `curl -4`，并多试几次**

#### 本机无法自动建 DNS 记录（能力边界，记下来避免再试）

- wrangler 的 OAuth 凭据（`%APPDATA%\xdg.config\.wrangler\config\default.toml`）
  scopes 里有 `zone:read` + `pages:write`，**没有 DNS 写权限**：
  `POST /zones/<id>/dns_records` 与 `GET /zones/<id>/dns_records` 一律 `10000 Authentication error`
- 本机也没有 `CLOUDFLARE_API_TOKEN` 之类的环境变量
- **若要免手动，需要用户新建一个带 `Zone:DNS:Edit` 权限的 API Token；
  否则这条记录只能由用户在面板加。**
- 顺带确认：`pages:write` 是够用的，用 `POST /accounts/<id>/pages/projects/<name>/domains`
  可以直接把自定义域名加进 Pages 项目（重复添加报 `8000018 already added`）

#### 验证结果（全部通过）

- `Resolve-DnsName` 返回 Cloudflare 边缘 IP（`104.21.81.62` / `172.67.157.103`）
- Pages 域名状态 `active`（`verification_data` 与 `validation_data` 均 active）
- 证书：当前由 `CN=wikiandroid.com` 通配证书覆盖，颁发者 Google Trust Services（WE1），
  2026-11-21 到期（Pages 的专用证书为同机构签发，稍后替换）
- `curl -4` 连打 6 次全部 `200`，首页 1170 字节、`/api/global` 正常返回 JSON
- **线上接口冒烟整套重跑通过**（目标站点改用自定义域名）：
  `node scripts/smoke-api.mjs https://cardemulate.wikiandroid.com`
  - 5 条注册约束全部 400 且中文提示正确
  - 注册 200 → 重复邮箱 409 → 密码错 401（文案不区分账号是否存在）→ 登录 200
  - `/api/me` → `/api/break` → `/api/stats`（`byTier` / `bySubset` 维度正确）
  - `/api/breaks` 未登录 401、登录后 total / seed / cardCount / best / bySubset 全部正确
  - `/api/leaderboard`、`/api/global` 正常 → 退出登录后 `/api/me` 返回 `user: null`
- 复测后清理线上测试数据（`changes: 5`，级联带走 sessions / breaks / pull_stats），
  `/api/global` 回到 `users: 0 / boxes: 0 / cards: 0`
- 遗留观察：`/api/global` 里的 `catalog` 计数全为 0，属预期——
  目录镜像同步是手动触发（尚未执行），页面渲染本来就不查库

#### 关于 Cloudflare API 的两个小坑

- PowerShell 5.1 里 `Invoke-RestMethod -Body '{"name":"..."}'` 会被解析器吃掉内层双引号，
  服务端收到坏 JSON 报 `8000006 Request body is incorrect`。
  改用 `curl.exe --data "@$env:TEMP\xxx.json"`（UTF-8 无 BOM 文件）即可
- `Invoke-RestMethod` 遇到 4xx 会把错误正文吞掉，只能看到一句中文的
  「远程服务器返回错误: (400)」；看错误详情要用
  `curl.exe -s -w "\nHTTP=%{http_code}"`
- 另：`node` 脚本输出中文在 PowerShell 5.1 里会显示为乱码（UTF-8 被按 GBK 解码），
  属显示层问题，不影响断言结果，先不管

### 2026-09-30（官方数据归档 + 盒型行为快照 + 清空记录改为可选范围）

#### 1. 官方数据源统一归档到仓库（用户要求：数据随仓库走，避免本机遗失）

- ✓ 新建 `sources/` 目录，作为**官方原始资料**的固定落点，目录规则与代码一致：
  `sources/<品类>/<发行商>/<系列产品>/`
- ✓ 每个产品固定放这些文件：`README.md`（来源与配率说明）、`pack-odds.pdf/.txt`、
  `checklist.pdf/.txt`、`education-sheet.txt`、`extract-pdf-text.py`
- ✓ **`sources/README.md` 登记册**：写清三级来源可信度
  - **A 官方原件**：`https://www.topps.com/pages/odds`（权威，但对命令行返回 403，只能人工下载）
  - **B 官方镜像**：`https://xcdn.checklistinsider.com/public/<年>/<月>/...pdf`
    （第三方托管，**字节与官方一致**，命令行可下，已记录 SHA-256 复核）
  - **C 参考**：仅用于**找** A 级资料的渠道
  - 另含「六步采集流程」与「已归档系列」表，以及后续新品类上线时的统一取数入口
- ✓ 已归档 `sources/basketball/topps/tcu26-basketball/`：
  `pack-odds.pdf`（242,261 B / SHA-256 `B4F08A7B…8FB817`）、
  `checklist.pdf`（297,352 B / SHA-256 `7010B390…9E4FC2`）、
  两个 PDF 的纯文本提取、教育页提取，以及 `extract-pdf-text.py`
- ✓ **来源真实性交叉验证**：在 VS Code 历史会话里翻出当时的下载链接，
  重新下载后 **SHA-256 与本地提取件完全一致**，
  确认手上这份 PDF 就是 Topps 官方配率表，而不是某处二手复制

#### 2. 配率表自动转换脚本（把 PDF 文本变成可 diff 的 TS）

- ✓ 新增 `scripts/import-pack-odds.mjs`：
  `node scripts/import-pack-odds.mjs <odds.txt> <out.ts>`
  - 12 个盒型渠道列：`hobby / jumbo / delight / sapphire / value-box-ea|se|cee /
    mega-box-ea|se|cee / fanatics-box / ascc-promo-pks`
  - 过滤 PDF 提取产生的噪声行（页码、`Cards Hobby`、促销语等）
  - `ROW_PATCHES` 修 PDF 抽文本时丢列的行（如 `Alter Ego` 尾列丢失）
  - 产出 `PACK_ODDS_COLUMNS` / `type PackOddsColumn` / `interface PackOddsRow` / `PACK_ODDS`
- ✓ 生成 `src/data/sets/basketball/topps/tcu26-basketball/pack-odds.generated.ts`
  （文件头标注「请勿手工编辑」）：**390 行配率、0 条告警**，
  抽查 `Base` / `Base Refractors` / `Alter Ego` / `NBA Debut Patch Autographs` 均正确
- ✓ **做这批盒型时不要手抄配率**——一律走这个脚本，配率才可复核、可 diff
- ✓ 已确认的盒型结构（官方公布）：Hobby 4 张×20 包 / 1 张签名，Jumbo 11 张×12 包 / 3 张签名，
  Delight 12 张×1 包 / 2 张签名，Value 4 张×7 包 / 无签名，Mega 6 张×7 包 / 无签名。
  **官方不公布「一箱几盒」**（`boxesPerCase` 无权威来源，新盒型按 0 处理并省略该行文案）

#### 3. 盒型行为快照（重构盒型数据前的安全网）

- ✓ 新增 `scripts/snapshot-boxes.ts`（esbuild 打包成 node 脚本执行），
  新增 npm 脚本：
  - `npm run boxes:snapshot` 把当前所有盒型的完整行为写进 `snapshots/boxes.json`
  - `npm run boxes:check` 比对，有差异就打印差异行并以退出码 1 结束
- ✓ 快照内容：每个 `BoxDefinition` 的全部字段 + 子集（roster 存 `{count, digest}`，
  用 `fnv1a` 摘要，文件从 224 KB 压到 **92,723 B**）+ 平行 + 5 个固定种子
  （`alpha / beta / gamma / 2026 / test-1`）逐张开出的卡（`id|variantKey|tier|player|no|serial|pack.slot`）
  - 浮点用 `Number(v.toPrecision(12))` 归一，避免假差异
- ✓ 基线已写入并 `boxes:check` 通过。**这是后续拆 `box.ts`、把 Value Box 逻辑复用给
  Hobby / Jumbo / Delight / Mega 的安全网：Value Box 的输出必须保持逐位一致**

#### 4. 清空拆盒记录改为「可选范围 + 二次确认」（用户明确要求）

用户原话：「刷新数据，这一项是多余的，本身就会根据拆盒信息刷新页面内容，
清空拆盒记录太暴力了，需要可选品类盒子来进行清空，并且清空需要提示用户数据将会丢失且不可恢复，
需要谨慎确认，用户确认后才能清空选中的品类的盒子的数据清空，并支持清空所有」

- ✓ **后端 `DELETE /api/break` 支持范围限定**（`functions/api/[[path]].js`）
  - 接受 `?category=` / `?maker=` / `?box=`，复用 `compileFilters()` 拼 `WHERE`；
    不带任何条件才是清空全部
  - 删**两张事实表**：只删 `breaks` 会让统计页的累计数字与记录列表对不上
  - 返回 `{ ok: true, removed: n }`，界面据此提示具体条数
  - **安全设计：非法范围直接 400，绝不静默退化成「清空全部」**
    （故意不用会吞掉非法值的 `softKey()`）；未登录 401
  - 顺带澄清一个曾误判的点：`isSafeKey` 的字符类里 `-` 在末尾是**字面量**而非区间，
    所以 `tcu26-basketball` / `value-box` 这类 key 本来就合法，无需放宽正则
- ✓ **`src/api/client.ts`**：`clearBreaks(filter?)` 支持传范围
- ✓ **`src/stores/app.ts`**：`clearBreaks(scopes: StatsFilter[])`
  - 范围逐个下发、**最后只汇总一条提示**（同一次确认不该冒出好几条提示）
  - 中途失败不放弃剩余范围，收尾如实汇总「已清空 N 条，其余未能清空」
  - 返回 `boolean` 供界面决定是否收起面板
- ✓ **`src/views/StatsView.vue`**
  - **删掉「刷新数据」按钮**（拆盒信息本身就会触发刷新）
  - 「清空拆盒记录」展开成面板：按品类分组列出**确有记录**的盒型，
    支持单盒 / 整品类 / 全选，按钮上实时显示「清空选中的 N 条」
  - 第二步独立确认页：**重述将要消失的条数与盒型清单**，
    文案明说「清空后这些记录会立刻消失，无法恢复」，
    并要求勾选「我明白这些记录无法恢复」后「确认清空」才可点（危险色按钮）
  - 勾选范围一变就退回第一步，避免在旧确认页上提交新范围
  - 把勾选结果**收敛成最少的下发次数**：整品类全选就按品类下发，
    全部盒型全选就按「全部」下发
  - 顺带修一处：全站累计 / 排行榜原本只在 `onMounted` 取一次，
    清空后会残留旧数字；抽出 `loadPublic()`，清空成功后一并重取
- ✓ 冒烟脚本 `scripts/smoke-api.mjs` 增加「按范围清空」整段断言，本地全栈实测全过：
  - 未登录 `DELETE /api/break` → 401
  - `?category=not%20a%20key` → 400，**且事后总数不变**（被拒绝的请求不改数据）
  - 造 3 条（2 篮球 + 1 棒球）→ `?category=basketball` 精确删 2 条，剩下全是棒球
  - `?box=baseball.topps.tcbs26-baseball.hobby-box` 精确删 1 条（验证带连字符的盒型 key）
  - 不带条件 → 清光剩余 1 条，总数归零
- ✓ 浏览器实测：注册 → 拆一盒 28 张 → 统计页「刷新数据」已消失；
  勾选盒型 → 确认页 → 勾选知情 → 确认清空 → 提示「已清空 1 条拆盒记录。」，
  汇总全部归零、按钮置灰、导航角标归零、全站累计同步刷新
- ✓ `npm run typecheck` 零错误、`npm run build` 成功、`npm run boxes:check` 通过
- ✓ 文案自检：本次新增字符串只用用户语言（无云/库/接口/写入等实现细节）

### 2026-09-30（登录页密码输入体验 + 昵称可自设）

#### 1. 密码输入：大写锁定提醒 + 按住看明文（用户明确要求）

用户原话：「优化一下账号密码输入页面，例如已经开启大写输入，
眼睛图标点击可展示当前密码松开鼠标则继续变成***，避免不知道注册密码，
登录密码是否正确」

- ✓ `src/views/AuthView.vue`
  - 密码框内右侧加眼睛图标：**按住显示明文、松开回到圆点**
    （鼠标 `mousedown/up`、触屏 `touchstart/end/cancel`、
    键盘 `Space`/`Enter` 的 keydown/keyup 都接上了，
    `keydown` 上 `.prevent` 防止空格触发页面滚动）
  - 两个密码框（密码 / 确认密码）**各自独立**，按住其中一个不会带上另一个
  - `getModifierState("CapsLock")` 驱动「大写锁定已打开。」提示，
    在 `keydown`/`keyup` 同步、失焦时清掉
  - 切换登录/注册、提交成功后重置状态，避免残留明文或旧提示
- ✓ 无障碍补偿：眼睛按钮就贴在输入框里，会让输入框的可访问名变成
  「密码 按住显示密码」——给两个 input 补了 `aria-label`，
  按钮保留 `aria-label` + `aria-pressed`，但**不放 `title`**（不要 hover 气泡）

#### 2. 文案清理：去掉低幼提示与复述型文案（用户明确要求）

用户原话：「按住右侧图标可以看到明文 这种类型的提示就不要有了，用户不是傻子」

- ✓ 删掉注册页「按住右侧图标可以看到明文。」，密码规则只留约束本身
- ✓ 删掉盒型卡片上的「点击进入拆盒」——卡片本来就是链接，旁边还有「可拆盒」徽章
- ✓ 删掉紧跟在「待上线」徽章下面的「待上线，敬请期待！」（品类 / 发行商 / 系列 / 产品页）
- ✓ 删掉统计页未登录时复述标题的那句「登录后可以看到自己的全部拆盒统计与记录。」
- ✓ 「这就是你现在的昵称。」改为「与当前昵称相同。」
- ✓ 一并清掉随之不再被引用的 `.ce-soon-line` / `.ce-live-line` 样式

#### 3. 昵称可自设（全站唯一）

用户原话：「欢迎回来，2092878237。需要可以设置昵称，不然用户名太丑陋了」，
后续补充：「新建个人中心可配置昵称，并且昵称不可重复，用户输入后，
点击检测是否可用按钮，才匹配数据库昵称，不存在则可创建」

- ✓ **改掉 `agent.md` 第 6 条**（原先明写「不要在前端恢复昵称输入框」，已取得用户同意）：
  注册仍然只要邮箱 + 密码，昵称是登录后自己改的展示名，入口是新的「个人中心」页
- ✓ 新增 `src/views/ProfileView.vue` + 路由 `/profile`，头部右上角昵称与按钮都指向它；
  未登录时显示「去登录」引导
- ✓ 两阶段交互：先在本地过规则，再点「检测是否可用」，**检测通过才能保存**；
  输入一变就作废上一次检测结果，避免「检测完又改字」还能存
- ✓ 新增 `src/account/nickname.ts`（前端规则）与后端 `nicknameProblem()`：
  两条实现**必须保持同一套规则**——2~16 个字（`Array.from` 计长度，
  否则中文会被算成两倍）、只允许文字/数字/空格/下划线/连字符（用 `\p{L}`/`\p{N}`，
  中文日文昵称都要能过）、连续空白先归一成一个空格
- ✓ 新增接口（均需登录）：`POST /api/profile/nickname` 只回答能不能用、不写库；
  `POST /api/profile` 改昵称，被占返回 409
- ✓ **唯一性不用「先查再写」**：改成单条
  `UPDATE … WHERE id = ?2 AND NOT EXISTS (SELECT 1 FROM users WHERE lower(display_name) = lower(?1) AND id != ?2)`，
  并发抢同一个昵称时只有一个能成功；两个接口都排除自己（否则重检自己的昵称会说「被占用」）
- ✓ `schema.sql` → `schema_version = 3`：
  - 建 `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name ON users(lower(display_name))`
    （大小写不同的同名算同一个）
  - **建索引前先把历史重名改掉**（追加 `-` + id 前 4 位），否则 CREATE 直接失败；
    这段重复执行不会动任何行，已实测重跑两次数据不变
  - 本地 D1 已跑完迁移，索引存在性已查库确认；另**刻意造了两条重名**验证改写生效
    （`dupname` / `DupName` → `DupName-5`）
- ✓ 注册默认昵称取邮箱前缀，但前缀可能已被别人改成昵称：
  按「前缀 → 前缀+随机串 → 再试一次」逐个候选写库，
  只有唯一索引冲突才重试，其他错误照原样抛出（`isDisplayNameConflict()` 认错误文本里的 `display_name`）
- ✓ 冒烟脚本新增「昵称校验」整段，本地全栈实测全过：未登录检测/保存均 401；
  全空白、1 个字、超过 16 字、带特殊符号均 400；
  「  冒烟 测试  」→ 归一为「冒烟 测试」且可用；保存成功后 `GET /api/me` 同步；
  重检自己的昵称可用；重复保存返回 `unchanged: true`；
  换账号用大写同名检测 → `available: false`、保存 → 409；
  另实测「邮箱前缀撞上别人昵称」时注册仍成功（自动得到 `smoke-68755-8xam`）
- ✓ 浏览器实测：`/profile` 改昵称后头部、当前昵称、提示同时更新；
  重名时提示「这个昵称已经有人用了，换一个试试。」且保存按钮不可点
- ✓ `npm run typecheck` 零错误、`npm run build` 成功、`npm run boxes:check` 通过

### 2026-09-30（首页文案瘦身 + 后续扩展暗示）

用户原话：「怎么玩 1. 注册一个账号…4. 每盒都会给出随机种子… 可以精简一下，
另外卡品分类未上线的保持现状非常好，可以暗示用户网站后续还会有很多建设。」

- ✓ 「怎么玩」由 4 条压到 3 条，且**不再写死导航路径与「Value Box（28 张）」**：
  原文把「篮球 → Topps → 2025-26 Topps Chrome Updates Basketball」和
  「一整个 Value Box（28 张）」写进说明，
  一旦补上 Hobby / Jumbo / Mega，这段话立刻变成错的；现在只说结构（逐层进入 → 按盒拆开 → 种子可复现）
- ✓ 底部状态说明压缩为「本模拟器只还原概率结构，不涉及任何真实交易；卡面为占位图。」
  （删掉「待后续补充实物图」——属于对未来的承诺，不是当下的状态）
- ✓ 品类宫格下方新增一行「分类会一直加，每个分区里的发行商与系列也会陆续补上。」
  暗示站点还在持续建设
- ✓ **未上线的品类卡片保持原样**（用户明确说「保持现状非常好」）：
  灰化卡片 + 真实 SVG 图标 +「待上线，敬请期待！」全部不动，只在宫格外加这一行
- ✓ 浏览器实测首页，typecheck / build 通过

### 2026-09-30（拆完即换新种子，连续开盒不用手动换）

用户原话：「随机种子（同一种子 = 同一盒）… 再拆一盒 … 本次拆盒已记入统计。
这块需要优化，拆完后自动生成一个新的种子 这样用户可以爽开」

- ✓ **拆完自动换种子**：一盒揭完（动画走完或点「直接看结果」）立刻把种子框
  换成新的随机种子，接着点「再拆一盒」就是全新一盒。
  之前种子框一直留着上一盒的值，**「再拆一盒」其实每次都开出一模一样的一盒**
- ✓ 没有牺牲可复现性：刚开完的那一盒的种子仍显示在「本盒概况」里，
  「复现这一盒」可以把种子填回输入框，重新开出的仍是同一盒（实测最佳卡一致）
- ✓ 顺手修掉两处与新流程不一致的地方
  - 进度文字只在**开盒过程中**显示；开完后原来会一直挂着
    「正在开第 7 / 7 包 · 已翻出 28 / 28 张」，进度条保留（满格即完成）
  - 「直接看结果」按钮改为只在开盒过程中出现（之前条件是「有结果且没揭完」，
    语义相同，但和新加的状态名保持一致）
- ✓ 抽出 `ripping` 计算属性统一「正在逐包揭示」的判断，
  `startRip()` 也用它兜底：开盒动画中途按 Enter 不会重开一盒
- ✓ 种子输入框支持回车直接开拆（少一次鼠标移动，配合连续开盒）
- ✓ 浏览器实测（本地全栈 + 本地 D1）：
  指定 `TESTSEED1` 开盒 → 过程中输入框仍是 `TESTSEED1`、进度文字正常；
  开完 → 输入框变为 `A5E4D-TGZXZ`、进度文字消失、本盒概况仍写 `TESTSEED1`；
  点「再拆一盒」→ 用 `A5E4D-TGZXZ` 开出**不同**的一盒，输入框再变为 `2Q5SQ-URX84`；
  点「复现这一盒」→ 填回 `A5E4D-TGZXZ` → 再拆，最佳卡与上一次完全一致；
  回车开拆可用、中途回车不重开；「直接看结果」跳过后同样换了新种子并揭完 28 张
- ✓ `npm run typecheck` 零错误、`npm run build` 成功（本次未动 `src/data/sets`）

### 2026-09-30（统计页支持按盒型下钻 + 修掉切片参数错位 + 导航角标 / 签字卡）

用户原话：「按盒子 … 后面加一个『查看统计』按钮，点击后弹窗展示当前盒子的统计信息」、
「实测右上角会有数字图标，不需要展示这个数字，不然用户以为是未读消息。」、
「value BOX 也是有概率开到签字的吧 … 如果开到签字这些需要展示出来」

#### 1. 统计页「按盒子」表格新增「查看统计」弹窗

- ✓ `src/views/StatsView.vue`
  - 「按盒子」表补一列按钮，点开弹窗显示**该盒型自己的**拆盒数 / 出卡数 / 编号卡 +
    稀有度分布 + 卡种子集（复用页面上那两套条形列表的样式）
  - 数据走已有的 `GET /api/stats?box=<boxKey>`，**没有新增接口**；
    加锁思路：先置 `drillKey` 再取数，`await` 回来后如果 `drillKey` 已经变了就丢弃结果，
    避免连点两个盒子时旧响应盖掉新的
  - 关闭三条路径都接了：右上「关闭」按钮、点遮罩空白处、按 Esc
    （Esc 走 `window` 的 `keydown` 监听，`onBeforeUnmount` 里摘掉）
  - 「编号卡」口径与页面一致，复用同一个 `NUMBERED_TIERS`

#### 2. 修一个真 bug：`/api/stats` 带切片条件必然 500

- 现象：不带条件正常，一加 `?box=` / `?category=` / `?maker=` 就
  `500 D1_ERROR: Wrong number of parameter bindings for SQL query.`
- 根因（`functions/api/[[path]].js` 的 `handleStats`）：
  查询前缀是 `app_key = ?1 AND user_id = ?2`，但切片条件是
  `compileFilters(..., 2)` 编译的 —— 第一个切片被编成 `?2`，
  **把 `user_id` 覆盖了**，于是 SQL 里最大占位符编号停在 2、却绑了 3 个值
- 修法：两处 `compileFilters(..., 2)` 改成 `3`，与 `handleBreaks` 的写法对齐
  （`handleBreaks` 早就写了「?1 = app_key、?2 = user_id，切片条件从 ?3 开始」）
- 教训：`handleLeaderboard` / `handleGlobal` 的前缀只有 `?1`，用 2 是对的，
  **照抄它们的起始下标就会错**；起始下标必须数前缀里的占位符个数
- ✓ 验证：`?box=` / `?category=` 均 200 且数字与页面汇总一致，
  `?box=does.not.exist` 返回 0 而不是报错

#### 3. 去掉导航栏的数字角标

- ✓ `src/App.vue` 删掉 `boxCount` 计算属性、链接里的角标与 `.ce-nav-count` 样式
- 原因（用户实测反馈）：数字看起来像「未读消息」，而不是「我的拆盒数」

#### 4. 「本盒概况」补上「签字卡」

- ✓ `src/views/BreakView.vue` 新增 `autographs`（`group === "auto" || group === "relic"`），
  概况格从 4 格变 5 格（`grid-template-columns` 改 `auto-fit`），
  开到签字时**整格换成品牌绿**，一眼能看到
- 数据侧确认不需要改：Value Box 的 `Topps Chrome Autographs` 官方配率是 1:30,619，
  另有 7 行 Lava Lamp，确实有概率开到

#### 5. 为 Hobby / Jumbo / Mega 预置名册（进行中）

- ✓ `roster.ts` 从「仅 Value Box」改为「Hobby / Jumbo / Value / Mega 四个盒型」
  的合并名册，按 `checklist.txt` 补进 8 组只在 Hobby / Jumbo 出现的名册：
  `SHADOW_ETCH`(SE) / `CELEBRACION`(CB) / `CAPTAINS`(SC) / `RADIATING_ROOKIES`(RR) /
  `HAVOC_MARKS`(HM) / `AUTOGRAPHS_1980_81`(80TBA) / `FUTURE_STARS_AUTOGRAPHS`(FS) /
  `DRUSKI_AUTOGRAPHS`(DA) + `SPIKE_LEE_AUTOGRAPHS`(SLA)
- 行格式沿用 `[卡号, 人物, 球队]` / `+ "R"` 标新秀；`box.ts` 的改造（按官方渠道列
  重映射配率、拆出三盒、`ABSENT_SUBSETS` 改为逐盒推导）**尚未开始**

### 2026-09-30（统计页删掉三块「全站维度」的图表）

用户原话：「有了按照盒子查看统计的功能之后，统计页面的 ## 卡种子集 Top 24、## 稀有度分布
这两项就不需要了，因为后面很多品类，很多卡种，开的多了，这个页面很杂乱」、
「最稀有的 20 张 这个也不需要了，同样道理，品类后续新增很多，盒子开很多，无法评估稀有度」

- ✓ `src/views/StatsView.vue` 删掉「稀有度分布」「卡种子集 Top 24」「最稀有的 20 张」三块，
  以及只为它们存在的 `tierRows` / `maxTier` / `subsetRows` / `subsetMax` / `rarestRows`
- 判断依据：这三块都是跨盒型、跨品类的汇总，品类一多就没有可比性
  —— 高配率品类的普卡会直接淹掉低配率品类的编号卡，条形图看不出「谁更难得」；
  要看单个盒型的稀有度与子集分布，「按盒子 → 查看统计」已经能看到，而且是逐盒口径
- ✓ 顺手清掉后端随之变成死代码的部分（`functions/api/[[path]].js`）：
  `handleStats` 里 `ORDER BY best_odds DESC LIMIT 20` 那条 `rarest` 查询
  —— 每次请求都白跑一次全表扫描排序 —— 连同 `UserStats.rarest` 字段一起删掉
- ✓ 追问后一并去掉「全站累计」卡片里的全站稀有度条形（口径是全站总量，同样没有可比性），
  只留收藏家 / 拆盒数 / 出卡数三个数字
- 页面顺序现在是：本盒概况 → 按盒子 → 拆盒记录 → 全站累计 / 拆盒排行
- 有意保留、记在这里免得下次疑惑：
  1. `UserStats.recent` 没有任何页面在读，属于本次改动之前就存在的死字段
  2. `/api/global` 仍返回 `byTier` / `bySubset` / `byBox` / `byCategory` / `byMaker`，
     前端已无人使用 —— 但这是**跨站点对账用的聚合接口**（D1 里那几张维度表存在的理由），
     别的消费方可能还在读，所以不跟着删
- ✓ 验证：`npm run typecheck` / `npm run build` 通过（`StatsView` 产物 19.31 kB → 15.85 kB），
  本地登录后实测页面只剩四段，逐盒弹窗（含稀有度分布 / 卡种子集）不受影响

### 2026-09-30（一个系列四个盒型：Hobby / Jumbo / Mega 上线）

用户原话：「为什么还是没有上 mega hobby jumbo」

前情：官方 Pack Odds 表早就归档（12 列），但 `box.ts` 只实现了 Value Box —— 那一份配率是
早期按 `value-box-ea` 单列手抄进源码的，其余盒型的数字根本没进代码，所以页面上只有 Value Box。

- 核心改动：`src/data/sets/basketball/topps/tcu26-basketball/box.ts` 从「手抄配率」
  改成「**按官方表的列投影**」——
  - 子集定义里的 `odds: { slug: 数字 }` 换成 `variants: [slug, 官方行标签][]`，
    数字一律 `oddsAt(spec, slug, label, column)` 查 `pack-odds.generated.ts`
  - `build()` 变成 `build(config: BoxConfig)` 工厂：`column` 决定取哪一列，
    该列为 `null` 的卡种直接不进本盒；整行都不为本盒出的话，该子集进「本盒不含」清单
  - `BOX_CONFIGS` 四条：Hobby（4×20，`hobby`）/ Jumbo（11×12，`jumbo`）/
    Value（4×7，`value-box-ea`）/ Mega（6×7，`mega-box-ea`）。
    新增第五个盒型以后只要加一条配置，不用再抄一遍数字
- 新增 9 个 Hobby / Jumbo 专属子集的独立名册（`roster.ts` 里本来就有，只是没接进 `SPECS`）：
  `captains` / `celebracion` / `radiating-rookies` / `shadow-etch` / `havoc-marks` /
  `autographs-1980-81` / `future-stars-autographs` / `druski-autographs` / `spike-lee-autographs`
- 「本盒不含的子集」不再硬编码：`count` 取名册真实长度（旧的 15 / 91 / 50 等是手写的，已换成实数），
  `where` 由「哪些盒型的列有值」推出来。清单跟着盒型走，不再只对 Value Box 成立
- `boxesPerCase` 正式支持留 0 = 官方未公布：`validateBox()` 只校验非负整数，
  `toBoxRef` / `BreakView` / `ProductView` 三处「盒 / 箱」徽章在 0 时都不渲染
  （Hobby / Jumbo / Mega 官方都没公布装箱数，只有 Value Box 的 40 盒是官方资料里有的）
- 系列页（`ProductView.vue`）原来假定「只有一个已上线盒型」，用 4 次
  `product.boxes.find((b) => b.live)` 只展示 Hobby；现在按 `liveBoxes` 逐盒展示独家内容与规模，
  「注意事项」是全盒型共用的，只留一份
- 系列简介里的「33 个子集、93 种平行」是官方 Checklist 的全系列口径，跟逐盒的「28 个子集、
  216 个卡种」并列会让人以为是同一件事，改成「官方 Checklist 共 1,299 张卡，
  分 Hobby / Jumbo / Value / Mega 四种盒型发行」
- 配率表抬头原来写死「官方 Value Box 配率」，改成「官方本盒配率」
- 删掉 `taxonomy.ts` 里 `tcu26-basketball` 的三个占位盒型（`hobby-box` / `jumbo-box` / `mega-box`
  的「待上线」条目），现在由 `TCU26_BASKETBALL_BOXES` 自动建目录；`ABSENT_SUBSETS` 这个导出
  随之取消（改成 box 内部按盒推导）
- **Value Box 行为逐位不变，只有一处文案订正**：`npm run boxes:snapshot` 生成新快照后，
  用脚本逐字段比对新旧 `value-box` 条目 —— 20 个字段里只有 `boxExclusives` 变了，
  标量、`baseWeight`、`absentSubsets`、23 个子集、187 个卡种（key / odds / weight / numbered /
  tier 顺序）、5 个种子的完整 `rips` 全部一致。
  这处文案改的是「零售独占短印：Glass Canvas / Paradox / Fanatical」——
  Mega 的官方列里这几个也有值，「独占」是早期只有 Value Box 时的旧说法，现在统一写成「零售共享短印」
- 有意留着不动的两处，免得下次当成 bug：
  1. `Base Refractors Yellow Wave` 官方表只有 Hobby 一列有值，`No Limit Superfractors` 的
     Jumbo 列为空 —— 原表如此，没有回填（Jumbo 因此比 Hobby 少 2 个卡种）
  2. Value Box 的「Basketball Refractor 彩虹」确实是 Value 专列，Mega 那列是空的，属于真独占
- 未做，留待以后：Delight / Sapphire / Fanatics 三个盒型（列名已知，缺的是官方包装规格）；
  `autoGuaranteed` 仍然只是展示用的标签，引擎不会强制「每盒 1 张签名」
- ✓ 验证：`npm run typecheck` / `npm run build` / `npm run boxes:check`（4 个盒型）通过；
  本地实测系列页 4 个盒型全部「可拆盒」、拆盒页无「盒 / 箱」徽章、配率表与不含清单按盒变化、
  Hobby 拆一盒 80 张并正常写入统计页「按盒子」

### 2026-09-30（系列按年份分组，为补录老盒子留出位置）

用户原话：「另外需要按照年份来 因为后续2027有新盒子补充，我也需要有空搜集老盒子的信息，
让用户可选老盒子来玩」

前情：目录层级是「品类 → 发行商 → 系列 → 盒型」，系列之间只按手写的 `order` 排。
`order` 是全局序号，一旦补录一个 2023 年的老系列，它该排在哪儿、后面的序号要不要全改，
都没有依据；年份信息只藏在系列名的字符串里，机器读不到。

- 年份正式进数据模型：`BoxDefinition` 与 `ProductSeed` 各加一个必填 `year`
  （跨年赛季写 `"2025-26"`，单年发行写 `"2026"`），`ProductDef.year` 由二者推出，
  取值优先级沿用已有的 `releaseDate` 规则（种子优先，其次看已注册盒型）
- `validateBox()` 新增年份格式校验：`/^\d{4}(-\d{2})?$/`，
  写成 `"2025-2026"` 或 `"26"` 会在开发环境直接抛错。同一个系列的盒型各填各的，
  没有额外的一致性校验 —— 填错会在页面上分成两组，一眼就能看见
- 派生顺序改成「年份新的在前 → 同一年的按 `order` → 再按名字」，
  排序键 `yearStart()` 取年份前四位，所以 `"2026"` 会排在 `"2025-26"` 前面
  （单年系列比跨年赛季晚一年上市）
- `MakerView` 由一张平铺卡片网格改成按年份分段，每段一个年份标题加系列个数；
  只有一段年份时也照常显示标题，因为「这是哪一年的系列」本身就是信息
- 新增目录查询 `findYearGroups(category, maker)`：不重新排序，直接对已经排好的
  系列列表切段，年份换了就开新组（`YearGroupDef`）
- `snapshot-boxes.ts` 记录 `year`，格式版本 `format: 1 → 2`
- 有意不做、留待以后：
  1. **没有加年份路由**。发行商页已经按年份分段，再加一层 `/c/.../:year` 会让
     「只想找一个系列」多一次点击，而现在每年只有一两个系列。
     哪天某个发行商攒到十来个年份、一屏放不下，再补这一层也不迟
  2. **D1 镜像没有跟着加 `year` 列**。`products` 表已有 `release_date`，
     而线上库里是真实用户数据，加列要一次 `ALTER TABLE` 加重新部署同步负载，
     风险和收益不成比例。真要做按年份对账时再补，届时是一次正经的 schema 迁移
- README 的「扩展约定」补了「年份」与「补一个老系列」两节，
  `agent.md` 第 4 节写明年份是目录的第二排序维度
- ✓ 验证：`npm run typecheck` / `npm run build` / `npm run boxes:check`（4 个盒型）通过；
  本地实测发行商页年份分段正常；为了确认排序方向，临时插了一条 `year: "2027"` 的探针
  系列，确认它排在 `2025-26` 上方后立即删除并重新构建

### 2026-09-30（盒型卡片去掉重复的规格行，「本盒独家内容」移进「配置说明」弹窗）

用户反馈：产品页的盒型卡片上，「4 张/包 · 20 包/盒 · 80 张/盒 · 有签名保证」
和下面的徽章是同一份信息，出现了两遍。徽章更好扫读，要留的是徽章，
所以问题在目录层——`BoxRef.note` 存了一份注定与注册表重复的派生文案。

- `BoxRef.note` 改为**可选**，`toBoxRef()` 不再拼这段说明：上线的盒型规格全在注册表里，
  视图直接读 `cardsPerPack / packsPerBox / boxesPerCase / autoGuaranteed`；
  只有「已规划未上线」的占位盒型还需要 `PRODUCT_SEED` 里的手写说明
- 「官方没公布装箱数就不显示盒 / 箱」的约定移到模板的 `v-if` 上，语义不变
- 盒型卡片新增「配置说明」按钮（跟在盒型名后面），点开弹窗显示该盒型的
  「本盒独家内容」，以及「共 N 个子集、M 个卡种。进入拆盒页可查看完整配率表与 Checklist。」
- 页面上原来那段「本盒独家内容」列表整段删除：四个盒型各占一张卡，
  每张只有四五条，翻完才轮到「进入拆盒页」。现在放回对应盒型里按需展开
- 「注意事项」仍留在页面底部：四个盒型完全相同，塞进弹窗会让不点开的人
  看不到配率口径说明
- 卡片改成「整体可点 + 内部按钮」：外层是 `div`，跳转由一层绝对定位的 `RouterLink`
  覆盖层负责，按钮用 `z-index` 压在覆盖层之上。原先的写法得把按钮塞进 `RouterLink` 里，
  属于嵌套交互元素，HTML 不合法
- 弹窗外壳（`.ce-modal*`）从 `StatsView` 的 scoped 样式提到 `src/styles/main.css`，
  统计页的盒型明细与产品页的配置说明共用一套
- `.ce-card-title` 加 `flex-wrap: wrap`：系列名是长英文串，徽章和按钮宁可换行
- ✓ 验证：`npm run typecheck` / `npm run build` / `npm run boxes:check`（4 个盒型）通过；
  本地实测卡片只剩一行徽章（Hobby 4/20/80/有签名保证，Value 多一个 40 盒 / 箱）、
  四个「配置说明」都能打开且标题与盒型对应、关闭后弹窗消失、
  按钮所在位置的命中元素是按钮本身（未被覆盖层挡住）、点卡片主体正常跳拆分页

### 2026-09-30（卡面加属性标记 + 球队图标，首页品类卡不再罗列盒型名）

两件事一起做：拆盒页的卡面信息重新分工，首页品类卡瘦身。

**卡面（`CardFace.vue`，拆盒页与统计列表共用）**

- 卡图下方新增一排**居中**标记，对齐 Topps 电子卡包在卡面上打标的习惯：
  `AUTO` 签字、`/99` 限量编号、`RC` 新秀。三个都适用就依次并排
- 标记全部由**已有字段**推导，不新增任何数据：签字看 `group`、
  编号看 `numbered`、新秀看 `rookie`。推导收在 `src/engine/marks.ts` 一个函数里，
  视图不参与判断，以后加标记（如 `MEM`、`SSP`）只改这一处
- 编号标记写**印刷量**（`/25`、`1/1`）；**具体到手的那一张**的流水号
  （`6 / 25`）留在下方信息行，与 `#卡号`、配率、第几包并排
- 卡图右上的编号 pill 与左上的 `RC` pill 删除：同一件事已经在卡下方有了位置，
  两处都写属于重复。稀有度 pill 仍留在卡图左下角
- 球队名 `card.team` 换成球队图标：`src/data/teams.ts` 存 33 支球队的
  缩写 + 主色，`src/components/TeamIcon.vue` 渲染成主色渐变圆角片
- 衬字颜色按 WCAG 相对亮度自动在白 / 深之间切换（马刺的浅银底用深字、
  篮网的近黑底用白字），省得 33 支球队逐队配一遍文字色
- 球队图标在紧凑模式（统计列表）里同样显示
- 拆盒页「开出的卡」的说明补一句标记含义，用户不必去别处查

**首页品类卡**

- `CategoryDef.feature` 整个删除：它由已注册盒型拼成
  「已上线：… Hobby Box / Jumbo Box / Value Box / Mega Box（按盒拆）」，
  一个系列四个盒型就已经顶满一行，再补几个年份会溢出卡片（用户直接指出了这点）。
  盒型细节点进品类页就能看到，首页不必预告
- 连带删掉 `taxonomy.ts` 的 `CategorySeed.feature`、`HomeView.vue` 的
  `.ce-cat-feature` 分支与样式。目录镜像负载（`catalog/db.ts`）本就没带这个字段
- ✓ 验证：`npm run typecheck` / `npm run build` / `npm run boxes:check`（4 个盒型）通过；
  本地实测首页品类卡只剩 `Basketball / 篮球 / NBA / 新秀卡 / 平行彩虹`，
  未上线品类仍显示「待上线，敬请期待！」
- ✓ 卡面实测（Hobby 固定种子 `4NBEU-GR6MU`）：3 张编号卡分别显示 `/25`、`/150`、`/399`，
  信息行同时有 `6 / 25` 这样的流水号；`/150` 那张同时有 `RC`。
  Jumbo 一盒 132 张里 AUTO 标记 2 张，与官方「每盒 3 张签名」的预期一致
- ✓ 顺带核对「每盒签名张数」口径：按现有 `box.variants` 复算，
  Hobby 签名期望 1.00 张、Jumbo 2.97 张，与 `box.ts` 头部的官方规格吻合

> 本节里**标记的摆放位置**、**球队图标的画法**、**紧凑模式**三处已被下一节推翻，
> 读的时候以下一节为准；其余结论仍然成立。

### 2026-09-30（卡面标记移到卡图左上角，球队换成官方队标，去掉「第 X 包」）

三处都是上一版卡面的返工。

**标记位置**

- 上一版把 `AUTO` / `/25` / `RC` 排成一行**居中**放在卡图下方，实际页面里
  卡片高度会随标记个数（0～3）变化，同一行卡片的下沿参差不齐（用户直接指出了这点）。
  现在标记**竖排、绝对定位在卡图左上角**，完全不参与布局，卡高只由文字区决定
- 与左下角的稀有度 pill 不冲突：卡图高 249px，标记最多 3 个共 47px，实测零重叠
- 卡图下方的信息行只剩「卡号 / 流水号 / 配率」三枚徽章，用 `margin-top: auto` 贴底

**球队图标换成官方队标**

- `data/teams.ts` 每条球队元数据加 `slug`，`teamLogo()` 拼出队标地址；
  slug 与三字母缩写**分开存**——缩写是 `GSW` / `NYK` / `UTA`，
  文件名是 `gs` / `ny` / `utah`，从缩写推导一定会错
- 缩写 + 主色保留下来做**兜底**：`TeamIcon` 在图片 `error` 时换成缩写圆片，
  `title` / `aria-label` 始终是完整队名
- 队标底下垫一层白色圆圈：队标多为深色描线，直接压在深色卡面上会糊
- 「第 {{ card.pack }} 包」徽章删除：拆盒页顶部已有「正在开第 N / 20 包」的进度，
  每张卡再写一遍属于冗余（用户直接指出了这点）
- 顺带删掉 `CardFace` 的 `compact` 模式（含 6 条 `.compact` 样式）：
  统计页改成下拉明细弹窗后已经没有地方再用它，留着是死代码

- ✓ 验证：`npm run typecheck` / `npm run build` / `npm run boxes:check`（4 个盒型）通过；
  Jumbo 盒（132 张、30 支球队）滚动到底逐张核对：队标 132/132 加载成功、0 张破图、
  0 次缩写兜底、标记与稀有度 pill 零重叠；
  另把一张卡片的队标地址改成 `sea.png` 实测 404 后确实换成缩写圆片

### 2026-09-30（卡面底色跟着稀有度、队标移到卡片右下角）

上一版的卡面文字区还是统一的深蓝底，只看得到角上的稀有度 pill；
队标则夹在人物名和卡名之间，占掉一行。这一版把两件事都改掉。

- **文字区底色 = 稀有度色**：`linear-gradient(160deg, color-mix(--tier 46%, panel),
  color-mix(--tier 24%, bg-soft))`，金卡是金色、超稀有是红／玫红、普卡是灰蓝。
  深色 `--tier` 直接铺底会让白字压不住（金色尤其明显），所以是和面板底色混而不是直接用主色
- 混比 46% → 24% 是按对比度定的：人物名（14.5px 粗体）最差一档 4.68:1、
  卡名 5.5:1 以上、徽章 4.2:1 以上。卡名颜色跟着改成主色提亮一档
  （`color-mix(--tier 55%, #fff)`），否则金卡上金色字只有 2.7:1
- **队标移到卡片右下角**：文字区尾部改成 `.ce-face-foot`（信息行靠左、队标靠右、
  `align-items: flex-end`）。实测一行四张卡的队标 y 坐标完全相同，与徽章零重叠
- 代价：队标占掉 34px 信息行宽度，带流水号的限量卡徽章从 2 行变 3 行，
  该行卡片从 370px 变 428px。稀有度配色本身就是要一眼分辨，这个高度换得值
- ✓ 验证：`npm run typecheck` / `npm run build` 通过；Hobby 一盒 80 张逐张量过：
  队标距卡片右边 13px、下边 14px，五档底色、文字对比度全部达标

### 2026-09-30（官方资料登记补齐：表格版检查表归档 + 名册核对脚本）

用户问「这些卡盒配置、checklist、概率信息之前是从哪里获取的」，要求记进项目，
以后新品类按同样方式取，避免信息拿偏。查了一遍：登记册（`sources/README.md`）
与系列采集记录本来就在，缺的是三件事——可执行的核对手段、表格版检查表、
以及一条能照着做的新品类流程。

- **补上 `checklist.xlsx`**：镜像站还在的官方名单表格版，列已经拆好
  （`卡号 / 人物 / 球队 / 新秀标记`），已归档并记哈希（`56AF5184…4479`）。
  PDF 版仍是权威件，但誊抄时表格版不用猜列，两份互相佐证
- **新增 `scripts/check-roster.mjs`（`npm run roster:check`）**：esbuild 打包
  `roster.ts` 后逐行对回原件，同时对上 `checklist.xlsx` 与 `checklist.txt`。
  卡号 + 人物必须命中，球队与新秀标记必须一致；命中不了时再按「人物 + 球队」
  反查，把「卡号抄错」与「名单里没这个人」分开报。人物名比对忽略重音与标点
  （官方表自己就不统一：`Dončić` 带重音、`Jakucionis` 不带）
- **核对结果**：1084 行全部对上，球队与新秀标记零出入。只查出一处官方原表缺陷——
  NBA Debut Patch Autographs 整份名单被贴了两遍，第二遍重复占用了第一遍的
  `DPA-AB` / `DPA-CJ`，`roster.ts` 里用 `DPA-ABAL` / `DPA-CJJ` 区分。
  这一处登记在脚本的 `SOURCE_DEFECTS` 里，命中时只提示不判失败
- **xlsx 解析不引依赖**：脚本用 Node 自带的 `zlib.inflateRawSync` 自己读 zip 容器，
  不为一次核对往仓库里加 `xlsx` 之类的包
- **采集流程从 6 步扩到 11 步**，每步都给了可复制的命令：找官方页 → 取原件 → 归档 →
  转文本 → 记哈希 → 生成配率 → 誊抄名册 → 核对名册 → 盒型配置 → 跑回归 → 写记录；
  并补了一张「一条数据能不能用」的判定表，以及「官方表自相矛盾时以 PDF 原件为准」的规则
- ✓ 验证：`npm run roster:check` 通过（1084 行；官方表 1149 条 + 192 条重复卡号）、
  `npm run typecheck` / `npm run build` / `npm run boxes:check` 通过
- 仍有缺口：`checklist.pdf` 的确切镜像链接找不回来了（镜像站目录列表已关闭 302、
  WordPress 接口 404、四个候选文件名全部 403），已写进登记册的待办，
  要求下次**当场**把每个文件的完整链接记进系列 README

### 2026-09-30（卡图颜色改由稀有度混色，卡片不再被拉到整行高）

上一版只改了文字区底色，卡图区还是那块深蓝紫的占位图，于是一张「稀有平行」
只有角上的 pill 是金色、卡面本体仍是一片蓝；队标也看着像贴在整行底部而不是这张卡上。

- **卡图不再用 CSS 滤镜套色**：`TIERS[tier].filter` 里的 `hue-rotate` 一直是失效的——
  占位图是 hue 250°、明度不到一成的深蓝紫，在这么暗的颜色上 hue-rotate 的负系数
  会先被裁到 0。实测 `#b487ff`（编号平行）的卡图被转成了 `rgb(0,116,63)` 绿色，
  金色档转出来依旧是蓝色。这个字段已整个删掉，不留一个假旋钮
- **卡图色相改由 `--tier` 两层层叠**：`.ce-face-hue` 用 `mix-blend-mode: color`
  拿走底图的明暗、色相与饱和度整份换成 `--tier`；`.ce-face-lift` 再用
  `mix-blend-mode: screen` 叠一层同色提亮，强度直接取档位的 `--glow`
  （`0.06 + glow * 0.6`），不另配一套数值。`.ce-face-art` 加 `isolation: isolate`
  把混色锁在卡图内部，底色也换成 `color-mix(--tier 30%, #0a0f1e)` 兜底
- 实测六档卡图的平均色相与档位主色偏差 ≤ 5°：普卡 219°、反射卡 159°、插入卡 209°、
  编号平行 265°、稀有平行 39°（金）、超稀有 338°
- **卡片不再被拉到整行高**：`.ce-card-grid` 补 `align-items: start`。网格默认
  `stretch`，一行里角标少的卡会被拉长，文字区底部那行的 `margin-top: auto`
  再把行内元素顶到行底——看着就是「贴在整行右下角」而不是贴在这张卡上。
  实测 80 张卡高度回到各自的内容高度
- 代价：同一行里角标行数不同的卡不再等高（原来靠拉伸凑齐）。等高是假的整齐，
  队标贴在哪张卡上是真的信息，取后者
- ✓ 验证：`npm run typecheck` / `npm run build` 通过；Hobby 一盒 80 张逐张量过：
  两层混色层 80/80 在位、卡图 `filter: none`、`.ce-card-grid` 为 `align-items: start`、
  队标 80/80 在位、角标 13 张照常显示；五档文字对比度重测——
  人物名 5.42–7.30:1、卡名 4.57–4.79:1，全部 ≥ 4.5:1

### 2026-09-30（队标从文字区移进卡图右下角，与档位 pill 同排）

上一版把队标放在文字区底部、和 `#AC-1` 这类角标同一行，与用户口径不符：
用户说的「卡片」是上面那张卡图，下面的球员名 / 卡种属于卡片信息，不算卡面。

- 队标移进 `.ce-face-art`，与档位 pill 同排：卡图底部新增一条 `.ce-face-bar`
  （`position: absolute; inset: auto 8px 8px`，flex + `space-between`），
  左端是 pill、右端是队标。「同一行」由同一条 flex 保证，
  **不再**两边各自绝对定位（两个绝对定位的元素迟早飘开）
- `.ce-face-bar` 加 `pointer-events: none`，不挡住卡图的 hover 缩放
- 文字区拆掉 `.ce-face-foot` 这层包装，只剩 `.ce-face-meta`（角标行）自己
  `margin-top: auto`。卡片高度仍然只由文字区决定，卡图是固定比例
- 实测 Hobby 一盒 80 张：队标 80/80 落在卡图框内，距卡图右边与底边都是 8px，
  底边与 pill 底边**逐张齐平**（差值 0），文字区里的队标数量为 0；
  底栏内 pill 与队标的最小间距 119.5px，最长档位名（`超稀有 / 1-of-1`，pill 宽 92px）
  也不会与队标相交
- ✓ 验证：`npm run typecheck` / `npm run build` 通过；截图像素抽样确认卡图右下角
  那块是白圆队徽（`rgb(121,125,150)`）而不是卡图底色（`rgb(93,45,161)`）

### 2026-09-30（文字区改成定行高，统计页补上「签字卡」）

用户提出两件事：文字区内容一长就折行、一眼看过去不齐；统计页只有拆盒数 / 出卡数 /
已拆盒型 / 编号卡，缺签字卡数。

- 文字区三块各自定死行数：球员名 1 行、卡种 2 行、角标行 1 行。
  之前只有卡种有 `min-height`（2 行），内容一长（子集名最长 33 字符、
  球员名最长 `Yanic Konan-Niederhäuser`）就会自己折行，同一排卡片的下沿参差不齐。
  现在超出的一律截断：球员名与卡种走省略号（完整文字放 `title`），
  角标行**只允许最后一个**（配率）被压窄--底栏信息本来就是按重要性排的
- 拿最窄设计下限（178px 列宽）配最坏内容压测：球员名 1 行、卡种停在第 2 行
  （自然 3 行，`scrollHeight` 49 > `clientHeight` 32 证明被截）、角标行仍是 1 行，
  压测卡与同排普通卡的文字区高度都是 115px，整盒 80 张卡高全部 450px
- 统计页加「签字卡」：汇总区（我的统计）与盒型下钻弹窗各多一格。
  口径与卡面 `AUTO` 标记、拆盒页「签字卡」完全共用：`engine/marks.ts` 新导出
  `isAutograph(group)`（`auto` + `relic`，本系列实物卡全部带签），三处都走它
- 计数不新增库表字段：服务端已按子集聚合（`pull_stats.subset_key`），
  在本地目录里把 `subset_key` 还原成子集分组再求和，目录真相仍在 TS 一侧。
  实测该用户 18 盒：签字卡 8 = `rookie-autographs-lava-lamp` 3 +
  `topps-chrome-autographs` 3 + `autographs-1980-81` 2；
  Hobby 下钻 2 = 1 + 1，与逐子集明细逐项对上
- ✓ 验证：`npm run typecheck` / `npm run build` 通过；
  80 张卡的文字区高度与卡高各自唯一（文字区 115px / 卡高 450px）

### 2026-09-30（手机端顶栏改两行，导航不再被账号按钮挤掉）

用户在手机上反映：「卡品分类 / 篮球 / 我的统计」被右边的个人中心 / 退出遮住。
实测确认不是遮挡，而是导航被 flex 压窄后裁字：390px 下三个链接的断字位置
正好落在账号按钮的左边缘，看上去就像按钮盖在上面；`elementFromPoint` 打「退出」
正中心命中的是那个按钮，导航并没有真的画上去。

- 根因：单行 flex 里只有导航是 `flex: 1`，logo（150px）与账号区（144px）
  都是 `flex-shrink: 0`，缺口只能由导航吸收。实测导航 `clientWidth`：
  320px→0、375px→7、390px→22、414px→46、430px→62、480px→112、560px→192、
  640px→272（这时才放得下 226px 的内容）。宽度不够时靠 `overflow-x: auto`
  把文字裁掉，「被掩住」的观感就是这么来的
- 修法：`max-width: 600px` 时顶栏 `flex-wrap: wrap` 改两行，导航
  `order: 3; flex: 1 1 100%` 独占第二行（`flex-basis` 必须是 `100%`，
  只写 `flex: 1` 依旧被压窄），账号区 `order: 2; margin-left: auto` 留在第一行右侧
- 品牌字标在 `374px` 以下隐藏、只留图标：375px 时 logo 右边缘 170px、
  账号区左边缘 201px，只剩 31px 余量，所以分界取 374px 而不是取整的 400px
- 实测 320 / 375 / 390 / 430 / 599 / 600 六档（带真实登录态）：顶栏高 96px、两行、
  导航宽度等于内容宽度（320px 档 270/270）、三个链接全部可见且不与账号区相交、
  页面无横向溢出；601 / 640 / 720 仍是单行 63px。顶栏最窄内容宽度 291px，
  320px 也放得下
- 踩坑：`npm run build` 之后只改视口宽度仍量到旧布局（导航 22px），
  必须 `page.reload()`；量之前还得确认登录态没被刷新掉，否则账号区会在
  「注册 / 登录」与「个人中心 / 退出」之间来回跳，量到的宽度就是假的
- ✓ 验证：`npm run typecheck` / `npm run build` 通过；上表逐档实测

### 2026-09-30（把可用数据站点的实测结果补进来源登记册）

用户要「补充 2026 年 Topps 发行的 NBA 篮球卡盒，以及各自的 checklist 与配率」，
允许从 Topps 之外的站点取数，并要求记录哪些站点能用。先做了一轮找源，
结论落进 `sources/README.md`：二级入口表补齐级别与本机可达性，新增第六节记实测。

- Topps 官网在本机彻底不可达：`www.topps.com` 与 `topps.com` 都是 403，
  `/pages/odds` 与 `/media/...` 一样，`api` / `media` / `cdn` 子域名连解析都没有，
  浏览器打开是 Cloudflare 的拦截页。A 级原件只能人工在别的网络上取
- 新找到一条 B 级通路：`www.cardboardconnection.com/wp-content/uploads/<年>/<月>/`。
  它托管 Topps 官方附件，实测 `Final_CheckList_26CUBK.pdf` 与已归档的
  `tcu26-basketball/checklist.pdf` 同为 297352 字节，是同一份官方名单；
  但它**不含配率**（同产品的 CC 文章里一个 `1:x` 都没有），也没有 Chrome Black 的文章
- 交叉验证了 Checklist Insider 指南页的配率转述：89 个不重复数值里 81 个与官方表
  逐项一致，对得上的是官方 `-EA` 列；CI 自己把通道改了名（Delight→Breaker、
  Value Box→Blaster），即便要用也得先做列映射，不能照抄
- 死路记录：`web.archive.org`、`archive.ph`、Google、DuckDuckGo、Mojeek 连不上或 403
  （Wayback 这条退路在本机不存在）；`tcdb` / `sportscardspro` / `dacardworld` /
  `steelcitycollectibles` / `fanatics` 一律 403；Bing 能开但结果与关键词无关
- Chrome Black 的配率原件确认拿不到：镜像按文件名规律试了 5 种写法 × 6 个月份目录
  （24 个）全 403，CC 没有该产品文章，猜的 5 个官方名单文件名全 404
- ✓ 验证：本轮只改 `sources/README.md`，未触碰代码

### 2026-09-30（补录筹备：归档 16 套官方原件，写出名册与配率两个转写脚本）

用户要求「补充 2026 Topps 发行的 NBA 篮球卡盒，以及各自的 checklist 与配率，
能从 Topps 官方获取最佳，其他网站也可以，并记录哪些站点能取到数」。
补录的产品有 16 个（8 套官方配率 PDF + 15 套官方名单表格版），
靠手抄做不完，所以先把采集流水线自动化。

- **推翻了上一轮的结论**。上一轮认定「镜像站没有配率 PDF」，实际是按文件名规律猜链接
  猜出来的假象。改成先把指南页 HTML 下载下来、再从 HTML 里正则抽
  `xcdn.checklistinsider.com` 开头的链接，一轮就点清了 16 个产品的全部附件：
  8 套官方配率 PDF（Chrome Updates、Topps Basketball、Chrome、Chrome Cactus Jack、
  Cosmic Chrome、NBA Hoops、Signature Class、Topps 3、Finest），
  15 套名单表格版。教训：「找不到原件」先怀疑自己的找法，写进
  `sources/README.md` 第五节
- 归档结构落成 `sources/basketball/topps/<产品>/`，与 `src/data/sets/` 同构；
  配率只有名单没有配率 PDF 的 7 套走 D 级（指南页转述），Chrome Black 连指南页
  都没有配率，单独处理
- **抽出 pypdf 的一个致命坑**：普通模式（`extract_text()`）会把空格单元格直接吞掉，
  `Base Rainbow 1:35　　　　1:9` 被压成 `Base Rainbow Green and Blue 1:35 1:9`，
  列位信息彻底消失，下游按顺序猜列必然错。量化验证过：同一页用布局模式才保留x坐标。
  所以统一改成 `extraction_mode="layout"`，脚本收进
  `scripts/extract-pdf-text.py`（配率默认布局模式，名单用 `--plain`），
  删掉各系列目录里的旧副本。**配率表必须用布局模式**写进采集流程第 4 步
- 官方配率表有三种写法：`1:X`（平均多少包出一张）、`A:B`（`4:1` 要换算成 `B/A`）、
  `-`（该渠道没有这个卡种）。旧的导入脚本写死了 `1:X` 和 TCU26 的 12 个渠道名，
  换一套表就跑不动，所以重写：渠道名改成命令行第三个参数、列位按表头算、
  `A:B` 支持、按产品登记的覆盖行、免责声明文案放宽到三种写法
- **列的归属规则是量出来的**：表头左对齐而数值居中，所以拿表头位置当左边界会错
  （`Paradox` 行的 `1:296` 结束于 380，下一列表头在 382，只看结束位会归错列）。
  最终规则分两种：写成 `-` 的表每行令牌数刚好等于列数，按顺序摆放；
  空格真的空着的表令牌数少于列数，按数值的水平中心归列，列边界取相邻表头的中间位。
  一份 PDF 里可能有好几张表（分页会重排行位），列位跟着当前表头走
- **重写后的脚本对 TCU26 输出 390 行、12 列，与已上线的
  `pack-odds.generated.ts` 逐行逐格完全一致（diff 为 0）**，
  证明新规则是旧行为的超集而不是改动
- 新增 `scripts/import-roster.mjs` 把 `checklist.xlsx` 转成 `roster.ts`：
  按「A 列有字、B 列空」认分节标题，`[Rookie]`（写在人物名后或单独一列）转成行尾 `"R"`。
  在 16 套名单上全跑通，其中 Chrome Black 复现出之前手工核对过的
  20 分节 / 556 行结果，说明分节识别正确
- `scripts/lib/xlsx.mjs`：`check-roster.mjs` 与 `import-roster.mjs` 共用同一份
  xlsx 读取实现（不引依赖，自己解 zip + 读 sharedStrings），避免两边漂移。
  顺手修掉 `` `<c …/>` `` 自闭标签被漏读的 bug（`t="s"` 写在自闭标签上时索引会漏出去）
- 同步 `sources/README.md`：目录约定改指共用脚本、采集流程第 4/6/7 步换成实际命令、
  补上「空格单元格会被吞掉，所以配率必须用布局模式」这条
- ✓ 验证：`npm run roster:check` 通过（TCU26 核对 1084 行 / 官方 1149 条 + 192 条重复卡号）；
  重写后的配率脚本对 TCU26 输出与已上线文件逐格一致（diff 0）；本轮未改任何页面代码

### 2026-09-30（补录第一个系列：Cactus Jack 上线，顺手修掉转写脚本的三处硬伤）

- 新增 `basketball/topps/tccj26-basketball`（2025-26 Topps Chrome Cactus Jack Basketball）：
  单盒型 Hobby（4 张/包 × 20 包，12 盒/箱），8 个子集 60 个卡种，
  Base 100 张 + 三套插入卡（各 8 档折射）+ 两套超短印（只有 SuperFractor）+ 两套签名
- `roster.ts` 与 `pack-odds.generated.ts` 由两个转写脚本生成，手工只写 `box.ts`。
  **平行限量只登记公开发行资料写明的档位**（插入卡黑 /10；签名橙 /25、黑 /10、红 /5；
  SuperFractor 1/1）：官方 Checklist 与产品资料都没公布 Base 彩虹各档的限量数，
  与其按配率倒推一个数字，不如按非编号展示，避免给出站不住脚的「限量」标记
- 配率脚本三处修补（都是新系列才暴露出来的）：
  1. 表头识别要求「至少两列」，而 Cactus Jack 官方表只有一列（`Odds`），于是整张表被跳过 → 放宽到一列；
  2. 判断某行是不是表头改成「命中列名的个数 ≥ min(2, 列数)」；
  3. 官方免责声明在布局模式里被折成多行，每行都被当成脏行报警 → 免责声明正则改成能吃下折行的整段
  - ✓ 改完对 TCU26 重跑仍是 390 行 / 12 列 / 无异常行，`git diff` 只有换行符提示，**零回归**
- 名册脚本一处修补：表头注释里的产品名原先取「表里第一行只有 A 列有字的内容」，
  而 Cactus Jack 那张表的第一行是一句免责声明，于是注释被写成半句英文。
  改成由命令行第 4 个参数传入，缺省退回系列目录名 —— 不再靠猜。
  （顺带发现 TCU26 的 `roster.ts` 已是手工润色过的版本，产品名参数按原值传回后 diff 为 0）
- 官方表里的 `Base Purple Mini-Diamond` 没有 `Refractor` 后缀（同档其他平行都有），
  第一版照抄指南页写成了 `Base Purple Mini-Diamond Refractor`，导致该平行配率查不到。
  `box.ts` 里加了「官方表缺行标签就报错」的前置检查，一跑就把它抖出来了
- `boxExclusives` 在「配置说明」弹窗里是可见列表，单盒型系列没有「独家」可言，
  于是给弹窗加了空列表判断：没有内容就不显示这一块（此前会留一个光秃秃的标题）
- 新增一次性核对脚本（放 `.snapshot/`，不提交）：把权重表和服务端的概率算一遍，
  再用 2 万盒蒙特卡洛对照。结果：权重合计正好 4.000000（= 每包张数）、零权重卡种 0 个，
  所有带配率的卡种实测频率与官方配率的相对偏差都在 ±5% 以内，没有「期望出现却一次都没出」的卡种
- ✓ 验证：`npm run typecheck` 通过；`npm run build` 通过；
  `npm run roster:check` 通过（Cactus Jack 核对 338 行 / 官方 338 条 + 13 条重复卡号，TCU26 不变）；
  `npm run boxes:check` 通过（5 个盒型）。`snapshots/boxes.json` 是有意扩容：
  `git diff --numstat` 为 `1264 0`，只增不删，既有盒型的每一行都没动

### 2026-09-30（补录第二、三个系列：Cosmic Chrome 与 Topps 3 上线，装配器抽出共享模块）

- 新增 `basketball/topps/tcosmic26-basketball`（2025-26 Topps Cosmic Chrome Basketball）：
  单盒型 Hobby（每包 4 张），18 个子集 124 个卡种
- 新增 `basketball/topps/tthree26-basketball`（2025-26 Topps 3 Basketball）：
  单盒型 Hobby（每包 4 张 × 1 包，官方没公布每箱盒数所以留 0），28 个子集 150 个卡种。
  这盒的特殊之处：官方配率是按包算的，而每盒只有 1 包，所以配率加起来直接就是
  「每盒期望」——签名类 2.963 张、非签名类 1.037 张，官方规格写的是「每盒三张签名卡 +
  一张非签名卡」，两边各自对得上
- **装配器抽出共享模块** `src/data/sets/basketball/topps/shared/assemble.ts`：
  一份 `odds` 表 + 一份 `sections` 名册 + 一组 `subsets` 方案 + 一组 `boxes` 规格，
  `assembleBoxes(config)` 生成整套盒型定义。多个渠道列（Hobby / Jumbo / FDI / …）
  不再各写一份盒型，只换 `column`。老的两个系列（`tcu26` / `tccj26`）仍是本地 `BOX_CONFIGS` 写法，
  语义相同，暂未合并
- 装配器两处修补，都是 Topps 3 逼出来的：
  1. **两人/三人卡合并成一张**。官方名册里 `DUAL_*` / `TRIPLE_*` 这类子集会给同一个卡号排两三行，
     第一版把它们当成「同号重复」直接报错（34 个子集报错）。现在同一卡号上的不同球员合并成一条，
     球员名与球队名各用 ` / ` 串起来（球队相同的只留一次），卡号仍然唯一。
     同一卡号上再出现同一个球员是真的重复，照旧建两条交给自检报错
  2. **每包残差下限可调**。默认给普卡留 0.5 的权重，而 Topps 3 的官方配率加起来已经 3.773，
     残差被顶到 0.5 后整盒权重变成 4.273（超过每包 4 张，自检报错）。
     新增 `minBaseWeight`（默认 0.5），Topps 3 里设成 0.2，让残差回到官方残差 0.227
- 配率脚本新增 `LABEL_PATCHES`：官方 PDF 会把行标签与配率黏在一起
  （`Rookie 3 Patch Autographs Horizontal Bronze1:23`），标签太宽、第一列排不下。
  看全 9 张已生成的表，这种黏连只出现在 Topps 3 的三行，改标签 + `ROW_PATCHES` 补第一列，
  生成的 `.ts` 标头会把这两类修正列出来
- 名册侧的官方原表缺陷同样走脚本补丁表：`import-roster.mjs` 的 `ROSTER_PATCHES`
  与 `check-roster.mjs` 的 `SOURCE_DEFECTS`。Cosmic Chrome 的 `BASE CARDS` 把 48 号
  写成了 101（与 `BASE CARDS II` 的 101 撞号），代码与核对脚本按官方本来的 48 号对齐
- `sources/README.md` 三处修订：
  1. D 级授权转述件的范围从「只对配率」扩到「配率与平行限量数」，
     理由是官方配率表不带编号、官方产品页本机 403，而限量数能用
     **张数 × 编号 × 配率 ≈ 本系列总印量** 这条恒等式交叉验证；
     Topps 3 的指南页 137 个样本取中位数得到 23,250 包，十几个互不相干的小节都算回同一个数
  2. 第四节从 1 行扩成 17 行，把 2025-26 赛季 Topps 篮球 17 个系列产品的采集情况列全
  3. 第三方指南页的正文不提交进仓库，只登记 URL 与抽出文本的哈希
- 新增系列采集记录 `sources/basketball/topps/tthree26-basketball/README.md`
  （来源表含链接与 SHA-256、恒等式验算表、盒型配置、已知问题）
- ✓ 验证：`npm run typecheck` 通过；`npm run build` 通过；`npm run roster:check` 通过
  （17 个系列全部对上，Topps 3 核对 1171 行 / 官方 1171 条 + 32 条多人卡卡号）；
  `npm run boxes:check` 通过（7 个盒型）；权重自检 7 个盒型的权重合计都正好等于每包张数；
  Topps 3 跑 3000 盒蒙特卡洛无异常；`snapshots/boxes.json` 差值 `4396 0`，仍然只增不删

### 2026-09-30（补录第四个系列：Finest 上线，配率归列改为拿官方原件的真实横坐标核对）

- 新增 `basketball/topps/tfinest26-basketball`（2025-26 Topps Finest Basketball）：
  两种盒型 Hobby（每包 10 张 × 6 包，每盒 2 张签名）与 Breaker Delight
  （每包 10 张 × 1 包，每盒 3 张签名），17 个子集 764 张卡、217 行配率
- 平行限量数来自 Checklist Insider 的指南页（官方配率表不带编号），
  用 **张数 × 编号 × 配率 ≈ 本系列总印量** 验算：Hobby 侧十几个互不相干的平行都算回约
  35 万包，Breaker 侧算回 1.7 万～2 万包。**同一系列两种盒型是两套印量口径，不能互推**
- 配率归列新增独立核对工具 `scripts/verify-odds-columns.py`：拿官方 PDF 里每个文本块的
  **真实横坐标**聚出列位，逐格与生成文件比对，7 个系列合计 1185 格全部「不一致 0 格」。
  为什么非做不可：提取件把横坐标折成了字符下标，而两端对齐的页面里每一行是按自己的
  标签宽度排位的，同一列在不同行能差十几个字符——按下标归列会偶尔差一列，而且不报错
  - PDF 里的数值常被拆成多个文本块（`1:20` 是 `1:` 与 `20` 两块），内容流里的顺序还会反。
    合并只接受能拼成合法数值的拼法：`1` + `3:` **不能**拼成 `13`，否则会凭空造出一个配率
  - 一张纸印好几张表（Hoops 一页四张表）、列数太多（Chrome Update 十二列）、
    标签被两端对齐撑开的页面聚不出列位，报 `SKIP`。这三处改用第二条保证：看导入脚本
    自己报的「贴着列边界」的行——必须报「没有需要留意的行」，三个系列都报了这一句
- Finest 的四行插入卡 SuperFractor 被提取件摆到了拆卡盒列，拿原件横坐标核对确认它们
  在 Hobby 列；登记进 `ROW_PATCHES` 后重新生成，生成文件标头会把这次用到的修正列出来
- `scripts/import-pack-odds.mjs` 标头补上「令牌数等于列数时按顺序对号入座」的例外，
  以及「归列必须拿原件横坐标核对、错了改 `ROW_PATCHES` 而不改规则」的硬约束
- 新增系列采集记录 `sources/basketball/topps/tfinest26-basketball/README.md`
  （来源表含链接与 SHA-256、两套盒型的印量验算表、子集张数表、签名数反查、已知问题 7 条）
- ✓ 验证：`npm run typecheck` 通过；`npm run build` 通过（101 个模块）；
  `npm run boxes:check` 通过（9 个盒型）；`npm run roster:check` 通过
  （17 个系列全部对上，Finest 核对 764 行 / 官方 764 条 + 20 条重复卡号）；
  7 个系列按文档里的命令重新生成，除 Finest 的四行修正外**其余 6 个系列零差异**

### 2026-09-30（补录第五个系列：Signature Class 上线，新增印量恒等式核对工具）

- 新增 `basketball/topps/tsig26-basketball`（2025-26 Topps Signature Class Basketball）：
  四种盒型 Hobby（4 张/包 × 8 包，每盒 2 张签名）、Hobby Jumbo（10 × 4，每盒 4 张签名）、
  Value Blaster（7 × 6）、Mega（8 × 10），31 个子集、名册 1098 行、配率 199 行
- **纸质普卡与折射版普卡是两套不同的球员**，开成四个 base 子集：68 号是
  `Anthony Edwards` / `Nick Smith Jr.`，89 号是 `Zach LaVine` / `Zach Lavine`
  （官方表格版两种写法，原样保留）；新秀 129 号之后分叉，纸质 49 行（101–149）、
  折射版 50 行（101–150），`Carter Bryant` 只在折射版 148 号。
  合成一个子集会让同号的两张卡并成一张
- 官方表格版**整行漏了纸质老兵普卡的 68 号**（67 直接跳到 69），
  按指南页的 100 张老将列表与逐卡索引补回：`import-roster.mjs` 新增 `INSERT_PATCHES`
  （分节标题 + 插在哪一号之前 + 整行内容，定位不到分节或该号已存在会报错），
  `check-roster.mjs` 用 `absentFromSheet: true` 记成「已知源表缺陷」，两处都写明依据
- **老兵普卡走残差**：官方表每一行的配率是「每包命中一次」的概率，四列各行加起来
  只有 2.3746 / 5.9649 / 1.4948 / 1.8094，不足每包张数（4 / 10 / 7 / 8），
  差额落在纸质老兵普卡上（1.6254 / 4.0351 / 5.5052 / 6.1906），
  「每包张数 = 各档权重之和」在四个盒型里都精确成立
  - 核对方法从「逐行对回原件」升级成「先算一遍再对」：新增
    `scripts/check-print-runs.ts`（`npm run print:check [-- <产品 key 片段>]`），
    把「张数 × 编号 × 配率」逐档算出来，看同一批平行是否落在同一个包数上。
    报告式、不判定失败——官方表本身就有取整与笔误
  - 算下来：Hobby 侧 4 个普卡子集与 8 个插入卡子集都回同一批（142.6 万～146.6 万包），
    签名卡只有六成（约 84 万包，落 77 万～98 万），四个渠道各是一批
    （Jumbo 约 30 万、Blaster 约 1217 万、Mega 约 1712 万），不能互推
  - 官方表自己也对不上：纸质老兵普卡的 `Magenta 1:81` 偏高 42%；
    该子集在 Hobby Jumbo 列那四档偏高 43%～498%；Mega 列的 `Coral 1:120` 与
    `Yellow 1:89` 偏低 79%（同一档在 Value Blaster 列 1:407 / 1:314 与本列其余档位吻合）。
    600 档里 52 档偏离中位数 15% 以上，其中一半是 `/1`、`/5` 这种取整。**原表如此，照抄**
- 配率导入新增两处开关：`--relaxed`（只认连续两个以上空格当格子边界）与
  `--labels=pack-odds-plain.txt`（拿同一份 PDF 的普通模式提取件当词典清理标签），
  加上 `joinValues` 把被双空格切开的 `5:  1` 合回一格——老兵普卡一度因此丢了
  Value Blaster 与 Mega 两列；`scripts/verify-odds-columns.py` 给聚不出列位的页面
  （本系列是第 1 页）加了按行退路，本系列 728 格「不一致 0 格」
- 新增系列采集记录 `sources/basketball/topps/tsig26-basketball/README.md`
  （来源表含链接与 SHA-256、恒等式验算表、四盒型配置与残差表、指南页笔误 4 处、
  已知问题 9 条）；`sources/README.md` 补上 `print:check`、`INSERT_PATCHES`、
  两处导入开关与镜像文件名的第三种写法，并把本系列登记进第四节
- 盒型快照基线重建（`snapshots/boxes.json` 新增 11602 行、无删除）：本次是**新增**四个盒型，
  属有意变更，没有改动任何既有盒型的输出，种子格式未变
- ✓ 验证：`npm run typecheck` 通过；`npm run roster:check` 通过（17 个系列，
  Signature Class 核对 1098 行 / 官方 969 条 + 164 行重复卡号，另有 1 条已知源表缺陷）；
  `npm run boxes:check` 通过（13 个盒型）；`npm run print:check` 只报已知的源表异常

### 2026-09-30（补录第六个系列：NBA Hoops 上线，导入器新增组合签名卡的组号拆分）

- 新增 `basketball/topps/thoops26-basketball`（2025-26 Topps NBA Hoops Basketball）：
  五种盒型 Hobby（8 张/包 × 20 包，每盒 1 张签名）、Hobby Jumbo（20 × 10，每盒 2 张）、
  Value Blaster（8 × 7）、Hanger（25 × 1，每箱 64）、Fanatics Blaster（8 × 8，官方没写每箱盒数），
  25 个子集、名册 1091 行（29 个分节）、配率 193 行 × 5 列
- **官方表格版给组合签名卡只写到组号**：同一组里的几张卡共用一个号（`HRD-A` 底下 5 张双签、
  `HRS-D` 四张、单签的 `HHS-G` 三张）。按卡号归并会并成一张
  （`Hoops Rookies Duals` 25 → 11 张、`Hoops 1989 Signatures` 60 → 52 张），
  所以 `import-roster.mjs` 新增 `GROUPED_CARDS` 组号表 + `applyGroupedCards()`：
  按「组号 + 卡序号」拆开（本系列 45 组，`playersPerCard` 按分节是 1 / 2 / 3，除不尽报错），
  `check-roster.mjs` 增 `DERIVED_CARD_NOS` 同步折叠回去，每节只记一条「已知源表缺陷」
  - 第一版按「连续同号」切，同一组的两张卡中间夹着别的组就会漏切
    （`Hoops Rookie Signatures` 仍少一张），改成按卡号整体归堆后正常
- **普卡走残差，五个盒型都指 `Base`**：官方表每一行的配率是「每包命中一次」的概率，
  非普卡各行加起来只有 1.01 / 3.00 / 0.93 / 4.10 / 0.80，不足每包张数（8 / 20 / 8 / 25 / 8），
  差额落在 `Base` 一行上（6.99 / 17.00 / 7.07 / 20.90 / 7.20），与官方 `Base` 的
  1:7、1:15、1:7、1:19、1:7 基本吻合，「每包张数 = 各档权重之和」在五个盒型里精确成立
- 普卡平行分两套：Hobby / Jumbo 走 `Pixel Burst`、零售三盒走 `Light Burst`，
  官方表为空的那一列就不进该盒型；`Orange Hoops` 只在 Hanger、`Fanatics` 只在 Fanatics、
  `Green Hoops` 只在 Value Blaster 与 Fanatics
- 新增系列采集记录 `sources/basketball/topps/thoops26-basketball/README.md`
  （来源表含链接与 SHA-256、逐渠道包数表、五盒型配置与残差表、已知问题 6 条），
  `sources/README.md` 第四节补上本系列的上线盒型与记录链接
- 盒型快照基线重建（`snapshots/boxes.json` 新增 9451 行、**删除 0 行**）：本次是新增五个盒型，
  属有意变更，没有改动任何既有盒型的输出，种子格式未变
- ✓ 验证：`npm run typecheck`、`npm run build` 通过；`npm run roster:check` 通过
  （thoops26 核对 1091 行 / 官方 1086 条 + 425 条重复卡号，另有 8 条已知源表缺陷）；
  `npm run boxes:snapshot` + `npm run boxes:check` 通过（18 个盒型）；
  `npm run print:check -- thoops26` 报 5 个盒型、45 个可核对子集、306 个档位，
  17 档偏离中位数 15% 以上（集中在官方表自己对不上的 `Rainbow Yellow /275`、
  `Rainbow Teal /299` 与低编号取整档位）

### 2026-09-30（补录第七个系列：Topps 旗舰上线，校对脚本补上「标签被拆散」的漏洞）

- 新增 `basketball/topps/tbb26-basketball`（2025-26 Topps Basketball，Topps 拿回 NBA 版权后的
  旗舰系列）：四个盒型 Hobby（20 张/包 × 12 包，每箱 12 盒）、Hobby Jumbo（40 × 10，8）、
  Mega（14 × 16，20）、Value Blaster（12 × 12），44 个子集、名册 2153 行、配率 351 行 × 17 列
  - 未收录 `Black Friday Target Blaster`、`Costco Super Box`、`Fanatics Value Blaster`：
    官方表有这三个渠道的配率列，但没有对应的包装张数，配不出权重（专属卡种落到「本盒不含」）
  - 普卡走残差：官方表没有 `BASE` 这一行，普卡配率由 17 条普卡平行行隐含给出，
    四个盒型都 `residualLabel: "BASE"`，「每包张数 = 各档权重之和」精确成立
    （20.0000 / 40.0000 / 14.0000 / 12.0000）
- **这一份提取件是至今最乱的**：表头是多行的、长标签会折行、超宽标签那一行的第一格数值
  被顶到后一列。新增 `scripts/prepare-pack-odds.mjs` 先整理（只挪位置、不改数值），
  生成文件的「预处理」注释里写明这一步
- **导入器新增两类「官方表自己坏掉的格子」**：
  - 配率被表格软件存成时间值（`01:11:00` → 1:11）或天数序列值
    （`4.4444444444444446E-2` → 0.0444 天 → 1:04），按「时:分」还原；
    同一行的两个 Display 列一正一残、还原出来都是 4，正好互相印证
  - `ROW_PATCHES` 新增 tbb26 的五条整行覆盖：数字被印重复一位
    （`1:5,0016`、`1:1,1304`、`1:15.282`、`1:19,9556`、`1:6,6632`），
    每格都拿同族同渠道的比例定回来，依据逐条写在注释里
  - `ROW_PATCHES` 的产品键改为从**输出路径**推：此前从输入路径推，
    而提取件在 `.snapshot/` 下，键对不上 → 补丁静默失效（生成文件里还是坏值）
  - 第六格（`1980-81 Topps Basketball Rookie Autographs` 的两个 Fat Pack 格印成 `1:3,2991`）
    **故意不改**：数字串只有 `32,991` 一种读法，而同族比例指向 `1:2,991`（差 11 倍），
    改成 2,991 要动一位数字，属于猜，所以照数字串保留并写进系列 README
- **校对脚本 `verify-odds-columns.py` 补上一个大漏洞**：此前只核「标签能对上生成文件」的行，
  官方 PDF 把标签拆散的行（`1980- BASKETBALL ROOKIE AUTOGRAPH …` 中间少了 `81 TOPPS`、
  `8 BIT BALLERS` 整族）会被**静默跳过**——所以「不一致 0 格」其实是少核了 561 格。
  改法：①标签按后缀补认（后缀短于 10 个字符不认，避免撞上正文碎片）；
  ②行首多出一个标签碎片时丢掉；③两条都不行就按页内位置对齐（前后邻居都能对上、
  且间隔格数正好相等才用）；④**核不到的行必须打印出来**，让覆盖率的洞不能再装成干净的一轮
  - 核到的格子从 5355 涨到 **5916**（共约 5967），不一致仍是 0；
    另报 56 行按后缀补认、10 行按位置对齐、75 行不可达（表头/表尾碎片与 3 个短行）
- 新增 `KNOWN_DEFECTS`（校对脚本）：上面那 12 格已知缺陷不再算「不一致」，改成打印说明，
  依据是「生成文件里按同族比例还原成的值」
- 装配器 `assemble.ts`：「本盒不含」里同一盒型的区域列展示名相同（Value Box SE / EA / CEE），
  去重后再拼 `where`，不再显示成「Value Blaster / Value Blaster / Value Blaster」
- 新增系列采集记录 `sources/basketball/topps/tbb26-basketball/README.md`（来源表含链接与
  SHA-256、恒等式验算、四盒型配置、17 列的列等价关系、已知问题 5 条），
  `sources/README.md` 第四节补上本系列的上线盒型与记录链接
- 盒型快照基线重建（`snapshots/boxes.json`，22 个盒型）：本次是新增四个盒型，属有意变更
- ✓ 验证：`npm run typecheck`、`npm run build` 通过；
  `node scripts/check-roster.mjs src/data/sets/basketball/topps/tbb26-basketball` 报
  「核对 2153 行，官方表 2128 条 + 89 条重复卡号」，结论「名册与官方 Checklist 一致」；
  `npm run boxes:snapshot` + `npm run boxes:check` 通过（22 个盒型）；
  `py -3 scripts/verify-odds-columns.py sources/basketball/topps/tbb26-basketball/pack-odds.pdf
  src/data/sets/basketball/topps/tbb26-basketball/pack-odds.generated.ts`
  核到 5916 格、不一致 0 格；`npm run print:check -- tbb26` 报 4 个盒型、94 个可核对子集、
  539 个档位，28 档偏离中位数 15% 以上（集中在渠道专属平行与残差折算出来的少数格）

### 2026-10-01（拆盒补上金额：盒价登记一次，卡价按规则推导）

需求原文是「选一款盒子，在多个平台上查当天均价（RMB），每张卡也去公开平台查最新售价，
算出这次花了多少钱、开了多少钱」，并明确要求**先评估可行性**。评估结论：不可行，
所以改成了另一条路，改造点如下。

- **可行性实测（21 个目标，Chrome UA，12 秒超时，脚本 `scripts/probe-price-sites.mjs`）**：
  - 能读的只有 3 类：`www.cardhobby.com.cn`（卡淘，服务端渲染、直接出 ￥ 价格）、
    汇率 `open.er-api.com` / `api.frankfurter.app` / 中国银行牌价页、
    `checklistinsider.com`（只有配率没有价）
  - 403：eBay、130point、PriceCharting、Card Ladder、PSACard、COMC、
    DA Card World、Steel City、SportsCardsPro、TCDB、StockX、topps.com
  - 反爬壳（返回挑战页而不是数据）：Blowout、Beckett、淘宝、得物、闲鱼、转转、京东、7788
  - 网络不通：Yahoo JP、jp.mercari、ruten、shopee.tw、carousell
  - **卡淘也救不了这个需求**：它的列表页能读，但搜索是 Vue SPA，按盒名/球员名检索
    拿不到结果，而且只有「起拍 / 一口价」没有「成交价」
  - 结论：**「每张卡实时查价」这件事没有可落地的数据源**，不是工程量问题
- **改成哪条路（用户拍板）**：价格**登记进仓库一次**，之后本地按规则算，
  不再联网查价；计算是纯函数，所以同一盒任何时候算出来都一样
- **两层价格**：
  - 盒价：22 个盒型全部登记（`src/data/prices/boxes.ts`），来源 Topps 零售渠道，
    22 条 `confidence` 全部是 `reference`（不是成交价，是零售参考价）
  - 卡价：`src/data/prices/card-values.ts` 一张基准矩阵（普卡/平行/插入/自动/实物/SSP 各 6 档）
    × 稀有度系数 × 球员档位系数（超巨 ×4 / 全明星 ×2 / 新秀 ×1.4）
    × 首尾编号加成（×1.5 / ×1.3），下限 ¥0.01
  - 新增 `src/data/prices/products.ts`：**系列系数**（`PRODUCT_VALUE_FACTORS`）。
    一张矩阵要同时服务 8 个系列，靠这个系数拉开档次；这组数是**标定值**，
    由盒价回本率反推，文件里写明「未登记的系列一律按 1 倍」
- **4 个盒价按回本率修过**：`tccj26` 2880→2600、`tcosmic26` 2160→1600、
  `tthree26` 650→2200、`tbb26-value-box` 180→240。
  不修的话只能给这几个系列塞极端系数，那等于把盒价写反了
- **新增核对脚本 `npm run prices:check`**（`scripts/check-prices.ts`，三段）：
  ① 线上盒型是否都登记了盒价；② 球员分级表的拼写是否都在名册里；
  ③ 每盒型模拟 40 盒，回本率中位数必须在 25%–100% 之间、单盒型在 15%–130% 之间
  - 第②段补上**归一化**才跑得通：名册里的名字是从官方 Checklist 抄的，
    同一球员各系列写法不一（`Alperun Sengun`、`Egor Dëmin`、`Bennedict mathurin`），
    比对前统一去掉大小写 / 变音符号 / 标点 / 多余空格
  - 归一化当场揪出两个真错：`"Myles Turner "`（尾随空格）、
    `Amen Thompson` 同时被标成全明星和超巨（重复）；都已修
  - 最终结果：盒价 22/22、名册 624 人分级 96 人、回本率中位数 50.0%
    （最低 `tbb26-hobby` 30.9%，最高 `tbb26-value-box` 80.2%），结论「价格表核对通过」
- **价格来源登记册 `sources/prices/README.md`**：上面那张实测矩阵、卡淘的抽取方式、
  两层定价法、置信度三档的含义、以及复核命令都写在这里；
  用户要求「记录可以成功获取的站点信息，避免后续频繁换站点算价」，这就是那份记录
- **`breaks` 表升到 schema v4**：加 `cost_rmb` / `value_rmb`（`REAL NOT NULL DEFAULT 0`）。
  存**结果**而不是价格表引用 —— 价格表以后一定会改，历史记录不该跟着变；
  价格表上线前的记录两者为 0，前端显示成「—」。
  迁移件 `migrations/004-break-values.sql`，同目录新增 `migrations/README.md` 写清约定
  （ALTER 没有 `IF NOT EXISTS`、只跑一次、改完要同步 `schema.sql`）
- **老记录回填（`npm run db:backfill`，`scripts/backfill-break-values.ts`）**：
  这条能成立的关键是**开盒的随机数只由「盒型 + 种子文本」决定**，而这两样每次都原样存进了
  `breaks`，所以每条老记录都能重放一遍，拿到当时开出的卡，再按当前价格表算钱。
  回填结果 = 「当时的卡按现在的价格算值多少」，是一条能解释的数字，不是补一个平均数进去
  - 盒价取 `box_key` 查表，卡价取重放后的卡逐张算再求和
  - 查不到的盒型（下架 / 改名）跳过并打印，不猜价
  - 只写变化的行，跑第二遍报「需要更新 0 条」，幂等
  - 本地实测：18 条记录全部回填，合计购入 ¥22140 / 合计售出 ¥6361.15
- **前端四处改动**：
  1. 卡面文字区下方新增一行「估值 ¥x.xx」（`CardFace.vue` 新增 `value` 属性）。
     它跟卡面本体无关，所以价格怎么算由调用方决定，组件只负责显示；
     这一行共用底部 `margin-top:auto` 的留白，卡面高度仍然完全一致
  2. 「本盒概况」下方新增金额行：购入 / 售出 / 盈亏（盈绿亏红）
  3. 删掉「种子 xxxxxx 复现这一盒」和「本次拆盒已计入统计」两块
     （用户原话：种子在统计里能看到，提示则完全多余）
  4. 统计页「拆盒记录」新增「购入 / 售出」一列；
     「查看统计」弹窗顶部新增累计购入 / 累计售出 / 盈亏
- **窄屏布局踩坑**：金额行一开始写成固定三列，在 600px 视口下概览卡只有 267px 宽，
  三格各 70px 装不下「¥1080.00」，被截成省略号。
  改成 `repeat(auto-fit, minmax(84px, 1fr))` 后自己会掉成两格一行；
  实测 1280 / 600 / 390 / 320 四档都不截断、无横向溢出、卡面等高
- ✓ 验证：`npm run typecheck`、`npm run build` 通过；
  `npm run boxes:check` 报「盒型行为与快照一致（22 个盒型）」；
  `npm run prices:check` 通过；`npm run db:backfill` 本地跑两遍（第二遍 0 条更新）；
  本地 `npx wrangler pages dev dist --port 8788` 实拆 6 盒（tbb26-hobby ×4、
  thoops26-hobby ×2）逐一核对：概况金额、卡面估值、拆盒记录列、弹窗累计全部正确
  （例：4 盒 tbb26-hobby 累计购入 ¥4320.00 = 4 × 1080，累计售出 ¥1290.25 与四条记录逐条相加一致）

### 2026-10-01（新系列盒型名补全：统计页不再只显示「Hobby」「Value Blaster」）

- **问题**：`thoops26` / `tbb26` 两个系列的盒型 `name` 只写了盒型本身
  （`Hobby` / `Hobby Jumbo` / `Mega` / `Value Blaster` / `Hanger` / `Fanatics`），
  而 `tcu26` 等七个系列写的是「产品全名 + 盒型 + Box」。
  盒型名是全站唯一一处用来区分盒型的展示文本，统计页「按盒子」与「拆盒记录」
  两张表都直接显示它，于是一屏里七个完整名和七个「Hobby」混在一起
- **成因**：`name` 只是数据里的一个字符串，既没有约定也没有检查。
  补录系列时按「盒型名」的字面意思填了短名，而 `snapshots/boxes.json` 又是在填错
  **之后**才建的基线 —— 快照只能发现「改没改」，发现不了「对不对」，
  于是把它锁成了预期值
- **修法**：九个盒型的 `name` 补成「产品全名 + 盒型 + Box」，例如
  `2025-26 Topps Basketball Value Blaster Box`、
  `2025-26 Topps NBA Hoops Basketball Value Blaster Box`，
  与 `tsig26` 已有的 `2025-26 Topps Signature Class Basketball Value Blaster Box` 写法对齐
- **补了一道数据自检**：`defineBox()` 新增一条 —— `name` 必须以年份开头
  （即「产品全名 + 盒型」），只写 `Hobby` 这种短名在 `npm run dev` 启动时直接抛错。
  放在数据自检里而不是快照里，是因为快照保证不了「对」，自检才能
- **全量核对方式**：`Select-String -Pattern 'slug:\s*"' -Context 0,2` 把 22 个盒型的
  `slug` 与紧跟的 `name` 一起打出来逐条看，确认除这九个之外都合规
- 盒型快照重刷：`snapshots/boxes.json` 用 `git diff --unified=0` 逐行核对，
  **只动了 9 行 `name`**，配率 / 权重 / 拆盒结果一点没变
- **D1 的 `boxes` 镜像表里还是旧名**：那张表只是对账用的副本，页面不读它，
  所以线上显示已经是对的；下次跑目录同步（`POST /api/catalog/sync`）会自动覆盖掉
  （`buildCatalogPayload()` 生成的盒型负载带的就是新名）
- ✓ 验证：`npm run typecheck`、`npm run build`、`npm run boxes:check`、
  `npm run prices:check` 全通过；本地 `npx wrangler pages dev dist --port 8788`
  里给统计页造了四条覆盖五个新盒型的记录，实测「按盒子」与「拆盒记录」都显示完整名，
  产品页盒型卡与拆盒页标题同步更新，320 / 390px 下无横向溢出、文字不截断

### 2026-10-01（用卡淘真实成交价重新标定卡价模型）

- **问题**：`PRODUCT_VALUE_FACTORS` 八个系列系数是「把回本率调到 45%~60%」反推出来的，
  整条链路上只有盒价一个锚，没有任何一条卡价数据参与。于是系列之间的相对贵贱全凭手感
   —— 一直把旗舰 Topps Basketball 当成 0.95 的中位基准，把 Cosmic Chrome 抬到 3.1，
  这两个判断都没有依据。先把「能不能拿到真实成交价」验证掉，再谈改不改系数。
- **验证方式**：用真实浏览器打开卡淘检索页，逐条记录它发出的网络请求。
  之前一直以为检索页是前端渲染拿不到数据，实际上它调的
  `/NewCommodity/SearchCommodity` 是个普通 JSON 接口，不需要登录、不需要 Cookie，
  普通 Node `fetch` 带上浏览器 UA 和 `Referer` 就能调。
  `searchJson=[{"Key":"Status","Value":-2}]` 取「已售出」记录，单条记录里的
  `LowestPrice` 就是**成交价**（`Price` 恒为 `"1.00"`，是起拍价，不是成交价）。
  完整参数与字段表已写进 `sources/prices/README.md`。
- **但逐张卡的真实价拿不到**，四个原因叠在一起：
  1. 检索结果里**只有标题字符串**，没有结构化的球员 / 系列 / 编号字段；
  2. `searchKey` 是**子串匹配不是分词**，`Topps Basketball Luka Doncic` 只剩 23 条，
     而 `Topps Basketball` 有 29,469 条，词序和写法都会把结果带偏；
  3. 标题里塞满了「打包 / 多张 / 编号 / 瑕疵」，同一个关键词的价格能从 ￥2 铺到 ￥336；
  4. 我们的卡面把普通卡一律渲染成 `Base`，本来就丢掉了平行版身份，即使有价也对不上。
  所以「拆盒时逐张查当天真实价」这条路走不通，成交价只能用来**标定**模型。
- **定量取样的四个坑**（都踩过并已修正，口径写进 `sources/prices/README.md`）：
  1. **￥1 兜底价**。绝大多数成交正好落在 ￥1，那是只有一个人出价的起拍价兜底，
     不是市场价。改成只统计 `PriceCount >= 2` 的样本后，各系列中位数才变得单调；
  2. **分页上限**。原以为能翻 1,200~1,500 条，实测 `pageIndex` 到第 8 页就到头
     （约 480 条，`TotalCount` 再大也翻不下去）。加页码没用，只能换关键词；
  3. **同一个卖家的标题被塞进多个系列名**，一张卡同时落进好几个系列，
     把最宽泛的那个关键词（Topps Basketball）抬成虚高。改成**互斥分桶**：每条只进
     最具体的那一个桶，在一份合并样本上分桶，不再按系列分别检索；
  4. **姓氏匹配要加词边界**。没有 `\b` 时姓氏 `burton` 会命中 `Haliburton`，
     凭空造出一个高价样本。
- **标定分两步**，因为两侧的绝对值不是一个量级：
  1. **形状取自成交价**。互斥分桶 + 噪声过滤后取「出价 ≥2 次的中位数」互相作比，
     结论和直觉相反 —— **旗舰 Topps Basketball 是最便宜的一档**，
     而 Cactus Jack、Finest 这类「单包贵、卡种少」的系列单张明显更贵；
  2. **水位由盒价钉住**。上表绝对值是国内二级市场，盒价是北美零售，两者差 2~8 倍，
     直接照搬比值会让回本率冲到 120% 以上。密封盒不可能长期回本超过 100%，
     所以把整组比值乘一个统一系数 `k`，只动水位不动比例。
- **顺带标定了人物档位**：按球员分组后「出价 ≥2 次的中位数」从 ￥2.55（全明星档）
  到 ￥13.55（顶级档）铺开，普通球员基本贴着 ￥1~2，也就是顶级档对普通球员的溢价在
  5~10 倍，而模型里是 4 倍。直接照搬会把回本率顶出区间，所以只取区间下沿：
  `SUPERSTAR_FACTOR` 4 → **6**，`ALL_STAR_FACTOR` 2 → **1.5**。
  两档必须一起动：名册平均系数 1.231 → 1.250 基本不变，水位差额由系列系数一并收回。
- **改了什么**（`k` 解出 0.6085）：

  | 系列 | 改前 | 改后 |
  | --- | --- | --- |
  | Topps Basketball（旗舰） | 0.95 | **0.578** |
  | Topps NBA Hoops | 1.05 | 0.961 |
  | Topps Signature Class | 1.15 | 1.126 |
  | Topps Chrome Update | 1.45 | 1.324 |
  | Topps Cosmic Chrome | 3.10 | **2.186** |
  | Topps Finest | 1.00 | **1.483** |
  | Topps Cactus Jack | 4.20 | 3.903 |
  | Topps 3 | 0.62 | 0.62（无样本，不动） |

- **结果**：回本率中位数 50.0% → 50.4%，区间 30.9%~80.2% → 19.6%~77.8%。
  区间变宽是**有意**的：以前是硬把每个系列都塞进 45%~60%，现在是让差异来自真实成交价。
  最明显的是 `tbb26` 四个盒型（30.9%~80.2% → 19.6%~53.4%）收窄到同一档，
  以及 `tfinest26` 从 47% / 51% 抬到 78% / 77%。
- **明确没解决的**：`tfinest26` 只有 11 条干净样本（最脆的一格）；
  Topps 3 完全没有样本（该系列几乎只出签名卡，全被噪声过滤器滤掉），系数保持原值；
  `card-values.ts` 里那张按「变体 + 球员」精确命中的 `EXPLICIT` 表**依然是空的** ——
  想填它得先有能对上的数据源，目前没有。
- 采样脚本是临时的（`calibrate3.ts` / `recalibrate.ts` / `solve-factors.ts`），
  跑完即删；**可复核的是 `sources/prices/README.md` 里那张分桶统计表**，
  数据、口径、结论都在那儿，改系数时照着重跑 `npm run prices:check` 即可。
- ✓ 验证：`npm run typecheck`、`npm run build`、`npm run boxes:check`（22 个盒型一致）、
  `npm run prices:check`（中位数 50.4%，区间 19.6%~77.8%）全通过

### 2026-10-01（盒价改用官方发售价；顺带把「还有哪里能查卡价」问清楚）

- **两个问题一起问的**：盒价一直写「发行商零售参考价」，实际是拿北美零售渠道的让步价
  折算的，比官方发售价低一截，于是「开一盒花多少钱」不是官方口径；
  而开盒后的收益估算要想有意义，盒价和卡价得同源。所以这次同时做两件事：
  **盒价换成发行商官方发售价**，以及**把还有哪些平台能查卡价穿刺一遍**。
- **卡价来源：能用接口的都要钱，不要钱的都不是运动卡。** 逐站打接口路径，五类结果：
  1. **有接口、要付费令牌**：PriceCharting 与 SportsCardsPro 直接返回
     `Must provide an access token` —— 这是唯一一条能持续取运动卡成交价的路径，
     但要付费，暂不接入；
  2. **有接口、要凭据**：TCGplayer 401、JustTCG 401、CardTrader 401、
     Cardmarket 410（已迁到 `apiv2.cardmarket.com`）、PSA 公开接口 429
     （`maximum admitted 100 per Day`，免密钥但每天 100 次）；
  3. **eBay**：老的 Finding 接口 418 已退役，新的换令牌端点存在
     （返回 405 = 只接受 POST），但要客户端凭据；
  4. **反爬墙**：Card Ladder、130point、COMC、DA Card World、Steel City、StockX 一律 403，
     Blowout Cards 的 Imperva/hCaptcha 要人工勾选；
  5. **免密钥能通的**：`api.scryfall.com`（万智牌）、`api.pokemontcg.io`，
     垂直不对，运动卡用不上。
  结论比上次更硬：**免费且能取运动卡成交价的只有卡淘**。想要「接近真实价」的逐张卡价格，
  绕不开付费令牌；而且即便有了价格源，还得先解决「检索标题 → 具体某一张卡」的匹配问题。
- **推翻一个旧结论**：`sources/README.md` 里写 Topps 官网「命令行与真实浏览器都落到
  Cloudflare 拦截页」，只对一半 —— 真实浏览器打开时 Cloudflare 的 JS 挑战十几秒后
  自己通过，页面正常加载。挡住 `fetch` 不等于挡住人，这两件事要分开记。
- **但官网过了墙也没用：下架商品整页不含价格。** 22 个盒型在 Topps 官方商店全部售罄，
  商品页有标题、有规格、有「Sold out」，却整页 0 个价格元素、0 个 `application/ld+json`、
  内嵌数据里 0 个价格字段；检索页能返回 1,306 条商品，同样一条价格都没有
  （`/products.json`、`/graphql`、`/rest/V1/products` 分别 403 / 403 / 404）。
  **发行商官方价只在发售期留在自己站上，过期不留痕**，所以只能靠第三方归档。
  零售渠道同样不行：DA Card World 搜索是 B2B 登录墙、Blowout 要过 hCaptcha、
  Cardboard Connection 的系列评测文章一篇都没写价格（发布日历页 1 MB，0 个金额）。
- **官方价出自 Checklist Insider 的系列指南页**：每个盒型段落会写
  「Topps presales appeared on <日期>, at $X per box. That increased to $Y on release day.」
  这类句子，是本机唯一能逐字读到官方发售价的地方。22 个盒型里 **20 个拿到官方价**，
  只有 `tfinest26` 的 Breaker Delight 与 `thoops26` 的 Hanger 官方从未公布过。
  逐盒型的价格与「预售 / 发售日」口径已抄进 `sources/prices/README.md` 第三节。
- **盒价表改口径**（`src/data/prices/boxes.ts`、`types.ts`）：新增
  `basis: "msrp" | "retail"` 与 `msrpUsd?` 两个字段 —— 比「多少钱」更需要先说清的是
  「这是什么价」。20 条 `msrp` 行的 `cost` 一律由 `msrpUsd × USD_CNY` 算出，
  美元原值留档；剩下 2 条退回公开零售报价，可信度分别标 `reference` / `estimate`。
  `prices:check` 顺手加了一条自洽校验：`msrp` 行的 `cost` 必须等于
  `msrpUsd × USD_CNY`，防「改了美元原价忘了改 RMB 价」这种不对称修改 ——
  人看不出 3960 与 549.99×7.2 的关系，脚本看得出来。
- **结果**：22 个盒型里 18 个登记价上升（如 `tcu26` Hobby ¥1380 → ¥3960），
  回本率中位数 50.4% → **28.7%**，区间 19.6%~77.8% → 14.8%~77.1%
  （单盒提醒只剩 `tcosmic26.hobby-box` 14.8%，低于 15% 下限）。
- **没有把水位重新钉回 50%，这是有意的。** 卡价那侧挂在卡淘成交价上，
  把系列系数整体乘 1.75 就能把中位数拉回 50%，但那等于宣布「一张卡的模型价比它在
  卡淘上的真实成交中位数贵 75%」，与「卡价要接近真实价」直接冲突。所以这次
  **只换盒价口径、不动模型**：盒价照官方原价，卡价照成交标定，两边各守各的锚，
  中间差多少就如实显示多少。顺带得到一个更像真的结论：按原价开盒越贵的盒型亏得越多
  （`tcosmic26` 14.8%、`tcu26` Jumbo 16.4%、`tcu26` Hobby 22.4%），
  Value Blaster / Mega / Hanger 这类小规格盒型反倒接近或超过 50%。
- **模型常量一个没改**，所以 `snapshots/boxes.json` 的行为锁不受影响。
- ✓ 验证：`npm run typecheck` 无输出；`npm run prices:check` 通过
  （22/22 已登记，20 条官方发售价口径 + 2 条公开零售报价口径，回本率中位数 28.7%）

### 关键取舍记录

- **不用 Pinia**：只有一个全局 store，手写 reactive 单例省一个依赖。
- **卡面用占位图 + 按稀有度混色**：实物卡图缺失且涉及版权，按稀有度做色彩区分即可，
  后续补图只需替换 `public/card-art.svg`。染色**不用** CSS `filter`：
  `hue-rotate` 在这么暗的底图上会先被裁掉色相（实测把紫色档转成绿色），
  走 `mix-blend-mode: color` 换色相 + `screen` 提亮两层，色值一律来自 `--tier`。
- **「卡片」= 卡图那块，不含文字区**：球员名 / 卡种 / 角标是卡片信息，不是卡面本体。
  属于卡面本体的元素（档位 pill、队标）都画在 `.ce-face-art` 里，靠底部那条
  `.ce-face-bar` 左右分开；文字区只放文字与角标。用户是按这个口径提需求的
  （队标一度被放在文字区、与 `#AC-1` 同一行，被否决）。
- **拆卡只走云端（已推翻早期的 local-first）**：早期为了站点可用性做过
  localStorage 本地历史，但用户明确要求「不要本地拆卡」，已全部删除。
  现在拆盒记录**只在 D1**，未登录不能用拆卡功能；
  代价是本地 `npm run dev` 下拆卡不可用（需 `npm run dev:cf`），这是有意为之。
- **目录真相在 TS 而非数据库**：页面渲染永远不查库，D1 里的维度表只是镜像，
  用于跨维度对账与后续后台分析。
- **目录同步手动触发**：不做构建时自动同步，避免部署流程耦合数据库写权限。
- **官方数据必须归档到仓库**：配率/Checklist 只认发行商公开原件，
  镜像件必须 SHA-256 复核一致后才算数，且按「品类/发行商/系列」落进 `sources/`。
  后续新盒型一律从这里取数，不依赖任何外部链接长期可用。
- **配率不手抄**：一律 `scripts/import-pack-odds.mjs` 从官方 PDF 文本生成，
  产物带「请勿手工编辑」标头，改动必须可 diff。
- **拆盒逻辑重构必须先有快照**：`npm run boxes:check` 是盒型行为的回归网，
  新增盒型可以，但已有盒型的输出不允许变（种子格式 `${box.key}|${seed}` 永不改）。
  官方不公布的字段（如 `boxesPerCase`）宁可留 0 并省略文案，也不许编数字。
- **年份写在数据里，不从名字里解析**：`year` 是必填字段，不是从系列名
  「2025-26 Topps Chrome Updates Basketball」里正则抠出来的。名字是给人看的、
  发行商会改，年份是给目录分组用的、必须能被程序读到，两者各管一头。
  副作用是同一年份要手写两遍（预置种子一处、盒型一处），
  但只有后者进了 `validateBox()`；写错了页面上会分成两组，一眼就能看见。
- **删除是不可逆操作，必须分两步**：范围要用户自己挑，确认页要重述后果
  并要求显式勾选；范围非法时必须报错，**绝不能退化成「清空全部」**。
- **昵称唯一性靠一条 SQL，不靠应用层先查再写**：
  两个页面同时抢同一个昵称时，「先 SELECT 再 INSERT/UPDATE」会让两边都以为可用；
  现在是带 `NOT EXISTS` 的**单条 UPDATE**，数据库说了算。
  代价是注册默认昵称（邮箱前缀）可能撞车，因此注册改成了逐个候选重试。
- **文案不解释显而易见的事**（用户明确要求）：
  「按住右侧图标可以看到明文」「点击进入拆盒」这种把界面上已经存在的操作
  再说一遍的句子一律不要；徽章已经写着「待上线」就不必再加一句「敬请期待」。
- **种子框始终代表「下一盒」，不代表「刚开完的那盒」**：
  拆完立刻换新种子，否则「再拆一盒」会原样重开上一盒（肉眼看不出，因为结果一致）。
  这一条当初的代价是页面上必须保留「复现这一盒」，2026-10-01 用户判定它鸡肋
  （种子在统计页的拆盒记录里就有）已删除，但**「拆完换新种子」的行为保留**：
  它保证的是「再拆一盒」的结果真的不一样。
- **卡片的「整体可点」用覆盖层实现，不把卡片本身做成 `<a>`**：
  一旦卡片里还要放按钮（如盒型卡的「配置说明」），把卡片做成 `<a>` 就只能把按钮
  嵌进去，属于嵌套交互元素，HTML 不合法、键盘焦点顺序也会乱。
  现在的做法是外层 `div` + 一层 `position:absolute; inset:0` 的 `RouterLink` 覆盖层，
  内部按钮用 `z-index` 压在它上面。代价是覆盖层挡住了文字选择，
  以及所有可点区域都必须显式声明层级，改动卡片内容时要记得这一点。
- **不想被重复的派生文案，就不要在目录层派生它**：`BoxRef.note` 曾经把
  「N 张/包 · N 包/盒 · 有签名保证」拼成一句话，而视图又从注册表里渲染了同样的徽章，
  于是同一份信息在卡片上出现两遍（用户直接指出了这点）。删掉派生字段而不是在视图里
  `v-if` 掉，是为了让「规格只有注册表一处真相」这件事在类型系统里就成立。
  同一类问题后来又在 `CategoryDef.feature` 上出现一次（把该品类所有盒型名拼成长串），
  处理方式相同：删掉派生字段，不在视图里遮。
- **卡面上的标记由已有字段推导，不新增数据字段**：`AUTO` / `/99` / `RC` 分别来自
  `group` / `numbered` / `rookie`，推导集中在 `engine/marks.ts`。
  如果改成一个手写的 `marks: string[]` 字段，就会多出一份可以和数据不一致的真相，
  而且每加一个盒型都要人工记得填。
- **卡片上的角标一律绝对定位，不参与布局**：卡图下方排一排标记试过一版，
  卡片高度会随标记个数（0～3）变化，同一行卡片的下沿就对不齐（用户直接指出了这点）。
  改成绝对定位后卡高只由文字区决定。代价是角标会压住卡图，
  所以卡图上的说明文字（稀有度 pill）必须放在标记堆的对面角落，加角标要顺着这个规矩放。
- **球队队标走公开图床，缩写只做兜底**：队标是各队商标、图形规范也会更新，
  因此不把队标图收进仓库，`data/teams.ts` 只存 slug，换图床改 `TEAM_LOGO_BASE` 一行。
  slug 与三字母缩写必须分开存（`GSW` 的文件名是 `gs`、`NYK` 是 `ny`、`UTA` 是 `utah`），
  从缩写推导一定会错。加载失败时退化成「主色 + 缩写」圆片而不是留白：
  历史球队（西雅图超音速）在公开图床上就没有条目，`Entertainer` 这类非球队的值
  也走这条路径——显示得朴素可以接受，显示空白不行。
- **卡面底色按稀有度混出来，不直接铺主色**：`--tier` 是给 pill、边框、光晕用的亮色，
  直接当底会在金色档位上把白字压到 2.7:1；和面板底色按固定比例 `color-mix`
  既能一眼看出金卡／红卡，对比度也稳定在 4.5:1 以上。
  混比是量出来的而不是拍出来的，改档位配色或改面板底色都要重新量一遍对比度。
- **卡片上的角标/附加元素一律不占文字区的行**：队标从独立一行改成挤在信息行右侧后，
  信息行可用宽度从 154px 降到 120px，带流水号的限量卡徽章从 2 行变 3 行。
  选择接受这个高度，是因为“卡片右下角放队标”比“少一行徽章”更重要；
  如果以后徽章还要加，就该动徽章本身（拆到卡背或弹窗），而不是把队标再挪回中间。
  后续已收敛（见下条）：徽章行现在固定 1 行，不再由内容决定卡片高度。
- **文字区按「行」对齐，不按「内容」对齐**：同一排卡片只要有一张的卡种折到第 3 行，
  整排的下沿就歪了（用户直接指出了这点）。所以球员名 1 行、卡种 2 行、
  角标行 1 行都是硬预算，超出截断而不折行，完整文字放 `title`。
  角标行放不下时**统一让最后一个（配率）让位**，前面的不许缩：
  三个都缩会变成一排省略号，反而更难认。代价是最窄列宽 + 限量卡 +
  长配率同时出现时，配率会被截成很短的一截（完整值仍在 `title` 里）。
- **统计口径不新增库表字段**：签字卡数在服务端已有按子集聚合的结果，
  「哪些子集算签字」这件事在本地目录里，就用 `subset_key` 回去查分组再求和。
  为一个计数去加一列聚合字段，等于把目录真相往库里栬了一份，
  以后新增带签字节集还要记着同步两边。
- **首页品类卡不罗列该品类下的盒型名**：一个系列就已经有四个盒型，
  按年份补录后数量只会更多，卡片上必然放不下（用户直接指出了这点）。
  首页只负责「有哪些品类 + 一句话定位」，盒型细节点进品类页再看。
- **窄屏靠换行，不靠缩字号或省略号**：顶栏在 600px 以下把导航换到第二行
  （导航 `flex-basis: 100%`、账号区留在第一行）。导航项本身就是入口，
  缩字号 / 隐藏文字 / 加省略号都会让人认不出来，而换行只多占 33px 高度。
  单行 flex 里只有导航是 `flex: 1`，logo 与账号区都是 `flex-shrink: 0`，
  放不下时缺口全由导航吸收——**顶栏新增元素时必须按两行重新量一遍**。
- **名册誊抄必须能对回原件**：`roster.ts` 是从官方 Checklist 手工抄进去的，
  抄错卡号、抄错球队、漏掉新秀标记都不会报错，只会安静地开出一张假卡。
  所以核对是采集流程的固定一步（`npm run roster:check`），而不是「有空再看」；
  官方原表自身的矛盾（重复卡号、漏字）登记进 `SOURCE_DEFECTS` / `ROW_PATCHES`
  并写明依据，**不允许**为了让脚本通过而放松比对规则。
- **官方原件的缺陷只在脚本的补丁表里修，不手改生成文件**：PDF 里行标签与配率黏在一起、
  某行缺列、官方 Checklist 把卡号写重，都属于「原件如此」。直接改 `pack-odds.generated.ts`
  或 `roster.ts` 会让下次重跑把手工修改覆盖掉，而且没人知道哪一行是官方的、哪一行是补的。
  所以修法统一是：改 `import-pack-odds.mjs` 的 `LABEL_PATCHES` / `ROW_PATCHES`、
  `import-roster.mjs` 的 `ROSTER_PATCHES`、`check-roster.mjs` 的 `SOURCE_DEFECTS`，
  并在生成文件标头里列出本次用了哪些补丁。
- **同一个卡号上的多个球员是一张卡**：官方名册里 `DUAL_*` / `TRIPLE_*` 子集会给同一卡号
  排两三行。按行建卡会得到「同号重复」的自检错误，但真正错的是建模方式——
  实物就是一张卡上印两三个球员。合并的判据只能是「卡号相同」+「球员不同」，
  球员重复时必须照旧报错，否则会把官方真的重号悄悄吞掉。
- **官方配率很紧的盒型要能动残差下限**：`baseWeight = 每包张数 − 非普卡权重` 是默认规则，
  但官方普卡配率本身就很低时（Topps 3 是 1:5，每包 4 张），残差小于 0.5，
  硬留 0.5 会让整盒权重超过每包张数。这类盒型在产品里显式调 `minBaseWeight`，
  而不是改全局默认值——默认值一改，其他所有盒型都会跟着动。
- **平行限量数也能用恒等式验算**：`张数 × 编号 × 配率 ≈ 本系列总印量`。
  这条式子让「指南页转述的编号」不再是孤证：同一个系列里几十个互不相干的子集
  都算回同一个数，用错一位就会立刻暴露。它也能反向补出指南页没写的编号
  （Topps 3 的 `Triple Relics Autographs` 官方表只有 Gold / Red / Platinum 三档配率，
  17 张反推正是 /10、/5、1/1）。
- **官方配率表自己会前后矛盾，照抄不改**：Signature Class 的纸质老兵普卡 `Magenta /250`
  官方写 1:81，而同批另外 12 档都算回 142.5～146.6 万包（这套 1:81 算出来是 202.5 万）；
  同一系列纸质新秀的同一个档位写 1:115，`49 × 250 × 115 = 1,408,750` 正好落在同批里——
  100 张的一节本就应该是 49 张那节的一半左右，所以是官方表那一格错了。
  同类还有 Hobby Jumbo 列那四档（偏高 43%～498%）与 Mega 列的 `Coral` / `Yellow`（偏低 79%）。
  改一个数就要连带改另一个数才能自洽，**没有任何依据说哪一格才是真的**，所以一律照抄，
  把异常写进系列 README，不做好看化的平滑。
- **普卡走残差不等于官方配率**：官方表每一行给的是「每包命中一次」的概率，
  Signature Class 四列加起来只有 2.37 / 5.96 / 1.49 / 1.81，不足每包张数（4 / 10 / 7 / 8）；
  差额只能落在纸质老兵普卡上，于是它的实际权重（1.63 / 4.04 / 5.51 / 6.19）比
  官方那一行的 0.5 大得多。这是有意为之：先让「每包张数 = 各档权重之和」成立，
  再把官方各行的比例保留下来，而不是把普卡按 0.5 算、让没归属的格子凭空消失。

- **归列表的错不会自己报出来，所以要用第二条独立证据去核**：`pack-odds.txt` 里的列位置
  是字符下标，而两端对齐的页面里同一列在不同行能差十几个字符，归错一列既不报错、
  页面上的数字也仍然「像」配率。所以每个系列生成完都要跑
  `python scripts/verify-odds-columns.py <原件.pdf> <生成的 .ts>`，拿 PDF 里文本块的
  真实横坐标再核一遍，要求「不一致 0 格」。**核出来的错行改 `ROW_PATCHES`，
  不许反过来改归列口径去凑**——「按数值中心」与「按离列头最近」两套口径都试过，
  各自都会在别的行上错。
- **聚不出列位的页面不是「没法核」，而是要换一种证据**：一张纸印好几张表、列数太多、
  标签被两端对齐撑开的页面，一页之内聚不出列数那么多堆，脚本只能报 `SKIP`。
  这种页面改用导入脚本自己的「贴着列边界」报告兜底：若没有一格贴着列边界，
  位置判断就是稳的——脚本会打印「没有需要留意的行」。两条证据都不成立时，
  才需要人工翻原件。
- **数值在 PDF 里不是一个整体，合并要挑拼法**：`1:20` 常被拆成 `1:` 与 `20` 两个文本块，
  内容流里的顺序还可能反。合并时只接受能拼成合法数值的那种拼法，
  `1` + `3:` 绝不能拼成 `13`——那会凭空造出一个配率，而且看起来完全正常。
- **同一系列的不同盒型是不同印量口径**：Finest 的 Hobby 盒算回约 35 万包、
  Breaker 盒算回约 1.9 万包，两者相差近二十倍。用「张数 × 编号 × 配率 ≈ 总印量」
  验算时，必须**按盒型各自算**，不能拿一个盒型推出来的数去套另一个盒型。
- **官方卡号可能只是「组号」**：NBA Hoops 的官方表格版给双签、三签、甚至同一姓氏的单签
  只写到组号（`HRD-A` 底下 5 张卡共用一个号，`HHS-G` 底下三张）。按卡号归并名册会把
  一组里的几张卡并成一张，且**不会报错**（只是少几张卡），只有拿指南页的逐卡张数一比
  才会露出来。归堆时要按卡号整体归，不能按「连续同号」切——同一组的两张卡中间
  可能夹着别的组。
- **「核对通过」这句话本身要先被核对**：Topps 旗舰那一轮的校对脚本报「不一致 0 格」，
  但把某格已知缺陷的值故意改错一位后，它**照样报 0 格**——说明那一格从来没被比过。
  原因是 PDF 把行标签拆成两段排版（`1980- BASKETBALL ROOKIE AUTOGRAPH` 中间少了
  `81 TOPPS`），脚本按标签找行找不到就静默跳过：跳过 561 格，占全部格子的 9%。
  所以校对脚本现在分三类结果——核对、补认（按后缀 / 按位置）、**没核到**，
  三个数都要打印，覆盖率不能再被读成「全绿」。
- **数字被印坏时，两种读法各有依据就照原文登记，不猜**：官方表把某格印成 `1:3,2991`，
  数字串本身只有 `32,991` 一种读法（其余五处坏格都是「多印了一位数字」，去掉重复位后
  与原数字串一致），但同一行其余六个渠道与同族那一行逐列吻合到万分之三，照比例该是
  `1:2,991`（差 11 倍）。改成 2,991 要动一位数字、改成 3,299 要丢一位数字，
  两条都没有直接依据——保留原数字串并写进系列 README，比悄悄抹平成「好看的值」诚实。
  反过来，能被两条独立证据同时印证的那些坏格（原数字串 + 同族比例）才写进 `ROW_PATCHES`。
- **补丁表按输出路径决定作用对象，不按输入路径**：`ROW_PATCHES` / `LABEL_PATCHES` 的键是
  产品目录名，最初从**输入提取件**的路径推——而提取件放在 `.snapshot/` 下，
  推出来是 `.snapshot`，于是补丁全部静默失效，生成文件里仍是坏值，且不报任何错。
  现在从输出文件的目录推（`dirname(target)`），键对不上会打印「脚本里登记的覆盖行没在表里找到」。
- **第三方转述件会把官方原件的错字一起转述过来**：指南页在同一个系列的同一格里写了
  `1:3,2991 Fat`——与官方表印坏的那一格一模一样。这既是好消息（说明它确实在转述同一张
  官方表，不是自己编的），也是提醒：转述件与原件不是两个独立证据，不能拿它来裁决原件的错。

### 金额相关的取舍（2026-10-01 补充）

- **价格登记进仓库，不在运行时查价**：实测 21 个站点后确认「每张卡实时查价」
  没有可用的数据源（见时间线那条）。运行时查价还会带来三个额外问题：
  同一盒两次打开算出不同金额、页面被第三方挂住、外部站改版后静默变成 0。
  现在价格是纯函数，代价是价格会滞后，靠 `PRICE_AS_OF` 这个显式日期说清是哪天的价。
- **`breaks` 存金额结果，不存价格表引用**：价格表一定会被改（现在是 22 条参考价 +
  一组单点标定的系数），如果记录只存引用，改一次价格表所有历史记录的数字都会跟着变。
  存下来的是「当时那几张卡按登记价算出的钱」，改价只影响以后开的盒。
- **老记录靠重放补，不靠估算**：`ripBox` 的随机数种子只由 `${box.key}|${seed}`
  拼接而成，与时间、路径、依赖版本都无关，所以老记录能逐盒重放。
  这正是一直坚持「种子格式永不改」这条快照约束的回报。
- **盒价与卡价性质不同，不能混着说**：盒价取自发行商官方发售价（20 条 `msrp`，
  美元原值留在 `msrpUsd` 备查），另外 2 条是公开零售报价；卡价是规则算出来的。
  所以「回本率」是**模型输出**，不是市场事实，系数文件与 `sources/prices/README.md`
  都写明了这点，避免以后被当成行情用。
- **盒价口径选官方发售价，不选渠道零售价**（2026-10-01 补充）：零售价随渠道和时间浮动，
  同一个盒型在不同店能差三成，拿它当「购入价」等于把渠道差价算成模型的锅；
  官方发售价是发行商自己公布的那个数，唯一、可查、有发布日期。
  代价是官方价普遍高于渠道价，回本率随之下移到 28.7% —— 这是口径变了，不是模型坏了。
  宁可如实显示「按原价开盒基本是亏的」，也不为了好看的百分比去改系数。
- **盒价换口径时不动模型水位**（2026-10-01 补充）：`PRODUCT_VALUE_FACTORS` 里那个
  统一系数是拿来对齐「国内二级市场卡价」与「北美盒价」两把尺子的。盒价从渠道价换成
  官方价后尺度变了，理论上可以重解系数把中位数拉回 50%，但那会让模型价系统性高于
  卡淘的真实成交中位数，与「接近真实价格」的目标直接矛盾。
  所以**盒子照原价、卡照成交价**，两把尺子各守各的锚，中间差多少就如实显示多少。
- **成交价只当标定输入，不进模型内部**（2026-10-01 补充）：卡淘的成交价拿得到，
  但对不到单张卡上（见时间线）。所以它只影响系列系数与人物系数这两个聚合量，
  `cardValueBreakdown()` 仍然是纯函数 —— 不读时钟、不发请求、不用随机数。
  将来若真要接当天行情，也只能先把结果写进数据表再让模型读，
  绝不能在函数里联网：否则「复现这一盒」和「回填历史记录」会算出两个不同的数。
- **金额显示成「购入 / 售出」而不是「成本 / 价值」**：用户是按「花了多少 / 开了多少」
  提的需求，售出是玩家实际会做的事，价值是概念。文案跟着用户的口径走。

## 5. 待办（TODO）

### P0 上线前必须完成
- [x] 在 Cloudflare 创建 Pages 项目并关联 `galifans/cardemulate`
- [x] 自定义域名 `cardemulate.wikiandroid.com` 生效：域名已加到项目里，
      DNS 代理 CNAME（`cardemulate -> cardemulate.pages.dev`）于 2026-09-30 补齐，
      Pages 侧状态 `active`，线上冒烟已通过自定义域名整套重跑
- [x] 创建 D1 数据库 `cardemulate`（真实 `database_id` 已回填 `wrangler.toml`），
      并执行 `schema.sql`
- [x] 本地全栈冒烟：注册 → 登录 → 拆盒 → `/api/breaks` → `/api/stats` 与 `/api/global` 数据正确
- [x] 线上冒烟（已重跑整套 `/api/*` 验证并通过）
- [x] 首次 `git push -u origin main`（已完成，用 SSH key，无需设备码授权）

### P1 内容扩展
- [x] 篮球：`tcu26-basketball` 按官方 Pack Odds 表驱动出 Hobby / Jumbo / Value / Mega 四个盒型
      （`box.ts` 的 `SPECS` 一份数据切四列，配率不再手抄）
- [ ] 篮球：补 `tcu26-basketball` 的 Delight / Sapphire / Fanatics 盒型
      （列名已知，缺的是官方包装规格：每包张数、每盒包数）
- [ ] 篮球：2025-26 赛季 Topps 17 个系列已上线 8 个
      （`tcu26` / `tccj26` / `tcosmic26` / `tthree26` / `tfinest26` / `tsig26` / `thoops26` / `tbb26`），
      余 9 个的数据已归档、名册已誊抄，缺 `box.ts`：
      其中 `tchrome26` 有官方配率表，
      `tcb26` / `tcus26` / `tdef26` / `tincep26` / `tmcd26` / `tmotif26` / `tnbl26` / `tpristine26`
      只有名册，配率要走 D 级授权转述件（指南页）
- [ ] 工具：用补上行匹配的 `verify-odds-columns.py` 把以前核过的系列再核一遍，
      确认没有别的格子被静默跳过（覆盖率数字要看「核到 / 补认 / 没核到」三个数）
- [ ] 工具：其他系列若也有多行表头或超宽标签，用 `scripts/prepare-pack-odds.mjs` 重新整理后再生成一次
- [ ] 重构：把 `tcu26` / `tccj26` 两个老系列从本地 `BOX_CONFIGS` 合并到共享装配器，
      消除同一件事的两套写法
- [ ] 品类：棒球、足球、橄榄球、网球、UFC、宝可梦的种子数据与首批盒型
- [ ] 卡面：替换统一占位图为按品类区分的背景图（仍不涉及实物卡）
- [x] 认证页：大写锁定提示 + 按住可见密码的眼睛图标（用户明确要求）
- [x] 昵称：允许用户自设展示名（个人中心 + 全站唯一，已取代邮箱前缀）
- [ ] 线上 D1 执行一次 `schema.sql` 升级到 v3（补唯一索引；不补也安全，
      唯一性由单条 `NOT EXISTS` UPDATE 保证，但线上应与本地口径一致）
- [ ] 线上 D1 执行一次 `migrations/004-break-values.sql`（`breaks` 表加两个金额列，
      不跑的话新开的盒写不进去）；跑完可选执行一次老记录回填（见下一条）
- [ ] 线上回填 `breaks` 的金额：`npm run db:backfill -- --remote`
      （本地已跑过，18 条；线上跑之前先将 `breaks` 导出一份留底，虽然脚本幂等且只写金额）
- [ ] 线上重推一次目录镜像（`POST /api/catalog/sync`）：`boxes.name` 里
      `tbb26` / `thoops26` 九个盒型还是旧的短名（`Hobby`、`Value Blaster`…）。
      页面不读这张表，不影响显示，只是对账口径对不上

### P1 定价表维护
- [ ] 盒价复核：20 条是官方发售价、2 条是公开零售报价，两者都会变，需要人工更新
      （`src/data/prices/boxes.ts`，同时把 `PRICE_AS_OF` 改成新日期）。
      官方价只在发售期留在发行商自己站上，过期整页不含价格，
      所以要在**发售当周**从 `sources/prices/README.md` 第三节写的指南页抄下来
- [ ] 系列系数复核：`PRODUCT_VALUE_FACTORS` 与人物档位系数（`players.ts` 的
      `SUPERSTAR_FACTOR` / `ALL_STAR_FACTOR`）是**一组**标定值，改盒价后要重跑
      `npm run prices:check` 看回本率是否还在 25%–100% 区间。两处不要分开调：
      人物系数一动，所有盒型的平均售出额都会动，差额靠系列系数收回。
      盒价换成官方发售价后中位数是 28.7%，已贴近 25% 下限；再落就要决定
      是重解水位还是放宽区间，理由见 `sources/prices/README.md` 第三节
- [ ] 球员分级表补录：`src/data/prices/players.ts` 只标了 96 人（超巨 24 + 全明星 72），
      名册 624 人里余下 528 人一律按 1 倍，属于有意保守，后续可按赛季表现调整
- [ ] 卡淘样本扩充：成交价标定的两个薄弱点分别是 `tfinest26`（只有 11 条干净样本）
      与 Topps 3（0 条，几乎只出签名卡）。要补前者就换关键词多采几轮，
      要补后者得先设计「怎么从签名卡标题里认出系列」的规则；
      采样口径见 `sources/prices/README.md` 第二节
- [ ] 成交价重采一轮，看系数是否需要跟着动：口径与判定都不变，
      跑完只需对比分桶统计表里的中位数，而不是相信任何一次单点数据

### P2 功能增强
- [ ] 目录同步脚本 `scripts/sync-catalog.mjs`（用 `buildCatalogPayload()` 生成并推送）
- [ ] 把 `scripts/smoke-api.mjs` 改造成正式回归脚本（目前是临时冒烟脚本）
- [ ] 排行版 / 全站统计的前端筛选联动（接口已支持 `?category=&maker=&box=`）
- [ ] 拆盒历史分享（种子可复现，适合做成分享链接）
- [ ] 统计页「按盒子」表格直接显示累计购入 / 售出（目前只在「查看统计」弹窗里）
- [ ] 拆盒动画与音效（目前是逐张揭开）
- [ ] 真实卡价接入（**需要先决策**）：穿刺结果写在 `sources/prices/README.md` 第二节，
      免费站点只有卡淘一家，其余不是反爬墙就是 401/403。唯一能持续取到运动卡成交价的
      公开路径是 PriceCharting / SportsCardsPro 的付费令牌。接入前有两个前置问题要解决：
      检索结果的标题 → 具体某一张卡的身份匹配，以及拿到的价要落成登记数据
      （触发一次写入）而不是拆盒时实时请求

## 6. 已知问题

- 无实物卡图，所有卡面共用一张占位图（按稀有度变色），属**预期行为**。
- 本地 `npm run dev` 下 `/api/*` 必然失败（无 Functions 运行时），
  控制台会出现一条连接失败的告警，属**预期行为**；要联调后端请用 `npm run dev:cf`。
- **本机访问不到 Pages 的预览别名**：`<hash>.cardemulate.pages.dev` 与
  `diag.cardemulate.pages.dev` 在 TLS 握手阶段就失败（生产域名
  `cardemulate.pages.dev` 正常）。要在线上验证函数行为，直接推 `main`
  用生产域名试，别指望预览别名。
- `esbuild` 的 postinstall 脚本被 npm 的 allow-scripts 策略拦截，会出现一条 warning；
  不影响构建（Vite 6 用 Rollup 打包，esbuild 仅用于依赖预构建）。
- **本机没装 wrangler**（不在 `node_modules` 也没全局装），
  所以 `npm run db:local` 与 `npm run dev:cf` 这两个脚本在本机会报
  `'wrangler' is not recognized`（这两个脚本直接调 `wrangler`，
  而 `db:backfill` 内部走的是 npx，所以它在本机能跑）。要联调本地全栈，
  直接用 npx 缓存里的 wrangler，例如
  `npx wrangler pages dev dist --port 8788`
  （**不要加 `--d1=DB`**，让它读 `wrangler.toml` 的绑定，否则会另建空库）。
  脚本本身没问题，线上/CI 环境有 wrangler 就能跑。
- **`SUM()` 出来的浮点尾数必须在接口层收口**：`cost_rmb` / `value_rmb` 是 `REAL`，
  多条相加会出现 `¥6361.150000000001`，`functions/api/[[path]].js` 的 `money()`
  统一四舍五入到两位，前端不再各自处理。

## 7. 环境备忘（本机）

- OS：Windows；shell：PowerShell 5.1（用 `;` 串联；中文输出前先 `chcp 65001`）
- Node.js v24.19.0 / npm；若终端找不到 `npm` 先刷新 PATH：
  `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
- 含 `[` `]` 的路径（`functions/api/[[path]].js`）必须用 `-LiteralPath`
- git 身份：`galifans <55650639+galifans@users.noreply.github.com>`
- **本机必须用 SSH 推 GitHub**：`remote` 固定为
  `git@github.com:galifans/cardemulate.git`（本机已配 `~/.ssh/id_ed25519`，
  `ssh -T git@github.com` 返回 `Hi galifans!`）。
  本机网络下 `github.com:443`（即 HTTPS remote）连不上，`git push` 会无限挂起；
  不要改回 `https://` remote。
- **wrangler 已登录**：凭据在 `%APPDATA%\xdg.config\.wrangler\config\default.toml`；
  账号与库 ID 见第 1 节表格。远程 SQL 要带 `--remote`：
  `npx --yes wrangler@latest d1 execute DB --remote --file=schema.sql`
- 本机 npx 缓存里已有一份 wrangler 4.143.1，没网也能用：
  `node "$env:LOCALAPPDATA\npm-cache\_npx\d77349f55c2be1c0\node_modules\wrangler\bin\wrangler.js" --version`
- **盒型改动后的固定三连**：`npm run typecheck` → `npm run build` → `npm run boxes:check`
  （第三条只在改了 `src/data/sets` 下任何东西时才必须跑；动了 `roster.ts` 还要跑
  `npm run roster:check`）
- **价格改动后的固定两连**：`npm run typecheck` → `npm run prices:check`
  （改了 `src/data/prices/*` 里任何文件都要跑；改了盒价或系列系数后重点看回本率那一段）
- **本机全栈实测可用的命令**：`npx wrangler pages dev dist --port 8788`
  （wrangler 4.144.0，第一次会提示 `Ok to proceed? (y)`，**不要加 `--d1=DB`**）。
  本地 D1 的迁移与回填同样是 npx 形式：
  `npx wrangler d1 execute DB --local --file=migrations/004-break-values.sql`、
  `npm run db:backfill`（内部就是用 npx 调的 wrangler）
- **`git push` 在 PowerShell 里即使成功也返回退出码 1**（git 把进度写到 stderr，
  PowerShell 当成 `NativeCommandError`）。**看输出里有没有 `main -> main`，不看退出码。**

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
| 数据库 | Cloudflare D1，库名 `cardemulate`，绑定变量名 `DB`，
`database_id = 51265817-c1ed-4e09-98fd-a3d1709fb0c3`（区域 WNAM） |
| 云端账号 | Cloudflare `2092878237@qq.com`，Account ID `88a2dc4c1e2c8652fd444ea1a65dec76` |
| 当前状态 | 已上线：Pages + 线上 D1 全链路验证通过，自定义域名 `cardemulate.wikiandroid.com` 已 active；待内容扩展 |

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
src/stores/      用户会话 + 云端拆盒记录 + 服务端统计
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

### 关键取舍记录

- **不用 Pinia**：只有一个全局 store，手写 reactive 单例省一个依赖。
- **卡面用占位图 + CSS filter**：实物卡图缺失且涉及版权，按稀有度做色彩区分即可，
  后续补图只需替换 `public/card-art.svg` 与 `CardFace.vue` 的取图逻辑。
- **拆卡只走云端（已推翻早期的 local-first）**：早期为了站点可用性做过
  localStorage 本地历史，但用户明确要求「不要本地拆卡」，已全部删除。
  现在拆盒记录**只在 D1**，未登录不能用拆卡功能；
  代价是本地 `npm run dev` 下拆卡不可用（需 `npm run dev:cf`），这是有意为之。
- **目录真相在 TS 而非数据库**：页面渲染永远不查库，D1 里的维度表只是镜像，
  用于跨维度对账与后续后台分析。
- **目录同步手动触发**：不做构建时自动同步，避免部署流程耦合数据库写权限。

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
- **本机访问不到 Pages 的预览别名**：`<hash>.cardemulate.pages.dev` 与
  `diag.cardemulate.pages.dev` 在 TLS 握手阶段就失败（生产域名
  `cardemulate.pages.dev` 正常）。要在线上验证函数行为，直接推 `main`
  用生产域名试，别指望预览别名。
- `esbuild` 的 postinstall 脚本被 npm 的 allow-scripts 策略拦截，会出现一条 warning；
  不影响构建（Vite 6 用 Rollup 打包，esbuild 仅用于依赖预构建）。

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
- **`git push` 在 PowerShell 里即使成功也返回退出码 1**（git 把进度写到 stderr，
  PowerShell 当成 `NativeCommandError`）。**看输出里有没有 `main -> main`，不看退出码。**

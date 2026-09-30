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

### 2.1 用户可见文案：禁止技术细节

用户不需要知道东西存在哪、怎么实现的，也不需要被科普。文案只回答
「这是什么 / 我要做什么」。仓库里的技术细节写在**代码注释、`README.md`、本文档**里。

- **禁止**在渲染给用户看的字符串里出现实现细节，包括但不限于：
  `云端`、`数据库`、`D1`、`breaks 表`、`后端`、`接口`、`API`、`写入`、
  `同步`、`聚合`、`分页`、`localStorage`、表名 / 字段名 / 路由路径，
  以及开发命令（如 `npm run dev:cf`）。
- **禁止**擦鞋式描述注册有多简单（「注册只需要邮箱和密码」「没有其他方式」），
  表单本身就是答案。
- **禁止**复述用户已经看得见的东西（页面已经列出拆盒数、稀有度分布，
  就不要再写一段话告诉用户「你能看到拆盒数、稀有度分布…」）。
- 说明性正文最多**两句**，一句能讲完就只写一句；标题能说清就不加正文。
- 反面例子（都真实写过，禁止再出现）：
  - 「本站的拆盒结果统一保存在云端数据库，用于个人统计与排行榜，
    因此不提供本地拆卡。注册只需要邮箱和密码，没有其他方式。」
  - 「每一次拆盒都会写入云端数据库，登录后即可在这里看到自己的全部记录；
    排行榜与全站统计对所有访客开放。」
  - 「数据来自云端 breaks 表」（分区小标题，应写成「按盒型汇总」这类结果描述）
- 正面例子：
  - 未登录拆卡页：标题「登录后才能拆卡」+ 一行「拆盒记录与个人统计都归入你的账号。」
  - 统计页描述：「这里汇总你的全部拆盒记录；排行榜与全站统计对所有访客开放。」
- 离线 / 报错提示也用**用户语言**：「统计数据暂时不可用，请稍后重试。」
- 约束只针对**渲染到页面上的字符串**，代码注释不受限制。

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
  - `index.ts` 由注册表 + 种子派生出 `CATEGORIES / MAKERS / findProducts / findYearGroups`
  - `db.ts` 目录 → D1 镜像负载
- **视图只读派生结果**：`HomeView` / `CategoryView` / `MakerView` / `ProductView` /
  `BreakView` / `StatsView` 一律 `import { ... } from "../catalog"`，
  **禁止**在视图里硬编码品类、发行商、盒型列表。
- **引擎与卡盒解耦**：`src/engine/` 不认识任何具体卡盒；盒型数据只出现在
  `src/data/sets/` 下。新增盒型不需要改 `engine/`。
- **卡面标记只有一个推导点**：`engine/marks.ts` 的 `cardMarks()` 负责
  AUTO / 限量编号 / RC 三类标记，全部由已有字段（`group` / `numbered` / `rookie`）推导。
  **禁止**在盒型数据里手写标记字段，也禁止在视图里另写一套判断。
  「是不是签字卡」这个判断单独导出为 `isAutograph(group)`（`auto` + `relic`，
  本系列实物卡全部带签），卡面标记、拆盒页「签字卡」、统计页「签字卡」必须都用它。
  标记竖排、绝对定位在卡图**左上角**（不参与布局，卡高不受标记个数影响），
  卡图上的其他角标放在对面角落。
- **球队图标用官方队标，缩写只做兜底**：`data/teams.ts` 存队标 slug（`teamLogo()`
  拼出地址，换图床改 `TEAM_LOGO_BASE`）+ 缩写 + 主色，`components/TeamIcon.vue` 渲染。
  slug 与三字母缩写**不可互相推导**（`GSW` 是 `gs`、`NYK` 是 `ny`、`UTA` 是 `utah`），
  必须各存一份。队标加载失败时退化成主色缩写圆片，**禁止**静默隐藏。
  队标固定在**卡图**右下角（`.ce-face-art` 里那条 `.ce-face-bar` 的右端），
  与左下角的档位 pill 同排、底边齐平；下方的球员名 / 卡种文字区只放文字与角标，
  **不放**队标——用户口径里的「卡片」指卡图那一块，不含文字区。
  同排靠同一条 flex 撑开保证，**禁止**两边各自绝对定位（会飘）。
  卡片本身不许被拉伸到整行高（`.ce-card-grid` 是 `align-items: start`），
  否则文字区底部那行会被撑开，看着像贴在整行而不是贴在这张卡上。
- **卡面文字区按「行」对齐，不按内容对齐**：球员名 1 行、卡种 2 行、角标行 1 行，
  行数是硬预算；超出的截断（省略号，完整文字放 `title`），**禁止**自由换行——
  同一排里只要有一张多折一行，整排卡片的下沿就参差不齐（用户直接指出了这点）。
  角标行不许换行，放不下时只许**最后一个**（配率）被压窄，
  前面几个保持自然宽度（三个都缩会变成一排省略号，更难认）。
  改行数必须同步改 `min-height`，否则短内容的卡片会变矮。
- **窄屏顶栏改两行，不缩导航**：`@media (max-width: 600px)` 下 `.ce-header-inner`
  `flex-wrap: wrap`，导航 `order: 3; flex: 1 1 100%` 独占第二行，
  账号区 `order: 2; margin-left: auto` 留在第一行；再窄（`374px` 以下）
  隐藏 `.ce-logo-text`，只留图标。单行时只有导航是 `flex: 1`，
  logo 与账号区都是 `flex-shrink: 0`，宽度不够时缺口全被导航吸收
  （实测 390px 只剩 22px、320px 为 0），`overflow-x: auto` 再把文字横向裁掉，
  断字位置正好落在账号按钮左边，看起来就像被盖住——**别**靠缩字号 / 隐藏文字 /
  省略号解决，也**别**只写 `flex: 1`（`flex-basis` 必须是 `100%` 才会换行）。
  顶栏新增元素后要按 320 / 390 / 600 / 601 四档重新量一遍。
- **卡面配色只有一个来源**：稀有度色一律取 `engine/tiers.ts` 的 `TIERS[tier]`，
  经 CSS 变量 `--tier` 派生到底色、边框、光晕、卡名、**卡图染色**，
  **禁止**在视图里另配一套。底色是 `--tier` 与面板底色 `color-mix` 出来的，
  不是直接铺主色：亮色档位（金）直接铺底会把白字压到 2.7:1。
  卡图的色相也只能来自 `--tier`（`mix-blend-mode: color` 换色相 + `screen` 提亮），
  **禁止**用 `filter: hue-rotate` 之类的滤镜去凑档位色：占位底图很暗，
  负系数会先被裁到 0，实测会把紫色档转成绿色。
  改档位配色后要重新量对比度（人物名 ≥ 4.5:1），卡名需要比主色提亮一档。
- **首页品类卡只放定位文案**：不要在目录层派生「这个品类有哪些盒型」的字段。
  一个系列就有四个盒型，按年份补录后会溢出卡片，盒型明细进品类页看。
- **命名规则**：每个盒型的 key 由四段拼成，这个 key 同时就是数据库的 `box_key`：

  ```
  <category>.<maker>.<productKey>.<slug>
  ```

  例如 `basketball.topps.tcu26-basketball.value-box`。
  四段合法字符均为 `[a-z0-9-]`，不允许大写、空格、下划线。
- **年份是目录的第二排序维度**：每个盒型都要填 `year`（`"2025-26"` 或 `"2026"`），
  同一系列的所有盒型必须一致；发行商页按年份分组展示，新的年份在前。
  排序键取年份前四位，所以 `"2026"` 会排在 `"2025-26"` 前面。
  新增/补录老系列时不要另建一套机制，直接在 `year` 上落位。
- **新增盒型**：在 `src/data/sets/<品类>/<发行商>/<系列>/` 建 `roster.ts` + `box.ts` +
  `index.ts`，用 `defineBox({...})` 产出定义，最后在 `src/data/sets/index.ts` 的
  `registerBoxes([...])` 中追加。品类页的盒数、「已上线」标记、面包屑会自动更新。
- **新增品类**：在 `taxonomy.ts` 的 `CATEGORY_SEED` 追加，并在
  `src/components/CategoryIcon.vue` 补一个 inline SVG。没有已上线盒型时，
  首页与品类页会自动显示「待上线，敬请期待！」，**不要**写死灰化文案。
- 结构性变更完成后，同步更新 `README.md` 的「目录结构」与「扩展约定」两节。

## 5. 概率模型约束

- **官方资料只有 `sources/` 一个入口**：新系列的盒型配置、配率、名册一律先按
  `sources/README.md` 的流程把发行商原件归档到 `sources/<品类>/<品牌>/<系列>/`，
  再从原件生成 `src/data/`；**禁止**对着整理站、截图或记忆填数。配率走
  `scripts/import-pack-odds.mjs`，名册誊抄完必须跑 `npm run roster:check` 对回原件，
  原表自身的矛盾登记进脚本里的 `SOURCE_DEFECTS` / 导入脚本的 `ROW_PATCHES`。
- 配率必须来自发行商**公开的 Pack Odds 表**，不得凭空估算；来源变化时在 `box.ts`
  头部注释里说明。
- 抽样模型：`weight = 1/odds`；`premiumWeight = Σ(1/odds)`；
  `baseWeight = max(0.5, cardsPerPack − premiumWeight)`；每包按槽位做加权抽样。
  **不要**改成「先掷概率再补足张数」，会破坏每包张数恒定。
- 随机数必须确定性可复现：`fnv1a(seed)` → `mulberry32`，
  种子文本固定为 `` `${box.key}|${seed}` ``。改动此处会让历史种子失效。
- `defineBox()` 在开发环境校验失败会直接抛错（配率、编号、子集引用、卡号重复都会被拦），
  **不要**为了让数据通过而放宽 `validateBox()` 的规则，应修数据。

### 5.1 价格模型约束（拆盒金额）

- **价格登记在仓库里，运行时禁止联网查价**。2026-10-01 实测 21 个候选行情站
  （见 `sources/prices/README.md`）确认「逐张实时查价」没有可用数据源，
  且会让同一盒两次打开算出不同金额。**不要**再尝试引入第三方价格接口。
- 卡价必须是**纯函数**：只依赖卡自身属性与系列 key，不依赖时间、随机数、网络或全局状态。
  这样才能让「复现这一盒」与历史记录回填算出同一个数。
- 盒价与卡价的来源都要写进数据文件：盒价逐条带 `confidence` + `asOf`；
  改动价格表必须同步改 `PRICE_AS_OF`，**不要**改模型去迁就某一格数字。
- 卡价规则分层是：档位基准 × 稀有度系数 × 人物系数 × 系列系数，下限 ¥0.01。
  系列系数（`PRODUCT_VALUE_FACTORS`）是**标定值**，改盒价后必须重跑
  `npm run prices:check` 看回本率是否仍在区间内。
- 球员分级表（`src/data/prices/players.ts`）里的名字必须与名册拼写一致；
  比对前统一做归一化（去大小写 / 变音符号 / 标点 / 多余空格）。
  `npm run prices:check` 会拦重复项与名册里查不到的名字。
- **`breaks` 存金额结果（`cost_rmb` / `value_rmb`），不存价格表引用**：
  记录是历史事实，价格表改了不该让老记录跟着变。
- 金额在前端渲染时统一走 `src/data/prices` 导出的 `rmb()` / `rmbOrDash()`，
  不要在视图里手写 `toFixed(2)` 或拼 `¥`。

## 6. 账号与注册约束

- 注册方式**只有一种**：邮箱 + 密码。注册表单**不要**采集昵称、手机号、生日等
  任何其他信息；昵称在注册后自行设置（见下一条）。
- **严禁**引入第三方登录（OAuth / 微信 / 手机验证码等），也不做邮箱验证流程；
  用户已明确表示本站不需要其他注册方式，后续也不要主动添加。
- 账号密码只需满足**常见站点约束**，不要自定义古怪规则：
  - 邮箱：`isEmail()` 格式校验，长度 ≤ `MAX_EMAIL_LENGTH = 100`，存库前
    `normalizeEmail()` 去空格 + 转小写
  - 密码：`MIN_PASSWORD_LENGTH = 6`、`MAX_PASSWORD_LENGTH = 32`、不得包含空格。
    后端统一走 `passwordProblem()`，前端 `AuthView.vue` 的 `MIN_PASSWORD` /
    `MAX_PASSWORD` 必须与后端常量保持一致。
  - 登录只校验密码上限（`MAX_PASSWORD_LENGTH`），**不能**用长度下限去拒绝旧密码。
- 注册页与登录页**默认进登录**，页面保持极简：两个标签 + 邮箱 + 密码，
  底部一行互跳提示（登录页「还没有账号？立即注册」/ 注册页「已有账号？直接登录」）。
  **不要**再加营销文案、第三方登录按钮或冗长的技术说明段落。
- 注册失败且错误文案包含「已注册」时，前端自动切到登录模式，不要弹单独的错误页。
- 展示名（昵称）：注册时由服务端从邮箱前缀派生（`email.split("@")[0].slice(0, 24)`），
  注册表单里**不要**加昵称输入框——注册页保持极简（见上一条）。
  登录后可在 `/profile`（个人中心，入口在顶栏右上角）改昵称；
  用户原话：「需要可以设置昵称，不然用户名太丑陋了」。
- 昵称约束（下方规则的前端副本在 `src/account/nickname.ts`，后端在
  `functions/api/[[path]].js` 的 `nicknameProblem()`，**改一处必须同步另一处**）：
  - **全站唯一**，比对一律用 `lower(display_name)`（`Topps` 与 `topps` 算同一个）
  - 2～16 个字符，按字符数算（`Array.from(name).length`，否则一个中文字算两个）；
    可用文字、数字、下划线、连字符，词之间可有单个空格
  - 写入前 `normalizeNickname()` 去首尾空白并把连续空白压成一个空格，
    否则「多个空格」会被当成另一个名字而绕过唯一性
  - 界面流程固定为：输入 → 「检测是否可用」→ 通过后才能点「保存昵称」
    （`POST /api/profile/nickname` 与 `POST /api/profile`，均需登录）。
    检测与写入都要**排除自己**，否则用户把当前昵称原样检测一次会被判为占用
  - 唯一性由带 `NOT EXISTS` 的**单条** `UPDATE` 兜底，改不中就是 `RETURNING` 无行。
    **不要**改成「先查再写」——中间那道缝足够两次请求穿插进去
  - `users.display_name` 上有 `CREATE UNIQUE INDEX IF NOT EXISTS
    idx_users_display_name ON users(lower(display_name))`；建索引前必须先改掉
    历史重复名，否则索引会创建失败（`schema.sql` 里有对应的 `UPDATE`）
- 密码存储：PBKDF2-SHA256，`PBKDF2_ITERATIONS = 100000`，每用户独立 16 字节随机盐，
  用 base64 存入 `users.password_hash`。**禁止**降级为 MD5 / SHA1 / 无盐哈希。
  **100000 是硬性天花板**：Cloudflare 的 WebCrypto 会拒绝更高的迭代次数
  （`iteration counts above 100000 are not supported`），线上直接抛异常，
  本地 miniflare 不会——不要因为「本地没事」就调高这个数字。
- 会话：`ce_session` Cookie 存**原始** token，数据库 `sessions` 表只存它的 SHA-256；
  比对必须用 `safeEqual()` 常量时间比较。排查登录问题时注意这个方向——
  拿去查库的是哈希，Cookie 里发出去的是原始 token，两者不能混用。
- Cookie 属性固定为 `Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=<秒>`，
  站点无 HTTPS 的本地环境做接口测试时，需手动带上 Cookie 头（浏览器/HTTP 客户端
  不会自动回传 `Secure` Cookie）。
- 错误文案统一走 `fail("中文提示")`，且**不要**区分「邮箱不存在」与「密码错误」，
  一律返回「邮箱或密码不正确」，避免账号枚举。
- **不要**在输入框上用原生校验属性（`required` / `minlength` / `type="email"`）——
  浏览器原生提示会盖掉我们的中文文案。邮箱输入用 `type="text" inputmode="email"`，
  所有校验在 `submit()` 里自己做。

### 6.1 拆卡必须登录（没有本地模式）

- **只有云端拆卡**：拆盒结果只写入 D1 的 `breaks` / `pull_stats`，
  未登录用户看不到拆盒面板，`BreakView` 只展示一个「拆卡需要先登录」卡片 + `/auth` 链接。
- **严禁**重新引入基于 `localStorage` 的本机历史（历史上存在过 `HISTORY_KEY` /
  `LocalBreak` / `localSummary` / `state.history` / `clearHistory`，
  它们已经被彻底删除，不要再拿回来）。
- 服务端所有拆盒相关接口都要求登录：`POST /api/break`、`GET /api/breaks`、
  `DELETE /api/break`、`GET /api/stats` 未登录一律 `401 { ok:false, error:"请先登录" }`；
  `GET /api/global` 与 `GET /api/leaderboard` 对匿名访客开放。
- 统计页的数据源只有两个：`GET /api/stats`（聚合）与 `GET /api/breaks`（明细分页）。
  不要在前端重算一份聚合。
- 导航栏的盒数角标取 `state.breakTotal`（云端总数），不是当前页的记录条数。
- 拆盒写入失败时必须把 `recorded` 保持为 `false`（`recordBreak()` 返回布尔值），
  否则用户会以为已经入库。

## 7. 数据库约束

- Cloudflare D1，绑定变量名**必须**是 `DB`，不可改名。
- 表结构变更必须同时更新 `schema.sql`（全为 `CREATE TABLE IF NOT EXISTS` /
  `CREATE INDEX IF NOT EXISTS`，可重复执行）与 `meta.schema_version`。
- **已有库的变更走 `migrations/NNN-*.sql`**（约定见 `migrations/README.md`）：
  `schema.sql` 是新库的全量脚本、**不能重跑**，线上库只跑增量。
  两处都要改，且必须在 `PROGRESS.md` 待办里写明线上还没跑哪一条。
  D1 的 `ALTER TABLE` 没有 `IF NOT EXISTS`，迁移件只保证跑一次。
- 所有表都带 `app_key` 列用于多站点隔离，新增表必须带上。
- 维度表（`categories/makers/products/boxes/subsets/variants`）是 TS 目录的镜像；
  事实表（`breaks/pull_stats`）冗余 `category_key / maker_key / product_key`，
  以便任意维度切片统计。新增维度时同步补冗余列。
- `box_key` / `variant_key` 是**软引用**（不加外键），允许数据先于目录同步落地。
- 写批量 upsert 时用 `INSERT ... ON CONFLICT (...) DO UPDATE SET col = excluded.col`，
  **严禁** `INSERT OR REPLACE`——它是先删后插，会触发子表的 `ON DELETE CASCADE`。
- 前端渲染永远不依赖数据库：目录（品类 / 盒型 / 配率）由 TS 静态定义渲染，
  后端不可用时页面照常打开，只是拿不到统计数据。
- 个人拆盒记录**只在数据库里**，前端不再有任何本地历史（见 6.1）。
- **卡种上报必须带维度**：`byVariant` 的每一项是
  `{ count, subsetKey, tier }`，不能只给张数。`pull_stats.subset_key / tier`
  依赖这两个字段，缺失会导致「按稀有度 / 按子集」统计恒为空。
  严禁再用 `variantKey.split(":")` 这类从 key 里猜维度的写法。

## 8. 质量与验证（每次修改必做）

```bash
npm run typecheck   # vue-tsc --noEmit，必须零错误
npm run build       # 必须 Success，且 dist/_routes.json 存在
```

- 改动 `src/data/prices/` 下任何文件后，**必须**跑 `npm run prices:check`
  （盒价登记完整性 + 球员分级拼写 + 回本率区间，三段都要看）。
- 改动 `breaks` 表结构后，除了迁移件，还要确认 `npm run db:backfill` 仍能跑通。

- 改动概率模型或盒型数据后，必须在浏览器里实际拆几盒核对：张数恒定（`cardsPerPack × packsPerBox`）、
  配率表数字与 `box.ts` 一致、同一种子可复现同一盒。
- 改动后端后，用 `npm run dev:cf` 起本地全栈（wrangler + 本地 D1）做接口冒烟。
- 改动任何页面文案后，用下述命令扫一遍，保证没有把实现细节拄到页面上
  （注释与文档命中的可以忽略，只看 `.vue` 的模板部分）：
  ```powershell
  Get-ChildItem -Recurse -Include '*.vue' -Path 'src' |
    Select-String -Pattern '云端|数据库|后端|接口|写入|同步|聚合|分页'
  ```
- 终端 PATH 偶发丢失时（PowerShell 5.1），先执行：
  `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
- PowerShell 5.1 用 `;` 串联命令，不要用 `&&`；输出中文前先 `chcp 65001`。
- 含 `[` `]` 的路径（如 `functions/api/[[path]].js`）必须用 `-LiteralPath`。

## 9. Git 与发布

- commit message 格式：`type(scope): 描述`，如 `feat(basketball): 新增 Mega Box 配率`、
  `fix(engine): 修正最优卡比较`。type ∈ `feat / fix / docs / chore / refactor / perf / test`。
- 推送 `origin main` 即触发 **Cloudflare Pages 自动构建部署**（仓库根目录即站点，
  构建命令 `npm run build`，输出目录 `dist`），无需其他发布步骤。
- 首次推送需要完成 GitHub 设备码授权（Git Credential Manager 会打开浏览器）。
- 严禁提交任何密钥、token、敏感配置；`CE_SYNC_TOKEN` 只放 Cloudflare Pages 环境变量。
- 不提交 `node_modules/`、`dist/`、`.wrangler/`、`.dev.vars`。

## 10. 技术栈约束（勿随意升级）

- 保持现有大版本，**不要**引入新框架：
  - Vue 3.5 / Vite 6 / TypeScript 5.7 / Vue Router 4
  - **不引入 Pinia**，状态用 `src/stores/app.ts` 的手写 reactive 单例
  - **不引入 UI 组件库**，样式统一写在 `src/styles/main.css` + 组件 scoped 样式
- 不新增运行时依赖前先确认能否用现有工具实现；新增依赖需在 `PROGRESS.md` 记录理由。
- 别名 `@` 指向 `src`（`vite.config.ts` 与 `tsconfig.json` 各配一份，改一处要同步另一处）。

## 11. 文档同步（强制）

- **任何改动完成后必须更新 `PROGRESS.md`**（进展时间线 + 待办），格式见该文件顶部说明。
- 新增品类 / 发行商 / 盒型后，同步更新 `README.md` 的「扩展约定」示例。
- 本文档（`agent.md`）若因架构调整需要修改，改动前先向用户说明原因。

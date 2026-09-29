# CardEmulate

电子卡牌拆包模拟器，[WikiAndroid](https://wikiandroid.com) 的娱乐功能。

线上地址：<https://cardemulate.wikiandroid.com/>

按照发行商官方公布的 Pack Odds 表，逐包还原真实卡盒的配率结构。首页按卡品分类
（篮球 / 棒球 / 足球 / 橄榄球 / 网球 / UFC / 宝可梦），逐层进入
「品类 → 发行商 → 系列 → 盒型」，按盒拆开，看看这一盒里到底有什么。

> 本模拟器只还原概率结构，不涉及任何真实交易；卡面统一使用占位图并按照稀有度做色彩区分。

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Vue 3.5 + Vite 6 + TypeScript 5.7 + Vue Router 4 |
| 状态 | 手写 reactive 单例 store（无 Pinia） |
| 后端 | Cloudflare Pages Functions（`functions/api/[[path]].js`） |
| 数据库 | Cloudflare D1（SQLite），binding 变量名固定为 `DB` |
| 部署 | Cloudflare Pages，自定义域名 `cardemulate.wikiandroid.com` |

## 本地开发

```bash
npm install

# 只跑前端，/api 请求会失败，拆卡与统计都不可用
npm run dev

# 前端 + Pages Functions + 本地 D1（wrangler）
npm run dev:cf
```

其他脚本：

```bash
npm run typecheck   # vue-tsc --noEmit
npm run build       # 产出 dist/
npm run preview     # 预览已构建产物，端口 4173
npm run db:local    # 向本地 D1 应用 schema.sql
npm run smoke       # 对着本地服务跑一遍 API 冒烟测试
```

数据与回归脚本：

```bash
# 把官方 Pack Odds 文本转成可 diff 的 TS（不要手抄配率）
node scripts/import-pack-odds.mjs sources/<...>/pack-odds.txt src/data/sets/<...>/pack-odds.generated.ts

npm run boxes:snapshot   # 记录当前所有盒型的完整拆盒行为
npm run boxes:check      # 比对差异，有差异退出码 1
```

> 官方原始资料（Pack Odds / Checklist 的 PDF 与文本提取）统一归档在 `sources/`，
> 目录规则与代码一致：`sources/<品类>/<发行商>/<系列产品>/`。
> 来源分级、SHA-256 与采集流程见 `sources/README.md`。
>
> 改了 `src/data/sets/` 下任何数据后，除了 `typecheck` 与 `build`，
> 还要跑 `npm run boxes:check`：它锁住已有盒型的拆盒结果（含 5 个固定种子的逐卡输出），
> 重构共享逻辑时能立刻发现有没有把老盒型改坏。

> 本地 D1 的两个命令必须指向**同一个库**：`db:local` 走 `wrangler.toml` 里的 `DB`
> 绑定，`dev:cf` 也**不要**加 `--d1=DB`（那会另建一个空库，导致
> `no such table: users`）。

## 首次部署

1. 新建 D1 数据库：

   ```bash
   npx wrangler d1 create cardemulate
   ```

2. 打开 Cloudflare 控制台 → Workers & Pages → D1 → `cardemulate` → Console，
   粘贴 `schema.sql` 的全部内容并执行。

3. 新建 Pages 项目，连接本仓库：构建命令 `npm run build`，输出目录 `dist`。

4. Pages → Settings → Bindings 添加 D1 绑定，**变量名必须是 `DB`**，数据库选 `cardemulate`。

5. （可选）加一个环境变量 `CE_SYNC_TOKEN`，用于目录同步接口；再加 `CE_APP`（默认
   `cardemulate`）用于多站点共用同一个数据库时做命名空间隔离。

6. Pages → Custom domains 绑定 `cardemulate.wikiandroid.com`。

## 环境变量

| 变量 | 作用域 | 说明 |
| --- | --- | --- |
| `DB` | Pages 绑定 | D1 数据库，**变量名不可更改** |
| `CE_APP` | Pages 环境变量 | 站点命名空间，默认 `cardemulate`；同一数据库承载多个站点时用它隔离 |
| `CE_SYNC_TOKEN` | Pages Secret | 调用 `POST /api/catalog/sync` 的令牌；不配则该接口返回 403 |
| `VITE_API_BASE` | 构建期 | 接口前缀，默认 `/api`；本地跨域调试时才需要改 |

## 目录结构

```
src/
  catalog/            目录层：站点 / 品类 / 发行商 / 年份 / 系列 的定义与派生
    types.ts            AppDef / CategoryDef / MakerDef / ProductDef / YearGroupDef / BoxRef
    apps.ts             多站点注册表（APPS、CURRENT_APP）
    registry.ts         盒型注册表（registerBox / boxByKey / boxesWhere）
    define.ts           boxKey() 命名规则 + validateBox() + defineBox()
    taxonomy.ts         品类 / 发行商 / 系列的「预置种子」（未上线的占位）
    index.ts            由注册表 + 种子派生出 CATEGORIES / MAKERS / findProducts / findYearGroups
    db.ts               目录 -> D1 镜像负载（buildCatalogPayload）
  data/sets/          盒型数据，按 品类/发行商/系列 分目录
    index.ts            汇总注册所有盒型
    basketball/topps/tcu26-basketball/
      roster.ts         球员名单（紧凑元组）
      box.ts            子集、平行、配率、盒型定义
      index.ts
  data/teams.ts       球队展示元数据（队标 slug + 缩写兜底 + 主色，卡面图标用）
  engine/             拆包引擎（与具体卡盒解耦）
    types.ts            BoxDefinition / SubsetDef / VariantDef / PulledCard
    rng.ts             fnv1a + mulberry32，种子可复现
    rip.ts             加权抽样、期望值、概率、最优卡比较
    tiers.ts           稀有度元数据与配色
    marks.ts           卡面标记（AUTO / 限量编号 / RC）的推导
  api/client.ts       后端接口封装，含降级逻辑
  stores/app.ts       用户会话、云端拆盒记录、服务端统计
  views/              页面
  components/         组件（CategoryIcon 品类图标、TeamIcon 球队队标、CardFace 卡面等）
functions/api/        Pages Functions：鉴权、统计、目录同步
schema.sql            D1 建表脚本（v2：维度表 + 事实表分离）
```

## 扩展约定

### 命名规则

每个盒型的唯一标识由四段拼成，这个 key 同时就是数据库的 `box_key`：

```
<category>.<maker>.<productKey>.<slug>
```

例如 `basketball.topps.tcu26-basketball.value-box`。
四段的合法字符是 `[a-z0-9-]`，不允许出现大写、空格、下划线。

### 年份

系列要填 `year`：跨年赛季写 `"2025-26"`，单年发行的写 `"2026"`。
发行商页按它分组，新的年份在前。同一个系列的所有盒型必须填一致的值 ——
`validateBox()` 会检查格式，填错（比如写成 `"2025-2026"`）会直接抛错。

### 新增一个盒型

1. 在 `src/data/sets/<品类>/<发行商>/<系列>/` 下新建 `roster.ts` 与 `box.ts`，
   参考 `basketball/topps/tcu26-basketball/`。
2. `box.ts` 里用 `defineBox({...})` 产出定义；它会自动执行 `validateBox()`，
   开发环境下校验失败直接抛错（配率、编号、子集引用、卡号重复都会被拦住）。
3. 在该系列目录的 `index.ts` 里导出数组，并在 `src/data/sets/index.ts` 的
   `registerBoxes([...])` 中追加。
4. 如果这是一个全新的系列，在 `src/catalog/taxonomy.ts` 的 `PRODUCT_SEED`
   里补一条（只为了让未上线系列也显示占位条目，纯新增盒型可以跳过）。

加完之后品类页的盒型数量、「已上线」标记、面包屑都会自动更新，不需要改任何视图。

### 补一个老系列

历史系列跟新系列走同一套流程：建目录、写 `box.ts`、加进 `registerBoxes()`。
不同的是配率得先从发行商归档的 Pack Odds 原件里重新提取
（见 `sources/README.md`），系列多的时候可以一个年份补一个，
发行商页会自动多出一段年份分组。

### 新增一个品类 / 发行商

- 品类：在 `taxonomy.ts` 的 `CATEGORY_SEED` 追加一条，并在
  `components/CategoryIcon.vue` 里补一个 inline SVG。没有任何已上线盒型时，
  首页和品类页会自动显示「待上线，敬请期待！」。
- 发行商：在 `MAKER_META` 里补元数据，再把它挂到对应品类 `category.makers` 上；
  也可以只注册盒型，发行商会从注册表里被自动发现。

### 多站点

`src/catalog/apps.ts` 里的 `APPS` 支持注册多个站点，构建时用 `VITE_APP_KEY`
选择当前站点。所有数据表都带 `app_key` 列，所以多个站点可以共用同一个 D1 数据库。

## 目录同步（可选）

运行时不依赖数据库：页面全部由 TS 目录直接渲染。D1 里的维度表只是这份目录的镜像，
用于跨维度对账。需要时手动推一次：

```bash
curl -X POST https://cardemulate.wikiandroid.com/api/catalog/sync \
  -H "content-type: application/json" \
  -H "x-sync-token: $CE_SYNC_TOKEN" \
  --data @catalog.json
```

`catalog.json` 由 `buildCatalogPayload()`（`src/catalog/db.ts`）生成。

## 账号与注册

- **只支持一种注册方式：邮箱 + 密码**。不采集昵称、手机号等任何其他信息，
  **不提供**第三方登录，也不做邮箱验证流程。
- 账号密码只按**常见站点约束**校验：邮箱格式合法且不超过 100 字符；
  密码 **6～32 位**且不能包含空格。展示名由服务端取邮箱前缀自动生成。
- 认证页默认进**登录**；没有账号时点底部的「立即注册」即可切换。
- 密码以 **PBKDF2-SHA256（100,000 次迭代 + 每用户随机盐）** 哈希存储，不保存明文。
- 登录态用一个 `ce_session` Cookie（`HttpOnly` + `Secure` + `SameSite=Lax`，30 天），
  数据库只存其 SHA-256；登录失败不区分「邮箱不存在 / 密码错误」，避免账号枚举。
- **未登录不能拆卡**：本站不提供本地拆卡，点「按盒拆开」前必须先注册 / 登录。
  注册只需要邮箱 + 密码，页默认进登录。

## 拆卡与记录

- **只有云端拆卡**：每次拆盒结果都写入 D1 的 `breaks` 表，并从 `pull_stats`
  聚合出按稀有度 / 按子集的维度统计，没有任何浏览器本地存储。
- 未登录时 `BreakView` 只显示一张「拆卡需要先登录」卡片；`/stats` 显示登录引导，
  但全站累计与排行榜仍然对匿名访客开放。
- 登录后 `/stats` 展示：拆盒数 / 出卡数 / 已拆盒型 / 编号卡、按盒子汇总、
  稀有度分布、卡种子集 Top 24、最稀有的 20 张、以及可「显示更多」的拆盒记录明细。
- 明细列表由 `GET /api/breaks` 分页拉取（默认 20 条，单页最多 100 条）。

## 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/config` | 站点元信息与功能开关 |
| POST | `/api/auth/register` | 注册（仅需 `email` + `password`，密码 6～32 位且不含空格） |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/me` | 当前用户 |
| GET | `/api/stats` | 本人统计，需登录（支持 `?category=&maker=&box=`） |
| GET | `/api/breaks` | 本人拆盒记录，需登录（`?limit=&offset=` + 同上切片参数） |
| POST | `/api/break` | 记录一次拆盒，需登录 |
| DELETE | `/api/break` | 清空本人拆盒记录，需登录 |
| GET | `/api/leaderboard` | 排行榜（支持切片参数，匿名可读） |
| GET | `/api/global` | 全站统计 + 目录镜像规模（匿名可读） |
| GET | `/api/catalog` | 读取目录镜像（需已同步） |
| POST | `/api/catalog/sync` | 推送目录镜像（需 `x-sync-token`） |

## 数据来源

配率数据取自发行商公开的 Pack Odds 表。模拟结果由种子决定，
同一个种子永远复现同一盒，方便核对与讨论。

---

CardEmulate 是 WikiAndroid 的娱乐功能，仅用于拆包概率模拟，与 Topps、Panini、
Fanatics、The Pokémon Company 等发行商无任何关联，也不销售任何实体卡牌。

Copyright © 2026 WikiAndroid

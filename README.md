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

# 只跑前端，/api 请求会失败并自动降级为本机统计
npm run dev

# 前端 + Pages Functions + 本地 D1（wrangler）
npm run dev:cf
```

其他脚本：

```bash
npm run typecheck   # vue-tsc --noEmit
npm run build       # 产出 dist/
npm run preview     # 预览已构建产物，端口 4173
```

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
  catalog/            目录层：站点 / 品类 / 发行商 / 系列 的定义与派生
    types.ts            AppDef / CategoryDef / MakerDef / ProductDef / BoxRef
    apps.ts             多站点注册表（APPS、CURRENT_APP）
    registry.ts         盒型注册表（registerBox / boxByKey / boxesWhere）
    define.ts           boxKey() 命名规则 + validateBox() + defineBox()
    taxonomy.ts         品类 / 发行商 / 系列的「预置种子」（未上线的占位）
    index.ts            由注册表 + 种子派生出 CATEGORIES / MAKERS / findProducts
    db.ts               目录 -> D1 镜像负载（buildCatalogPayload）
  data/sets/          盒型数据，按 品类/发行商/系列 分目录
    index.ts            汇总注册所有盒型
    basketball/topps/tcu26-basketball/
      roster.ts         球员名单（紧凑元组）
      box.ts            子集、平行、配率、盒型定义
      index.ts
  engine/             拆包引擎（与具体卡盒解耦）
    types.ts            BoxDefinition / SubsetDef / VariantDef / PulledCard
    rng.ts             fnv1a + mulberry32，种子可复现
    rip.ts             加权抽样、期望值、概率、最优卡比较
    tiers.ts           稀有度元数据与配色
  api/client.ts       后端接口封装，含降级逻辑
  stores/app.ts       用户会话、本地历史、服务端统计
  views/              页面
  components/         组件
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

## 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/config` | 站点元信息与功能开关 |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/me` | 当前用户 |
| GET | `/api/stats` | 本人统计（支持 `?category=&maker=&box=`） |
| POST | `/api/break` | 记录一次拆盒 |
| DELETE | `/api/break` | 清空本人拆盒记录 |
| GET | `/api/leaderboard` | 排行榜（支持切片参数） |
| GET | `/api/global` | 全站统计 + 目录镜像规模 |
| GET | `/api/catalog` | 读取目录镜像（需已同步） |
| POST | `/api/catalog/sync` | 推送目录镜像（需 `x-sync-token`） |

## 数据来源

配率数据取自发行商公开的 Pack Odds 表。模拟结果由种子决定，
同一个种子永远复现同一盒，方便核对与讨论。

---

CardEmulate 是 WikiAndroid 的娱乐功能，仅用于拆包概率模拟，与 Topps、Panini、
Fanatics、The Pokémon Company 等发行商无任何关联，也不销售任何实体卡牌。

Copyright © 2026 WikiAndroid

# 价格来源登记册

这里记录**价格从哪来**：盒型购入价的出处、卡价的推导口径，以及本机能访问哪些查价站点。

与上一级 `sources/README.md` 的区别：那边的原始件是发行商发布的官方资料（配率、名单），
这里登记的是**市场信息**，天生带有时间与渠道属性，所以每一格都要求写清来源站点与记录日期。

## 一、结论先说

**本机能够访问的公开价格来源只有两个半：**

| 能拿到 | 站点 | 用途 |
| --- | --- | --- |
| 中文卡牌交易平台的挂牌价 | 卡淘 `www.cardhobby.com.cn` | 唯一的 RMB 卡价参照 |
| 汇率 | 中国银行外汇牌价 / ExchangeRate-API | 美元报价折算成 RMB |
| 只作对照 | Checklist Insider | 有配率没有价格，用来核对系列是否同一个 |

**北美与欧洲的主流行情站，一个都进不来。** 这意味着「拆盒时实时去多平台取当天均价」
在本项目里做不到，只能退到下一节的做法。

## 二、实测记录（2026-10-01）

方法：`scripts/probe-price-sites.mjs`，Node 24 内置 fetch，12 秒超时，
Chrome 桌面版 UA，逐站记录状态码 / 响应字节数 / 最终地址。
命令：`node scripts/probe-price-sites.mjs [站点名片段]`。

### 可用

| 站点 | 结果 | 能拿到什么 |
| --- | --- | --- |
| `www.cardhobby.com.cn`（卡淘） | 200，约 115 KB | 列表页是服务端直出，每条含 `￥` 价格、运费、出价次数 |
| `www.checklistinsider.com` | 200，约 148 KB | 只有清单与配率 |
| `open.er-api.com` | 200 | `USD → CNY` 汇率 |
| `api.frankfurter.app` | 200，跳 `api.frankfurter.dev` | `USD → CNY` 汇率 |
| `www.boc.cn/sourcedb/whpj/` | 200，约 27.5 KB | 人民币口径的美元牌价 |

卡淘的列表页结构（2026-10-01 实测）：`<a href="/market/item/<id>">` 包住一条记录，
价格在 `<table class="card-info">` 里，形如
`<span style="font-size:16px;...">￥NNO</span>`，另有一行 `运费：￥18`。
注意它给的是**起拍价或一口价**，不是成交价；成交价在 `/market/bidrecords/<id>`，
那张页面前端渲染，抓不到。

### 拒绝访问（403）

eBay（搜索页与首页）、130point、PriceCharting、Card Ladder、PSA 拍卖成交、
COMC、DA Card World、Steel City Collectibles、SportsCardsPro、TCDB、StockX、Topps 官网。

### 返回 200 但内容是反爬壳

| 站点 | 现象 |
| --- | --- |
| Blowout Cards | Incapsula 挑战页，正文本体约 1.1 KB，搜索页与首页都是 |
| Beckett | 302 到 `maintenance.beckett.com` |
| 淘宝 / 得物 / 闲鱼 / 转转 | 34 KB / 45 KB / 10.5 KB / 2.3 KB 的空壳，价格由脚本再拉接口 |
| 京东 | 2.7 KB 风控跳转页 |
| 7788.com | 1.19 MB，但没有命中任何关键词（页面是模板） |

### 网络不通

`auctions.yahoo.co.jp`、`jp.mercari.com`、`ruten.com.tw`、`shopee.tw`、`carousell.com.hk`
全部连接超时；Google、DuckDuckGo、Mojeek、Bing、`web.archive.org`、`archive.ph` 同样不可用。

## 三、所以价格怎么定

既然逐张联网查价不成立（在册卡种四千多个），价格走**登记 + 推导**两条腿：

| 价格 | 口径 | 存在哪 |
| --- | --- | --- |
| 盒型购入价 | 按公开零售报价折算成 RMB，逐条登记 | `src/data/prices/boxes.ts` |
| 卡价 | 档位基准价 × 限量系数 × 人物系数 × 系列系数 | `src/data/prices/card-values.ts` |

卡价模型是纯函数：只依赖卡本身的属性，不依赖时间、随机数或网络。
这样「复现这一盒」和「回填历史记录」都能算出同一个数。

### 盒价的可信度分级

每个条目都带 `confidence`，取值见 `src/data/prices/types.ts`：

- `verified` —— 本机实测抓到的价格
- `reference` —— 公开零售报价换算，**未在本机复核**
- `estimate` —— 同类盒型的合理估算

**当前 22 个盒型全部是 `reference`**：唯一能实测的卡淘覆盖不到盒型成交，
而北美零售渠道本机进不来（见第二节）。所以这批数字是**可改的基准**，
拿到更可靠的价格时直接改数字并同步 `asOf`，不要改模型去迁就某一格。

### 系列档次系数是标定值

`src/data/prices/products.ts` 里的 `PRODUCT_VALUE_FACTORS` **不是从任何官方资料抄的**，
是拿盒价反推出来的：跑 `npm run prices:check`，把每个系列的回本率调到 45%~60% 之间，
记下需要的倍数。它表达的是「这个系列的卡在二级市场上的溢价水平」，
换成更硬的卡价数据后，这张表应该是第一个被删掉的。

标定过程中改过 4 个盒价（不是改系数去迁就盒价，是把明显写反的盒价修正）：

| 盒型 | 原值 | 改后 | 依据 |
| --- | --- | --- | --- |
| `tccj26`（Cactus Jack） | ¥2880 | ¥2600 | 同档位旗舰 Hobby 的零售区间上限 |
| `tcosmic26`（Cosmic Chrome） | ¥2160 | ¥1600 | 单包数少、卡种少，不该高于旗舰 |
| `tthree26`（Topps 3） | ¥650 | ¥2200 | 原值是按「一盒 3 包」错算的，实际是整箱级包装 |
| `tbb26-value-box`（Topps 旗舰 Value Box） | ¥180 | ¥240 | 与同系列 Blaster 的价差应按包装规格，不是按倍率 |

改完全体回本率中位数 50.0%，区间 30.9%~80.2%，落在判定区间里。

## 四、复核命令

```bash
npm run prices:probe                     # 重新穿刺站点可用性（约 30 秒）
npm run prices:check                     # 盒价登记完整性 + 球员分级拼写 + 回本率
npm run prices:check -- thoops           # 只看某个系列
```

`prices:check` 的判定规则：盒价缺失与球员名拼错**判定失败**；
回本率看**全体中位数**（要求落在 25%~100%），单个盒型偏出只提醒不失败 ——
不同盒型的回收率本来就不一样，这是市场事实，不是数据错误。

## 五、历史记录里的金额怎么补

价格表上线前开的盒没有金额。补法不是估算，是**重放**：

```bash
npm run db:backfill                      # 本地库
npm run db:backfill -- --remote          # 线上库（先导出一份 breaks 留底）
```

能重放的原因写在 `scripts/backfill-break-values.ts` 的开头：
拆盒的随机数种子只由「盒型 key + 种子文本」拼接决定，而这两样每次都原样存进了 `breaks`，
所以每条老记录都能重开一遍，拿到当时的卡，再按当前价格表算出金额。
算出来的是「当时的卡按登记价现在值多少」，一条可以解释的数字，不是补一个平均数进去。

脚本只写变化的行，可以反复跑；盒型查不到（下架或改名）的记录跳过并打印，不猜价。

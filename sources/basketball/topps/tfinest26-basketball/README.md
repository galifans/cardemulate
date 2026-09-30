# 2025-26 Topps Finest Basketball

采集日期：2026-09-30

## 来源

| 资料 | 级别 | 链接 | SHA-256 |
| --- | --- | --- | --- |
| Pack Odds（配率） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/02/2025-26-Topps-Finest-Basketball-Checklist-Downloads-Odds.pdf` | `pack-odds.pdf`：`DD19E49694B22A425F5F83029342080FEA1292DAE18C1A420A55DE2146020990` |
| Checklist（名单，表格版） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/02/2025-26-Topps-Finest-Basketball-Checklist-Downloads-Excel-spreadsheet.xlsx` | `checklist.xlsx`：`56958ACE2399D71B4591B2690B836E360231B075ECE8FEFF7EFAC93452D8C702` |
| 盒型配置、**平行限量数** | D 授权转述件 | `https://www.checklistinsider.com/2025-26-topps-finest-basketball` | 指南页 HTML 未归档；抽出的小节表 78,576 字节，SHA-256 `5C61C0D337D896870B48E5F6E00893914B515CA4A69CCF4A5F66B6F8C8EA20A9` |

官方产品页：`https://www.topps.com/products/2025-26-topps-finest-basketball-hobby-box`
（Topps 官网对命令行请求返回 403，只用于人工核对。）

**这一份没有官方 Checklist PDF**，只有表格版；名单以表格版为准，`npm run roster:check` 只对上这一份。

### 为什么用 D 级

官方 Pack Odds 表这一份能下到（B 级），但**表里只有配率，没有平行限量数**；
限量数只在官方产品页与指南页里出现，而官方产品页本机 403。
按 `sources/README.md` 第二节的四道手续，限量数走 D 级：

1. 有明确授权：2026-09-30 用户决定配率类转述可用指南页。
2. 官方原件不可得：Topps 官网（含 `/products/...`）命令行与真实浏览器都是 Cloudflare 拦截页。
3. 做了数值交叉验证，见下节。
4. 改名列出来：本系列两边写法一致，只差一个后缀——指南页写 `Sky Blue Refractor /350`，
   官方行标签写 `Base Common Sky Blue`；`Xfractor` 在指南页里写成 `X-Fractor`。
   `box.ts` 里行标签一律用官方表的写法，限量数按指南页填。

## 指南页的转述怎么校验

指南页把每个小节的「张数 / 编号」与每档平行的「编号 + 各渠道配率」都写全了，
数字之间有一条恒等式：**张数 × 编号 × 配率 ≈ 本系列总印量（包）**。
本系列普卡三档各 100 张，拿 Hobby 一列 11 个样本验算：

| 来源 | 算式 | 结果 |
| --- | --- | --- |
| `Sky Blue Refractor /350`，1:10 | 100 × 350 × 10 | 350,000 包 |
| `Purple Refractor /250`，1:14 | 100 × 250 × 14 | 350,000 包 |
| `Blue Refractor /200`，1:18 | 100 × 200 × 18 | 360,000 包 |
| `Green Refractor /75`，1:47 | 100 × 75 × 47 | 352,500 包 |
| `Gold Refractor /50`，1:70 | 100 × 50 × 70 | 350,000 包 |
| `Orange Refractor /25`，1:140 | 100 × 25 × 140 | 350,000 包 |
| `Black Refractor /15`，1:234 | 100 × 15 × 234 | 351,000 包 |
| `Red Refractor /10`，1:350 | 100 × 10 × 350 | 350,000 包 |
| `SuperFractor 1/1`，1:3514 | 100 × 1 × 3514 | 351,400 包 |

11 个样本里 10 个落在 35.0–36.0 万包，只有 `Blue X-Fractor /125`（1:36）算出来 45 万，
偏离 29%，属个别档位的取整误差。**拆卡盒那一列是另一批产量**，同一套算法得到约 1.9 万包：

| 来源 | 算式 | 结果 |
| --- | --- | --- |
| `Purple Geometric Refractor /100`，1:2 | 100 × 100 × 2 | 20,000 包 |
| `Gold Geometric Refractor /50`，1:4 | 100 × 50 × 4 | 20,000 包 |
| `Red/Black Geometric Refractor /25`，1:7 | 100 × 25 × 7 | 17,500 包 |
| `Red Geometric Refractor /10`，1:17 | 100 × 10 × 17 | 17,000 包 |
| `Black Geometric 1/1`，1:167 | 100 × 1 × 167 | 16,700 包 |

所以指南页的 `/N` 是**这一档平行整批的印量**，不是单张卡的印量；
两个盒型的印量口径相差一个数量级，**不能互推**（`sources/README.md` 第三节第 7 步）。

另一头也对了：指南页逐行写的配率与官方表完全一致，例如指南页
`Sky Blue Refractor /350 (1:10 Hobby)` 对官方表 `Base Common Sky Blue` 的 Hobby 列 1:10、
`Purple Geometric Refractor /100 (1:2 Breaker)` 对官方表 `Base Common Purple Geometric`
的拆卡盒列 1:2。指南页的小节张数也和名册逐节对上，合计 764 张：

| 小节 | 张数 | 小节 | 张数 |
| --- | --- | --- | --- |
| Base Common / Uncommon / Rare | 100 + 100 + 100 | Headliners | 15 |
| Finest Autographs | 54 | Muse | 30 |
| Rookies Finest Autographs | 40 | Aura | 20 |
| Baseline Autographs | 50 | Arrivals | 30 |
| Colossal Shots Autographs | 49 | First | 30 |
| Electrifying Signatures | 49 | Finishers | 10 |
| Masters Autographs | 47 | Pulse | 20 |
| The Man | 20 | **合计** | **764** |

反向的校验也做了：把官方配率按「每包 10 张」加起来，Hobby 盒签名类期望
**1.98 张/盒**，官方规格写的是「每盒两张签名卡」；拆卡盒签名类期望 3.47 张/盒，
规格写的是「每盒三张」，属于保证下限。两边量级一致，说明表格与规格是同一套数据。

## 盒型配置

配率列名与 `pack-odds.generated.ts` 的 `PACK_ODDS_COLUMNS` 一一对应。
`src/data/sets/basketball/topps/tfinest26-basketball/box.ts` 里 `assembleBoxes(...)` 的参数
必须与这张表一致。

| 盒型 | 每包张数 | 每盒包数 | 签名保证 | 配率取哪一列 | 状态 |
| --- | --- | --- | --- | --- | --- |
| Hobby | 10 | 6 | 每盒 2 张 | `hobby` | 已上线 |
| Breaker Delight | 10 | 1 | 每盒 3 张 | `breaker` | 已上线 |

- 官方没公布发行量，不做推测。
- 官方表里 `Base Common 5:1` 是「每包 5 张」的意思，与 `1/0.2` 同口径，正好等于残差
  （普卡走残差，所以这一行在两种盒型里都不参与求和）。
- 两种盒型的普卡平行不通用：Hobby 列是普通折射版，拆卡盒列是几何折射版。
  拆卡盒的官方表里 `Base Common` 是空的，所以那个盒型的残差要指到
  `Base Common Geometric` 这一条平行上（`box.ts` 里的 `residualLabel`）。
- 官方配率是按包算的，Hobby 每盒 6 包、拆卡盒每盒 1 包，所以「每包」与「每盒」在
  拆卡盒里是同一件事。

## 配率表的列

`hobby, breaker`。

`box.ts` 里只登记行标签，数值一律从这张表取；某个盒型列为 `null` 就是「本盒不出这个卡种」。

## 已知问题

1. **四档插入卡（Arrivals、First、Finishers、Muse）的 SuperFractor 只在 Hobby 列**，
   拆卡盒列为空。导入时这一档一度被摆到拆卡盒列，是用
   `python scripts/verify-odds-columns.py` 拿官方 PDF 里文本块的真实横坐标逐格核对
   才发现的（生成文件的头部会记这条修正），`sources/README.md` 第三节第 6 步记了核对办法。
2. **不编号的三档平行，官方配率与指南页的阶梯顺序（Refractor → Oil Spill → Xfractor）
   不一致**：Common 是 `Refractor 1:8`、`Oil Spill 1:2`、`Xfractor 1:16`（Oil Spill 最易出），
   Uncommon 是 `1:6` / `1:24` / `1:12`，Rare 是 `1:24` / `1:96` / `1:48`（这两档都是
   Xfractor 比 Oil Spill 易出）。非编号档没有编号，恒等式对不上号，**原表如此，照抄**。
3. **`Masters Autographs Refractors 1:150` 比它自己的普通版 `1:163` 更易出**，原表如此，照抄。
4. **两档拆卡盒专属签名（Electrifying Signatures、Colossal Shots Autographs）的普通版
   行标签里带着 `Geometric`**（`Electrifying Signatures Geometric`），Hobby 列为空，
   拆卡盒列多一档 SuperFractor。原表如此，`box.ts` 里照抄行标签。
5. **名册里的分节标题与配率表的行标签写法不同**：指南页写 `Finest Autographs`、
   `Rookies Finest Autographs`，官方 Checklist 分节写 `AUTOGRAPH CARDS`、
   `ROOKIE AUTOGRAPHS`；`box.ts` 里 `section` 指名册、`label` 指配率表，
   不要指望字符串能直接对上。
6. `Pulse`、`The Man` 两档只有普通版一行配率（没有平行），`Headliners`、`Aura` 只有
   普通版与 SuperFractor 两行。原表如此，没有回填。
7. **普卡三档在配率表里是三条独立的行标签**（`Base Common` / `Base Uncommon` /
   `Base Rare`），名册分成三节各 100 行；`box.ts` 用一个 `SubsetPlan` 把三节收进
   `Base Set` 一张卡，三个普通版行标签走残差，不在 `variantMeta` 里。

## 核对名册

```powershell
npm run roster:check
```

本系列官方表 764 条（表格版），`roster.ts` 764 行，逐行对上才算通过。

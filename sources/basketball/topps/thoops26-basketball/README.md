# 2025-26 Topps NBA Hoops Basketball

采集日期：2026-09-30

## 来源

| 资料 | 级别 | 链接 | SHA-256 |
| --- | --- | --- | --- |
| Pack Odds（配率） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/04/2025-26-Topps-NBA-Hoops-Basketball-Checklist-Downloads-odds-new.pdf` | `pack-odds.pdf`（195,480 字节）：`453416FA10C8C1B2E17076E5D890C35BB5CCF88191024F84F88C5439D03EED1A` |
| Checklist（名单，表格版） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/04/2025-26-Topps-NBA-Hoops-Basketball-Checklist-Downloads-Excel-spreadsheet.xlsx` | `checklist.xlsx`（48,364 字节）：`935FEB2EE98D93D2581C9AD3B1347960FFB78D2E857AE2B94307D9158A09F413` |
| 盒型配置、平行限量数 | D 授权转述件 | `https://www.checklistinsider.com/2025-26-topps-nba-hoops-basketball` | 指南页正文 336,275 字节，SHA-256 `466136A1E923137154E52113D1E4A104EFCB68B00683EA5E1F9220C159090E97` |

派生文件：`pack-odds.txt`（62,724 字节，`pack-odds.pdf` 的文本层，
`3953B8F8B12CFC027A5567D1A3C3F70C122E5078BBA42B237295C57630E114AF`）。

**这一份只有表格版名册，没有官方 Checklist PDF**：官方下载区只放了 Excel 表格与配率 PDF
（`sources/README.md` 的镜像链接表里本系列只有这两个文件）。名册以表格版为准，
另外用指南页的逐卡索引做交叉核对。

配率 PDF 抽出来的文本层里，行标签与数字都是干净的（导入器报「没有需要注意的行」），
所以本系列不需要 `pack-odds-plain.txt` 那样自建的行标签词典。

### 为什么用 D 级

官方 Pack Odds 表能下到（B 级），但**表里只有配率，没有平行限量数**；
限量数只在官方产品页与指南页里出现，而 Topps 官网产品页对命令行请求取不到
（详见 `sources/README.md` 第二节）。按同一节的四道手续，限量数走 D 级：

1. 有明确授权：2026-09-30 用户决定配率类转述可用指南页。
2. 官方原件不可得：Topps 官网产品页取不到限量数文字。
3. 做了数值交叉验证，见下节；指南页逐行写的配率与官方表一致，例如指南页
   `Pixel Burst Purple /99 (1:88 Hobby; 1:21 Jumbo)` 对官方表 `Base Pixel Burst Purple`
   的 Hobby 1:88 / Jumbo 1:21，`Light Burst Platinum 1/1 (1:35,573 Blaster; 1:10,696 Fanatics;
   1:10,118 Hanger)` 对官方表 `Base Light Burst Platinum` 的 Value Box 1:35,573 /
   Hanger 1:10,118 / Fanatics 1:10,696。
4. 改名列出来：指南页在 `Green Hoops` 与 `The Buzz` / `Net 2 Net` / `Jam-Packed` 的
   `Green Hoops` 后面写了 Hanger，官方表这几行的 Hanger 列是空的（本模拟器按官方表，
   Hanger 不出 `Green Hoops`）；`Rainbow Yellow /275` 两边一致，都只列 Hobby 与 Jumbo。

## 恒等式验算

官方只公布配率、不公布发行量，但配率里藏着一条恒等式：
**张数 × 编号 × 配率 ≈ 该渠道的总包数（也就是这一批的印量）**。

同一批包数（从各子集的中位反推，`npm run print:check -- thoops26`）：

| 渠道 | 包数口径 | 依据 |
| --- | --- | --- |
| Hobby | 约 261 万包 | `Base` 中位 2,614,500，插卡五节 2,603,125–2,609,500 |
| Hobby Jumbo | 约 62 万包 | `Base` 中位 625,800，插卡五节 618,000–618,750 |
| Value Blaster | 约 1,073 万包 | `Base` 中位 10,748,700，`Hardwired` 等四节 10,714,375–10,734,000 |
| Hanger | 约 306 万包 | `Base` 中位 3,083,400，`Hardwired` 等四节 3,056,625–3,057,000 |
| Fanatics Blaster | 约 335 万包 | `Hardwired` 等四节 3,342,375–3,354,750 |

签名卡在零售两盒里是另一批（Value Blaster 签名约 901–1,177 万包，
Hanger 约 270–352 万包，Fanatics 约 485–634 万包）；Hobby / Jumbo 的签名卡与普卡同批
（2,395,440–2,494,800 / 591,300–616,440）。

官方表每一行的配率是「每包命中一次」的概率，五行加起来却不足每包张数：

| 盒型 | 其余各行 1:X 之和 | 残差（`Base`） | 权重合计 | 每包张数 |
| --- | --- | --- | --- | --- |
| Hobby | 1.01 | 6.99 | 8.0000 | 8 |
| Hobby Jumbo | 3.00 | 17.00 | 20.0000 | 20 |
| Value Blaster | 0.93 | 7.07 | 8.0000 | 8 |
| Hanger | 4.10 | 20.90 | 25.0000 | 25 |
| Fanatics Blaster | 0.80 | 7.20 | 8.0000 | 8 |

不足的部分只能由普卡补，所以五个盒型都用 `residualLabel` 把官方表的 `Base` 一行
指到残差上；「每包张数 = 各档权重之和」在五个盒型里都精确成立。
算出来的残差与官方 `Base` 那一行基本吻合（Hobby 6.99 对 1:7、Value Blaster 7.07 对 1:7、
Fanatics 7.2 对 1:7、Hanger 20.9 对 1:19、Hobby Jumbo 17.0 对 1:15）。

## 盒型配置

指南页给的规格：`Hobby` 8 cards per pack; 20 packs per box; 12 boxes per case、
`Hobby Jumbo` 20 / 10 / 8、`Value Blaster` 8 / 7 / 40、`Fanatics Blaster` 8 / 8（每箱盒数没写）、
`Hanger` 25 / 1 / 64。配率列名与 `pack-odds.generated.ts` 的 `PACK_ODDS_COLUMNS`
一一对应，`src/data/sets/basketball/topps/thoops26-basketball/box.ts` 里
`assembleBoxes(...)` 的参数必须与这张表一致。

| 盒型 | 每包张数 | 每盒包数 | 每箱盒数 | 签名保证 | 配率取哪一列 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| Hobby | 8 | 20 | 12 | 每盒 1 张 | `hobby` | 已上线 |
| Hobby Jumbo | 20 | 10 | 8 | 每盒 2 张 | `hobby-jumbo` | 已上线 |
| Value Blaster | 8 | 7 | 40 | 无 | `value-box` | 已上线 |
| Hanger | 25 | 1 | 64 | 无 | `hanger-box` | 已上线 |
| Fanatics Blaster | 8 | 8 | 0（官方没写） | 无 | `fanatics-box` | 已上线 |

- 普卡平行分两套、互不出现在对方盒型里：Hobby / Jumbo 走 `Pixel Burst` 一套
  （含 `Rainbow Green and Blue`、`Rainbow Gold and Green`、`Rainbow Yellow`），
  Value Blaster / Hanger / Fanatics 走 `Light Burst` 一套（含 `Rainbow Teal`、
  `Rainbow Red and Orange`、`Rainbow Purple and Blue`）；`Orange Hoops` 只在 Hanger（2:1）、
  `Fanatics` 只在 Fanatics、`Green Hoops` 只在 Value Blaster 与 Fanatics。
- 官方表里某个盒型那一格是空的，本模拟器就让这个卡种不进该盒型，不做替代。
- `Base` 一行只算非平行的普通普卡，平行各档各自成行；平行覆盖整套 300 张普卡。

## 配率表的列

`hobby, hobby-jumbo, value-box, hanger-box, fanatics-box`（官方 PDF 表头写 `Hobby` /
`Hobby Jumbo` / `Value Box` / `Hanger Box` / `Fanatics Box`；指南页与市面把第三列叫
`Value Blaster`、第五列叫 `Fanatics Value Blaster`，`box.ts` 的 `columnNames` 用指南页的叫法）。

导入器把 `A:B` 一律读成「每包命中一次」（取 `B/A`），所以官方表里 `Base` 写 7:1、
`Base Orange Hoops` 写 2:1、新秀签名写 1:18 都是同一个口径，两种写法都不会读错。
`box.ts` 里只登记行标签，数值一律从这张表取。

## 已知问题

1. **官方表格版给组合签名卡只写到组号**：同一组里的几张卡共用一个号——`HRD-A` 底下排着
   5 张双签、`HRT-CD` 两张、`HRS-D` 四张，单签的 `HHS-G` 底下也并排着三张卡。
   直接按卡号归并会把一组里的几张卡并成一张（`Hoops Rookies Duals` 会从 25 张缩到 11 张，
   `Hoops 1989 Signatures` 从 60 张缩到 52 张），
   所以 `roster.ts` 由 `scripts/import-roster.mjs` 的组号表按「组号 + 卡序号」拆开
   （本系列 45 组，`playersPerCard` 按分节是 1 / 2 / 3），核对脚本同步把 `组号-n` 折回组号，
   每节记一条「已知源表缺陷」。
2. **官方表个别格子与它自己那一批对不上**（原表如此，照抄，未做平滑）：
   `Base Rainbow Yellow /275` 的 Hobby 1:86 换算成 7,095,000 包，比 Hobby 那一批高 171%；
   `Base Rainbow Teal /299` 的 Value 1:254 换算成 22,783,800 包，高 112%（Hanger 1:72
   同样是高 109%）；Fanatics 的 `Base Light Burst Gold /50`、`Orange /25`、`Black /10`、
   `Red /5`、`Platinum 1/1` 五档都低 47–49%。
3. **指南页有一处数字被切坏**：`Jam-Packed Light Burst Platinum 1/1 (…; 1:16,0427; …)`
   少了首位，官方表这一格是 1:160,427，按它算出来的包数与同一批吻合。
4. **编号很小的档位配率取整后误差被放大**：`/5`、`/1` 这些档位差 19–31% 属于正常范围，
   与上面第 2 条不是一回事。
5. **官方配率表没有分节名，只有行标签**：名册的分节标题是全大写的组合签名节名
   （`HOOPS ROOKIE DUALS`），配率表的行标签是 `Hoops Rookies Duals` 这样的大小写写法，
   `box.ts` 里 `section` 指名册、`label` 指配率表，不要指望字符串能直接对上。
6. **指南页把 Hanger 的 25 张一包缩写成「Hanger Box」**，`Base Green Hoops` 那一行的
   Hanger 列官方表是空的（见「为什么用 D 级」第 4 步），本模拟器按官方表。

## 核对名册

```powershell
npm run roster:check
```

本系列核对 1091 行（29 个分节），官方表格版 1086 条卡号另有 425 条重复卡号（第 1 条）。

复核配率恒等式（报告式，不判定失败）：

```powershell
npm run print:check -- thoops26
```

本系列核对 5 个盒型、45 个可核对的子集、306 个档位，其中 17 档偏离中位数 15% 以上，
集中在第 2 条那两组官方格子与第 4 条的低编号档位。

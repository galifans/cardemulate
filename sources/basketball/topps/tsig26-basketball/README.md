# 2025-26 Topps Signature Class Basketball

采集日期：2026-09-30

## 来源

| 资料 | 级别 | 链接 | SHA-256 |
| --- | --- | --- | --- |
| Pack Odds（配率） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/04/2025-26-Topps-Signature-Class-Basketball-Checklist-Downloads-Odds.pdf` | `pack-odds.pdf`：`BCAF92C47BAE5FA7A1F0B14A9711946E106EB6A27A8A7AECEC5AF807A9B61B82` |
| Checklist（名单，表格版） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/04/2025-26-Topps-Signature-Class-Basketball-Checklist-Downloads-Excel-spreadsheet.xlsx` | `checklist.xlsx`：`F1FE312D62DCA04BC76243EBB1BBDAA34E55FD7AD8248EB1CC3F2C9E921B1911` |
| 盒型配置、**平行限量数** | D 授权转述件 | `https://www.checklistinsider.com/2025-26-topps-signature-class-basketball` | 指南页正文 113,963 字节，SHA-256 `7119E2B1D67C5EDBBBAC36FEEEEF11FB0E31E41F83650A3DB4F3092D51B52E16` |

派生文件：`pack-odds.txt`（42,076 字节，`pack-odds.pdf` 的文本层，
`48D3DBA7CE95978469C5F038065CBBC9F516CE08B86A88187A6B83E6E5A80E9E`）、
`pack-odds-plain.txt`（10,804 字节，自建的行标签词典，导入器的 `--labels` 用它清理标签，
`07DAF301F4C1DE86E532EC02DA449FBBCF664B7C06642545076EFAD905CD4D2B`）。

官方产品页：`https://www.topps.com/products/2025-26-topps-signature-class-basketball-hobby-box`
（Topps 官网对命令行请求返回 403，只用于人工核对。）

**这一份没有官方 Checklist PDF**，官方只放了表格版；名单以表格版为准，
另外用指南页的逐卡索引做交叉核对。

### 为什么用 D 级

官方 Pack Odds 表能下到（B 级），但**表里只有配率，没有平行限量数**；
限量数只在官方产品页与指南页里出现，而官方产品页本机 403。
按 `sources/README.md` 第二节的四道手续，限量数走 D 级：

1. 有明确授权：2026-09-30 用户决定配率类转述可用指南页。
2. 官方原件不可得：Topps 官网（含 `/products/...`）命令行与真实浏览器都是 Cloudflare 拦截页。
3. 做了数值交叉验证，见下节；指南页逐行写的配率与官方表完全一致，
   例如指南页 `Green Refractor /150 (1:96 Hobby)` 对官方表 `Veteran Class Chrome Base Green`
   的 Hobby 列 1:96，`FoilFractor 1/1 (1:14,661 Hobby)` 对官方表
   `Veteran Class Base FoilFractor` 的 Hobby 列 1:14661。
4. 改名列出来：两边有两处对不上——指南页纸质老兵普卡写 `Indigo /175`，
   官方行标签是 `Lime`（限量数一致，都是 175）；指南页折射版老兵普卡的
   `Purple Refractor /199` 与其配率对应的 /100 不是一档。两处都按官方表的行标签写，
   限量数按指南页填（`box.ts` 里 `Indigo` 记成 `Lime /175`、`/199` 记成 `/100`）。

## 恒等式验算

指南页把每档平行的「编号 + 各渠道配率」写全了，数字之间有一条恒等式：
**张数 × 编号 × 配率 ≈ 该渠道的总包数（也就是这一批的印量）**。

纸质老兵普卡 100 张，Hobby 一列 13 个样本：

| 平行 | 算式 | 结果 |
| --- | --- | --- |
| `Teal /225`，1:64 | 100 × 225 × 64 | 1,440,000 包 |
| `Lime /175`，1:82 | 100 × 175 × 82 | 1,435,000 包 |
| `Green /150`，1:96 | 100 × 150 × 96 | 1,440,000 包 |
| `Purple /100`，1:143 | 100 × 100 × 143 | 1,430,000 包 |
| `Pink /75`，1:191 | 100 × 75 × 191 | 1,432,500 包 |
| `Orange /50`，1:286 | 100 × 50 × 286 | 1,430,000 包 |
| `Red /25`，1:571 | 100 × 25 × 571 | 1,427,500 包 |
| `Red Lava /25`，1:571 | 100 × 25 × 571 | 1,427,500 包 |
| `Black /10`，1:1426 | 100 × 10 × 1426 | 1,426,000 包 |
| `Black Gold /10`，1:1426 | 100 × 10 × 1426 | 1,426,000 包 |
| `Blue /5`，1:2851 | 100 × 5 × 2851 | 1,425,500 包 |
| `FoilFractor 1/1`，1:14661 | 100 × 1 × 14661 | 1,466,100 包 |
| `Magenta /250`，1:81 | 100 × 250 × 81 | **2,025,000 包** |

12 个样本落在 142.5–146.6 万包，只有 `Magenta` 偏高 42%。旁边那套纸质新秀普卡
（49 张）的同一个档位是 1:115，`49 × 250 × 115 = 1,408,750`，
正好落在同一批里——所以是官方表那一格写错了，**原表如此，照抄**。

**这批印量（约 143 万 Hobby 包）不止普卡对得上**：

| 子集 | 张数 | 档数 | 包数中位数 | 区间 |
| --- | --- | --- | --- | --- |
| `Veteran Class Base` | 100 | 13 | 1,430,000 | 1,425,500–2,025,000 |
| `Rookie Class Base` | 49 | 15 | 1,400,175 | 1,396,990–1,436,778 |
| `Veteran Class Chrome Base` | 100 | 12 | 1,431,250 | 1,425,500–1,466,100 |
| `Rookie Class Chrome Base` | 50 | 12 | 1,428,125 | 1,425,500–1,466,100 |
| 插卡 8 节（`After Image`、`High Fidelity`、`Pure`、`Unfazed`、`Star Cast`、`Algorithm`、`Roses`、`Fluidity`） | 20–30 | 4 | 1,415,600–1,425,500 | 1,282,800–1,426,500 |

**签名卡是另一批**，只有六成：

| 子集 | 张数 | 档数 | 包数中位数 | 区间 |
| --- | --- | --- | --- | --- |
| `Veteran Class Autographs` | 46 | 8 | 844,215 | 821,008–946,450 |
| `Veteran Class Chrome Autographs` | 46 | 6 | 844,215 | 821,008–1,058,000 |
| `Rookie Class Autographs` | 46 | 8 | 843,640 | 821,008–924,600 |
| `Signature Blend`、`Shadow Scripts` 等 7 节 | 19–70 | 2–3 | 795,390–874,950 | 769,680–978,750 |

四个渠道各是一批，**不能互推**（`sources/README.md` 第三节第 7 步）：

| 渠道 | 包数口径 | 依据 |
| --- | --- | --- |
| Hobby | 约 143 万包 | 普卡与插卡的 13 节全部落在这里 |
| Hobby Jumbo | 约 30 万包 | `After Image` 中位数 300,500，`Star Cast` 300,500 |
| Value Blaster | 约 1,217 万包 | `After Image` 中位数 12,238,125，`Veteran Class Chrome Base` 12,170,000 |
| Mega | 约 1,712 万包 | `After Image` 中位数 17,118,125，`Veteran Class Chrome Base` 17,120,000 |

复核命令（报告式，不判定失败）：

```powershell
npm run print:check -- tsig26
```

本系列核对 4 个盒型、92 个可核对的子集、600 个档位，其中 52 档偏离中位数 15% 以上。
一半是编号很小的档位（`/5`、`/1`、`SuperFractor`）配率取整后误差被放大，
另一半集中在三处明显的对不上：纸质老兵普卡的 `Magenta 1:81`（Hobby +42%）、
该子集在 Hobby Jumbo 列的四档（`Magenta 1:73` +498%、`Teal 1:41` +202%、
`Lime 1:33` +89%、`Green 1:29` +43%）、
以及 Mega 列的 `Coral 1:120` 与 `Yellow 1:89`（都低 79%，而同一档在 Value Blaster 列
1:407 / 1:314 与本列其余档位吻合）。

## 盒型配置

指南页给的规格：`Hobby` 4 cards per pack; 8 packs per box; 12 boxes per case（第 199 行）、
`Hobby Jumbo` 10 / 4 / 6（第 201 行）、`Mega` 8 / 10 / 20（第 202–203 行）、
`Value Blaster` 7 / 6 / 40（第 205 行）。配率列名与
`pack-odds.generated.ts` 的 `PACK_ODDS_COLUMNS` 一一对应，
`src/data/sets/basketball/topps/tsig26-basketball/box.ts` 里 `assembleBoxes(...)` 的参数
必须与这张表一致。

| 盒型 | 每包张数 | 每盒包数 | 每箱盒数 | 签名保证 | 配率取哪一列 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| Hobby | 4 | 8 | 12 | 每盒 2 张 | `hobby` | 已上线 |
| Hobby Jumbo | 10 | 4 | 6 | 每盒 4 张 | `hobby-jumbo` | 已上线 |
| Value Blaster | 7 | 6 | 40 | 无 | `value-box` | 已上线 |
| Mega | 8 | 10 | 20 | 无 | `mega-box` | 已上线 |

官方表每一行的配率是「每包命中一次」的概率，各行加起来却不足每包张数：

| 盒型 | 其余各行 1:X 之和 | 残差（纸质老兵普卡） | 权重合计 | 每包张数 |
| --- | --- | --- | --- | --- |
| Hobby | 2.3746 | 1.6254 | 4.0000 | 4 |
| Hobby Jumbo | 5.9649 | 4.0351 | 10.0000 | 10 |
| Value Blaster | 1.4948 | 5.5052 | 7.0000 | 7 |
| Mega | 1.8094 | 6.1906 | 8.0000 | 8 |

不足的部分只能由纸质老兵普卡补，所以四个盒型都用 `residualLabel` 把
`Veteran Class Base` 指到残差上；另外三套普卡（纸质新秀 0.5、折射老兵 0.5、折射新秀 0.25）
照原样参与求和。「每包张数 = 各档权重之和」在四个盒型里都精确成立。

- 官方不公布发行量，上面那些包数是从配率反推的，不做进一步推测。
- 官方配率是按包算的，`Value Blaster` 每盒 6 包、`Mega` 每盒 10 包。
- `Hobby` 与 `Hobby Jumbo` 独有 `Monarchs of the Game`、`Leviathans` 与三档
  `Crystal Clear Autographs`；`Value Blaster` 与 `Mega` 独有 `Pandora`、`Pandora Yellow`
  两档折射平行与 `Aristocrat`、`Odyssey`、`Pressure Points`；
  纸质版的 `Blue & Orange`、`Bronze`、`Yellow`、`Coral` 四档平行只出在零售两盒里。

## 配率表的列

`hobby, hobby-jumbo, value-box, mega-box`（官方 PDF 表头写 `Hobby` / `Hobby Jumbo` /
`Value Box` / `Mega Box`；指南页与市面把第三列叫 `Value Blaster`，`box.ts` 的
`columnNames` 把展示名写成 `Value Blaster`）。

导入器把 `A:B` 一律读成「每包命中一次」（取 `B/A`），所以官方表里老兵普卡写
`2:1`、新秀普卡写 `1:2` 是同一个值 0.5，两种写法都不会读错。
`box.ts` 里只登记行标签，数值一律从这张表取；某个盒型列为空就是「本盒不出这个卡种」。

## 已知问题

1. **指南页有四处数字被切坏**（都按官方表填）：
   `Manuscripts` 的 `Orange Refractor /50 (1:246 Hobby; 1:122 Jumbo; 1:69,00 Blaster; …)`
   （应为 6,900）、`Signature Blend` 的
   `Gold Refractor /10 (…; 1:11,6832 Blaster; …)`（应为 116,832）、
   `After Image` 的 `Blue Refractor /5 (…; 1:13,6945 Mega)`（应为 136,945）、
   `Base Veteran Class Chrome Autographs` 的
   `Blue Refractor /5 (1:35,70 Hobby; …)`（应为 3,570）。
2. **指南页有两处 `Red Refractor /25(` 少了空格**（`Manuscripts` 与折射版老兵普卡），
   逐行抄录时容易把括号连进编号里，本系列已核对。
3. **折射版老兵普卡那一节的 `Purple Refractor /199` 是 /100**：同节折射版新秀普卡写作
   `Purple Refractor /100`，且两者的配率完全相同（1:143 Hobby / 1:31 Jumbo /
   1:1,217 Blaster / 1:1,712 Mega），`/199` 是笔误。
4. **`Lime` 与 `Indigo` 是同一档**：官方表行标签写 `Lime`，指南页写 `Indigo`，限量数都是 175。
   两套折射版普卡里都这样写，`box.ts` 用官方表的写法。
5. **官方表的个别格子与它自己那一批对不上**（见「恒等式验算」末段），
   另外 `/1`、`/5` 这种低编号档位的配率取整后误差很大。原表如此，照抄，未做平滑。
6. **官方表格版漏了纸质老兵普卡的 68 号**：`67 Jalen Green` 之后直接跳到 `69 Cam Whitmore`，
   而指南页的老将普卡列表（100 张）与逐卡索引（`Base - Anthony Edwards (68)`）都有这一号。
   已用 `scripts/import-roster.mjs` 的 `INSERT_PATCHES` 补回，`roster:check` 把它记成
   「已知源表缺陷」跳过一次。
7. **纸质版与折射版是两套不同的球员**，卡号范围一样但名单不同：
   68 号是 `Anthony Edwards`（纸质）对 `Nick Smith Jr.`（折射），
   89 号是 `Zach LaVine`（纸质）对 `Zach Lavine`（折射，同一个人的另一种写法，
   官方表格版原样如此，没有统一）；新秀 129 号之前两套完全相同，之后开始分叉，
   纸质版只到 149 号（49 张），折射版到 150 号（50 张），
   `Carter Bryant` 只出现在折射版新秀的 148 号、纸质版新秀没有这一号
   （指南页那一节也写着 `49 cards. Card #150 not listed.`）。
   所以两套普卡各占一个子集，合成一个会把同号的两张卡并成一张。
8. **官方配率表没有分节名，只有行标签**：名册的分节标题带 `BASE … AUTOGRAPHS` 前缀
   （`BASE VETERAN CLASS AUTOGRAPHS`），配率表的行标签不带 `Base`
   （`Veteran Class Autographs`）；`box.ts` 里 `section` 指名册、`label` 指配率表，
   不要指望字符串能直接对上。
9. **官方配率 PDF 里 `5:  1` 那一格有两个空格**，直接按空白切会把一格切成两格，
   老兵普卡一度因此丢了 Value Box 与 Mega 两列；`scripts/import-pack-odds.mjs`
   现在先用 `joinValues` 把「数字冒号空数字」合回一格，
   `python scripts/verify-odds-columns.py` 再拿 PDF 里文本块的真实横坐标逐格核对
   （本系列 728 格、不一致 0 格）。配率 PDF 抽出的文本层里标签被换行与空白拆开过，
   导入时用 `--relaxed --labels=pack-odds-plain.txt` 靠词典把标签清理回原样。

## 核对名册

```powershell
npm run roster:check
```

本系列官方表格版 969 条（另有 164 行重复卡号：`Dual Autographs` 一张卡占两行、
`Triple Autographs` 占三行），`roster.ts` 1098 行逐行对上，
另有 1 条已知源表缺陷（纸质老兵普卡 68 号）跳过官方表那一轮核对。
`roster.ts` 共 31 个分节，用
`node scripts/import-roster.mjs sources/basketball/topps/tsig26-basketball/checklist.xlsx
src/data/sets/basketball/topps/tsig26-basketball/roster.ts 1 "2025-26 Topps Signature Class Basketball"`
重新誊抄（第 2 个参数是工作表序号）。

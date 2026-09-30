# 2025-26 Topps 3 Basketball

采集日期：2026-09-30

## 来源

| 资料 | 级别 | 链接 | SHA-256 |
| --- | --- | --- | --- |
| Pack Odds（配率） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/02/2025-26-Topps-3-Basketball-Checklist-Downloads-Odds.pdf` | `pack-odds.pdf`：`9A779D849E4F9E5B1822FBBDE0AB62DF034F0D39F1D1785D194FD273AEF1665D` |
| Checklist（名单，表格版） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/02/2025-26-Topps-3-Basketball-Checklist-Downloads-Excel-spreadsheet.xlsx` | `checklist.xlsx`：`1B706A7E8107899ABE7F61694817036E4436462401C60213BC658D920BFE04D3` |
| 盒型配置、**平行限量数**、缺行配率 | D 授权转述件 | `https://www.checklistinsider.com/2025-26-topps-3-basketball` | 指南页 HTML 未归档；抽出的小节表 112,160 字节，SHA-256 `3B254E3342E5657C8D1177F4876F152D5A1F69EEB07EA92965B7A097E56959F5` |

官方产品页：`https://www.topps.com/products/2025-26-topps-3-basketball-hobby-box`
（Topps 官网对命令行请求返回 403，只用于人工核对。）

**这一份没有官方 Checklist PDF**，只有表格版；名单以表格版为准，`npm run roster:check` 只对上这一份。

### 为什么用 D 级

官方 Pack Odds 表这一份能下到（B 级），但**表里只有配率，没有平行限量数**；
限量数只在官方产品页与指南页里出现，而官方产品页本机 403。
按 `sources/README.md` 第二节的四道手续，限量数走 D 级：

1. 有明确授权：2026-09-30 用户决定配率类转述可用指南页。
2. 官方原件不可得：Topps 官网（含 `/products/...`）命令行与真实浏览器都是 Cloudflare 拦截页。
3. 做了数值交叉验证，见下节。
4. 改名列出来：本系列官方列名与指南页写法完全一致（`Hobby` / `FDI`），没有改名。

## 指南页的转述怎么校验

指南页把每个小节的「张数 / 编号」与每档平行的「编号 + 各渠道配率」都写全了，
数字之间有一条恒等式：**张数 × 编号 × 配率 ≈ 本系列总印量（包）**。
拿整份指南页 137 个样本取中位数，得到 **23,250 包**，同一条数值可以在很多互不相干的
小节上复现：

| 来源 | 算式 | 结果 |
| --- | --- | --- |
| Base Bronze /25，1:10，100 张 | 100 × 25 × 10 | 25,000 包 |
| Base Blue /15，1:16，100 张 | 100 × 15 × 16 | 24,000 包 |
| Base Gold /10，1:23，100 张 | 100 × 10 × 23 | 23,000 包 |
| Base Platinum 1/1，1:229，100 张 | 100 × 1 × 229 | 22,900 包 |
| 3&D /15，1:39，40 张 | 40 × 15 × 39 | 23,400 包 |
| City Drip Signatures Holo Gold /3，1:264，28 张 | 28 × 3 × 264 | 22,176 包 |

所以指南页的 `/N` 是**这一档平行整批的印量**，不是单张卡的印量。有了这条恒等式，
指南页没写的两项也能反推出来：

- 官方表里 `Triple Relics Autographs` 只有 Gold / Red / Platinum 三档配率（1:140 / 1:281 / 1:1302），
  没有普通版那一行。17 张反推：/10、/5、1/1——正好是常见的那套阶梯，说明这只 17 张卡
  没有不编号的普通版。
- 各子集的平行编号也可以逐档验算，例如 `Rookie 3 Patch Autographs Horizontal`（40 张）
  的 Bronze 1:23 → /25.3、Blue 1:37 → /15.7、Gold 1:56 → /10.4、Red 1:111 → /5.2、
  Platinum 1:554 → 1.05，取整后正好是 /25 / /15 / /10 / /5 / 1/1。
- 反不过来的一处：`Rookie 3 Patch Autographs` 的 Emerald（1:2）与 Holo Gold（1:5）
  只写了 FDI 一列，分母不是整套的包数，恒等式用不上。这两档在原表里本来也没有编号，
  `box.ts` 里如实写成不编号的平行，不做推测。

反向的校验也做了：把这盒的官方配率按「每包 4 张」加起来，签名类期望是
**2.963 张/盒**，官方规格写的是「每盒三张签名卡」；非签名类期望 1.037 张/盒，
规格写的是「每盒一张非签名卡」。两边各自对得上，说明表格与规格是一致的。

## 盒型配置

配率列名与 `pack-odds.generated.ts` 的 `PACK_ODDS_COLUMNS` 一一对应。
`src/data/sets/basketball/topps/tthree26-basketball/box.ts` 里 `assembleBoxes(...)` 的参数
必须与这张表一致。

| 盒型 | 每包张数 | 每盒包数 | 签名保证 | 配率取哪一列 | 状态 |
| --- | --- | --- | --- | --- | --- |
| Hobby | 4 | 1 | 每盒 3 张 | `hobby` | 已上线 |
| FDI（First Day Issue） | 4 | 1 | 每盒 3 张（含 1 张专属 RPA 平行） | `fdi` | 未上线 |

- 官方没公布每箱盒数，`boxesPerCase` 留 0；官方也没公布发行量，不做推测。
- 盒内构成（Hobby 与 FDI 都是）：3 张签名（签名卡与实物签名卡合计）+ 1 张非签名卡，
  非签名卡可能是普卡也可能是插入卡。
- FDI 比 Hobby 多的东西：1 张 Rookie 3 Patch Autographs 专属平行（Emerald 或 Holo Gold）。
  这两档官方表只给了 FDI 列，`box.ts` 里因此不在 Hobby 盒的内容里。
- 官方配率是按包算的，本盒每包 4 张、每盒 1 包，所以「每盒」与「每包」是同一件事：
  官方配率加起来 3.773，留给普卡的只有 0.227，`box.ts` 把残差下限从默认的 0.5 调成 0.2，
  否则整盒权重会被顶到 4.273 —— 这盒普卡官方配率本来就只有 1:5（平均 5 盒出 1 张）。

## 配率表的列

`hobby, fdi`。

`box.ts` 里只登记行标签，数值一律从这张表取；某个盒型列为 `null` 就是「本盒不出这个卡种」。

## 已知问题

1. **官方 PDF 有三行把配率黏在行标签后面**（标签太宽，排不下空格）：
   `Rookie 3 Patch Autographs Horizontal Bronze1:23`、
   `… Horizontal Platinum1:554`、`… Vertical Platinum1:554`。
   这三行在原表里第一列是空的，导入时用 `scripts/import-pack-odds.mjs` 的
   `LABEL_PATCHES`（改标签）与 `ROW_PATCHES`（补第一列数值）修回来，
   生成的 `.ts` 头部会列出这两处修正。
2. **Emerald 与 Holo Gold 两档平行只有 FDI 一列有值**，Hobby 列为空。原表如此，没有回填；
   结果是这两档不进 Hobby 盒（见上）。
3. **`Triple Relics Autographs` 是三人卡**：官方表里 17 个卡号各占三行（51 行）。
   名册照抄 51 行，`shared/assemble.ts` 会把同一卡号上的多个球员合并成一条，
   页面上仍然是一张卡（球员名用 ` / ` 串起来）。
4. 官方表里 `Triple Relics Autographs` 没有普通版配率行（见上节，编号已由恒等式反推）。
5. **名册里的分节标题是 `3 AND D`，配率表里写的是 `3&D`**，两处写法不同但指同一个子集，
   `box.ts` 里用 `section` 指名册、`label` 指配率表，不要指望字符串能直接对上。

## 核对名册

```powershell
npm run roster:check
```

本系列官方表 1171 条（表格版），`roster.ts` 1171 行，逐行对上才算通过。

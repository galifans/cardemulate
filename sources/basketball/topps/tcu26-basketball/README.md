# 2025-26 Topps Chrome Updates Basketball

采集日期：2026-09-30

## 来源

| 资料 | 级别 | 链接 | SHA-256 |
| --- | --- | --- | --- |
| Pack Odds（配率） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/08/2025-26-Topps-Chrome-Update-Series-Basketball-Checklist-Downloads-Odds-Checklist-Insider-new-update.pdf` | `pack-odds.pdf`：`B4F08A7B42A432D762D2BF9C8F34D252A47B61477C84E66549649D70158FB817` |
| Checklist（名单，PDF） | B 官方镜像 | 同批下载，镜像链接待补记 | `checklist.pdf`：`7010B390246C9297AB213ABF22FDEF2408CE76D7D54B21966D0C63BA8E9E4FC2` |
| Checklist（名单，表格版） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/07/2025-26-Topps-Chrome-Update-Series-Basketball-Checklist-Downloads-Excel-spreadsheet-Checklist-Insider.xlsx` | `checklist.xlsx`：`56AF51845500B9D9C8DEFD68517D18819741BFE88F3E60802AA7DDF0BF494479` |
| 发行说明（盒型配置） | A 官方原件 | `https://www.cardboardconnection.com/wp-content/uploads/2026/08/2025-26_Topps_Chrome_Updates_BK_-_Education_Sheet-_FINAL.pdf` | 原 PDF 未归档（体积以图片为主），只留文本 |

官方产品页：`https://www.topps.com/products/2025-26-topps-chrome-updates-basketball-value-box`
（Topps 官网对命令行请求返回 403，只用于人工核对。）

名册的数据源是官方 Final Checklist：`roster.ts` 头部写的是 PDF 文件名
（`Final_CheckList_26CUBK.pdf`），归档后就是本目录的 `checklist.pdf`；
后来找到的表格版 `checklist.xlsx` 是同一份名单的另一种导出，把卡号 / 人物 / 球队 /
新秀标记拆成了四列（`A` / `B` / `C` / `D`），誊抄与核对以它为准。
两种导出都存在时，名册应当同时对上两份。

## 盒型配置

来自官方发行说明，权威值如下。`src/data/sets/basketball/topps/tcu26-basketball/box.ts`
里 `BOX_CONFIGS` 的参数必须与这张表一致。

| 盒型 | 每包张数 | 每盒包数 | 签名保证 | 配率取哪一列 | 状态 |
| --- | --- | --- | --- | --- | --- |
| Hobby | 4 | 20 | 每盒 1 张 | `hobby` | 已上线 |
| Jumbo | 11 | 12 | 每盒 3 张 | `jumbo` | 已上线 |
| Delight | 12 | 1 | 每盒 2 张 | `delight` | 未上线 |
| Value | 4 | 7 | 无 | `value-box-ea` | 已上线 |
| Mega | 6 | 7 | 无 | `mega-box-ea` | 已上线 |
| Sapphire | — | — | — | `sapphire` | 未上线 |
| Fanatics | — | — | — | `fanatics-box` | 未上线 |

同一个盒型在官方表里拆成多个渠道列（Value Box 分 EA/SE/CEE 三种零售渠道，Mega 同理），
拆包时取本渠道的列；同一盒型的几个渠道列数值一致，只差 PDF 提取误差。
三列不一致时以 `-ea` 列为准，并用 `SubsetSpec.manual` 单独补齐差异项（如 `Alter Ego`）。

官方资料没有公布每箱盒数，`boxesPerCase` 留 0，页面上就不显示「盒 / 箱」。

## 配率表的列

官方表从左到右 12 列，与 `pack-odds.generated.ts` 里 `PackOddsRow.odds` 的下标一一对应：

`hobby, jumbo, delight, sapphire, value-box-ea, value-box-se, value-box-cee,
mega-box-ea, mega-box-se, mega-box-cee, fanatics-box, ascc-promo-pks`

`box.ts` 里只登记行标签，数值一律从这张表取；某个盒型列为 `null` 就是「本盒不出这个卡种」。

## 已知问题

1. **`Alter Ego` 行缺列**。PDF 转文本时行尾的空列被吃掉，导致该行不足 12 个值。
   `scripts/import-pack-odds.mjs` 里用 `ROW_PATCHES` 按官方原值补齐，改动前必须回看 PDF。
2. **`Rookie Autographs Lava Lamp` 是 7 个独立行**（`Magenta/Purple` 到 `Black/Red`），
   不是一行加 7 个平行，映射时要注意。
3. **`Base Refractors Yellow Wave` 只有 Hobby 一列有值，`No Limit Superfractors` 的 Jumbo
   列为空**。两处都是原表如此，没有回填；前者成了 Hobby 独占，后者在 Jumbo 里不出。
4. PDF 文本提取对个别符号不稳（例如 `X/hyphen.caseFRACTOR` 实为 `X-FRACTOR`），
   涉及数值之外的内容一律回看 PDF。
5. **官方表把 NBA Debut Patch Autographs 整份名单贴了两遍**，第二遍重复占用了
   前一遍已经用过的卡号：`DPA-AB`（第一遍是 Ace Bailey）与 `DPA-CJ`（第一遍是 Curtis Jones）
   在第二遍里变成了 Adama Bal 与 Chaney Johnson。`roster.ts` 里把后两行写成
   `DPA-ABAL` / `DPA-CJJ` 以区分同号；`scripts/check-roster.mjs` 的 `SOURCE_DEFECTS`
   登记了这两处，核对时按官方原卡号比对，不再报为差异。
6. **人物名的重音符号官方表自己就不统一**：`Luka Dončić` / `Nikola Jokić` 带重音，
   而 `Kasparas Jakucionis` / `Toni Kukoc` 不带，`Hugo Gonza´lez` 的重音符号位置还是错的。
   代码里统一写正确全名，核对脚本比对时忽略重音与标点，两种写法视为同一人。

## 核对名册

```powershell
npm run roster:check
```

脚本会把 `roster.ts` 的每一行对回 `checklist.xlsx` 与 `checklist.txt`：
卡号 / 人物必须命中，球队与新秀标记必须一致（文本件没有球队列，只对卡号与人物）。
输出 `通过` 才算誊抄无误；报出来的出入要么改 `roster.ts`，要么回看原件后登记进
`SOURCE_DEFECTS`。

## 重新生成派生数据

```powershell
node scripts/import-pack-odds.mjs `
  sources/basketball/topps/tcu26-basketball/pack-odds.txt `
  src/data/sets/basketball/topps/tcu26-basketball/pack-odds.generated.ts
```

生成后确认脚本没有打印「列数不对」的警告；`Alter Ego` 之外若出现警告，说明官方表变了，
需要回看 PDF 后更新 `ROW_PATCHES`。

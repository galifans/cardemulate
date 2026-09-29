# 2025-26 Topps Chrome Updates Basketball

采集日期：2026-09-30

## 来源

| 资料 | 级别 | 链接 | SHA-256（`pack-odds.pdf` / `checklist.pdf`） |
| --- | --- | --- | --- |
| Pack Odds（配率） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2026/08/2025-26-Topps-Chrome-Update-Series-Basketball-Checklist-Downloads-Odds-Checklist-Insider-new-update.pdf` | `B4F08A7B42A432D762D2BF9C8F34D252A47B61477C84E66549649D70158FB817` |
| Checklist（名单） | B 官方镜像 | 同批下载，镜像链接待补记 | `7010B390246C9297AB213ABF22FDEF2408CE76D7D54B21966D0C63BA8E9E4FC2` |
| 发行说明（盒型配置） | A 官方原件 | `https://www.cardboardconnection.com/wp-content/uploads/2026/08/2025-26_Topps_Chrome_Updates_BK_-_Education_Sheet-_FINAL.pdf` | 原 PDF 未归档（体积以图片为主），只留文本 |

官方产品页：`https://www.topps.com/products/2025-26-topps-chrome-updates-basketball-value-box`
（Topps 官网对命令行请求返回 403，只用于人工核对。）

## 盒型配置

来自官方发行说明，权威值如下。`src/data/sets/basketball/topps/tcu26-basketball/boxes.ts`
里的参数必须与这张表一致。

| 盒型 | 每包张数 | 每盒包数 | 签名保证 |
| --- | --- | --- | --- |
| Hobby | 4 | 20 | 每盒 1 张 |
| Jumbo | 11 | 12 | 每盒 3 张 |
| Delight | 12 | 1 | 每盒 2 张 |
| Value | 4 | 7 | 无 |
| Mega | 6 | 7 | 无 |

官方资料没有公布每箱盒数，程序里对应字段留空，不在页面上编造数字。

## 配率表的列

官方表从左到右 12 列，与 `pack-odds.generated.ts` 里 `PackOddsRow.odds` 的下标一一对应：

`hobby, jumbo, delight, sapphire, value-box-ea, value-box-se, value-box-cee,
mega-box-ea, mega-box-se, mega-box-cee, fanatics-box, ascc-promo-pks`

同一个盒型在官方表里拆成多个渠道列（如 Value Box 分 EA/SE/CEE 三种零售渠道），
拆包时取本渠道的列。

## 已知问题

1. **`Alter Ego` 行缺列**。PDF 转文本时行尾的空列被吃掉，导致该行不足 12 个值。
   `scripts/import-pack-odds.mjs` 里用 `ROW_PATCHES` 按官方原值补齐，改动前必须回看 PDF。
2. **`Rookie Autographs Lava Lamp` 是 7 个独立行**（`Magenta/Purple` 到 `Black/Red`），
   不是一行加 7 个平行，映射时要注意。
3. PDF 文本提取对个别符号不稳（例如 `X/hyphen.caseFRACTOR` 实为 `X-FRACTOR`），
   涉及数值之外的内容一律回看 PDF。

## 重新生成派生数据

```powershell
node scripts/import-pack-odds.mjs `
  sources/basketball/topps/tcu26-basketball/pack-odds.txt `
  src/data/sets/basketball/topps/tcu26-basketball/pack-odds.generated.ts
```

生成后确认脚本没有打印「列数不对」的警告；`Alter Ego` 之外若出现警告，说明官方表变了，
需要回看 PDF 后更新 `ROW_PATCHES`。

# 数据来源登记册

这里存放**没有经过任何加工**的发行商原始资料，以及每份资料的出处。

之所以要把原始件也提交进仓库：配率与名单是产品的核心资产，一旦本机的临时下载
没了，就只能靠记忆重做。原始件留着，任何时候都能用 `scripts/` 里的脚本重新生成
`src/data/` 下的派生数据，并且能逐字比对。

## 一、目录约定

原始件按网站的分类结构摆放，与 `src/data/sets/` 完全一致：

```
sources/<品类>/<品牌>/<系列产品>/
```

例如 `sources/basketball/topps/tcu26-basketball/`。

每个系列产品目录下固定放两类文件：

| 文件 | 内容 | 强制性 |
| --- | --- | --- |
| `README.md` | 该系列的采集记录：来源链接、采集日期、已知问题 | 必须 |
| `pack-odds.pdf` / `pack-odds.txt` | 官方 Pack Odds 表（配率）原始件与文本提取件 | 必须 |
| `checklist.pdf` / `checklist.txt` | 官方 Checklist（名单）原始件与文本提取件 | 必须 |
| `checklist.xlsx` | 官方 Checklist 的表格版（列已经拆好：卡号 / 人物 / 球队 / 新秀标记） | 能拿到就必须收 |
| `education-sheet.txt` | 官方发行说明的文本提取件，盒型配置（每包张数、每盒包数）以它为准 | 必须 |
| `extract-pdf-text.py` | 从 PDF 提取文本的脚本，保证提取结果可复现 | 必须 |

`.pdf` 是权威原件，`.txt` 只是它的文本视图，方便检索与 diff。
两者不同步时以 `.pdf` 为准。

`.xlsx` 与 `.pdf` 是同一份官方名单的两种导出，互为佐证：`.pdf` 是权威件，
但表格版把球队、新秀标记放在了独立列里，誊抄与核对都以它为准，
拿不到表格版时再回到 `.pdf` 逐行看。两者都归档的系列，名册应同时对上这两份。

## 二、来源分级

数据来源只认下面三级，其他渠道（论坛、博客、二手转发）一律不作为依据。

| 级别 | 说明 | 用途 |
| --- | --- | --- |
| **A 官方原件** | 发行商自己发布的产品页面、Pack Odds 表、Checklist、发行说明 | 唯一可用于生成数据的来源 |
| **B 官方镜像** | 由第三方托管、但内容与 A 逐字节相同的文件 | 当 A 无法直接下载时使用，须记录哈希以便验证 |
| **C 参考** | 整理站、卖家页面对 A 的转述 | 只能用来**寻找** A，不能用来填数据 |

### 稳定入口

| 入口 | 地址 | 状态 |
| --- | --- | --- |
| Topps 官方配率页 | `https://www.topps.com/pages/odds` | A 级，但带反爬，命令行直连返回 403，只能人工打开 |
| Topps 官方产品页 | `https://www.topps.com/products/<产品 slug>` | A 级，同样 403 |
| Checklist Insider 镜像 | `https://xcdn.checklistinsider.com/public/<年>/<月>/...pdf` | B 级，可命令行直接下载，内容为 Topps 官方 PDF 原件 |

实践结论：**配率与名单优先走 B 级镜像下载，再用哈希或页数比对确认与 A 级一致**；
Topps 官网只用人工核对，不写进自动化流程。

## 三、采集流程

新系列上线时按下面顺序做，每一步都要留痕。命令里的 `<系列目录>` 指
`sources/<品类>/<品牌>/<系列产品>`，`<代码目录>` 指 `src/data/sets/<品类>/<品牌>/<系列产品>`；
两边的相对路径必须完全一致，脚本靠这个对应关系找原件。

1. **找官方页面**。从发行商官网定位该产品的产品页、Pack Odds 表、Checklist；
   Topps 官网对命令行请求返回 403，只能人工打开，但要把链接记下来。
2. **取原件**。官网下不动就去 Checklist Insider 镜像找同一批文件
   （镜像地址形如 `https://xcdn.checklistinsider.com/public/<年>/<月>/<文件名>`）。
   镜像内容与官网逐字节相同，属于 B 级。
3. **归档**。把 Pack Odds、Checklist、发行说明放进 `<系列目录>`，文件名统一成
   `pack-odds.pdf` / `checklist.pdf`，表格版原名保留为 `checklist.xlsx`。
4. **转文本**。用目录里的脚本转出 `.txt`，不要用别的工具，保证提取结果可复现：
   ```powershell
   pip install pypdf
   python <系列目录>/extract-pdf-text.py <原件.pdf> <输出.txt>
   ```
   输出以 `PAGES: n` 开头，接着是 `===== PAGE i =====` 分段。**不要**手改 `.txt`：
   改不动原件时就在系列 README 的已知问题里写明，让 `.txt` 与 `.pdf` 的差异可追溯。
5. **记哈希**。每份文件算 SHA-256 并写进 `<系列目录>/README.md`：
   ```powershell
   Get-FileHash <系列目录>/*.pdf, <系列目录>/*.xlsx -Algorithm SHA256
   ```
   B 级来源必须记；将来拿到 A 级原件时用哈希确认两者是同一份。
6. **生成配率**。用导入脚本把 `pack-odds.txt` 转成 `pack-odds.generated.ts`：
   ```powershell
   node scripts/import-pack-odds.mjs `<系列目录>`/pack-odds.txt `<代码目录>`/pack-odds.generated.ts
   ```
   脚本会把识别不了的行打印出来，**必须逐条人工核对**，不能放着警告往下走。
   配率**禁止**手抄、禁止估算，数值只从这张表来。
7. **誊抄名册**。按 `<代码目录>/roster.ts` 的行格式（`[卡号, 人物, 球队]`，
   新秀加 `"R"`）从 `checklist.xlsx` 抄写；官方表有重音符号不一致或缺字的情况，
   代码里统一写正确的全名。
8. **核对名册**。抄完立刻跑核对脚本，它会逐行对回原件：
   ```powershell
   npm run roster:check
   ```
   有出入必须逐条回看原表：是抄错就改 `roster.ts`，
   确认是官方原表自己的缺陷（重复卡号、漏字）就登记进
   `scripts/check-roster.mjs` 的 `SOURCE_DEFECTS` 并写明原因。
   **不允许**跳过这一步，也不允许为了让脚本闭嘴而放松比对规则。
9. **盒型配置落库**。每包张数、每盒包数、签名保证从发行说明文本里取，
   写进 `<代码目录>/box.ts` 的 `BOX_CONFIGS`；官方没公布的值（如每箱盒数）留 0，
   页面上就不显示，**不要**猜一个数填进去。
10. **跑回归**。`npm run boxes:check` 必须通过；新增盒型后如确属有意变更，
    用 `npm run boxes:snapshot` 重建基线并在 `PROGRESS.md` 里说明原因。
11. **写采集记录**。在 `<系列目录>/README.md` 里补齐来源表、盒型配置表与已知问题，
    并在本文件第四节登记一行。

### 判定一条数据能不能用

| 情况 | 结论 |
| --- | --- |
| 发行商官网 / Pack Odds 表 / Checklist / 发行说明 | A 级，直接采信 |
| 第三方托管的官方原件（镜像、CDN） | B 级，记哈希后可用 |
| 整理站、卖家的转述与截图 | C 级，只能用来**找** A 级原件 |
| 论坛、社群、AI 生成内容 | 一律不用 |
| 官方表内部自相矛盾 | 以 PDF 原件为准，必要时在 `SOURCE_DEFECTS` 或 `ROW_PATCHES` 里登记并写明依据 |

## 四、已归档系列

| 品类 | 品牌 | 系列产品 | 采集日期 | 配率 | 名单 | 名单表格版 | 发行说明 | 采集记录 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 篮球 | Topps | 2025-26 Topps Chrome Updates Basketball | 2026-09-30 | ✔ | ✔ | ✔ | ✔ | [记录](./basketball/topps/tcu26-basketball/README.md) |

## 五、待办

- `checklist.pdf` 的确切镜像链接没能记下来。2026-09-30 复查时发现该镜像站已关闭目录列表
  （`.../public/<年>/<月>/` 返回 302，落到占位页），WordPress 接口返回 404，
  猜的四个 `...Checklist-Downloads-...pdf` 文件名全部返回 403，只有配率 PDF 与
  名单表格版还能下载。下次采集时**当场**把每个文件的完整链接写进系列 README，
  不要等事后补。
- 已归档的 `checklist.pdf` 与 `checklist.xlsx` 内容一致（`npm run roster:check` 同时对上两份），
  所以清单数据本身可用；缺的只是那份 PDF 的出处链接。

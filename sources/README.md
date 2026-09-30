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

`.pdf` 是权威原件，`.txt` 只是它的文本视图，方便检索与 diff。
两者不同步时以 `.pdf` 为准。文本提取统一用仓库根目录的 `scripts/extract-pdf-text.py`，
**不要**在每个系列目录里放副本；转换命令见第三节第 4 步。
派生数据用 `scripts/import-pack-odds.mjs` 与 `scripts/import-roster.mjs` 生成，
两者共同依赖 `scripts/lib/xlsx.mjs`。

`.xlsx` 与 `.pdf` 是同一份官方名单的两种导出，互为佐证：`.pdf` 是权威件，
但表格版把球队、新秀标记放在了独立列里，誊抄与核对都以它为准，
拿不到表格版时再回到 `.pdf` 逐行看。两者都归档的系列，名册应同时对上这两份。

## 二、来源分级

数据来源只认下面四级，其他渠道（论坛、博客、二手转发）一律不作为依据。

| 级别 | 说明 | 用途 |
| --- | --- | --- |
| **A 官方原件** | 发行商自己发布的产品页面、Pack Odds 表、Checklist、发行说明 | 唯一可用于生成数据的来源 |
| **B 官方镜像** | 由第三方托管、但内容与 A 逐字节相同的文件 | 当 A 无法直接下载时使用，须记录哈希以便验证 |
| **C 参考** | 整理站、卖家页面对 A 的转述 | 只能用来**寻找** A，不能用来填数据 |
| **D 授权转述件** | 技能站指南页里对官方配率表的转述 | **只对配率与平行限量数开放**，且必须走完下面四道手续，缺一条就退回 C 级 |

### D 级只对配率与限量数开放

**名单永远不用 D 级。** Topps 官方 Checklist 的表格版在目前见过的每个系列里都能从镜像下到，
名单一律按 B 级处理；只有配率表存在「官方原件全网拿不到」的情况。

**限量数也放在 D 级里**（2026-09-30 补记）：此前这一级只写「配率」，
用下来发现官方配率表**不带平行编号**，编号只出现在官方产品页与指南页，
而官方产品页在本机是 403。限量数不是名单，且能用一条算术恒等式交叉验证——
**张数 × 编号 × 配率 ≈ 本系列总印量（包）**，同一个系列里十几个互不相干的小节会算出同一个数，
交叉验证的强度比逐字比对还高。各系列的验算过程写在该系列的 `README.md` 里。
核对命令：`npm run print:check -- <产品 key 片段>`（报告式，不判定失败；
同一批平行算出来的包数会聚在一起，散得太开的档位单独标出来）。

这条是对「允许用指南页配率转述」那次授权的顺延，**如需收紧、改回只认配率**，
代价是 8 个只有名册的系列不能给平行加编号标记（`tbb26` / `tccj26` 等有官方表的系列不受影响）。

D 级成立的四个条件，采集时必须逐条留痕：

1. **有明确授权**。2026-09-30 用户决定：官方配率 PDF 拿不到的产品，
   允许用 Checklist Insider 指南页的转述当配率来源。
2. **官方原件确实不可得**。要写明试过哪些路径、各自返回什么（本机 Topps 官网 403、
   镜像没有上传该文件），不能因为「懒得找」就跳到 D 级。
3. **做过数值交叉验证**。拿一个**同时有官方原件与指南页转述**的系列做对照，
   把命中率写进系列 README。已完成的对照见第六节「指南页的配率只是转述」。
4. **改名列出来**。指南页把官方通道名改写过（`Delight` → `Breaker`、
   `Value Box` → `Blaster`），映射关系必须写进系列 README，不许现场猜。

走 D 级时的固定做法：指南页的 URL 与子集表的抽取文本哈希记进系列 README，
脚本抽出的「标签 + 配率」文本存成 `pack-odds.txt`，然后走第六步同一个导入脚本。
**第三方指南页的正文不提交进仓库**（只在 `.snapshot/` 里留本机副本），
登记 URL 与哈希是为了将来能确认拿到的是同一份。
受影响系列的 `box.ts` 头部必须写明配率来自 D 级授权转述件。

### 稳定入口

| 入口 | 地址 | 级别 | 本机可达性 |
| --- | --- | --- | --- |
| Topps 官方配率页 | `https://www.topps.com/pages/odds` | A | ✘ 命令行与真实浏览器都落到 Cloudflare 拦截页 |
| Topps 官方产品页 | `https://www.topps.com/products/<产品 slug>` | A | ✘ 同上；换 `topps.com`、`/media/...` 也一样，没有可用子域名 |
| Checklist Insider 镜像 | `https://xcdn.checklistinsider.com/public/<年>/<月>/<文件名>` | B | ✔ 唯一能下到官方 PDF / 表格的入口 |
| Checklist Insider 指南页 | `https://www.checklistinsider.com/<产品 slug>`、`?s=<关键词>` | C | ✔ 站点搜索是**找产品**最省事的入口 |
| Cardboard Connection 附件 | `https://www.cardboardconnection.com/wp-content/uploads/<年>/<月>/<文件名>` | B | ✔ 托管 Topps 官方 Education Sheet 与 Final Checklist 原件 |
| Cardboard Connection 文章 | `https://www.cardboardconnection.com/<产品 slug>-set-review-and-checklist` | C | △ 时好时坏，只有 CC 写过的产品才有页面 |

实践结论：**配率与名单优先走 B 级镜像下载，再用哈希或页数比对确认与 A 级一致**；
Topps 官网只用人工核对，不写进自动化流程。逐站实测结果见第六节。

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
4. **转文本**。用仓库根目录的脚本转出 `.txt`，不要用别的工具，保证提取结果可复现：
   ```powershell
   pip install pypdf
   python scripts/extract-pdf-text.py <原件.pdf> <输出.txt>            # 配率表：布局模式
   python scripts/extract-pdf-text.py <原件.pdf> <输出.txt> --plain    # 名单：普通模式
   ```
   **配率表必须用布局模式**（脚本默认就是）。普通模式会把空格单元格直接吞掉，
   列位信息一起消失，`Base Rainbow 1:35　　　　1:9` 会被压成
   `Base Rainbow Green and Blue 1:35 1:9`，下游只能按顺序猜列，一定错。
   名单没有列位问题，用 `--plain` 出得更干净。
   输出以 `PAGES: n` 开头，接着是 `===== PAGE i =====` 分段。**不要**手改 `.txt`：
   改不动原件时就在系列 README 的已知问题里写明，让 `.txt` 与 `.pdf` 的差异可追溯。
5. **记哈希**。每份文件算 SHA-256 并写进 `<系列目录>/README.md`：
   ```powershell
   Get-FileHash <系列目录>/*.pdf, <系列目录>/*.xlsx -Algorithm SHA256
   ```
   B 级来源必须记；将来拿到 A 级原件时用哈希确认两者是同一份。
6. **生成配率**。用导入脚本把 `pack-odds.txt` 转成 `pack-odds.generated.ts`，
   第三个参数是这张表的列名。列名必须**照抄官方表头**、顺序从左到右；
   官方表头里带着 `Odds`、`Box` 之类的后缀时只写渠道本身（写成
   `Hobby,Jumbo,Delight,...` 而不是 `Hobby Odds,Jumbo Odds,...`），脚本会自己匹配：
   ```powershell
   node scripts/import-pack-odds.mjs `<系列目录>`/pack-odds.txt `<代码目录>`/pack-odds.generated.ts "Hobby,Jumbo,..."
   ```
   脚本会把识别不了的行打印出来，**必须逐条人工核对**，不能放着警告往下走。
   配率**禁止**手抄、禁止估算，数值只从这张表来（拿不到官方表时走 D 级，仍然不许手抄，
   由脚本从指南页 HTML 提取）。

   官方表有几种写法，脚本都处理好了，但改动脚本前要知道它们的存在：

   | 写法 | 例子 | 数值单位 |
   | --- | --- | --- |
   | `1:X` | `1:12,259` | `X`（平均多少包出一张） |
   | `A:B` | `4:1` | `B / A`（`4:1` = 平均 4 包出一张 → 0.25） |
   | `-` | `-` | 空，该渠道没有这个卡种 |
   | 小数 | `2.1` | 原样 |

   空格的处理分两种表：写成 `-` 的表每行令牌数刚好等于列数，按顺序摆放；
   空格真的空着的表令牌数少于列数，只能按数值在版面里的水平位置归列——表头与数值都是
   左对齐的，所以「起点不小于列头位」的最右一列就是它的列。一份 PDF 里可能有好几张表
   （分页会重排行位），所以列位要跟着当前表头走。

   位置归列**必须**拿官方 PDF 里每个文本块的真实横坐标核对，只看提取件的字符下标会漏错：
   两端对齐的页面（Signature Class 就是）里每一行按自己的标签宽度排位，同一列在不同行能
   差十几个字符，按下标归列会偶尔差一列而且不报错。核对命令：

   ```powershell
   python scripts/verify-odds-columns.py `<系列目录>`/pack-odds.pdf `<代码目录>`/pack-odds.generated.ts
   ```

   它把每页的数字按真实横坐标聚成列数那么多堆，逐格与生成文件比对，必须报「不一致 0 格」。
   `SKIP` 的页面是本页聚不出列位：一张纸印好几张表（Hoops 一页四张）、列数太多（Chrome
   Update 十二列）、标签被两端对齐撑开的页面都会这样。这类页面改用第二条保证——看导入
   脚本自己报的「贴着列边界」的行：没有一格贴着列边界，位置判断就是稳的，脚本会打印
   「没有需要留意的行」。
   对不上的行登记到 `scripts/import-pack-odds.mjs` 的 `ROW_PATCHES` 里并写明依据，
   **不要**改归列口径去凑：「按数值中心」与「按离列头最近」两套口径都试过，
   各自都会在别的行上错。

   两类需要额外开关的情况（Signature Class 都遇到了）：两端对齐的页面里数值与标签
   会被拉开，这时加 `--relaxed`（只认连续两个以上空格当格子边界）与
   `--labels=<系列目录>/pack-odds-plain.txt`——最后一个是同一份 PDF 的**普通模式**
   提取件，当词典把被拉开的标签还原；一格里的数字被双空格切成两格的，
   脚本用 `joinValues` 先合回一格再归列。
   `scripts/verify-odds-columns.py` 碰到聚不出列位的页面会整页 `SKIP`
   （Signature Class 的第一页就是这样），现在它在这些页面按行退路逐格比对，
   结论仍要报「不一致 0 格」才箿过。
7. **誊抄名册**。名单表格版一律用脚本转，不要手工抄：
   ```powershell
   node scripts/import-roster.mjs `<系列目录>`/checklist.xlsx `<代码目录>`/roster.ts [工作表序号]
   ```
   脚本按「A 列有字、B 列空」认分节标题，按「A/B 两列都有字」认数据行，
   把 `[Rookie]`（写在人物名后面或单独一列）转成行尾的 `"R"`，
   最后按官方表里的原始分节标题生成 `ROSTER_SECTIONS`。
   官方表有重音符号不一致或缺字的情况，代码里统一写正确的全名：
   改写 `roster.ts` 后必须重跑第 8 步，让脚本逐行对回原件。
   官方表格版**整行漏掉某张卡**时（Signature Class 漏了老将普卡的 68 号），
   在 `scripts/import-roster.mjs` 的 `INSERT_PATCHES` 里登记「分节标题 + 插在哪一号之前
   + 整行内容」（定位不到分节或该号已存在会直接报错），同时在 `check-roster.mjs` 的
   `SOURCE_DEFECTS` 里用 `absentFromSheet: true` 登记同一条，
   两处都要写明依据（指南页列表、逐卡索引或官方 PDF 正文），
   核对脚本会把它单独列成「已知源表缺陷」而不算失败。
8. **核对名册**。抄完立刻跑核对脚本，它会逐行对回原件：
   ```powershell
   npm run roster:check
   ```
   有出入必须逐条回看原表：是抄错就改 `roster.ts`，
   确认是官方原表自己的缺陷（重复卡号、漏字）就登记进
   `scripts/check-roster.mjs` 的 `SOURCE_DEFECTS` 并写明原因。
   **不允许**跳过这一步，也不允许为了让脚本闭嘴而放松比对规则。
9. **盒型配置落库**。每包张数、每盒包数、签名保证从发行说明文本里取，
   写进 `<代码目录>/box.ts` 里 `assembleBoxes(...)` 的 `boxes` 参数（老的两个系列
   `tcu26` / `tccj26` 还是各自本地的 `BOX_CONFIGS` 写法，语义相同，尚未合并）；
   官方没公布的值（如每箱盒数）留 0，
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
| 技能站指南页的配率转述（Checklist Insider） | D 级，**仅限配率**，且四道手续齐全才可用；名单不适用 |
| 论坛、社群、AI 生成内容 | 一律不用 |
| 官方表内部自相矛盾 | 以 PDF 原件为准，必要时在 `SOURCE_DEFECTS` 或 `ROW_PATCHES` 里登记并写明依据 |

## 四、已归档系列

2026-09-30 一次性点清了 2025-26 赛季 Topps 篮球的 17 个系列产品，全部归档。
「配率原件」列写 `B` 的是拿到官方 Pack Odds 表的（9 个），
写 `D` 的是没拿到官方配率表、按第二节的 D 级流程用指南页转述的（8 个，
本节这一批里尚未落地，`box.ts` 里必须写明来源级别）。

| 品类 | 品牌 | 系列产品 | 目录 | 采集日期 | 配率原件 | 名单表格版 | 上线盒型 | 采集记录 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 篮球 | Topps | 2025-26 Topps Basketball | `tbb26-basketball` | 2026-09-30 | B | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Chrome Basketball | `tchrome26-basketball` | 2026-09-30 | B | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Chrome Cactus Jack Basketball | `tccj26-basketball` | 2026-09-30 | B | ✔ | Hobby | 待补 |
| 篮球 | Topps | 2025-26 Topps Chrome Black Basketball | `tcb26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Chrome Update Sapphire Basketball | `tcus26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Chrome Updates Basketball | `tcu26-basketball` | 2026-09-30 | B | ✔ | Hobby、Jumbo、Value、Mega | [记录](./basketball/topps/tcu26-basketball/README.md) |
| 篮球 | Topps | 2025-26 Topps Cosmic Chrome Basketball | `tcosmic26-basketball` | 2026-09-30 | B | ✔ | Hobby | 待补 |
| 篮球 | Topps | 2025-26 Topps Definitive Collection Basketball | `tdef26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Finest Basketball | `tfinest26-basketball` | 2026-09-30 | B | ✔ | Hobby、Breaker Delight | [记录](./basketball/topps/tfinest26-basketball/README.md) |
| 篮球 | Topps | 2025-26 Topps Inception Basketball | `tincep26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Motif Basketball | `tmotif26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps NBA Hoops Basketball | `thoops26-basketball` | 2026-09-30 | B | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps NBL Basketball | `tnbl26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Pristine Basketball | `tpristine26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |
| 篮球 | Topps | 2025-26 Topps Signature Class Basketball | `tsig26-basketball` | 2026-09-30 | B | ✔ | Hobby、Hobby Jumbo、Value Blaster、Mega | [记录](./basketball/topps/tsig26-basketball/README.md) |
| 篮球 | Topps | 2025-26 Topps 3 Basketball | `tthree26-basketball` | 2026-09-30 | B | ✔ | Hobby | [记录](./basketball/topps/tthree26-basketball/README.md) |
| 篮球 | Topps | 2025 Topps Chrome McDonald's All American Basketball | `tmcd26-basketball` | 2026-09-30 | D | ✔ | — | 待补 |

目录列省掉了 `sources/basketball/topps/` 这一层前缀；`src/data/sets/basketball/topps/`
下同名目录一一对应。

**没有收进来的**：`2025-26-topps-x-bob-ross-the-joy-of-basketball` 与
`2026-27-topps-flagship-basketball` 两份指南页（前者没找到名单表格版，
后者属于下一个赛季，都不在本次补录范围里）。

## 五、待办

- `checklist.pdf` 的确切镜像链接没能记下来。2026-09-30 复查时发现该镜像站已关闭目录列表
  （`.../public/<年>/<月>/` 返回 302，落到占位页），WordPress 接口返回 404，
  猜的四个 `...Checklist-Downloads-...pdf` 文件名全部返回 403，只有配率 PDF 与
  名单表格版还能下载。下次采集时**当场**把每个文件的完整链接写进系列 README，
  不要等事后补。
- 已归档的 `checklist.pdf` 与 `checklist.xlsx` 内容一致（`npm run roster:check` 同时对上两份），
  所以清单数据本身可用；缺的只是那份 PDF 的出处链接。
- Checklist Insider 只发布它自己上传过的那几份原件，**没上传的产品就是没有**。
  2026-09-30 试到 `2025-26 Topps Chrome Black Basketball` 时，配率 PDF 按文件名规律
  试了 5 种写法 × 6 个月份目录（共 24 个）全部 403。找不到时要回到指南页看
  Downloads 一节到底列了哪几个附件，**不要**继续猜文件名。
  正确做法：先把指南页 HTML 下下来，再从 HTML 里正则抽 `xcdn.checklistinsider.com`
  开头的链接。一轮就能点清该产品到底有哪些附件可下，也顺带拿到这些链接的完整写法。
  2026-09-30 用这个方法一次点清了 16 个 2025-26 Topps 篮球产品，其中 8 个有官方配率 PDF。

## 六、本机网络可达性（2026-09-30 实测）

本机（Windows / PowerShell 5.1）出网被大量拦截，采集前先按这张表判断走哪条路，
省得在死路上耗时间。

| 站点 | 可达性 | 说明 |
| --- | --- | --- |
| `xcdn.checklistinsider.com` | ✔ | 官方 PDF / 表格的唯一命令行入口 |
| `www.checklistinsider.com` | ✔ | 指南页带盒型配置、名单与配率转述；`?s=<关键词>` 能枚举产品 |
| `www.cardboardconnection.com` | ✔ | 附件可用；文章页会返回 404 / 500 / 连接被关闭，重试常能成功 |
| `www.beckett.com`、`www.blowoutcards.com` | ✔ | 可达，本轮未用于取数 |
| `www.bing.com` | △ | 首页可达，但搜索结果与关键词不符，**不能当检索依据** |
| `www.topps.com`（含 `topps.com`） | ✘ 403 | Cloudflare IP 拦截，命令行与真实浏览器都是「you have been blocked」 |
| `web.archive.org`、`archive.ph` | ✘ | **连不上**，所以 Wayback 这条退路在本机不存在 |
| `www.google.com`、`duckduckgo.com`、`www.mojeek.com` | ✘ | 不可达或 403 |
| `www.tcdb.com`、`www.sportscardspro.com`、`www.dacardworld.com`、`www.steelcitycollectibles.com`、`www.fanatics.com` | ✘ 403 | 一律 403 |

### 镜像文件名的规律

```
https://xcdn.checklistinsider.com/public/<年>/<月>/
    <产品名>-Checklist-Downloads-<类型>-Checklist-Insider[-new-update].<后缀>
```

`<产品名>` 与指南页 slug 的大小写形式一致（指南页 `2025-26-topps-chrome-update-series-basketball`
→ 文件 `2025-26-Topps-Chrome-Update-Series-Basketball-…`），`<月>` 取发布当月。
已见过的两种：`…-Checklist-Downloads-Odds-Checklist-Insider-new-update.pdf`（配率）、
`…-Checklist-Downloads-Excel-spreadsheet-Checklist-Insider.xlsx`（名单表格版）。
Signature Class 那一批还有第三种写法：`…-Checklist-Downloads-Odds.pdf` 与
`…-Checklist-Downloads-Excel-spreadsheet.xlsx`，少一层 `-Checklist-Insider`。
文件名不能靠拼，必须从指南页 HTML 里抽 `xcdn.checklistinsider.com` 开头的链接。

### 指南页的配率只是转述

Checklist Insider 指南页里的 `Pack odds - …` 行与官方表**不是同一份东西**：
它把官方 12 列压成 6 列，还用了自家通道名（`Delight` → `Breaker`、
`Value Box` → `Blaster`）。拿已归档的 `2025-26 Topps Chrome Updates Basketball`
做交叉验证：89 个不重复数值里 81 个能在官方表里原样找到，对得上的行取的是官方
各通道的 `-EA` 列（例：`Base Refractors Denim Tears` 的 Hobby 1:6,054 / Jumbo 1:2,415 /
Delight 1:201 / Value Box EA 1:17,365 / Mega Box EA 1:112,000 / Fanatics 1:8,774
与指南页逐项一致）；对不上的 8 个集中在少数几行，疑为官方出过修订版
（归档件文件名带 `new-update`）。两种导出都存在时，**结论：指南页可以用来找方向；要拿它的配率转述填数，
必须先走完第二节的 D 级四道手续（明确授权、官方原件确实不可得、数值交叉验证、改名列出来）。
2026-09-30 之后的新系列一律先按第二节的流程判断级别，不再靠这份对照表逐行猜。**

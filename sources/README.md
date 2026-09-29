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

| 文件 | 内容 |
| --- | --- |
| `README.md` | 该系列的采集记录：来源链接、采集日期、已知问题 |
| `pack-odds.pdf` / `pack-odds.txt` | 官方 Pack Odds 表（配率）原始件与文本提取件 |
| `checklist.pdf` / `checklist.txt` | 官方 Checklist（名单）原始件与文本提取件 |
| `education-sheet.txt` | 官方发行说明的文本提取件，盒型配置（每包张数、每盒包数）以它为准 |
| `extract-pdf-text.py` | 从 PDF 提取文本的脚本，保证提取结果可复现 |

`.pdf` 是权威原件，`.txt` 只是它的文本视图，方便检索与 diff。
两者不同步时以 `.pdf` 为准。

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

新系列上线时按下面顺序做，每一步都要留痕。

1. **取原件**。先从 Topps 官网找到该产品的 Pack Odds 与 Checklist，记下链接；
   若官网无法下载，改用 Checklist Insider 镜像，并记下镜像链接。
2. **归档**。按上面的目录约定把 PDF 放进 `sources/<品类>/<品牌>/<系列产品>/`。
3. **转文本**。用目录里的脚本转出 `.txt`：
   ```powershell
   python sources/<品类>/<品牌>/<系列产品>/extract-pdf-text.py <原件.pdf> <输出.txt>
   ```
4. **比对**。如果原件来自 B 级镜像，记下 SHA-256；有 A 级原件时用哈希确认两者相同。
5. **生成派生数据**。配率用 `scripts/import-pack-odds.mjs` 转成
   `src/data/sets/<品类>/<品牌>/<系列产品>/pack-odds.generated.ts`：
   ```powershell
   node scripts/import-pack-odds.mjs sources/<...>/pack-odds.txt src/data/sets/<...>/pack-odds.generated.ts
   ```
   脚本会把识别不了的行打印出来，**必须逐条人工核对**，不能放着警告往下走。
6. **写采集记录**。在该系列目录的 `README.md` 里补一条。

## 四、已归档系列

| 品类 | 品牌 | 系列产品 | 采集日期 | 配率 | 名单 | 发行说明 | 采集记录 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 篮球 | Topps | 2025-26 Topps Chrome Updates Basketball | 2026-09-30 | ✔ | ✔ | ✔ | [记录](./basketball/topps/tcu26-basketball/README.md) |

## 五、待办

- `cli.pdf` 与 `pack-odds.pdf` 来自同一批下载，但只有 `pack-odds.pdf` 的镜像链接被哈希验证过；
  `checklist.pdf` 的确切镜像链接待下次采集时补记。

# 2025-26 Topps Basketball

采集日期：2026-09-30

Topps 自 2009-10 之后第一次拿回 NBA 版权，这一版是旗舰系列，官方名就叫
「2025-26 Topps Basketball」。上线盒型：Hobby、Hobby Jumbo、Mega、Value Blaster。

## 来源

| 资料 | 级别 | 链接 | SHA-256 |
| --- | --- | --- | --- |
| Pack Odds（配率） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2025/10/2025-26-Topps-Basketball-Checklist-Downloads-odds.pdf` | `pack-odds.pdf`（310,020 字节）：`7360C74ACBDBECCCA9D1D5A7A243F34AF5467F877A55031471F2488B69391D1D` |
| Checklist（名单，表格版） | B 官方镜像 | `https://xcdn.checklistinsider.com/public/2025/10/2025-26-Topps-Basketball-Checklist-Downloads-Excel-spreadsheet.xlsx` | `checklist.xlsx`（79,495 字节）：`831D5CF918D9376400828EC027C115D3FA9BC09F5ED1D73290F5963ADB40FF31` |
| 盒型配置、平行限量数 | D 授权转述件 | `https://www.checklistinsider.com/2025-26-topps-basketball` | 指南页正文 482,594 字节，SHA-256 `F50F7086688F968859527C68420FE5AC3CC2828C4AE38DF901829406C38DB67A` |

派生文件：`pack-odds.txt`（170,040 字节，`pack-odds.pdf` 的文本层，
`30860A024ECDB96AD94481E87B2BF3679F483EFACBA481DF3549DF90560A79C2`）。

**这一份只有表格版名册，没有官方 Checklist PDF**：官方下载区只放了 Excel 表格与配率 PDF
（`sources/README.md` 的镜像链接表里本系列只有这两个文件）。

名册：普卡 300 张 = `BASE CARDS` 270 张 + `COMBO CARDS` 30 张（组合卡一张卡上两位球员，
官方表里写成 60 行）。`node scripts/check-roster.mjs src/data/sets/basketball/topps/tbb26-basketball`
报「核对 2153 行，官方表 2128 条 + 89 条重复卡号」，结论是「名册与官方 Checklist 一致」；
重复卡号按组号归并比对，不逐条登记。

这份提取件也**不能直接进导入器**：官方表的表头是多行的、长标签会折行、
超宽标签那一行的数值还被顶到后一列，先由 `scripts/prepare-pack-odds.mjs` 整理
（只挪位置、不改数值），再进 `scripts/import-pack-odds.mjs`。

### 为什么用 D 级

官方 Pack Odds 表能下到（B 级），**表里只有配率，没有平行限量数**；
限量数只在官方产品页与指南页里出现，而 Topps 官网产品页对命令行请求取不到
（详见 `sources/README.md` 第二节）。按同一节的四道手续，限量数走 D 级：

1. 有明确授权：2026-09-30 用户决定配率类转述可用指南页。
2. 官方原件不可得：Topps 官网产品页取不到限量数文字。
3. 做了数值交叉验证：抽查 Rainbow Foilboard、Gold、Holo Foil、Aqua Holo Foil、
   Golden Mirror、MVP Vault、8-Bit Ballers、Generation Now、Power Players 九族，
   官方表在哪个盒型给了数字，指南页就在同一个盒型给出同一个 `1:X`，没有一处冲突。
   反过来也有用：官方表把几个数字印坏了，指南页把那几个错字**照抄**了下来
   （见「已知问题」第 2 条），两边互相印证文档来源是同一张官方表。
4. 改名列出来：指南页按 `Fat Pack / Display / Hanger / Black Friday Target Blaster / Super Box`
   这套渠道名写，官方表多出的 `Fanatics Value Blaster` 一列指南页基本不提；
   `1980-81 Topps Basketball` 的三条签名卡官方表只按编号平行写行标签，
   指南页直接给子集的配率（见「已知问题」第 4 条）。

## 恒等式验算

配率里藏着一条恒等式：**张数 × 编号 × 配率 ≈ 该渠道的总包数**。

`npm run print:check -- tbb26` 报「核对 4 个盒型、94 个可核对的子集、539 个档位，
偏离中位数超过 15% 的 28 个」。插入卡与普卡同批（Hobby 约 512 万包，
`Base` 中位 5,129,700，插卡七节 5,114,000–5,357,360）；签名卡与实物卡反推出来的包数
是它的 3.36 倍（约 1,722 万包），两边不是同一批印量。偏离的那些档位出在两处：
渠道专属的平行（只有某一个渠道出，档位少、中位数本身不稳）与残差折算出来的少数格，
例如 `Base` 的 `WOOD /25` 偏离 249%、`FIRST CARD /1` 偏离 252%、`GOLD /2025` 偏离 930%。

官方表里**没有一条叫 `BASE` 的行**——普卡的配率由 17 条普卡平行行隐含给出，
所以每个盒型都用 `residualLabel: "BASE"` 把残差 `每包张数 − Σ(1/配率)` 指到普卡上，
「每包张数 = 各档权重之和」在四个盒型里都精确成立：

| 盒型 | 权重合计 | 每包张数 |
| --- | --- | --- |
| Hobby | 20.0000 | 20 |
| Hobby Jumbo | 40.0000 | 40 |
| Mega | 14.0000 | 14 |
| Value Blaster | 12.0000 | 12 |

## 盒型配置

| 盒型 | 每包张数 | 每盒包数 | 每箱盒数 | 签名保证 | 配率取哪一列 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| Hobby | 20 | 12 | 12 | 每盒 1 张签名卡或实物卡，另有 1 包 Silver Pack | `hobby` | 上线 `tbb26-hobby` |
| Hobby Jumbo | 40 | 10 | 8 | 每盒 1 张签名卡 + 1 张实物卡，另有 1 包 Silver Pack | `hta-jumbo` | 上线 `tbb26-hobby-jumbo` |
| Mega | 14 | 16 | 20 | 无 | `mega-box-ea` | 上线 `tbb26-mega` |
| Value Blaster | 12 | 12 | 官方未公布 | 无 | `value-box-ea` | 上线 `tbb26-value-box` |

规格取自指南页与发行说明的包装文字。官方表另外还有 `Black Friday Target Blaster`、
`Costco Super Box`、`Fanatics Value Blaster` 三个渠道的配率列，却没有对应的包装张数，
配不出权重，暂不收录——它们的专属卡种（如 `Shopping Spree Signatures` 只在
Black Friday Blaster 出现）、装在独立 Silver Pack 里的 `1980-81 Topps Chrome Basketball` 三节、
官方连盒型都没公布的 `Hidden Gems`，都在页面上落到「本盒不含」里。

## 配率表的列

17 列（`PACK_ODDS_COLUMNS`）：`hobby`、`hta-jumbo`、`value-box-se/-ea/-cee`、
`mega-box-se/-ea/-cee`、`fat-pack-se/-ea`、`display-nt`、`display-hh`、
`hanger-se/-ea`、`black-friday`、`costco-super`、`fanatics-value`。

官方把零售渠道按区域拆成 SE / EA / CEE 三个编号（Value Box、Mega Box）或两个编号
（Fat Pack、Display、Hanger）。逐格比对过：同一盒型的区域列**完全一样**
（`value-box-se = -ea = -cee`、`mega-box-*` 三列一致、`fat-pack-se = -ea`、
`hanger-se = -ea`、`display-nt = display-hh`），所以每个盒型取其中一列即可。
页面展示名在 `columnNames` 里把三个 Value Box 列都映射成「Value Blaster」、
三个 Mega 列都映射成「Mega」，渠道不会重复出现。

## 已知问题

1. **配率被表格软件存成了时间值**：`Base Rainbow Foilboard` 的 Hobby 格印成 `01:11:00`、
   `MVP Vault` 的 Hobby 格印成 `01:37:00`、`Generation Now` 的 Display 格印成 `01:04:00`
   （本意是一个小时零 11 / 37 / 4 分钟）。三格按「时:分」还原成 11、37、4；
   `Generation Now` 旁边那个 Display 格印的是天数序列值 `4.4444444444444446E-2`
   （＝0.0444 天＝1 小时 4 分），还原出来也是 4——两个 Display 列本来就该逐格相同，
   两条还原路径正好互相印证。
2. **数字被印坏的行（六条）**。前五条按同族同渠道的比例还原，比值依据写在
   `scripts/import-pack-odds.mjs` 的 `ROW_PATCHES` 里，校对脚本的 `KNOWN_DEFECTS`
   里也各留一条：
   - Power Players 蓝 Holo Foil 的 Fat Pack 两格：`1:5,016` 印成 `1:5,0016`；
   - Topps Notch Signatures Holo Foil 的 Fat Pack 两格：`1:1,304` 印成 `1:1,1304`；
   - Topps Notch Signatures 金 Holo Foil 的三个 Value Box 格：`1:15,282` 印成 `1:15.282`；
   - 1980-81 Topps Basketball Rookie Autographs 金彩虹的三个 Value Box 格：
     `1:19,956` 印成 `1:19,9556`；
   - All Kings 两个 Display 格：`1:6,632` 印成 `1:6,6632`。

   第六条是 `1980-81 Topps Basketball Rookie Autographs`（普通版）的两个 Fat Pack 格印成
   `1:3,2991`（指南页把这个错字照抄了下来）。这一格**没有改**：数字串本身只有
   `32,991` 一种读法，但同一行其余六个渠道与该系列非新秀那一行逐列吻合到万分之三，
   照那个比例这一格该是 `1:2,991`——和 `32,991` 差 11 倍。两种读法各有依据，
   而 `2,991` 要从 `3,2991` 改掉一位数字才拿得到，属于猜，所以照数字串保留
   `1:32,991` 并在此登记。Fat Pack 不是上线盒型，不影响页面配率。
3. **超宽标签那一行的数值被顶到后一列**：像 `GENERATION NOW PLATINUM HOLO FOIL` 这样的长标签，
   排在它右边的空格子会被整段丢掉，第一格的数值其实是后一列的。
   `scripts/prepare-pack-odds.mjs` 按列位挪回来之后，导入器只剩 1 条「贴着列边界」提示
   （`Generation Now Platinum Holo Foil` 的 HTA JUMBO 列差 2 个字符，值本身归列正确）。
4. **有三条子集官方表只给编号平行行**：`1980-81 Topps Basketball Triple Autographs`、
   `Flagship Real One Autographs (Spike Lee)`、`Rookie Photo Shoot Dual Autographs`，
   官方表里没有任何一条「普通版」行，配率按指南页补录
   （三签卡 1:172,200 Hobby / 1:42,694 Jumbo，后两条 1:344,400 / 1:85,387）；
   后两条的 Value Blaster 与 Mega 两列官方表与指南页都没有，按同族已公布的列间比例折算。
   三签卡那里还有个说法上的坑：官方表那三条行标签都是编号平行，其中 `Black Rainbow` 行
   与指南页给子集的配率逐列相同，所以本模拟器里普通版与 /10 会显示成同一个配率——
   两边来源就是这样，照录。
5. **校对结果**：`py -3 scripts/verify-odds-columns.py sources/basketball/topps/tbb26-basketball/pack-odds.pdf
   src/data/sets/basketball/topps/tbb26-basketball/pack-odds.generated.ts`
   核到 5,916 格、**不一致 0 格**（其中 12 格是上面登记的已知缺陷；
   56 行的标签被排版拆散，按后缀补认后照常核对；10 行的标签整块读不出来，按页内位置对齐）。

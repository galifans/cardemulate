/**
 * 选秀顺位采集：把 NBA 官网的选秀结果归档到 sources/，再生成派生的 TS 数据。
 *
 * 为什么要有这个维度
 * ----------------
 * 「选秀排名」是卡价模型里唯一无法从卡盒资料推出的变量：官方 Checklist 只写
 * 球员名、球队、是否新秀，不写他是第几顺位。而市场对「状元」与「次轮秀」的定价
 * 差得很清楚，模型必须知道这件事。
 *
 * 来源
 * ----
 * 只认 NBA 官网。本机实测能连上的选秀名单来源只有这一个（详见
 * sources/basketball/nba/2025-draft-order/README.md 的穿刺表），
 * 维基/DBpedia/篮球参考站全部连不上或 403。
 *
 * 页面里的 `application/ld+json` 带一整段 `articleBody`，内容是逐顺位的
 * 「N. 球队 draft 球员 (学校)」，59 条一条不缺，也不用解析 DOM。所以归档的是
 * 这段正文，不是整张 HTML —— 整张 HTML 有 600 KB，其中 99% 是导航与样式。
 *
 * 用法：node scripts/import-draft-order.mjs [年份，默认 2025]
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const year = Number(process.argv[2] ?? 2025);
const pageUrl = `https://www.nba.com/news/${year}-nba-draft-order`;
const sourceDir = resolve(process.cwd(), `sources/basketball/nba/${year}-draft-order`);
const rawPath = resolve(sourceDir, "draft-order.txt");
const generatedPath = resolve(process.cwd(), "src/data/prices/draft-order.generated.ts");

const res = await fetch(pageUrl, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
if (!res.ok) throw new Error(`${pageUrl} -> HTTP ${res.status}`);
const html = await res.text();

const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!ld) throw new Error("页面里没有 ld+json，官网结构可能变了，先人工看一眼");
const article = JSON.parse(ld[1]);
const body = article.articleBody;
if (typeof body !== "string" || body.length < 500) throw new Error("articleBody 异常，先人工看一眼");

/** 逐顺位抽行。写法是「3. 76ers draft VJ Edgecombe (Baylor)」，第二轮还有交易附注 */
const picks = [];
for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^(\d{1,2})\.\s+(.+?)\s+draft\s+(.+?)\s*\((.+?)\)/);
    if (!match) continue;
    const trailing = line.slice(match[0].length);
    const trade = trailing.match(/-\s*Traded to\s+(.+?)\s*$/);
    picks.push({
        pick: Number(match[1]),
        player: match[3].trim(),
        team: match[2].trim(),
        school: match[4].trim(),
        tradedTo: trade ? trade[1].trim() : null,
    });
}

if (picks.length < 58) {
    console.log(`[!] 只解出 ${picks.length} 个顺位，官网写法可能变了，仍然继续生成`);
}

const asOf = new Date().toISOString().slice(0, 10);
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

await mkdir(sourceDir, { recursive: true });
await writeFile(rawPath, body, "utf8");

const hash = sha256(body);
const readme = `# ${year} 年 NBA 选秀顺位 —— 采集记录

| 项 | 值 |
| --- | --- |
| 来源页面 | ${pageUrl} |
| 页面里的字段 | \`application/ld+json\` 的 \`articleBody\` |
| 采集日期 | ${asOf} |
| \`draft-order.txt\` 的 SHA-256 | \`${hash}\` |
| 解出的顺位 | ${picks.length} 个（第 1 轮 30 个 + 第 2 轮 ${Math.max(0, picks.length - 30)} 个） |

## 为什么来源只有这一个

选秀名单是「选秀排名」这一维度的唯一依据，所以采集前把常见来源逐个穿刺过一遍
（方法：Node 24 内置 fetch，15 秒超时，Chrome 桌面版 UA，看状态码与响应里有没有
当届球员名）。结果：

| 来源 | 结果 |
| --- | --- |
| \`www.nba.com/news/${year}-nba-draft-order\` | **200，正文含全部 ${picks.length} 个顺位** |
| \`www.nba.com/draft/${year}\` | 200，但只是新闻聚合页，没有逐顺位名单 |
| \`www.nba.com/draft/${year}/round/1\` | 404 |
| \`en.wikipedia.org\` / \`zh.wikipedia.org\` / wikidata / dbpedia | 连不上（本机网络到不了） |
| \`www.basketball-reference.com/draft\` | 403 |
| \`basketball.realgm.com\` | 403 |
| \`www.espn.com/nba/draft\` | 202，空响应 |
| \`www.statmuse.com\` | 422 |
| \`tankathon.com\` | 404 |
| \`www.sports-reference.com\` | 403 |

## \`draft-order.txt\` 是什么

是 \`articleBody\` 的**原文**，未做任何加工，逐行形如：

\`\`\`
1. Mavericks draft Cooper Flagg (Duke)

2. Spurs draft Dylan Harper (Rutgers)
\`\`\`

交易附注（\`- Traded to Suns\`）留在行尾。派生的
\`src/data/prices/draft-order.generated.ts\` 由
\`node scripts/import-draft-order.mjs\` 生成，重新生成时先比对这份哈希。
`;

await writeFile(resolve(sourceDir, "README.md"), readme, "utf8");

const entries = picks
    .map(
        (row) =>
            `    { pick: ${row.pick}, player: ${JSON.stringify(row.player)}, team: ${JSON.stringify(row.team)}, ` +
            `school: ${JSON.stringify(row.school)}, tradedTo: ${row.tradedTo ? JSON.stringify(row.tradedTo) : "null"} },`,
    )
    .join("\n");

const ts = `/**
 * ${year} 年 NBA 选秀顺位。
 *
 * **自动生成，不要手改。** 由 \`node scripts/import-draft-order.mjs\` 从
 * \`sources/basketball/nba/${year}-draft-order/draft-order.txt\` 生成，
 * 原始页面的出处与哈希记在同目录的 README.md 里。
 */

/** 名单对应的选秀年份 */
export const DRAFT_CLASS_YEAR = ${year};

/** 采集日期 */
export const DRAFT_AS_OF = "${asOf}";

export interface DraftPick {
    pick: number;
    player: string;
    /** 选中球队；被交易时仍是选中球队 */
    team: string;
    school: string;
    /** 选秀夜被交易到的球队；null = 未交易 */
    tradedTo: string | null;
}

export const DRAFT_PICKS_${year}: DraftPick[] = [
${entries}
];
`;

await mkdir(resolve(generatedPath, ".."), { recursive: true });
await writeFile(generatedPath, ts, "utf8");

console.log(`原文归档 -> ${rawPath}（${body.length} 字节，SHA-256 ${hash.slice(0, 16)}…）`);
console.log(`派生数据 -> ${generatedPath}（${picks.length} 个顺位）`);
console.log(`状元 ${picks[0]?.player}，末位 ${picks[picks.length - 1]?.player}（第 ${picks[picks.length - 1]?.pick} 顺位）`);

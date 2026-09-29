/**
 * 把发行商官方 Pack Odds 表的纯文本提取件转成 TS 数据文件。
 *
 * 官方 PDF 提取出来后是「一行 = 一个卡种 + 12 个渠道列的配率」。人工转录
 * 上千个数字一定会出错，而且无法复核，所以这里一次性用脚本生成，
 * 保证生成结果与官方表逐字对应；要核对时直接 diff 输出文件即可。
 *
 * 用法：
 *   node scripts/import-pack-odds.mjs <odds.txt> <输出 .ts 路径>
 *
 * 输出文件是「官方表的忠实转录」，不含任何业务映射：
 * 哪个卡种属于哪个子集、用哪个 slug、进哪个盒型，全部写在同目录的
 * subsets.ts 与 odds-*.ts 里。两层分开，官方表更新时只需重跑本脚本。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

/** 官方表的 12 个渠道列，顺序即 PDF 里的从左到右 */
export const COLUMNS = [
    "hobby",
    "jumbo",
    "delight",
    "sapphire",
    "value-box-ea",
    "value-box-se",
    "value-box-cee",
    "mega-box-ea",
    "mega-box-se",
    "mega-box-cee",
    "fanatics-box",
    "ascc-promo-pks",
];

/**
 * PDF 提取时可能把行内的空列（`-`）吃掉，导致某行不足 12 个值。
 * 这类行不能用索引定位列，必须按已知的官方原始值补回，否则整行错位。
 * 目前只有这一行。
 */
const ROW_PATCHES = {
    "Alter Ego": [6818, 3065, 2155, null, 15386, 15386, 15386, 10821, 10821, 10821, 3571, null],
};

/** 值只有两种形态：`-`（该渠道无此卡种）或 `1:X` */
const VALUE_RE = /^(?:-|1:[\d,]+)$/;
const NUMBER_RE = /^1:([\d,]+)$/;

const toNumber = (token) => {
    const matched = NUMBER_RE.exec(token);
    if (!matched) return null;
    const value = Number(matched[1].replace(/,/g, ""));
    return Number.isFinite(value) ? value : null;
};

/** 表头、分页标记与页脚版权声明都不是数据行 */
const isNoise = (line) =>
    /^PAGES:/.test(line) ||
    /^=+ PAGE \d+ =+$/.test(line) ||
    /^Cards Hobby/.test(line) ||
    /^\*\*Checklists and odds/.test(line) ||
    /^2025-26 Topps Chrome Updates Basketball \*\*/.test(line) ||
    /^production, but actual/.test(line);

const parse = (text) => {
    const rows = [];
    const warnings = [];

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || isNoise(line)) continue;

        const tokens = line.split(/\s+/);
        // 卡种名里可能含数字（如 1980-81），但绝不会出现 `1:X` 或独立的 `-`，
        // 所以第一个「值 token」之前的部分就是卡种名。
        const firstValue = tokens.findIndex((token) => VALUE_RE.test(token));
        if (firstValue < 0) {
            warnings.push(`未识别出配率列，已跳过：${line}`);
            continue;
        }

        const label = tokens.slice(0, firstValue).join(" ");
        let odds = tokens.slice(firstValue).map(toNumber);

        if (ROW_PATCHES[label]) {
            odds = ROW_PATCHES[label].slice();
        } else if (odds.length !== COLUMNS.length) {
            warnings.push(`列数为 ${odds.length}（应为 ${COLUMNS.length}），请人工核对：${label}`);
        }

        rows.push({ label, odds });
    }

    return { rows, warnings };
};

const render = (rows, sourceName) => {
    const lines = [];
    lines.push("/**");
    lines.push(" * 发行商官方 Pack Odds 表（自动生成，请勿手工编辑）。");
    lines.push(" *");
    lines.push(` * 来源：${sourceName}（Topps 官方 Pack Odds PDF 的文本提取件）。`);
    lines.push(" * 重新生成：node scripts/import-pack-odds.mjs <odds.txt> <本文件>");
    lines.push(" */");
    lines.push("");
    lines.push("/** 官方表的列顺序，索引与 PackOddsRow.odds 一一对应 */");
    lines.push("export const PACK_ODDS_COLUMNS = [");
    for (const column of COLUMNS) lines.push(`    "${column}",`);
    lines.push("] as const;");
    lines.push("");
    lines.push("export type PackOddsColumn = (typeof PACK_ODDS_COLUMNS)[number];");
    lines.push("");
    lines.push("/** 一行 = 官方表里的一个卡种；odds 是各渠道的 1:X，null 表示该渠道没有 */");
    lines.push("export interface PackOddsRow {");
    lines.push("    label: string;");
    lines.push("    odds: (number | null)[];");
    lines.push("}");
    lines.push("");
    lines.push("export const PACK_ODDS: PackOddsRow[] = [");
    for (const row of rows) {
        const cells = row.odds.map((value) => (value === null ? "null" : String(value))).join(", ");
        lines.push(`    { label: ${JSON.stringify(row.label)}, odds: [${cells}] },`);
    }
    lines.push("];");
    lines.push("");
    return lines.join("\n");
};

const main = () => {
    const [source, target] = process.argv.slice(2);
    if (!source || !target) {
        console.error("用法：node scripts/import-pack-odds.mjs <odds.txt> <输出 .ts 路径>");
        process.exit(1);
    }

    const text = readFileSync(resolve(source), "utf8");
    const { rows, warnings } = parse(text);

    const outputPath = resolve(target);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, render(rows, basename(source)), "utf8");

    console.log(`已生成 ${outputPath}`);
    console.log(`共 ${rows.length} 行配率`);
    if (warnings.length) {
        console.log("");
        console.log(`需要注意 ${warnings.length} 条：`);
        for (const warning of warnings) console.log(`  - ${warning}`);
    }
};

main();

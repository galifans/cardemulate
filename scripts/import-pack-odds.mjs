/**
 * 把官方 Pack Odds 表的文本提取件转成 `pack-odds.generated.ts`。
 *
 * 为什么不能手工誊抄：一张表动辄几百行、十几列，抄错一位就是把 1:1509 变成 1:1590，
 * 页面上完全看不出来。所以配率只从这张表来，由脚本转换，再由 `npm run boxes:check` 兜底。
 *
 * 表的结构与「为什么必须用布局模式提取」
 * ------------------------------------
 * 官方表都是「左侧一列标签 + 右侧若干列渠道」。渠道名写在表头行里，正文行只写有值的
 * 列——**空格子会被整段丢掉**，所以不能按「从左往右数第几个」来填列，那样一旦中间
 * 少一列，后面全部左移。本脚本改用横向位置定位：先按表头算出每一列的起始字符位，
 * 再把每个配率归到它左边最近的那一列。因此 `pack-odds.txt` 必须用布局模式提取
 * （见 `scripts/extract-pdf-text.py`），否则列位置不存在，脚本会直接报错退出。
 *
 * 配率有两种写法，统一换算成「平均多少包出一张」：
 * - `1:X`  → X（1 包里出 1 张）
 * - `A:B`  → B / A（A 包里出 B 张）
 * 例如 `4:1` 是每包 4 张，换成 0.25；`1:7` 是 7 包一张，换成 7。
 *
 * 用法：
 *   node scripts/import-pack-odds.mjs <pack-odds.txt> <输出 .ts> "渠道1,渠道2,..."
 *
 * 渠道名按官方表**从左到右**列出，脚本用它算列位并由此生成列 id（小写连字符）。
 * 认不出来的行会打印出来，**必须逐条人工核对**，不能放着警告往下走。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";

/**
 * 官方表自身的缺陷：个别行在 PDF 里少印了几列。这种地方宁可写死在脚本里，
 * 也不要让导入器「猜」——猜错了配率就悄悄错了。键是产品目录名，值是整行覆盖。
 */
const ROW_PATCHES = {
    "tcu26-basketball": {
        "Alter Ego": [6818, 3065, 2155, null, 15386, 15386, 15386, 10821, 10821, 10821, 3571, null],
    },
};

const PAGE_RE = /^=+ PAGE \d+ =+$/;
const DISCLAIMER_RE =
    /checklists? and odds provided by topps|actual contents and odds may vary|does not guarantee that it will appear/i;

/** 一个配率令牌：`-`（空）、`1:X`、`A:B`、或者没有冒号的数字（异常，必须人工看） */
const VALUE_RE = /^(?:-|\d+\s*:\s*[\d,.]+|\d+\.\d+)$/;

const slugify = (name) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

/** 把 `1:X` / `A:B` / 裸数字换算成「平均多少包出一张」 */
const toOdds = (token) => {
    if (token === "-") return null;
    const parts = token.split(":").map((part) => part.trim());
    if (parts.length === 2) {
        const left = Number(parts[0].replace(/,/g, ""));
        const right = Number(parts[1].replace(/,/g, ""));
        if (!left || !right) return null;
        return right / left;
    }
    return Number(token.replace(/,/g, ""));
};

/** 在一行里找出所有配率令牌及其位置（`at` 起始位，`end` 结束位，`center` 中心位） */
const valueTokens = (line) => {
    const found = [];
    for (const match of line.matchAll(/\S+/g)) {
        if (!VALUE_RE.test(match[0])) continue;
        const at = match.index;
        const end = at + match[0].length;
        found.push({ at, end, center: (at + end) / 2, text: match[0] });
    }
    return found;
};

/** 表头行：请求的渠道名都能按从左到右的顺序在里面找到；返回各列的起始位 */
const headerOffsets = (line, columns) => {
    if (columns.length < 2) return null;
    let from = 0;
    const offsets = [];
    for (const name of columns) {
        const at = line.indexOf(name, from);
        if (at < 0) return null;
        offsets.push(at);
        from = at + name.length;
    }
    return offsets;
};

const findHeader = (lines, columns) => {
    for (let i = 0; i < lines.length; i++) {
        const offsets = headerOffsets(lines[i], columns);
        if (offsets) return { index: i, offsets };
    }
    return null;
};

const looksLikeHeader = (line, columns) => columns.filter((name) => line.includes(name)).length >= 2;

/**
 * 把数值归到某一列。
 *
 * 官方表分两种写法，必须分别对待：
 * - 空格写成 `-` 的表（TCU26 就是这样），每一行的令牌个数刚好等于列数，按顺序摆放就是对的。
 * - 空格是真的空着的表（后面几套系列都是这样），令牌个数少于列数，只能靠水平位置判断。
 *
 * 位置判断取数值的**中心**，列边界取相邻表头的**中间位**。不能直接拿表头位置当左边界：
 * 表头文字左对齐、数值居中，窄数值的结束位会落在下一列表头的左边而被归错列。
 */
const columnOf = (offsets, token) => {
    const point = (token.at + token.end) / 2;
    let index = 0;
    for (let i = 0; i + 1 < offsets.length; i++) {
        if (point >= (offsets[i] + offsets[i + 1]) / 2) index = i + 1;
    }
    return index;
};

const parse = (text, columns) => {
    const lines = text.split(/\r?\n/);
    const header = findHeader(lines, columns);
    if (columns.length >= 2 && !header) {
        throw new Error(
            "没能在文本里找到表头行。确认传进来的渠道名与官方表一致，且 pack-odds.txt 是用布局模式提取的。",
        );
    }

    // 一份文件里可能有好几张表（分页会重排行位），所以列位要跟着当前表走。
    let offsets = header?.offsets ?? [0];
    const rows = [];
    const warnings = [];
    let lastLabel = null;

    for (const line of lines) {
        if (!line.trim()) continue;
        if (PAGE_RE.test(line.trim()) || /^PAGES:/.test(line)) continue;
        if (DISCLAIMER_RE.test(line)) continue;

        const nextOffsets = headerOffsets(line, columns);
        if (nextOffsets) {
            offsets = nextOffsets;
            continue;
        }

        const tokens = valueTokens(line);
        if (!tokens.length) {
            if (!looksLikeHeader(line, columns)) warnings.push(`没有配率，已跳过：${line.trim()}`);
            continue;
        }

        const label = line.slice(0, tokens[0].at).trim();
        if (!label) {
            if (lastLabel) warnings.push(`有配率但没标签，已忽略：${line.trim()}`);
            continue;
        }
        lastLabel = label;

        const odds = columns.map(() => null);
        if (tokens.length === columns.length) {
            tokens.forEach((token, index) => (odds[index] = toOdds(token.text)));
        } else {
            for (const token of tokens) odds[columnOf(offsets, token)] = toOdds(token.text);
        }
        rows.push({ label, odds });
    }

    return { rows, warnings };
};

const render = (rows, columns, sourceName) => {
    const ids = columns.map(slugify);
    const out = [];

    out.push("/**");
    out.push(" * 发行商官方 Pack Odds 表（自动生成，请勿手工编辑）。");
    out.push(" *");
    out.push(` * 来源：${sourceName}（Topps 官方 Pack Odds PDF 的文本提取件）。`);
    out.push(` * 重新生成：node scripts/import-pack-odds.mjs <${sourceName}> <本文件> "${columns.join(",")}"`);
    out.push(" *");
    out.push(" * odds 是「平均多少包出一张」：官方表的 `1:X` 直接取 X，`A:B` 取 B / A。");
    out.push(" * null 表示官方表里这一格是空的——即该渠道没有这个卡种。");
    out.push(" */");
    out.push("");
    out.push("/** 官方表的列顺序，索引与 PackOddsRow.odds 一一对应 */");
    out.push("export const PACK_ODDS_COLUMNS = [");
    for (const id of ids) out.push(`    ${JSON.stringify(id)},`);
    out.push("] as const;");
    out.push("");
    out.push("export type PackOddsColumn = (typeof PACK_ODDS_COLUMNS)[number];");
    out.push("");
    out.push("/** 一行 = 官方表里的一个卡种；odds 是各渠道的 1:X，null 表示该渠道没有 */");
    out.push("export interface PackOddsRow {");
    out.push("    label: string;");
    out.push("    odds: (number | null)[];");
    out.push("}");
    out.push("");
    out.push("export const PACK_ODDS: PackOddsRow[] = [");
    for (const row of rows) {
        const odds = row.odds.map((value) => (value === null ? "null" : String(value))).join(", ");
        out.push(`    { label: ${JSON.stringify(row.label)}, odds: [${odds}] },`);
    }
    out.push("];");
    out.push("");

    return out.join("\n");
};

const main = () => {
    const [source, target, columnArg] = process.argv.slice(2);
    if (!source || !target || !columnArg) {
        console.error('用法：node scripts/import-pack-odds.mjs <pack-odds.txt> <输出 .ts> "渠道1,渠道2,..."');
        process.exit(1);
    }

    const columns = columnArg
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    const sourcePath = resolve(source);
    const productKey = dirname(sourcePath).split(sep).pop();

    const parsed = parse(readFileSync(sourcePath, "utf8"), columns);

    const patches = ROW_PATCHES[productKey] ?? {};
    for (const row of parsed.rows) {
        if (patches[row.label]) row.odds = [...patches[row.label]];
    }
    for (const label of Object.keys(patches)) {
        if (!parsed.rows.some((row) => row.label === label)) {
            parsed.warnings.push(`脚本里登记的覆盖行「${label}」没在表里找到，可能官方表已修订。`);
        }
    }

    const outputPath = resolve(target);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, render(parsed.rows, columns, basename(sourcePath)), "utf8");

    console.log(`已生成 ${outputPath}`);
    console.log(`共 ${parsed.rows.length} 行配率，${columns.length} 列：${columns.join(" / ")}`);
    if (parsed.warnings.length) {
        console.log(`需要留意 ${parsed.warnings.length} 条：`);
        for (const warning of parsed.warnings) console.log(`  - ${warning}`);
    } else {
        console.log("没有需要留意的行。");
    }
};

main();

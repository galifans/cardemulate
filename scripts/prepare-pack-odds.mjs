/**
 * 把官方 Pack Odds 提取件整理成 `import-pack-odds.mjs` 能直接读的形状。
 *
 * 为什么要有这一步
 * ----------------
 * 导入器假设「表头一行、正文一行、标签在左、数值在右」，而新版 Topps NBA 配率表在 PDF 里
 * 是三处形状不同的排版（tbb26 全中，其余系列各中一部分）：
 *
 * 1. 表头是**多行**的，而且渠道名与列身对不齐：表头首行只有 `Card 6489 - NBA- ...`
 *    这样的列编号，渠道名排在下面几行。每个表头块换成一行合成表头，渠道名摆在各列列位上；
 *    列位取表头首行里 `NNNN - NBA-` 的起始位——正文数值就排在这些位的右边，与导入器
 *    「数值起始位不小于列头位」的归列口径一致。
 * 2. 折行折出来的标签（没有配率的行，例如 `FOILBOARD`、`RAINBOW`）并回上一行的标签。
 *    并的时候**保持数值原位**：标签短就补够空格。官方表里标签本身就分了好几行印的行，
 *    并起来比标签列还宽，数值会被顶到后一列——这种行连同它那一段的**列头**一起右移同一个
 *    量（导入器认列头行，跟着换归列基准），数值与列位的对应关系因此不变。
 * 3. 个别配率被官方表存成了时间值，PDF 里印成 `01:11:00`（本意 `1:11`）、甚至天数序列值
 *    `4.4444444444444446E-2`。这两种形状也算令牌、原位保留，换算交给导入脚本，
 *    不把它们当标签文字（否则整行数值会左移一列）。
 *
 * 处理不了、要人工兜底的两类：标签比标签列还宽**而且**第一列的数值就压在第二列列头上
 * 的行（打印完会提示「位置可疑」），以及官方表自己少印了几格的行——这两类写进
 * `import-pack-odds.mjs` 的 `ROW_PATCHES`，并且必须在官方 PDF 上逐格核对过。
 *
 * 用法：
 *   node scripts/prepare-pack-odds.mjs <pack-odds.txt> <输出 .txt> "渠道1,渠道2,..."
 *
 * 渠道名按官方表**从左到右**列出，个数必须和表头里的 `NNNN - NBA-` 列编号一致。
 * 处理完照例交给导入器与核对脚本：
 *   node scripts/import-pack-odds.mjs <输出 .txt> <输出 .ts> "渠道1,渠道2,..."
 *   py -3 scripts/verify-odds-columns.py <pack-odds.pdf> <输出 .ts>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , source, out, namesArg] = process.argv;
if (!source || !out || !namesArg) {
    console.error(
        '用法：node scripts/prepare-pack-odds.mjs <pack-odds.txt> <输出 .txt> "渠道1,渠道2,..."',
    );
    process.exit(2);
}
const names = namesArg.split(",").map((name) => name.trim());
const lines = readFileSync(source, "utf8").split(/\r?\n/);

const VALUE_RE = /^(?:-|\d+\s*:\s*[\d,.]+|\d+\.\d+|\d{1,2}:\d{2}:\d{2}|\d+(?:\.\d+)?[eE]-\d+)$/;
/** 提取件把冒号两边的空格也抄进来了（`1: 480`），先按导入器的同款规则合上，再分词 */
const joinValues = (line) =>
    line.replace(/(\d)\s*:\s*([\d,.]+)/g, "$1:$2").replace(/(\d)\.\s+(\d)/g, "$1.$2");
/** 官方 PDF 里个别数值前面多一个撇号（`'1:19,776`），那是渲染残渣，不是数据 */
const stripStrayQuote = (line) => line.replace(/'(?=\d)/g, "");
const normalize = (line) => stripStrayQuote(joinValues(line));
const tokensOf = (line) => [...line.matchAll(/\S+/g)].filter((m) => VALUE_RE.test(m[0]));
const CODE_RE = /\d{4}\s*-\s*NBA-/g;

/** 每页的页眉页脚：不能被当成折行标签并进上一行 */
const NOISE_RE =
    /^20\d\d\/\d\d .+ Basketball$|checklists? and odds provided by topps|actual contents and odds may vary|does not guarantee/i;

/**
 * 第一遍：把提取件读成「合成的表头行 + 正文行」两类记录。
 * 正文行记录下它当时的表头列位，渲染时要按同一位移改动两边。
 */
const collect = () => {
    const found = [];
    /** 正在累积的正文行：标签还在被折行续写，数值部分原样保留 */
    let current = null;
    let inHeader = false;
    let headerAt = null;

    const flush = () => {
        if (!current) return;
        found.push({ ...current, headerAt });
        current = null;
    };

    for (const raw of lines) {
        const line = normalize(raw);
        const trimmed = line.trim();
        if (/^(PAGES:|===== PAGE)/.test(trimmed)) {
            inHeader = false;
            continue;
        }
        if (!trimmed) continue;
        if (NOISE_RE.test(trimmed)) continue;

        const codes = [...line.matchAll(CODE_RE)];
        if (codes.length >= 2) {
            flush();
            headerAt = codes.map((match) => match.index);
            if (headerAt.length !== names.length) {
                console.error(
                    `表头有 ${headerAt.length} 列，调用方给了 ${names.length} 个名字，对不上。`,
                );
                process.exit(3);
            }
            found.push({ kind: "header", offsets: headerAt });
            inHeader = true;
            continue;
        }

        const tokens = tokensOf(line);
        if (!tokens.length) {
            // 表头块的尾巴（TARGET / VALUE BOX / EA 这类折行）丢掉；正文里的折行并回标签
            if (!inHeader && current) current.label = `${current.label} ${trimmed}`;
            continue;
        }

        inHeader = false;
        flush();
        const firstIdx = tokens[0].index;
        current = {
            kind: "row",
            label: line.slice(0, firstIdx).replace(/\s+/g, " ").trim(),
            firstIdx,
            rest: line.slice(firstIdx),
        };
    }
    flush();
    return found;
};

/** 一行里所有渠道名的列位（`shift` 是整体位移，正文数值也跟着移这么多） */
const headerLine = (offsets, shift) => {
    let header = "";
    names.forEach((name, index) => {
        const at = offsets[index] + shift;
        if (header.length > at) {
            console.error(`右移 ${shift} 位后第 ${index + 1} 个名字会压到上一列：${name}`);
            process.exit(5);
        }
        header = header.padEnd(at) + name;
    });
    return header;
};

/** 标签列装不下的行：合并后的标签顶到了第一个数值上，整行（含列头）要一起右移 */
const needsShift = (record) =>
    record.kind === "row" && record.label.length + 2 > record.firstIdx;

const records = collect();
const SHIFT = records.reduce(
    (max, record) =>
        needsShift(record) ? Math.max(max, record.label.length + 2 - record.firstIdx) : max,
    0,
);

const outLines = [];
const suspicious = [];
let inShiftBlock = false;
for (const record of records) {
    if (record.kind === "header") {
        outLines.push(headerLine(record.offsets, 0));
        inShiftBlock = false;
        continue;
    }
    const shift = needsShift(record) ? SHIFT : 0;
    if (shift > 0 !== inShiftBlock) {
        // 进出「右移块」时补一行同宽的列头，导入器跟着它换归列基准
        outLines.push(headerLine(record.headerAt, shift));
        inShiftBlock = shift > 0;
    }
    if (shift && record.headerAt[1] <= record.firstIdx) {
        suspicious.push(`${record.label}（第一列的数值本身就压在第二列列头上，只能写行覆盖）`);
    }
    const at = record.firstIdx + shift;
    const pad = Math.max(1, at - (1 + record.label.length));
    outLines.push(` ${record.label}${" ".repeat(pad)}${record.rest}`);
}

writeFileSync(out, `${outLines.join("\n")}\n`, "utf8");
console.log(`已写出 ${out}：${outLines.length} 行`);
console.log(
    `标签装不下的行 ${records.filter(needsShift).length} 条，整体右移 ${SHIFT} 位（连同表头）`,
);
if (suspicious.length) {
    console.log(`这些行的第一列位置可疑，得靠行覆盖兜底 ${suspicious.length} 条：`);
    for (const item of suspicious) console.log(`  - ${item}`);
}

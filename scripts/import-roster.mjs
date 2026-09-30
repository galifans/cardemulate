/**
 * 把官方 Checklist 表格版（`checklist.xlsx`）誊抄成 `roster.ts`。
 *
 * 为什么需要这个脚本：一个系列的名册少则几百行、多则上千行，手工誊抄既慢又容易
 * 错一位卡号，而且错了不会被发现——只会安静地开出一张不存在的卡。
 * 官方表格版的列本来就拆好了（卡号 / 人物 / 球队 / 新秀标记），直接抄下来
 * 既比人手快，也不会引入抄写误差；之后再用 `npm run roster:check` 对回原件。
 *
 * 官方表格版的结构（2025-26 Topps 篮球系列都是这个形状）：
 *
 * ```
 * 行 1        A=<产品名> Checklist           ← 标题，B 列为空
 * 行 3        A=免责声明                      ← B 列为空
 * 行 5        A=BASE                          ← 大类分隔，B 列为空，自身没有数据行
 * 行 6        A=BASE CARDS                    ← 分节标题，B 列为空
 * 行 7 起     A=卡号  B=人物  C=球队  D=Rookie  ← 数据行
 * ```
 *
 * 所以「B 列为空」的行都是分隔行，其中**后面跟了数据行**的才是真正的分节标题，
 * 纯大类名（`BASE` / `AUTOGRAPH` / `INSERT`）后面跟的还是标题行，会被自动跳过。
 *
 * 用法：
 *   node scripts/import-roster.mjs <checklist.xlsx> <输出 roster.ts>
 *
 * 生成结果按官方表的顺序与分节原样保留，不合并也不改名；
 * 哪个分节用哪个 slug、进哪个盒型，全部写在同目录的 `box.ts` 里，两层分开。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { readSheet } from "./lib/xlsx.mjs";

/** 分节标题转成合法的导出名：非字母数字一律变下划线，数字开头加前缀 */
const toExportName = (title) => {
    let name = title
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!name) name = "SECTION";
    if (/^\d/.test(name)) name = `SECTION_${name}`;
    return name;
};

/**
 * 官方原件里的已知笔误。
 *
 * 键是系列目录名，每条补丁用「分节标题 + 现有卡号 + 人物」定位，改成 `to`。
 * 官方表格版偶尔会把卡号写错（撞号、跳号），照抄会让两张卡共用一个号；
 * 与其手改生成文件（下次重新生成就被冲掉），不如把修正写在这里，
 * 并在生成文件的注释里留一行痕迹。
 */
const ROSTER_PATCHES = {
    "tcosmic26-basketball": [
        {
            section: "BASE CARDS",
            no: "101",
            player: "Nikola Jović",
            to: "48",
            why: "官方表格版把 48 号写成 101 号，与 BASE CARDS II 的 101 号撞号",
        },
    ],
};

/**
 * 官方表格版**漏掉**的行。
 *
 * 官方表格版偶尔整行缺失（导表时丢了一行），指南页与官方 Checklist 正文里却有。
 * 用「分节标题 + 插在哪一号之前 + 整行内容」定位；先用 `ROSTER_PATCHES` 改完卡号，
 * 再按这里的先后关系插入，所以 `before` 写的是改完之后的卡号。
 */
const INSERT_PATCHES = {
    "tsig26-basketball": [
        {
            section: "BASE CARDS I",
            before: "69",
            row: ["68", "Anthony Edwards", "Minnesota Timberwolves"],
            why:
                "官方表格版漏了 68 号；指南页的老将普卡列表（100 张）与逐卡索引" +
                "（Base - Anthony Edwards (68)）都记着这一号",
        },
    ],
};

const ROOKIE_RE = /\[?\s*rookie\s*\]?/i;

/** 把一个单元格里的新秀标记剥掉，返回 `[干净的人物名, 是否新秀]` */
const splitRookie = (playerCell, flagCell) => {
    const fromFlag = ROOKIE_RE.test(String(flagCell ?? ""));
    const fromName = ROOKIE_RE.test(String(playerCell ?? ""));
    return [String(playerCell ?? "").replace(/\s*\[?\s*rookie\s*\]?\s*$/i, "").trim(), fromFlag || fromName];
};

const parse = (xlsxPath, sheetIndex) => {
    const rows = readSheet(xlsxPath, sheetIndex);

    /** 数据行的判据：卡号与人物都非空 */
    const isData = (row) => Boolean(row.A) && Boolean(row.B);

    const sections = [];
    let current = null;

    for (const row of rows) {
        const hasA = Boolean(row.A);
        const hasB = Boolean(row.B);

        if (hasA && !hasB) {
            // 分隔行 / 标题行：先记下来，等确认后面有数据行再算一个分节
            current = { title: String(row.A).trim(), rows: [] };
            sections.push(current);
            continue;
        }

        if (!isData(row) || !current) continue;

        const [player, rookie] = splitRookie(row.B, row.D);
        const entry = [String(row.A).trim(), player, String(row.C ?? "").trim()];
        if (rookie) entry.push("R");
        current.rows.push(entry);
    }

    return { sections: sections.filter((section) => section.rows.length > 0) };
};

/** 按补丁表修正原件笔误；补丁定位不到就直接报错，免得默默改错人 */
const applyPatches = (parsed, patches) => {
    const applied = [];
    for (const patch of patches) {
        const section = parsed.sections.find((item) => item.title === patch.section);
        if (!section) throw new Error(`补丁找不到分节：${patch.section}`);
        const row = section.rows.find((item) => item[0] === patch.no && item[1] === patch.player);
        if (!row) throw new Error(`补丁找不到 ${patch.section} 的 ${patch.no} ${patch.player}`);
        row[0] = patch.to;
        applied.push(patch);
    }
    return applied;
};

/** 按补行表把官方表格版漏掉的行插回去；定位不到或卡号已存在就直接报错 */
const applyInserts = (parsed, patches) => {
    const applied = [];
    for (const patch of patches) {
        const section = parsed.sections.find((item) => item.title === patch.section);
        if (!section) throw new Error(`补行补丁找不到分节：${patch.section}`);
        if (section.rows.some((item) => item[0] === patch.row[0])) {
            throw new Error(`补行补丁想插的 ${patch.section} ${patch.row[0]} 号已经在表里了`);
        }
        const at = section.rows.findIndex((item) => item[0] === patch.before);
        if (at < 0) throw new Error(`补行补丁找不到 ${patch.section} 的 ${patch.before} 号`);
        section.rows.splice(at, 0, [...patch.row]);
        applied.push(patch);
    }
    return applied;
};

const render = (parsed, xlsxName, productName, patches = [], inserts = []) => {
    const used = new Map();
    const lines = [];

    lines.push("/**");
    lines.push(` * ${productName} 名册（自动生成，请勿手工编辑）。`);
    lines.push(" *");
    lines.push(` * 来源：${xlsxName}（官方 Checklist 表格版，B 级官方镜像）。`);
    lines.push(` * 重新生成：node scripts/import-roster.mjs <${xlsxName}> <本文件> [工作表序号] [产品名]`);
    lines.push(" *");
    lines.push(" * 分节标题与顺序与官方表格版一致，`ROSTER_SECTIONS` 的键就是表里的原始标题；");
    lines.push(" * `box.ts` 按标题取子集，不要按下标取。");
    if (patches.length) {
        lines.push(" *");
        lines.push(" * 已修正官方原件的笔误（改在 import-roster.mjs 的补丁表里，不在本文件手改）：");
        for (const patch of patches) {
            lines.push(` *   ${patch.section} ${patch.no} ${patch.player} → ${patch.to}：${patch.why}`);
        }
    }
    if (inserts.length) {
        lines.push(" *");
        lines.push(" * 已补入官方表格版漏掉的行（补在 import-roster.mjs 的补行表里，不在本文件手改）：");
        for (const patch of inserts) {
            lines.push(
                ` *   ${patch.section} ${patch.row[0]} ${patch.row[1]}（插在 ${patch.before} 前）：${patch.why}`,
            );
        }
    }
    lines.push(" */");
    lines.push("");
    lines.push('const R = "R" as const;');
    lines.push("");
    lines.push(
        "export type RosterRow = [no: string, player: string, team: string] | [no: string, player: string, team: string, typeof R];",
    );
    lines.push("");

    const named = [];
    for (const section of parsed.sections) {
        let name = toExportName(section.title);
        const seen = used.get(name) ?? 0;
        used.set(name, seen + 1);
        if (seen > 0) name = `${name}_${seen + 1}`;
        named.push({ ...section, name });

        lines.push(`/** ${section.title}（${section.rows.length} 行） */`);
        lines.push(`export const ${name}: RosterRow[] = [`);
        for (const row of section.rows) {
            lines.push(`    [${row.map((cell) => JSON.stringify(cell)).join(", ")}],`);
        }
        lines.push("];");
        lines.push("");
    }

    lines.push("/** 官方表格版的分节 → 名册，键是表里的原始标题 */");
    lines.push("export const ROSTER_SECTIONS: Record<string, RosterRow[]> = {");
    for (const section of named) {
        lines.push(`    ${JSON.stringify(section.title)}: ${section.name},`);
    }
    lines.push("};");
    lines.push("");

    return lines.join("\n");
};

const main = () => {
    const [source, target, sheetArg, nameArg] = process.argv.slice(2);
    if (!source || !target) {
        console.error(
            "用法：node scripts/import-roster.mjs <checklist.xlsx> <输出 roster.ts> [工作表序号] [产品名]",
        );
        process.exit(1);
    }

    const parsed = parse(resolve(source), Number(sheetArg ?? 1));
    if (!parsed.sections.length) {
        console.error("没有在表格里认出任何分节，先确认列布局与系列是否一致。");
        process.exit(1);
    }

    const productKey = basename(dirname(resolve(source)));
    const patches = applyPatches(parsed, ROSTER_PATCHES[productKey] ?? []);
    const inserts = applyInserts(parsed, INSERT_PATCHES[productKey] ?? []);

    // 表头注释里的产品名不用表里的行去猜：官方表的头几行有的是产品名、
    // 有的是一句免责声明，猜错会写进注释。默认退回系列目录名。
    const productName = nameArg || productKey;
    const outputPath = resolve(target);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, render(parsed, basename(source), productName, patches, inserts), "utf8");

    const total = parsed.sections.reduce((sum, section) => sum + section.rows.length, 0);
    console.log(`已生成 ${outputPath}`);
    console.log(`共 ${parsed.sections.length} 个分节、${total} 行`);
    for (const patch of patches) {
        console.log(`   已修正笔误：${patch.section} ${patch.no} ${patch.player} → ${patch.to}`);
    }
    for (const patch of inserts) {
        console.log(`   已补入漏行：${patch.section} ${patch.row[0]} ${patch.row[1]}（插在 ${patch.before} 前）`);
    }
    for (const section of parsed.sections) {
        console.log(`    ${section.title}（${section.rows.length} 行）`);
    }
};

main();

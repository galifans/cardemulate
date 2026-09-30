/**
 * 回填历史拆盒记录的金额（cost_rmb / value_rmb）
 *
 * 为什么能算准而不是拍脑袋：开盒用到的随机数只由「盒型 + 种子文本」决定，
 * 而这两样每次都原样存进了记录里，所以每一条老记录都能重放一遍，
 * 拿到当时开出的卡，再按当前价格表算钱。回填结果 = 「当时的卡按现在的价格值多少」，
 * 是一条能解释的数字，不是补一个平均数进去。
 *
 * 用法：
 *   npm run db:backfill            本地库
 *   npm run db:backfill -- --remote 线上库
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getBox } from "../src/catalog";
import { boxCostRmb, sumValueRmb } from "../src/data/prices";
import { ripBox } from "../src/engine/rip";

const REMOTE = process.argv.includes("--remote");
const SCOPE = REMOTE ? "--remote" : "--local";
/* 本地按 wrangler.toml 里的绑定名找库，线上按库名找库，两种写法不一样 */
const TARGET = REMOTE ? "cardemulate" : "DB";
const OUT_DIR = resolve(".snapshot");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

const run = (args: string[]): string => {
    const result = spawnSync(NPX, args, { encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`wrangler 执行失败（退出码 ${result.status}）\n${result.stderr ?? ""}${result.stdout ?? ""}`);
    }
    return result.stdout ?? "";
};

/** wrangler 会在 JSON 前后夹带提示文字，只取中间那一段数组 */
const parseJson = <T>(text: string): T => {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start < 0 || end <= start) throw new Error(`读不出 JSON 结果：\n${text.slice(0, 400)}`);
    return JSON.parse(text.slice(start, end + 1)) as T;
};

const asSqlPath = (path: string): string => path.replace(/\\/g, "/");
const round2 = (value: number): number => Math.round(value * 100) / 100;

interface BreakRow {
    id: number;
    box_key: string;
    seed: string;
    cost_rmb: number;
    value_rmb: number;
}

interface D1JsonResult {
    results?: BreakRow[];
    success?: boolean;
}

mkdirSync(OUT_DIR, { recursive: true });

const queryFile = asSqlPath(resolve(OUT_DIR, "break-values-query.sql"));
writeFileSync(
    queryFile,
    "SELECT id, box_key, seed, cost_rmb, value_rmb FROM breaks ORDER BY id;\n",
    "utf8",
);

console.log(`读取拆盒记录（${REMOTE ? "线上" : "本地"}）…`);
const payload = parseJson<D1JsonResult[]>(
    run(["wrangler", "d1", "execute", TARGET, SCOPE, "--json", `--file=${queryFile}`]),
);
const rows = payload.flatMap((entry) => entry.results ?? []);

const statements: string[] = [];
const missingBoxes = new Set<string>();
let unchanged = 0;
let costTotal = 0;
let valueTotal = 0;

for (const row of rows) {
    const box = getBox(row.box_key);
    if (!box) {
        /* 盒型下架或改名后老记录还在，这种记录不猜价，原样留着 */
        missingBoxes.add(row.box_key);
        continue;
    }

    const cost = boxCostRmb(box.key);
    const replayed = ripBox(box, { seed: row.seed, boxIndex: row.id });
    const value = round2(sumValueRmb(replayed.cards, box.productKey));
    costTotal += cost;
    valueTotal += value;

    if (Math.abs(row.cost_rmb - cost) < 0.005 && Math.abs(row.value_rmb - value) < 0.005) {
        unchanged += 1;
        continue;
    }
    statements.push(`UPDATE breaks SET cost_rmb = ${cost}, value_rmb = ${value} WHERE id = ${row.id};`);
}

console.log(`  记录 ${rows.length} 条，需要更新 ${statements.length} 条，已经一致 ${unchanged} 条`);
if (missingBoxes.size) {
    console.log(`  跳过 ${missingBoxes.size} 个查不到的盒型：${[...missingBoxes].join("、")}`);
}
console.log(`  合计购入 ¥${round2(costTotal)}，合计售出 ¥${round2(valueTotal)}`);

if (!statements.length) {
    console.log("没有需要回填的记录。");
} else {
    const sqlFile = resolve(OUT_DIR, "backfill-break-values.sql");
    writeFileSync(
        sqlFile,
        `-- 由 npm run db:backfill 生成，内容是按现有种子重放后算出来的金额\n${statements.join("\n")}\n`,
        "utf8",
    );
    console.log(`写入 ${statements.length} 条更新语句，开始执行…`);
    run(["wrangler", "d1", "execute", TARGET, SCOPE, `--file=${asSqlPath(sqlFile)}`]);
    console.log("回填完成。");
}

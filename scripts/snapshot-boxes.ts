/**
 * 盒型快照工具：把整个卡盒目录序列化成一份可比对的 JSON，用来锁住既有行为。
 *
 * 为什么需要它：卡盒数据经常要重构（新增盒型、拆分配率来源、换平行命名），
 * 而重构最容易悄悄改掉三样东西——某个卡种的配率、某个卡种的权重、
 * 相同种子拆出来的结果。这三样都不会报错，只有逐字节比对才能发现。
 *
 * 用法（在仓库根目录）：
 *   npm run boxes:snapshot          把当前目录写成 snapshots/boxes.json
 *   npm run boxes:check             与 snapshots/boxes.json 比对，有差异就退出码 1
 *
 * 有意改动盒型数据时：先跑 snapshot 看清 diff，确认符合预期后再提交新快照。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { REGISTERED_BOXES } from "@/data/sets";
import { fnv1a } from "@/engine/rng";
import { ripBox } from "@/engine/rip";
import type { BoxDefinition, PulledCard, Subject } from "@/engine/types";

/** 用于锁行为的固定种子；改动这个列表等于放宽校验，需要说明理由 */
const SEEDS = ["alpha", "beta", "gamma", "2026", "test-1"];

const SNAPSHOT_PATH = resolve(process.cwd(), "snapshots/boxes.json");

/** 数字统一保留 12 位有效位，避免浮点尾差造成假 diff */
const num = (value: number | null): number | null =>
    value === null ? null : Number(value.toPrecision(12));

const cardLine = (card: PulledCard): string =>
    [
        card.id,
        card.variantKey,
        card.tier,
        card.player,
        card.no,
        card.serial ?? "-",
        `${card.pack}.${card.slot}`,
    ].join("|");

/**
 * 名册只存「条数 + 摘要」：几百行球员名单直接写进快照会把文件撑到几百 KB，
 * 而重构时真正要盯住的是「名册有没有被改」，摘要足以发现改动，
 * 具体的球员差异去看 git diff 里的 roster.ts。
 */
const rosterDigest = (subjects: Subject[]) => ({
    count: subjects.length,
    digest: fnv1a(subjects.map((s) => `${s.no}\u0001${s.player}\u0001${s.team}\u0001${s.rookie === true}`).join("\u0002")),
});

const snapshotBox = (box: BoxDefinition) => ({
    key: box.key,
    slug: box.slug,
    name: box.name,
    category: box.category,
    maker: box.maker,
    productKey: box.productKey,
    productName: box.productName,
    live: box.live,
    releaseDate: box.releaseDate,
    cardsPerPack: box.cardsPerPack,
    packsPerBox: box.packsPerBox,
    boxesPerCase: box.boxesPerCase,
    autoGuaranteed: box.autoGuaranteed,
    boxExclusives: box.boxExclusives,
    notes: box.notes,
    baseWeight: num(box.baseWeight),
    absentSubsets: box.absentSubsets,
    subsets: box.subsets.map((subset) => ({
        key: subset.key,
        name: subset.name,
        code: subset.code ?? "",
        kind: subset.kind,
        detailed: subset.detailed,
        inBox: subset.inBox,
        note: subset.note ?? "",
        roster: rosterDigest(subset.subjects),
    })),
    variants: box.variants.map((variant) => ({
        key: variant.key,
        subset: variant.subset,
        subsetName: variant.subsetName,
        variantName: variant.variantName,
        fullName: variant.fullName,
        group: variant.group,
        tier: variant.tier,
        odds: num(variant.odds),
        numbered: variant.numbered,
        weight: num(variant.weight),
    })),
    rips: Object.fromEntries(
        SEEDS.map((seed) => [seed, ripBox(box, { seed }).cards.map(cardLine)]),
    ),
});

const buildSnapshot = () => ({
    /** 快照格式版本；字段增删时递增，避免旧文件造成误判 */
    format: 1,
    seeds: SEEDS,
    boxes: REGISTERED_BOXES.map(snapshotBox),
});

/** 逐行比较，返回人类可读的差异摘要 */
const diff = (expected: string, actual: string): string[] => {
    const a = expected.split("\n");
    const b = actual.split("\n");
    const out: string[] = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i += 1) {
        if (a[i] !== b[i]) {
            out.push(`第 ${i + 1} 行：`);
            out.push(`    快照  ${a[i] ?? "<无>"}`);
            out.push(`    现在  ${b[i] ?? "<无>"}`);
        }
    }
    return out;
};

const main = (): void => {
    const mode = process.argv[2] ?? "check";
    const actual = `${JSON.stringify(buildSnapshot(), null, 2)}\n`;

    if (mode === "snapshot" || mode === "write") {
        mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
        writeFileSync(SNAPSHOT_PATH, actual, "utf8");
        console.log(`已写入 ${SNAPSHOT_PATH}`);
        console.log(`共 ${REGISTERED_BOXES.length} 个盒型`);
        return;
    }

    if (!existsSync(SNAPSHOT_PATH)) {
        console.error(`找不到快照文件 ${SNAPSHOT_PATH}，先跑一次 npm run boxes:snapshot`);
        process.exit(1);
    }

    const expected = readFileSync(SNAPSHOT_PATH, "utf8");
    if (expected === actual) {
        console.log(`盒型行为与快照一致（${REGISTERED_BOXES.length} 个盒型）`);
        return;
    }

    const lines = diff(expected, actual);
    console.error("盒型行为与快照不一致：");
    console.error(lines.slice(0, 60).join("\n"));
    if (lines.length > 60) console.error(`……还有 ${lines.length - 60} 行差异`);
    process.exit(1);
};

main();

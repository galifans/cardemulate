/**
 * 把「官方 Pack Odds 表 + 官方 Checklist 名册」拼成盒型定义。
 *
 * 为什么要有这一层
 * ----------------
 * 2025-26 Topps NBA 有十几个系列，每个系列官方表里都是几百行行标签。手写 `box.ts`
 * 意味着逐个字母誊抄这些标签：抄错一个，那一档配率就静默变成 0，页面上完全看不出
 * 区别。所以各系列只写一张「分节 → 行标签」的小表，平行列表由这里照着官方表展开。
 *
 * 三张表的角色
 * ------------
 * - Checklist 名册（roster.ts）是**权威的子集清单**：官方表里 `Planetary Pursuit`
 *   只写成 `Planetary Pursuit Sun / Mercury / …`，`Singularity Signatures` 只写成
 *   `… Refractor`，都没有「普通版」那一行，单看配率表推不出子集边界。
 * - Pack Odds 表是**权威的配率**，也是平行列表：某子集的行标签去掉前缀之后，
 *   剩下的就是平行名。
 * - 这里只做搬运与展开，不猜边界；每个系列要哪些子集、配率前缀是什么，写在其 `box.ts`。
 *
 * 权重
 * ----
 * 与既有盒型同口径：`weight = 1/odds`；普通 Base 不取官方表那一行，改用残差
 * `cardsPerPack - Σ(1/odds)`——这样每包张数与其余每一档配率同时成立。
 */
import type {
    AbsentEntry,
    BoxDefinition,
    GroupKind,
    SubsetDef,
    Subject,
    Tier,
    VariantDef,
} from "@/engine/types";
import { defineBox } from "@/catalog/define";

/** 名册行：卡号、人物、球队、（可选）新秀标记。各系列 roster.ts 里的同名类型形状一致 */
export type RosterRow =
    | [no: string, player: string, team: string]
    | [no: string, player: string, team: string, "R"];

export interface OddsRow {
    label: string;
    odds: readonly (number | null)[];
}

export interface OddsTable {
    columns: readonly string[];
    rows: readonly OddsRow[];
}

export interface VariantMeta {
    /** 平行显示名；默认取行标签去掉子集前缀之后的那一段 */
    name?: string;
    /** 限量数；null = 非编号 */
    numbered?: number | null;
}

export interface SubsetPlan {
    /** Checklist 分节标题，多段表示合并；缺省时按 `label` 去找最贴的分节 */
    section?: string | string[] | false;
    /** 官方表的行标签前缀；缺省时用分节的第一个标题 */
    label?: string;
    /** 展示名；默认用 `label` */
    name?: string;
    /** 卡号前缀 */
    code?: string;
    kind?: GroupKind;
    /** 是否逐卡展示；默认「有名册就展开」 */
    detailed?: boolean;
    note?: string;
    /** 行标签 → 平行显示名 / 限量数 */
    variantMeta?: Record<string, VariantMeta>;
    /** 前缀对不上、但要并进来的行标签 */
    extraLabels?: string[];
    /** 前缀对上了、但不要的行标签 */
    dropLabels?: string[];
    /** 官方表整行缺失时的补录配率：行标签 → 列 key → 1:X 里的 X */
    manual?: Record<string, Partial<Record<string, number>>>;
}

export interface BoxSpec {
    slug: string;
    name: string;
    /** 本盒取官方表的哪一列 */
    column: string;
    cardsPerPack: number;
    packsPerBox: number;
    boxesPerCase: number;
    autoGuaranteed: boolean;
    boxExclusives: string[];
}

export interface AssembleConfig {
    productKey: string;
    productName: string;
    year: string;
    releaseDate: string;
    category: string;
    maker: string;
    live: boolean;
    notes: string[];
    odds: OddsTable;
    sections: Record<string, RosterRow[]>;
    subsets: SubsetPlan[];
    boxes: BoxSpec[];
    /** 列 key → 展示名，用于「本盒不含」里的说明；缺省时直接用列 key */
    columnNames?: Record<string, string>;
    /** 官方表里查不到、要挂在每个盒上的补充说明 */
    extraAbsent?: AbsentEntry[];
    /**
     * 每包至少留给普卡的权重，默认 0.5。
     *
     * 官方配率加起来可能逼近包厚（每包只有一张非命中卡、其余全按配率抽的盒型），
     * 这时残差会被这个下限顶出去，整盒权重就超过每包张数了——自检会报出来。
     * 官方表确实那么紧的盒型，在产品里把这个值调小。
     */
    minBaseWeight?: number;
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** 比对口径：去掉一切非字母数字再比，避免逗号、短横线、大小写造成假差异 */
const normalize = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "");

const slugify = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

/**
 * 名册行 → 卡。一张卡有可能印着两三个球员：官方表里 `DUAL_*` / `TRIPLE_*` 这类子集
 * 会为同一个卡号排两三行。这种行合并成一条，球员与球队各用 ` / ` 串起来（球队相同的
 * 只留一次），卡号保持唯一，页面上看到的就还是一张卡。
 *
 * 同一卡号上再出现同一个球员，那是官方表真的重复了，照旧建两条交给下游自检报错。
 */
const toSubjects = (rows: readonly RosterRow[]): Subject[] => {
    const subjects: Subject[] = [];
    /** 卡号 → 这个卡号下已经建出来的卡，可能只有一条（合并多个球员），也可能有多条（重号） */
    const taken = new Map<string, Subject[]>();

    for (const [no, player, team, rookie] of rows) {
        const candidates = taken.get(no) ?? [];
        const merged = candidates.find((item) => !item.player.split(" / ").includes(player));

        if (!merged) {
            const subject: Subject = { no, player, team, rookie: rookie === "R" };
            subjects.push(subject);
            candidates.push(subject);
            taken.set(no, candidates);
            continue;
        }

        merged.player = `${merged.player} / ${player}`;
        if (!merged.team.split(" / ").includes(team)) {
            merged.team = merged.team ? `${merged.team} / ${team}` : team;
        }
        if (rookie === "R") merged.rookie = true;
    }

    return subjects;
};

/** 行标签是不是这个前缀下的一条：大小写不敏感，且必须切在词边界上 */
const underLabel = (label: string, prefix: string): boolean => {
    if (label === prefix) return true;
    return (
        label.length > prefix.length &&
        label.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase() &&
        !/[A-Za-z0-9]/.test(label.charAt(prefix.length))
    );
};

/* ------------------------------------------------------------------ */
/* 稀有度                                                              */
/* ------------------------------------------------------------------ */

/** 稀有度判定：编号卡按限量数，非编号卡按配率 */
const tierOf = (odds: number, numbered: number | null, kind: GroupKind): Tier => {
    if (kind === "auto" || kind === "relic" || kind === "ssp") {
        return odds > 100000 ? "mythic" : "legendary";
    }
    if (numbered !== null) {
        if (numbered >= 100) return "epic";
        if (numbered >= 20) return "legendary";
        return "mythic";
    }
    if (odds <= 12) return "uncommon";
    if (odds <= 90) return "rare";
    if (odds <= 1500) return "epic";
    if (odds <= 80000) return "legendary";
    return "mythic";
};

const AUTO_RE =
    /auto|signature|autograph|penmanship|hand ?sign|\bink\b|script|marks?$|firma|signed|john hancock/i;
const RELIC_RE = /relic|patch|jersey|memorabilia|swatch/i;

const kindOf = (label: string, labels: readonly string[]): GroupKind => {
    if (/^base\b/i.test(label)) return "base";
    const all = [label, ...labels].join(" ");
    if (RELIC_RE.test(all)) return "relic";
    if (AUTO_RE.test(all)) return "auto";
    return "insert";
};

/* ------------------------------------------------------------------ */
/* 展开                                                                */
/* ------------------------------------------------------------------ */

interface BuiltSubset {
    key: string;
    name: string;
    code?: string;
    kind: GroupKind;
    detailed: boolean;
    /** [平行显示名, 行标签, slug]，第一项是子集本身的普通版 */
    variants: [name: string, label: string, slug: string][];
    numbered: (number | null)[];
    /** 补录配率，按子集内序号索引 */
    manual: (Partial<Record<string, number>> | undefined)[];
    subjects: Subject[];
    note?: string;
    /** 纯 Base：第一条平行走残差权重 */
    residual: boolean;
}

const buildSubsets = (config: AssembleConfig): BuiltSubset[] => {
    const titles = Object.keys(config.sections);
    const built: BuiltSubset[] = [];

    config.subsets.forEach((plan, index) => {
        const sectionTitles =
            plan.section === false
                ? []
                : plan.section === undefined
                  ? titles
                  : typeof plan.section === "string"
                    ? [plan.section]
                    : plan.section;
        const label = plan.label ?? sectionTitles[0] ?? "";

        for (const title of sectionTitles) {
            if (!(title in config.sections)) {
                throw new Error(
                    `${config.productKey}：子集「${label}」写了名册里没有的分节「${title}」`,
                );
            }
        }

        const drop = new Set(plan.dropLabels ?? []);
        const labels = config.odds.rows
            .map((row) => row.label)
            .filter((rowLabel) => underLabel(rowLabel, label) && !drop.has(rowLabel));
        for (const extra of plan.extraLabels ?? []) if (!labels.includes(extra)) labels.push(extra);

        if (!labels.length) {
            throw new Error(
                `${config.productKey}：官方配率表里找不到子集「${label}」的任何行标签，` +
                    "官方表的措辞可能变了，请核对后更新这张表",
            );
        }

        const variants: [string, string, string][] = labels.map((rowLabel) => {
            const suffix = underLabel(rowLabel, label)
                ? rowLabel.slice(label.length).trim()
                : rowLabel;
            const name = plan.variantMeta?.[rowLabel]?.name ?? suffix;
            return [name, rowLabel, slugify(name) || "base"];
        });

        const slugs = new Set<string>();
        for (const [, , slug] of variants) {
            if (slugs.has(slug)) {
                throw new Error(
                    `${config.productKey}：子集「${label}」里有两条平行都映射到 key "${slug}"`,
                );
            }
            slugs.add(slug);
        }

        const kind = plan.kind ?? kindOf(label, labels);
        const subjects = sectionTitles.flatMap((title) => toSubjects(config.sections[title] ?? []));
        const name = plan.name ?? label;

        built.push({
            key: slugify(name) || `subset-${index + 1}`,
            name,
            code: plan.code,
            kind,
            detailed: plan.detailed ?? subjects.length > 0,
            variants,
            numbered: labels.map((rowLabel) => plan.variantMeta?.[rowLabel]?.numbered ?? null),
            manual: labels.map((rowLabel) => plan.manual?.[rowLabel]),
            subjects,
            note: plan.note,
            residual: kind === "base",
        });
    });

    const keys = new Set<string>();
    for (const subset of built) {
        if (keys.has(subset.key)) throw new Error(`${config.productKey}：子集 key "${subset.key}" 重复`);
        keys.add(subset.key);
    }

    return built;
};

/* ------------------------------------------------------------------ */
/* 组装                                                                */
/* ------------------------------------------------------------------ */

/**
 * 生成一批盒型定义。
 *
 * 每个盒型独立算一遍权重：官方表里这一列为空的行不出现在本盒，一列都空的子集进
 * 「本盒不含」，这样页面上能说清某个卡种在哪个盒里才有。
 */
export const assembleBoxes = (config: AssembleConfig): BoxDefinition[] => {
    const built = buildSubsets(config);
    const columnIndex = new Map(config.odds.columns.map((column, index) => [column, index]));
    const oddsOf = new Map(config.odds.rows.map((row) => [row.label, row.odds]));
    const columns = config.odds.columns;
    const nameOf = (column: string): string => config.columnNames?.[column] ?? column;

    /** 某条平行在某一列的配率；null = 本盒没有这个卡种 */
    const oddsIn = (
        column: string,
        label: string,
        manual?: Partial<Record<string, number>>,
    ): number | null => {
        const fixed = manual?.[column];
        if (fixed !== undefined) return fixed;
        const index = columnIndex.get(column);
        if (index === undefined) return null;
        return oddsOf.get(label)?.[index] ?? null;
    };

    return config.boxes.map((spec) => {
        if (!columnIndex.has(spec.column)) {
            throw new Error(
                `盒型 ${spec.slug} 指定了官方表里没有的列「${spec.column}」，` +
                    `现有列：${columns.join(" / ")}`,
            );
        }

        const subsets: SubsetDef[] = [];
        const variants: VariantDef[] = [];
        const absent: AbsentEntry[] = [];
        let premiumWeight = 0;

        for (const subset of built) {
            const rows = subset.variants
                .map(([name, label, slug], order) => {
                    // 普通 Base 不取官方表那一行，交给残差，避免与平行配率重复计算
                    const odds =
                        subset.residual && order === 0
                            ? 0
                            : oddsIn(spec.column, label, subset.manual[order]);
                    return { name, slug, odds, numbered: subset.numbered[order] };
                })
                .filter((row): row is typeof row & { odds: number } => row.odds !== null);

            if (!rows.some((row) => row.odds > 0)) {
                const elsewhere = columns.filter((column) =>
                    subset.variants.some(
                        ([, label], order) => (oddsIn(column, label, subset.manual[order]) ?? 0) > 0,
                    ),
                );
                absent.push({
                    name: subset.name,
                    code: subset.code ?? "",
                    count: subset.subjects.length,
                    where: elsewhere.map(nameOf).join(" / "),
                    kind: subset.kind,
                });
                continue;
            }

            subsets.push({
                key: subset.key,
                name: subset.name,
                code: subset.code,
                kind: subset.kind,
                detailed: subset.detailed,
                inBox: true,
                subjects: subset.subjects,
                note: subset.note,
            });

            for (const row of rows) {
                const weight = row.odds > 0 ? 1 / row.odds : 0;
                if (row.odds > 0) premiumWeight += weight;
                variants.push({
                    key: `${subset.key}:${row.slug}`,
                    subset: subset.key,
                    subsetName: subset.name,
                    variantName: row.name,
                    fullName: row.name ? `${subset.name} · ${row.name}` : subset.name,
                    group: subset.kind,
                    tier: row.odds > 0 ? tierOf(row.odds, row.numbered, subset.kind) : "common",
                    odds: row.odds,
                    numbered: row.numbered,
                    weight,
                });
            }
        }

        const baseWeight = Math.max(
            config.minBaseWeight ?? 0.5,
            spec.cardsPerPack - premiumWeight,
        );
        for (const variant of variants) if (variant.odds === 0) variant.weight = baseWeight;

        return defineBox({
            slug: spec.slug,
            name: spec.name,
            category: config.category,
            maker: config.maker,
            productKey: config.productKey,
            productName: config.productName,
            year: config.year,
            live: config.live,
            releaseDate: config.releaseDate,
            cardsPerPack: spec.cardsPerPack,
            packsPerBox: spec.packsPerBox,
            boxesPerCase: spec.boxesPerCase,
            autoGuaranteed: spec.autoGuaranteed,
            boxExclusives: spec.boxExclusives,
            notes: config.notes,
            absentSubsets: [...absent, ...(config.extraAbsent ?? [])],
            subsets,
            variants,
            baseWeight,
        });
    });
};

/* ------------------------------------------------------------------ */
/* 起草辅助                                                            */
/* ------------------------------------------------------------------ */

/**
 * 起草阶段的报告：把官方表的行按「最贴的 Checklist 分节」归堆，输出能贴进
 * `box.ts` 的草稿。只在为新系列起草时用，运行时用不到。
 *
 * 归堆口径：分节标题（去掉非字母数字）是行标签的前缀，取最长的那一段。
 */
export const draftPlan = (
    odds: OddsTable,
    sections: Record<string, RosterRow[]>,
): { lines: string[]; gaps: string[] } => {
    const titles = Object.keys(sections);
    const groups = new Map<string, string[]>();
    const gaps: string[] = [];

    for (const row of odds.rows) {
        const key = normalize(row.label);
        let best: string | null = null;
        for (const title of titles) {
            const other = normalize(title);
            if (other.length < 4 || !key.startsWith(other)) continue;
            if (best === null || normalize(best).length < other.length) best = title;
        }
        if (!best) {
            gaps.push(row.label);
            continue;
        }
        const list = groups.get(best) ?? [];
        list.push(row.label);
        groups.set(best, list);
    }

    const lines: string[] = [];
    for (const title of titles) {
        const rows = groups.get(title);
        if (!rows) {
            lines.push(`// 无配率行：${title}（${sections[title]!.length} 人）`);
            continue;
        }
        // 候选前缀：能罩住本堆所有行的最短标签
        const root =
            rows.find((label) => rows.every((other) => underLabel(other, label))) ?? rows[0]!;
        const parallels = rows
            .filter((label) => label !== root)
            .map((label) => label.slice(root.length).trim());
        lines.push(
            `{ section: ${JSON.stringify(title)}, label: ${JSON.stringify(root)} }` +
                `  // ${sections[title]!.length} 人 / ${rows.length} 行` +
                (parallels.length ? `：${parallels.join(" | ")}` : ""),
        );
    }

    const claimed = new Set(groups.keys());
    const unclaimed = titles.filter((title) => !claimed.has(title));
    if (unclaimed.length) lines.push(`// 没被认领的分节：${unclaimed.join(" | ")}`);

    return { lines, gaps };
};

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import CardFace from "../components/CardFace.vue";
import { getBox } from "../catalog";
import {
    boxProbability,
    cardProbability,
    expectedPerBox,
    formatOdds,
    formatPercent,
    ripBox,
    type RipResult,
} from "../engine/rip";
import { randomSeed } from "../engine/rng";
import { TIER_ORDER, TIERS, GROUP_NAMES } from "../engine/tiers";
import { useAppStore } from "../stores/app";
import type { Tier } from "../engine/types";

const route = useRoute();
const router = useRouter();
const store = useAppStore();

/** 拆卡必须登录：结果要写进云端数据库，所以未登录时直接拦住 */
const signedIn = computed(() => Boolean(store.state.user));

const boxKey = computed(() => String(route.params.boxKey));
const box = computed(() => getBox(boxKey.value));

/** 本盒不含（但同系列其他盒型有）的子集 */
const absentSubsets = computed(() => box.value?.absentSubsets ?? []);

const tab = ref<"rip" | "odds" | "checklist">("rip");
const seedInput = ref(randomSeed());
const result = ref<RipResult | null>(null);
const revealed = ref(0);
const revealedPack = ref(0);
const recorded = ref(false);
let timer: number | null = null;

const stopTimer = (): void => {
    if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
    }
};

onUnmounted(stopTimer);

const totalCards = computed(() => result.value?.cards.length ?? 0);

/** 正在逐包揭示：此时不允许再开一盒 */
const ripping = computed(() => revealed.value > 0 && revealed.value < totalCards.value);

const rollNewSeed = (): void => {
    seedInput.value = randomSeed();
};

const startRip = (): void => {
    if (!box.value || ripping.value) return;
    if (!signedIn.value) {
        store.clearMessages();
        void router.push("/auth");
        return;
    }
    stopTimer();
    recorded.value = false;
    revealed.value = 0;
    revealedPack.value = 0;

    const seed = seedInput.value.trim() || randomSeed();
    seedInput.value = seed;
    const ripped = ripBox(box.value, { seed, boxIndex: store.state.breaks.length });
    result.value = ripped;

    timer = window.setInterval(() => {
        revealed.value += box.value!.cardsPerPack;
        revealedPack.value = Math.min(
            box.value!.packsPerBox,
            Math.ceil(revealed.value / box.value!.cardsPerPack),
        );
        if (revealed.value >= ripped.cards.length) {
            revealed.value = ripped.cards.length;
            revealedPack.value = box.value!.packsPerBox;
            stopTimer();
            // 开完就换上新种子：接着点「再拆一盒」就是全新一盒，不用先手动换种子
            rollNewSeed();
            // 只有云端写入成功才算「已记录」，失败时用户可以再试一次
            void store.recordBreak(box.value!, ripped).then((ok) => {
                recorded.value = ok;
            });
        }
    }, 260);
};

const skipToEnd = (): void => {
    if (!result.value || !box.value) return;
    stopTimer();
    revealed.value = result.value.cards.length;
    revealedPack.value = box.value.packsPerBox;
    rollNewSeed();
    if (!recorded.value) {
        const current = box.value;
        void store.recordBreak(current, result.value).then((ok) => {
            recorded.value = ok;
        });
    }
};

watch(boxKey, () => {
    stopTimer();
    result.value = null;
    revealed.value = 0;
    revealedPack.value = 0;
    recorded.value = false;
    seedInput.value = randomSeed();
});

/** 排序后的卡组（稀有度优先，再按配率） */
const sortedCards = computed(() => {
    if (!result.value) return [];
    return [...result.value.cards].sort((a, b) => {
        const t = (TIERS[b.tier].order ?? 0) - (TIERS[a.tier].order ?? 0);
        if (t !== 0) return t;
        return b.odds - a.odds;
    });
});

const tierCounts = computed(() => {
    const counts = new Map<Tier, number>();
    for (const card of result.value?.cards ?? []) {
        counts.set(card.tier, (counts.get(card.tier) ?? 0) + 1);
    }
    return TIER_ORDER.map((tier) => ({ tier, count: counts.get(tier) ?? 0 }));
});

const rookies = computed(() => (result.value?.cards ?? []).filter((c) => c.rookie).length);
const numberedCards = computed(
    () => (result.value?.cards ?? []).filter((c) => c.numbered !== null),
);
/** 签名卡：auto 与实物签名（本系列实物卡全部带签） */
const autographs = computed(
    () => (result.value?.cards ?? []).filter((c) => c.group === "auto" || c.group === "relic"),
);

/** 配率表：按子集分组 */
const oddsGroups = computed(() => {
    if (!box.value) return [];
    const groups = new Map<string, typeof box.value.variants>();
    for (const variant of box.value.variants) {
        const list = groups.get(variant.subset) ?? [];
        list.push(variant);
        groups.set(variant.subset, list);
    }
    return box.value.subsets.map((subset) => ({
        subset,
        rows: (groups.get(subset.key) ?? []).sort((a, b) => {
            if (a.odds === 0) return -1;
            if (b.odds === 0) return 1;
            return b.odds - a.odds;
        }),
    }));
});

const openSubset = ref<string | null>(null);
const toggleSubset = (key: string): void => {
    openSubset.value = openSubset.value === key ? null : key;
};
</script>

<template>
    <div class="ce-shell">
        <template v-if="box">
            <nav class="ce-crumbs">
                <RouterLink to="/">卡品分类</RouterLink>
                <span>/</span>
                <RouterLink :to="`/c/${box.category}`">{{ box.category }}</RouterLink>
                <span>/</span>
                <RouterLink :to="`/c/${box.category}/${box.maker}`">{{ box.maker }}</RouterLink>
                <span>/</span>
                <RouterLink
                    :to="`/c/${box.category}/${box.maker}/${box.productKey}`"
                >
                    {{ box.productName }}
                </RouterLink>
                <span>/</span>
                <span>拆盒</span>
            </nav>

            <header class="ce-page-head">
                <div>
                    <p class="ce-card-en">按盒拆 · Box Break</p>
                    <h1 class="ce-page-title">{{ box.name }}</h1>
                    <div class="ce-head-badges">
                        <span class="ce-badge">{{ box.cardsPerPack }} 张 / 包</span>
                        <span class="ce-badge">{{ box.packsPerBox }} 包 / 盒</span>
                        <span class="ce-badge">
                            {{ box.packsPerBox * box.cardsPerPack }} 张 / 盒
                        </span>
                        <span v-if="box.boxesPerCase > 0" class="ce-badge">
                            {{ box.boxesPerCase }} 盒 / 箱
                        </span>
                        <span class="ce-badge">
                            {{ box.autoGuaranteed ? "有签名保证" : "无签名保证" }}
                        </span>
                        <span class="ce-badge ce-badge-live">配率已收录</span>
                    </div>
                </div>
            </header>

            <div class="ce-tabs">
                <button
                    type="button"
                    :class="{ active: tab === 'rip' }"
                    @click="tab = 'rip'"
                >
                    拆盒模拟
                </button>
                <button
                    type="button"
                    :class="{ active: tab === 'odds' }"
                    @click="tab = 'odds'"
                >
                    配率表（{{ box.variants.length }} 卡种）
                </button>
                <button
                    type="button"
                    :class="{ active: tab === 'checklist' }"
                    @click="tab = 'checklist'"
                >
                    Checklist（{{ box.subsets.length }} 子集）
                </button>
            </div>

            <!-- ---------------- 拆盒 ---------------- -->
            <section v-if="tab === 'rip'" class="ce-section">
                <div v-if="!signedIn" class="ce-card ce-rip-gate">
                    <h2 class="ce-section-title">登录后才能拆卡</h2>
                    <p class="ce-faint">
                        拆盒记录与个人统计都归入你的账号，登录后即可开拆。
                    </p>
                    <div class="ce-rip-buttons">
                        <RouterLink to="/auth" class="ce-btn ce-btn-primary">
                            注册 / 登录后拆卡
                        </RouterLink>
                    </div>
                </div>

                <div v-else class="ce-card ce-rip-panel">
                    <div class="ce-rip-controls">
                        <label class="ce-field ce-seed-field">
                            <span>随机种子（同一种子 = 同一盒）</span>
                            <input
                                v-model="seedInput"
                                type="text"
                                maxlength="24"
                                class="ce-mono"
                                @keydown.enter="startRip"
                            />
                        </label>
                        <div class="ce-rip-buttons">
                            <button class="ce-btn" type="button" @click="rollNewSeed">
                                换一个种子
                            </button>
                            <button
                                class="ce-btn ce-btn-primary"
                                type="button"
                                :disabled="store.state.busy || ripping"
                                @click="startRip"
                            >
                                {{ result ? "再拆一盒" : "按盒拆开" }}
                            </button>
                            <button
                                v-if="ripping"
                                class="ce-btn"
                                type="button"
                                @click="skipToEnd"
                            >
                                直接看结果
                            </button>
                        </div>
                    </div>

                    <div v-if="result" class="ce-rip-progress">
                        <div class="ce-bar">
                            <span
                                :style="{ width: `${(revealed / Math.max(1, totalCards)) * 100}%` }"
                            ></span>
                        </div>
                        <p v-if="ripping" class="ce-faint ce-rip-progress-text">
                            正在开第 {{ revealedPack }} / {{ box.packsPerBox }} 包 · 已翻出
                            {{ revealed }} / {{ totalCards }} 张
                        </p>
                    </div>

                    <p v-else class="ce-faint ce-rip-hint">
                        点「按盒拆开」后，引擎会按官方配率逐包抽样，一次开出
                        {{ box.packsPerBox * box.cardsPerPack }} 张卡。
                        没有真实卡图，卡面统一使用占位图，并按照稀有度做色彩区分。
                    </p>

                    <p v-if="store.state.error" class="ce-alert ce-alert-error">
                        {{ store.state.error }}
                    </p>
                    <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">
                        {{ store.state.info }}
                    </p>
                </div>

                <template v-if="result">
                    <div class="ce-rip-summary">
                        <div class="ce-card ce-summary-card">
                            <h3 class="ce-hl-title">本盒概况</h3>
                            <div class="ce-summary-grid">
                                <div>
                                    <strong>{{ totalCards }}</strong><span>总张数</span>
                                </div>
                                <div>
                                    <strong>{{ rookies }}</strong><span>新秀卡</span>
                                </div>
                                <div>
                                    <strong>{{ numberedCards.length }}</strong><span>编号卡</span>
                                </div>
                                <div :class="{ 'ce-summary-hot': autographs.length > 0 }">
                                    <strong>{{ autographs.length }}</strong><span>签字卡</span>
                                </div>
                                <div>
                                    <strong>{{ Object.keys(result.bySubset).length }}</strong>
                                    <span>涉及卡种</span>
                                </div>
                            </div>
                            <p class="ce-faint ce-seed-note">
                                种子 <code class="ce-mono">{{ result.seed }}</code>
                                <button
                                    class="ce-btn ce-btn-sm"
                                    type="button"
                                    @click="seedInput = result.seed"
                                >
                                    复现这一盒
                                </button>
                            </p>
                            <p v-if="recorded" class="ce-faint ce-seed-note">
                                已记入统计，可在<RouterLink to="/stats" class="ce-link">
                                    我的统计
                                </RouterLink>
                                查看。
                            </p>
                        </div>

                        <div class="ce-card ce-summary-card">
                            <h3 class="ce-hl-title">稀有度分布</h3>
                            <ul class="ce-tier-bars">
                                <li v-for="row in tierCounts" :key="row.tier">
                                    <span
                                        class="ce-tier-dot"
                                        :style="{ background: TIERS[row.tier].color }"
                                    ></span>
                                    <span class="ce-tier-name">{{ TIERS[row.tier].name }}</span>
                                    <span class="ce-tier-bar">
                                        <i
                                            :style="{
                                                width: `${(row.count / Math.max(1, totalCards)) * 100}%`,
                                                background: TIERS[row.tier].color,
                                            }"
                                        ></i>
                                    </span>
                                    <span class="ce-mono ce-tier-count">{{ row.count }}</span>
                                </li>
                            </ul>
                        </div>

                        <div v-if="result.best" class="ce-card ce-summary-card ce-best-card">
                            <h3 class="ce-hl-title">本盒最佳</h3>
                            <p class="ce-best-name">{{ result.best.player }}</p>
                            <p class="ce-best-sub">{{ result.best.fullName }}</p>
                            <p class="ce-best-odds ce-mono">{{ result.best.oddsLabel }}</p>
                        </div>
                    </div>

                    <div class="ce-section-head ce-rip-cards-head">
                        <h2 class="ce-section-title">开出的卡</h2>
                        <span class="ce-section-desc">
                            优先展示高稀有度，再按官方配率排序
                        </span>
                    </div>

                    <div class="ce-grid ce-card-grid">
                        <CardFace
                            v-for="card in sortedCards"
                            :key="card.id"
                            :card="card"
                            :style="{
                                opacity:
                                    result.cards.indexOf(card) < revealed ? 1 : 0.12,
                            }"
                        />
                    </div>
                </template>
            </section>

            <!-- ---------------- 配率表 ---------------- -->
            <section v-else-if="tab === 'odds'" class="ce-section">
                <div class="ce-card ce-odds-intro">
                    <p>
                        下表为官方本盒配率（1:X 包，一包 {{ box.cardsPerPack }} 张）。
                        「整盒期望」= {{ box.packsPerBox }} / X；「一盒至少 1 张」=
                        1 - (1 - 1/X)<sup>{{ box.packsPerBox }}</sup>；「单张概率」按子集内等概率估算。
                    </p>
                    <p class="ce-faint">
                        普通 Base 卡不单独给配率，它由残差权重决定，每包期望
                        {{ box.baseWeight.toFixed(3) }} 张；所有非 Base 卡种每包期望合计
                        {{ (box.cardsPerPack - box.baseWeight).toFixed(3) }} 张。
                    </p>
                </div>

                <div v-for="group in oddsGroups" :key="group.subset.key" class="ce-card ce-odds-group">
                    <div class="ce-odds-head">
                        <h3 class="ce-card-title">
                            {{ group.subset.name }}
                            <span v-if="group.subset.code" class="ce-badge">
                                {{ group.subset.code }}
                            </span>
                            <span class="ce-badge">{{ GROUP_NAMES[group.subset.kind] }}</span>
                            <span class="ce-badge">{{ group.subset.subjects.length }} 张名册</span>
                        </h3>
                        <p v-if="group.subset.note" class="ce-faint ce-odds-note">
                            {{ group.subset.note }}
                        </p>
                    </div>

                    <div class="ce-table-wrap">
                        <table class="ce-table">
                            <thead>
                                <tr>
                                    <th>卡种</th>
                                    <th>每包配率</th>
                                    <th>整盒期望</th>
                                    <th>一盒至少 1 张</th>
                                    <th>单张概率</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in group.rows" :key="row.key">
                                    <td>
                                        <span
                                            class="ce-tier-dot"
                                            :style="{ background: TIERS[row.tier].color }"
                                        ></span>
                                        {{ row.fullName }}
                                        <span v-if="row.numbered" class="ce-faint ce-mono">
                                            /{{ row.numbered }}
                                        </span>
                                    </td>
                                    <td class="ce-mono">
                                        {{ row.odds === 0 ? "残差权重" : formatOdds(row.odds) }}
                                    </td>
                                    <td class="ce-mono">
                                        {{ row.odds === 0
                                            ? `${box.baseWeight.toFixed(2)} 张`
                                            : `${expectedPerBox(row.odds, box.packsPerBox).toFixed(3)} 张` }}
                                    </td>
                                    <td class="ce-mono">
                                        {{ row.odds === 0
                                            ? "—"
                                            : formatPercent(
                                                  boxProbability(row.odds, box.packsPerBox),
                                              ) }}
                                    </td>
                                    <td class="ce-mono">
                                        {{ row.odds === 0
                                            ? "—"
                                            : formatPercent(
                                                  cardProbability(
                                                      row.odds,
                                                      Math.max(1, group.subset.subjects.length),
                                                  ),
                                                  4,
                                              ) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-if="absentSubsets.length" class="ce-card">
                    <h3 class="ce-card-title">本盒不含的子集</h3>
                    <p class="ce-faint ce-odds-note">
                        以下子集不在本盒的官方配率里。
                    </p>
                    <ul class="ce-absent-list">
                        <li v-for="item in absentSubsets" :key="item.name">
                            <strong>{{ item.name }}</strong>
                            <span class="ce-badge">{{ item.code }}</span>
                            <span class="ce-badge">{{ item.count }} 张</span>
                            <span class="ce-faint">{{ item.where }}</span>
                        </li>
                    </ul>
                </div>
            </section>

            <!-- ---------------- Checklist ---------------- -->
            <section v-else class="ce-section">
                <div class="ce-card ce-odds-intro">
                    <p>
                        以下为官方 Final Checklist 里本盒可开出的全部子集名册。
                        点开任一子集查看逐卡清单。
                    </p>
                </div>

                <div v-for="subset in box.subsets" :key="subset.key" class="ce-card ce-acc">
                    <button class="ce-acc-head" type="button" @click="toggleSubset(subset.key)">
                        <span>
                            <strong>{{ subset.name }}</strong>
                            <span v-if="subset.code" class="ce-badge">{{ subset.code }}</span>
                            <span class="ce-badge">{{ subset.subjects.length }} 张</span>
                            <span class="ce-badge">{{ GROUP_NAMES[subset.kind] }}</span>
                        </span>
                        <span class="ce-acc-arrow">{{ openSubset === subset.key ? "收起" : "展开" }}</span>
                    </button>

                    <div v-if="openSubset === subset.key" class="ce-acc-body">
                        <p v-if="subset.note" class="ce-faint ce-odds-note">{{ subset.note }}</p>
                        <ul class="ce-checklist">
                            <li v-for="subject in subset.subjects" :key="subject.no">
                                <span class="ce-mono ce-no">{{ subject.no }}</span>
                                <span class="ce-player">{{ subject.player }}</span>
                                <span class="ce-faint ce-team">{{ subject.team }}</span>
                                <span v-if="subject.rookie" class="ce-badge ce-badge-rookie">RC</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>
        </template>

        <div v-else class="ce-empty">
            没有找到该卡盒。<RouterLink to="/" class="ce-link">返回首页</RouterLink>
        </div>
    </div>
</template>

<style scoped>
.ce-crumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 22px 0 0;
    font-size: 13px;
    color: var(--ce-text-faint);
    flex-wrap: wrap;
}

.ce-crumbs a:hover {
    color: var(--ce-brand);
}

.ce-page-head {
    padding: 22px 0 6px;
}

.ce-page-head p {
    margin: 0;
}

.ce-page-title {
    font-size: 26px;
    line-height: 1.25;
    margin-top: 2px !important;
}

.ce-head-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
}

.ce-tabs {
    display: flex;
    gap: 6px;
    margin-top: 22px;
    padding-bottom: 2px;
    border-bottom: 1px solid var(--ce-border-soft);
    overflow-x: auto;
}

.ce-tabs button {
    padding: 9px 16px;
    border: none;
    background: transparent;
    color: var(--ce-text-dim);
    border-bottom: 2px solid transparent;
    font-size: 14px;
    white-space: nowrap;
}

.ce-tabs button:hover {
    color: var(--ce-text);
}

.ce-tabs button.active {
    color: var(--ce-brand);
    border-bottom-color: var(--ce-brand);
}

.ce-rip-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ce-rip-gate {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
}

.ce-rip-gate p {
    max-width: 620px;
    line-height: 1.7;
}

.ce-rip-controls {
    display: flex;
    align-items: flex-end;
    gap: 18px;
    flex-wrap: wrap;
}

.ce-seed-field {
    margin: 0;
    flex: 1 1 260px;
    max-width: 340px;
}

.ce-rip-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.ce-rip-progress .ce-bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
}

.ce-rip-progress .ce-bar span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--ce-brand-deep), var(--ce-brand));
    transition: width 0.24s ease;
}

.ce-rip-progress-text {
    margin: 8px 0 0;
    font-size: 12.5px;
}

.ce-rip-hint {
    margin: 0;
    font-size: 13.5px;
}

.ce-rip-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    margin-top: 18px;
}

.ce-summary-card h3 {
    margin-bottom: 12px;
}

.ce-hl-title {
    font-size: 12px;
    color: var(--ce-text-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.ce-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(74px, 1fr));
    gap: 10px;
}

.ce-summary-grid div {
    display: flex;
    flex-direction: column;
}

.ce-summary-grid strong {
    font-size: 20px;
    font-variant-numeric: tabular-nums;
}

.ce-summary-grid span {
    font-size: 11.5px;
    color: var(--ce-text-faint);
}

/* 开到签字卡：整格换成品牌色，一眼能看到 */
.ce-summary-hot strong,
.ce-summary-hot span {
    color: var(--ce-brand);
}

.ce-seed-note {
    margin: 14px 0 0;
    font-size: 12.5px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.ce-seed-note code {
    color: var(--ce-brand);
}

.ce-tier-bars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.ce-tier-bars li {
    display: grid;
    grid-template-columns: 10px 1fr 74px 24px;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
}

.ce-tier-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    vertical-align: middle;
    margin-right: 5px;
}

.ce-tier-bar {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
    display: block;
}

.ce-tier-bar i {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
}

.ce-tier-count {
    text-align: right;
    color: var(--ce-text-dim);
}

.ce-best-name {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
}

.ce-best-sub {
    margin: 4px 0 0;
    font-size: 12.5px;
    color: var(--ce-text-dim);
}

.ce-best-odds {
    margin: 6px 0 0;
    color: var(--ce-brand);
    font-size: 13px;
}

.ce-rip-cards-head {
    margin-top: 30px;
}

.ce-card-grid {
    grid-template-columns: repeat(auto-fill, minmax(178px, 1fr));
}

.ce-card-grid > * {
    transition: opacity 0.3s ease;
}

.ce-odds-intro p {
    margin: 0 0 8px;
    font-size: 13.5px;
    color: var(--ce-text-dim);
}

.ce-odds-intro p:last-child {
    margin-bottom: 0;
}

.ce-odds-group {
    margin-bottom: 16px;
}

.ce-odds-head {
    margin-bottom: 10px;
}

.ce-odds-note {
    font-size: 12.5px;
    margin: 6px 0 0;
}

.ce-table-wrap {
    overflow-x: auto;
    margin: 0 -4px;
}

.ce-absent-list {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
}

.ce-absent-list li {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.ce-acc {
    padding: 0;
    margin-bottom: 12px;
    overflow: hidden;
}

.ce-acc-head {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    background: transparent;
    border: none;
    color: var(--ce-text);
    text-align: left;
}

.ce-acc-head strong {
    font-size: 15px;
    margin-right: 8px;
}

.ce-acc-head .ce-badge {
    margin-right: 5px;
}

.ce-acc-arrow {
    font-size: 12.5px;
    color: var(--ce-brand);
    flex-shrink: 0;
}

.ce-acc-body {
    padding: 0 18px 18px;
    border-top: 1px solid var(--ce-border-soft);
}

.ce-checklist {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 5px 16px;
    font-size: 13px;
}

.ce-checklist li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
}

.ce-no {
    color: var(--ce-text-faint);
    min-width: 46px;
    font-size: 12px;
}

.ce-player {
    flex: 1;
    min-width: 0;
}

.ce-team {
    font-size: 11.5px;
    display: none;
}

.ce-link {
    color: var(--ce-brand);
}

@media (min-width: 1000px) {
    .ce-team {
        display: inline;
    }
}
</style>

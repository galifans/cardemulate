<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import CategoryIcon from "../components/CategoryIcon.vue";
import { CATEGORIES } from "../catalog";
import { api, type GlobalStats } from "../api/client";

const globalStats = ref<GlobalStats | null>(null);

onMounted(async () => {
    try {
        const result = await api.global();
        globalStats.value = result.global;
    } catch {
        globalStats.value = null;
    }
});

const liveCount = computed(() => CATEGORIES.filter((c) => c.live).length);

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");
</script>

<template>
    <div class="ce-shell">
        <section class="ce-hero">
            <p class="ce-hero-kicker">CardEmulate · 娱乐功能</p>
            <h1 class="ce-hero-title">电子卡牌拆包模拟器</h1>
            <p class="ce-hero-desc">
                按发行商官方公布的 Pack Odds 表，逐包还原真实卡盒的配率结构。
                选一个品类进入，按盒拆开，看看这一盒里到底有什么。
            </p>
            <div class="ce-hero-stats">
                <div class="ce-hero-stat">
                    <strong>{{ liveCount }}</strong>
                    <span>已上线品类</span>
                </div>
                <div class="ce-hero-stat">
                    <strong>{{ globalStats ? formatNumber(globalStats.boxes) : "—" }}</strong>
                    <span>全站累计拆盒</span>
                </div>
                <div class="ce-hero-stat">
                    <strong>{{ globalStats ? formatNumber(globalStats.cards) : "—" }}</strong>
                    <span>全站累计出卡</span>
                </div>
                <div class="ce-hero-stat">
                    <strong>{{ globalStats ? formatNumber(globalStats.users) : "—" }}</strong>
                    <span>注册收藏家</span>
                </div>
            </div>
        </section>

        <section class="ce-section">
            <div class="ce-section-head">
                <h2 class="ce-section-title">卡品分类</h2>
                <span class="ce-section-desc">点进任一分区，逐层选择发行商与系列</span>
            </div>

            <div class="ce-grid ce-grid-3">
                <component
                    :is="category.live ? RouterLink : 'div'"
                    v-for="category in CATEGORIES"
                    :key="category.key"
                    :to="category.live ? `/c/${category.key}` : undefined"
                    class="ce-card"
                    :class="category.live ? 'ce-card-hover ce-cat-live' : 'ce-card-off'"
                >
                    <div class="ce-cat-inner">
                        <span class="ce-cat-icon">
                            <CategoryIcon :name="category.icon" :size="32" />
                        </span>
                        <div class="ce-cat-text">
                            <p class="ce-card-en">{{ category.nameEn }}</p>
                            <p class="ce-card-title">{{ category.name }}</p>
                            <p class="ce-card-sub">{{ category.tagline }}</p>
                        </div>
                    </div>
                    <p v-if="category.live" class="ce-cat-feature">{{ category.feature }}</p>
                    <p v-else class="ce-cat-soon">待上线，敬请期待！</p>
                </component>
            </div>
        </section>

        <section class="ce-section">
            <div class="ce-card ce-howto">
                <h2 class="ce-section-title">怎么玩</h2>
                <ol class="ce-howto-list">
                    <li>注册一个账号，拆盒数与卡牌张数会自动记入你的统计。</li>
                    <li>进入「篮球 → Topps → 2025-26 Topps Chrome Updates Basketball」。</li>
                    <li>点「按盒拆」，引擎会用确定性随机数逐包还原一整个 Value Box（28 张）。</li>
                    <li>每盒都会给出随机种子，记下种子就能复现同一盒，方便核对与讨论。</li>
                </ol>
                <p class="ce-faint ce-howto-note">
                    本模拟器只还原概率结构，不涉及任何真实交易；所有卡面为统一占位图，
                    待后续补充实物图。
                </p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.ce-hero {
    padding: 54px 0 30px;
    max-width: 760px;
}

.ce-hero-kicker {
    margin: 0 0 10px;
    font-size: 12px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ce-brand);
}

.ce-hero-title {
    font-size: clamp(30px, 5vw, 46px);
    line-height: 1.14;
    background: linear-gradient(100deg, #ffffff 0%, #bff5d6 55%, var(--ce-brand) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.ce-hero-desc {
    margin: 16px 0 0;
    color: var(--ce-text-dim);
    font-size: 15.5px;
}

.ce-hero-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 14px;
    margin-top: 28px;
}

.ce-hero-stat {
    padding: 14px 16px;
    border-radius: var(--ce-radius);
    border: 1px solid var(--ce-border-soft);
    background: rgba(255, 255, 255, 0.025);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ce-hero-stat strong {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
}

.ce-hero-stat span {
    font-size: 12px;
    color: var(--ce-text-faint);
}

.ce-cat-inner {
    display: flex;
    align-items: center;
    gap: 14px;
}

.ce-cat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    flex-shrink: 0;
    border-radius: 16px;
    border: 1px solid var(--ce-border);
    background: rgba(255, 255, 255, 0.03);
    color: var(--ce-text-dim);
}

.ce-cat-live .ce-cat-icon {
    color: var(--ce-brand);
    border-color: rgba(61, 220, 132, 0.4);
    background: var(--ce-brand-soft);
}

.ce-cat-text p {
    margin: 0;
}

.ce-card-title {
    margin: 2px 0 0 !important;
    font-size: 17px;
}

.ce-cat-feature {
    margin: 14px 0 0;
    font-size: 12.5px;
    color: var(--ce-brand);
}

.ce-cat-soon {
    margin: 14px 0 0;
    font-size: 12.5px;
    color: var(--ce-warn);
}

.ce-howto-list {
    margin: 14px 0 0;
    padding-left: 20px;
    color: var(--ce-text-dim);
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.ce-howto-note {
    margin: 14px 0 0;
    font-size: 12.5px;
}
</style>

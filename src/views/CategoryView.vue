<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import CategoryIcon from "../components/CategoryIcon.vue";
import { findCategory, findMakers } from "../catalog";

const route = useRoute();
const categoryKey = computed(() => String(route.params.category));
const category = computed(() => findCategory(categoryKey.value));
const makers = computed(() => findMakers(categoryKey.value));
</script>

<template>
    <div class="ce-shell">
        <nav class="ce-crumbs">
            <RouterLink to="/">卡品分类</RouterLink>
            <span>/</span>
            <span>{{ category?.name ?? categoryKey }}</span>
        </nav>

        <template v-if="category">
            <header class="ce-page-head">
                <span class="ce-page-icon" :class="{ live: category.live }">
                    <CategoryIcon :name="category.icon" :size="30" />
                </span>
                <div>
                    <p class="ce-card-en">{{ category.nameEn }}</p>
                    <h1 class="ce-page-title">{{ category.name }}</h1>
                    <p class="ce-page-desc">{{ category.tagline }}</p>
                </div>
            </header>

            <p v-if="!category.live" class="ce-alert ce-alert-error ce-soon-alert">
                该分区待上线，敬请期待！
            </p>

            <section class="ce-section">
                <div class="ce-section-head">
                    <h2 class="ce-section-title">选择发行商</h2>
                    <span class="ce-section-desc">不同发行商的配率表结构差别很大，逐家适配中</span>
                </div>

                <div class="ce-grid ce-grid-2">
                    <component
                        :is="maker.live ? RouterLink : 'div'"
                        v-for="maker in makers"
                        :key="maker.key"
                        :to="maker.live ? `/c/${categoryKey}/${maker.key}` : undefined"
                        class="ce-card"
                        :class="maker.live ? 'ce-card-hover' : 'ce-card-off'"
                    >
                        <p class="ce-card-en">{{ maker.nameEn }}</p>
                        <p class="ce-card-title">
                            {{ maker.name }}
                            <span v-if="maker.live" class="ce-badge ce-badge-live">已上线</span>
                            <span v-else class="ce-badge ce-badge-soon">待上线</span>
                        </p>
                        <p class="ce-card-sub">{{ maker.note }}</p>
                    </component>
                </div>
            </section>
        </template>

        <div v-else class="ce-empty">
            没有找到该品类。<RouterLink to="/" class="ce-link">返回首页</RouterLink>
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
}

.ce-crumbs a:hover {
    color: var(--ce-brand);
}

.ce-page-head {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 22px 0 6px;
}

.ce-page-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 62px;
    height: 62px;
    border-radius: 18px;
    border: 1px solid var(--ce-border);
    background: rgba(255, 255, 255, 0.03);
    color: var(--ce-text-dim);
}

.ce-page-icon.live {
    color: var(--ce-brand);
    border-color: rgba(61, 220, 132, 0.4);
    background: var(--ce-brand-soft);
}

.ce-page-head p {
    margin: 0;
}

.ce-page-title {
    font-size: 27px;
    margin-top: 2px !important;
}

.ce-page-desc {
    color: var(--ce-text-dim);
    font-size: 14px;
    margin-top: 4px !important;
}

.ce-soon-alert {
    margin-top: 14px;
}

.ce-link {
    color: var(--ce-brand);
}

.ce-card-sub {
    color: var(--ce-text-faint);
}
</style>

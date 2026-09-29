<script setup lang="ts">
import { onMounted, computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useAppStore } from "./stores/app";

const store = useAppStore();
const route = useRoute();

onMounted(() => {
    void store.init();
});

const user = computed(() => store.state.user);
/** 导航角标用云端记录总数，未登录时后端不返回数据，自然为 0 */
const boxCount = computed(() => store.state.breakTotal);

const navActive = (prefix: string): boolean => route.path.startsWith(prefix);
</script>

<template>
    <header class="ce-header">
        <div class="ce-shell ce-header-inner">
            <RouterLink to="/" class="ce-logo">
                <img src="/favicon.svg" alt="CardEmulate" width="34" height="34" />
                <span class="ce-logo-text">
                    <strong>CardEmulate</strong>
                    <small>电子卡牌拆包模拟器</small>
                </span>
            </RouterLink>

            <nav class="ce-nav">
                <RouterLink to="/" :class="{ active: route.path === '/' }">卡品分类</RouterLink>
                <RouterLink to="/c/basketball" :class="{ active: navActive('/c/basketball') }">
                    篮球
                </RouterLink>
                <RouterLink to="/stats" :class="{ active: navActive('/stats') }">
                    我的统计
                    <span v-if="boxCount" class="ce-nav-count">{{ boxCount }}</span>
                </RouterLink>
            </nav>

            <div class="ce-header-right">
                <RouterLink v-if="!user" to="/auth" class="ce-btn ce-btn-sm ce-btn-primary">
                    注册 / 登录
                </RouterLink>
                <div v-else class="ce-user">
                    <span class="ce-user-name">{{ user.displayName }}</span>
                    <button class="ce-btn ce-btn-sm" type="button" @click="store.logout()">退出</button>
                </div>
            </div>
        </div>
    </header>

    <main class="ce-main">
        <RouterView />
    </main>

    <footer class="ce-footer">
        <div class="ce-shell ce-footer-inner">
            <p>
                CardEmulate 是 WikiAndroid 的娱乐功能，仅用于拆包概率模拟，与 Topps、Panini、
                Fanatics、The Pokémon Company 等发行商无任何关联，也不销售任何实体卡牌。
            </p>
            <p class="ce-faint">
                所有配率数据来自发行商公开的 Pack Odds 表；模拟结果为随机生成，不代表真实开卡体验。
            </p>
            <p class="ce-faint">Copyright © 2026 WikiAndroid</p>
        </div>
    </footer>
</template>

<style scoped>
.ce-header {
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(14px);
    background: rgba(11, 16, 32, 0.86);
    border-bottom: 1px solid var(--ce-border-soft);
}

.ce-header-inner {
    display: flex;
    align-items: center;
    gap: 22px;
    height: 62px;
}

.ce-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.ce-logo-text {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
}

.ce-logo-text strong {
    font-size: 16px;
    letter-spacing: 0.02em;
    background: linear-gradient(100deg, var(--ce-brand) 0%, #7ef0b0 60%, var(--ce-brand-deep) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.ce-logo-text small {
    font-size: 11px;
    color: var(--ce-text-faint);
}

.ce-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
}

.ce-nav a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: 9px;
    color: var(--ce-text-dim);
    font-size: 14px;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.ce-nav a:hover {
    color: var(--ce-text);
    background: rgba(255, 255, 255, 0.05);
}

.ce-nav a.active {
    color: var(--ce-brand);
    background: var(--ce-brand-soft);
}

.ce-nav-count {
    font-size: 11px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--ce-brand-deep);
    color: #eafff3;
}

.ce-header-right {
    flex-shrink: 0;
}

.ce-user {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ce-user-name {
    font-size: 13.5px;
    color: var(--ce-text-dim);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ce-main {
    flex: 1;
    width: 100%;
}

.ce-footer {
    margin-top: 60px;
    border-top: 1px solid var(--ce-border-soft);
    background: rgba(0, 0, 0, 0.22);
}

.ce-footer-inner {
    padding: 26px 20px 34px;
    font-size: 12.5px;
    color: var(--ce-text-dim);
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.ce-footer-inner p {
    margin: 0;
}

@media (max-width: 720px) {
    .ce-logo-text small {
        display: none;
    }

    .ce-header-inner {
        gap: 12px;
    }
}
</style>

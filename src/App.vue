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
                <RouterLink to="/stats" :class="{ active: navActive('/stats') }">我的统计</RouterLink>
            </nav>

            <div class="ce-header-right">
                <RouterLink v-if="!user" to="/auth" class="ce-btn ce-btn-sm ce-btn-primary">
                    注册 / 登录
                </RouterLink>
                <div v-else class="ce-user">
                    <RouterLink class="ce-user-name" to="/profile" title="个人中心">
                        {{ user.displayName }}
                    </RouterLink>
                    <RouterLink
                        class="ce-btn ce-btn-sm"
                        :class="{ active: navActive('/profile') }"
                        to="/profile"
                    >
                        个人中心
                    </RouterLink>
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

.ce-user-name:hover {
    color: var(--ce-brand);
    text-decoration: underline;
}

.ce-user .ce-btn.active {
    color: var(--ce-brand);
    background: var(--ce-brand-soft);
    border-color: var(--ce-brand-deep);
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

    .ce-user-name {
        display: none;
    }
}

/*
 * 手机端：顶栏改两行，导航独占第二行。
 * 一行里塞不下 logo(150) + 导航(226) + 账号按钮(144) + 间距，
 * 导航会被 flex 压到几乎没有宽度（实测 390px 下只剩 22px、320px 下 0px），
 * 文字正好断在账号按钮左边，看起来就像被按钮盖住了。
 */
@media (max-width: 600px) {
    .ce-header-inner {
        flex-wrap: wrap;
        height: auto;
        padding: 9px 20px 7px;
        gap: 8px 12px;
    }

    .ce-header-right {
        order: 2;
        margin-left: auto;
    }

    /* flex-basis 100% 才换行；宽度还不够时横向滚动，而不是继续被压窄 */
    .ce-nav {
        order: 3;
        flex: 1 1 100%;
    }
}

/* 再窄就只有图标放得下了，字标让位给账号按钮（375px 起放得下，留 20px 余量） */
@media (max-width: 374px) {
    .ce-logo-text {
        display: none;
    }
}
</style>

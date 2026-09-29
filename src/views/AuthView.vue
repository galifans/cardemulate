<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAppStore } from "../stores/app";

const store = useAppStore();
const router = useRouter();

const mode = ref<"login" | "register">("register");
const email = ref("");
const password = ref("");
const confirm = ref("");
const displayName = ref("");
const localError = ref("");

onMounted(() => {
    store.clearMessages();
});

const isRegister = computed(() => mode.value === "register");

const switchMode = (next: "login" | "register"): void => {
    mode.value = next;
    localError.value = "";
    store.clearMessages();
};

const submit = async (): Promise<void> => {
    localError.value = "";
    store.clearMessages();

    if (!email.value.includes("@")) {
        localError.value = "请输入有效的邮箱地址。";
        return;
    }
    if (password.value.length < 8) {
        localError.value = "密码至少 8 位。";
        return;
    }
    if (isRegister.value && password.value !== confirm.value) {
        localError.value = "两次输入的密码不一致。";
        return;
    }

    const ok = isRegister.value
        ? await store.register(
              email.value.trim(),
              password.value,
              displayName.value.trim() || undefined,
          )
        : await store.login(email.value.trim(), password.value);

    if (ok) {
        password.value = "";
        confirm.value = "";
        await router.push("/stats");
    }
};

const logout = async (): Promise<void> => {
    await store.logout();
};
</script>

<template>
    <div class="ce-shell ce-auth-shell">
        <section v-if="store.state.user" class="ce-card ce-auth-card">
            <p class="ce-card-en">Signed In</p>
            <h1 class="ce-auth-title">已登录</h1>
            <p class="ce-auth-desc">
                <strong>{{ store.state.user.displayName }}</strong>
                <br />
                <span class="ce-faint">{{ store.state.user.email }}</span>
            </p>
            <p v-if="store.state.info" class="ce-alert ce-alert-ok">{{ store.state.info }}</p>
            <div class="ce-auth-actions">
                <RouterLink class="ce-btn ce-btn-primary" to="/stats">查看我的统计</RouterLink>
                <button class="ce-btn" type="button" @click="logout">退出登录</button>
            </div>
            <p class="ce-faint ce-auth-note">
                拆盒记录保存在服务端，退出登录不会清空云端数据。
            </p>
        </section>

        <section v-else class="ce-card ce-auth-card">
            <p class="ce-card-en">Account</p>
            <h1 class="ce-auth-title">
                {{ isRegister ? "注册账号" : "登录账号" }}
            </h1>
            <p class="ce-auth-desc">
                注册后，拆盒数、各稀有度与卡种子集张数会自动统计并同步到云端，可在任意设备查看。
            </p>

            <div class="ce-auth-tabs">
                <button
                    type="button"
                    :class="{ active: mode === 'register' }"
                    @click="switchMode('register')"
                >
                    注册
                </button>
                <button
                    type="button"
                    :class="{ active: mode === 'login' }"
                    @click="switchMode('login')"
                >
                    登录
                </button>
            </div>

            <form class="ce-auth-form" @submit.prevent="submit">
                <label v-if="isRegister" class="ce-field">
                    <span>昵称（可选，默认使用邮箱前缀）</span>
                    <input
                        v-model="displayName"
                        type="text"
                        maxlength="24"
                        autocomplete="nickname"
                        placeholder="卡牌收藏家"
                    />
                </label>

                <label class="ce-field">
                    <span>邮箱</span>
                    <input
                        v-model="email"
                        type="email"
                        autocomplete="email"
                        placeholder="you@example.com"
                        required
                    />
                </label>

                <label class="ce-field">
                    <span>密码（至少 8 位）</span>
                    <input
                        v-model="password"
                        type="password"
                        :autocomplete="isRegister ? 'new-password' : 'current-password'"
                        placeholder="至少 8 位字符"
                        required
                    />
                </label>

                <label v-if="isRegister" class="ce-field">
                    <span>确认密码</span>
                    <input
                        v-model="confirm"
                        type="password"
                        autocomplete="new-password"
                        placeholder="再输入一次"
                        required
                    />
                </label>

                <p v-if="localError" class="ce-alert ce-alert-error">{{ localError }}</p>
                <p v-else-if="store.state.error" class="ce-alert ce-alert-error">
                    {{ store.state.error }}
                </p>
                <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">
                    {{ store.state.info }}
                </p>

                <button class="ce-btn ce-btn-primary ce-auth-submit" type="submit" :disabled="store.state.busy">
                    {{ store.state.busy ? "处理中…" : isRegister ? "注册并开始拆盒" : "登录" }}
                </button>
            </form>

            <p class="ce-faint ce-auth-note">
                我们只存储邮箱、昵称与密码的 PBKDF2 哈希（SHA-256，150,000 次迭代，随机盐），
                不保存明文密码，也不收集任何其他个人信息。
            </p>
        </section>
    </div>
</template>

<style scoped>
.ce-auth-shell {
    display: flex;
    justify-content: center;
    padding-top: 40px;
}

.ce-auth-card {
    width: 100%;
    max-width: 460px;
}

.ce-auth-card p {
    margin: 0;
}

.ce-auth-title {
    font-size: 24px;
    margin-top: 2px !important;
}

.ce-auth-desc {
    color: var(--ce-text-dim);
    font-size: 13.5px;
    margin-top: 10px !important;
}

.ce-auth-tabs {
    display: flex;
    gap: 6px;
    margin: 20px 0 18px;
    padding: 4px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--ce-border-soft);
}

.ce-auth-tabs button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ce-text-dim);
    font-size: 13.5px;
}

.ce-auth-tabs button.active {
    background: var(--ce-brand-soft);
    color: var(--ce-brand);
    font-weight: 600;
}

.ce-auth-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.ce-auth-submit {
    justify-content: center;
    margin-top: 4px;
}

.ce-auth-note {
    margin-top: 18px !important;
    font-size: 11.5px;
    line-height: 1.65;
}

.ce-auth-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
}
</style>

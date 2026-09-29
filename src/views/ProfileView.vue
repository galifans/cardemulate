<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useAppStore } from "../stores/app";
import {
    MAX_NICKNAME_LENGTH,
    MIN_NICKNAME_LENGTH,
    nicknameProblem,
    normalizeNickname,
} from "../account/nickname";

const store = useAppStore();

const nickname = ref("");
/** 上一次通过检测的昵称；输入一旦变化就作废，避免「检测完又改了字」还能保存 */
const checkedName = ref("");
const checkState = ref<"idle" | "available" | "taken" | "error">("idle");
const checking = ref(false);

onMounted(() => {
    store.clearMessages();
});

watch(
    () => store.state.user?.displayName,
    (name) => {
        if (name && !nickname.value) nickname.value = name;
    },
    { immediate: true },
);

watch(nickname, () => {
    checkState.value = "idle";
    checkedName.value = "";
});

const current = computed(() => store.state.user?.displayName ?? "");
const normalized = computed(() => normalizeNickname(nickname.value));
/** 规则问题先在本地拦掉，不必为了「太短」去问一次服务端 */
const localProblem = computed(() => nicknameProblem(nickname.value));
const changed = computed(() => normalized.value !== current.value);
const checkedOk = computed(
    () => checkState.value === "available" && checkedName.value === normalized.value,
);
const canSave = computed(() => checkedOk.value && changed.value && !store.state.busy);

const check = async (): Promise<void> => {
    if (localProblem.value) return;
    checking.value = true;
    try {
        const result = await store.checkNickname(normalized.value);
        checkState.value = result;
        checkedName.value = result === "available" ? normalized.value : "";
    } finally {
        checking.value = false;
    }
};

const save = async (): Promise<void> => {
    if (!canSave.value) return;
    const done = await store.updateNickname(normalized.value);
    if (done) {
        checkState.value = "idle";
        checkedName.value = "";
    }
};
</script>

<template>
    <div class="ce-shell ce-profile-shell">
        <section v-if="!store.state.user" class="ce-card ce-profile-card">
            <h1 class="ce-profile-title">个人中心</h1>
            <p class="ce-faint">登录后可以在这里改昵称。</p>
            <RouterLink class="ce-btn ce-btn-primary ce-profile-go" to="/auth">去登录</RouterLink>
        </section>

        <section v-else class="ce-card ce-profile-card">
            <h1 class="ce-profile-title">个人中心</h1>
            <p class="ce-profile-current">
                当前昵称
                <strong>{{ current }}</strong>
            </p>
            <p class="ce-faint ce-profile-mail">{{ store.state.user.email }}</p>

            <form class="ce-profile-form" @submit.prevent="save">
                <label class="ce-field">
                    <span>新昵称</span>
                    <input
                        v-model="nickname"
                        type="text"
                        maxlength="32"
                        autocomplete="off"
                        :placeholder="`${MIN_NICKNAME_LENGTH}~${MAX_NICKNAME_LENGTH} 个字`"
                    />
                </label>

                <p class="ce-faint ce-profile-rule">
                    昵称全站唯一，{{ MIN_NICKNAME_LENGTH }}~{{ MAX_NICKNAME_LENGTH }} 个字，
                    可用文字、数字、空格、下划线与连字符。
                </p>

                <p v-if="localProblem" class="ce-alert ce-alert-error">{{ localProblem }}</p>
                <p v-else-if="!changed" class="ce-alert ce-alert-ok">与当前昵称相同。</p>
                <p v-else-if="checkState === 'available'" class="ce-alert ce-alert-ok">
                    这个昵称可以用。
                </p>
                <p v-else-if="checkState === 'taken'" class="ce-alert ce-alert-error">
                    这个昵称已经有人用了，换一个试试。
                </p>
                <p v-else-if="checkState === 'error'" class="ce-alert ce-alert-error">
                    没能确认这个昵称能不能用，请稍后重试。
                </p>
                <p v-else-if="store.state.error" class="ce-alert ce-alert-error">
                    {{ store.state.error }}
                </p>
                <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">
                    {{ store.state.info }}
                </p>

                <div class="ce-profile-actions">
                    <button
                        class="ce-btn"
                        type="button"
                        :disabled="checking || !changed || Boolean(localProblem)"
                        @click="check"
                    >
                        {{ checking ? "检测中…" : "检测是否可用" }}
                    </button>
                    <button class="ce-btn ce-btn-primary" type="submit" :disabled="!canSave">
                        {{ store.state.busy ? "保存中…" : "保存昵称" }}
                    </button>
                </div>
            </form>

            <p class="ce-faint ce-profile-note">
                <RouterLink class="ce-link" to="/stats">查看我的统计</RouterLink>
            </p>
        </section>
    </div>
</template>

<style scoped>
.ce-profile-shell {
    display: flex;
    justify-content: center;
    padding-top: 40px;
}

.ce-profile-card {
    width: 100%;
    max-width: 460px;
}

.ce-profile-card p {
    margin: 0;
}

.ce-profile-title {
    font-size: 24px;
}

.ce-profile-current {
    margin-top: 14px !important;
    font-size: 13.5px;
    color: var(--ce-text-dim);
}

.ce-profile-current strong {
    color: var(--ce-text);
    font-size: 15px;
}

.ce-profile-mail {
    margin-top: 4px !important;
    font-size: 12.5px;
}

.ce-profile-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 20px;
}

.ce-profile-rule {
    font-size: 11.5px;
    margin-top: -6px !important;
}

.ce-profile-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 4px;
}

.ce-profile-go {
    display: inline-flex;
    margin-top: 18px;
}

.ce-profile-note {
    margin-top: 18px !important;
    font-size: 12.5px;
}

.ce-link {
    color: var(--ce-brand);
    text-decoration: underline;
}
</style>

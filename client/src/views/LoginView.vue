<template>
  <section class="w-full flex justify-center items-center min-h-screen">
    <div class="login-container" :class="cardClass">
      <div class="title-container">
        <h2
          class="title-text text-[24px] lg:text-[36px] font-semibold text-center mb-[12px] lg:mb-[24px]"
          :class="conditionalClass('text-white', 'text-slate-700')"
        >
          後台管理系統
        </h2>
        <div
          class="title-decoration"
          :class="
            conditionalClass(
              'bg-gradient-to-r from-transparent via-white/80 to-transparent',
              'bg-gradient-to-r from-transparent via-blue-500/80 to-transparent',
            )
          "
        ></div>
      </div>
      <form @submit.prevent="handleLogin" class="flex flex-col gap-[24px]">
        <!-- 帳號 -->
        <div>
          <label
            for="account"
            :class="conditionalClass('text-gray-200', 'text-slate-700 font-medium')"
            >帳號</label
          >
          <div class="relative">
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <input
              type="text"
              id="account"
              v-model="account"
              required
              placeholder="請輸入帳號"
              :class="inputClass + ' pl-10'"
            />
          </div>
        </div>
        <!-- 密碼 -->
        <div>
          <label
            for="password"
            :class="conditionalClass('text-gray-200', 'text-slate-700 font-medium')"
            >密碼</label
          >
          <div class="relative">
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <input
              type="password"
              id="password"
              v-model="password"
              required
              placeholder="請輸入密碼"
              :class="inputClass + ' pl-10'"
            />
          </div>
        </div>
        <!-- 錯誤訊息 -->
        <div
          v-if="error"
          class="error-message bg-red-500/20 border border-red-500 text-red-100 px-4 py-2 rounded-lg text-center"
        >
          {{ error }}
        </div>

        <!-- 登入按鈕 -->
        <button
          type="submit"
          :disabled="loading"
          class="bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
        >
          <span v-if="loading" class="mr-2">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
          {{ loading ? '登入中...' : '登入' }}
        </button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'

const userStore = useUserStore()
const notify = useNotifications()
const { cardClass, inputClass, conditionalClass } = useThemeClass()

// 表單狀態
const account = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// 登入處理
const handleLogin = async () => {
  if (!account.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    notify.notifyError('請輸入帳號和密碼')
    return
  }

  loading.value = true
  error.value = ''

  try {
    console.log('正在嘗試登入...')
    const message = await userStore.login({
      account: account.value,
      password: password.value,
    })

    console.log('登入回應訊息:', message)

    if (message === '登入成功' || message.includes('成功')) {
      console.log('登入成功，即將跳轉...')

      notify.notifySuccess('登入成功')

      // 短暫延遲以展示成功訊息
      setTimeout(() => {
        // 使用 window.location.href 進行頁面重新整理並導向首頁
        window.location.href = '/'
      }, 1000)
    } else {
      error.value = message
      console.error('登入未成功，原因:', message)

      notify.notifyError(message)
    }
  } catch (err) {
    console.error('登入過程拋出錯誤:', err)
    error.value = err || '登入失敗，請稍後再試'

    notify.notifyError(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  padding: 48px;
  border-radius: 20px;
  width: fit-content;
  max-width: 90%;
}

.title-container {
  position: relative;
  text-align: center;
  margin-bottom: 48px;
  padding: 24px 0;
}

.title-decoration {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 4px;
  border-radius: 2px;
}

button {
  width: 100%;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

label {
  display: block;
  font-size: 18px;
  margin-bottom: 8px;
}

@media (min-width: 768px) {
  .login-container {
    width: 480px;
  }
}
</style>
